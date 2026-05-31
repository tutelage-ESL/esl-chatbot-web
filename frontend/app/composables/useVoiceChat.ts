import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '~~/stores/auth'

export type VoiceState = 'idle' | 'recording' | 'processing' | 'error'

export interface VoiceResult {
  sessionId: string
  clientMsgId: string
  transcript: string
  pronunciationScore?: number | null
  userMessage: { id: string; content: string; createdAt: string; wordCount?: number | null }
  assistantMessage: { id: string; content: string; createdAt: string }
  evaluation: Record<string, unknown> | null
  audioBase64?: string | null
}

export interface VoiceChatCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void
  onResult?: (result: VoiceResult) => void
  onTts?: (audioBase64: string) => void
  onError?: (code: string, message: string) => void
}

export function useVoiceChat() {
  const authStore = useAuthStore()

  const voiceState = ref<VoiceState>('idle')
  const partialTranscript = ref('')
  const socketError = ref<string | null>(null)

  let socket: Socket | null = null
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let activeSessionId: string | null = null
  let callbacks: VoiceChatCallbacks = {}

  // ── Socket ────────────────────────────────────────────────────────────────

  function ensureSocket() {
    if (socket?.connected) return socket

    // Tear down any stale disconnected instance before creating a fresh one
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }

    const token = authStore.getAccessToken
    // public.baseUrl is e.g. "http://localhost:8000/api/v1" — strip path for socket origin
    const configUrl = (useRuntimeConfig().public.baseUrl as string) || 'http://localhost:8000/api/v1'
    const socketOrigin = new URL(configUrl).origin

    socket = io(`${socketOrigin}/chat`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    })

    socket.on('voice:started', ({ sessionId }: { sessionId: string }) => {
      if (sessionId !== activeSessionId) return
      // backend acknowledged — recording is already flowing
    })

    socket.on('voice:partial_transcript', ({ sessionId, text, isFinal }: { sessionId: string; text: string; isFinal: boolean }) => {
      if (sessionId !== activeSessionId) return
      partialTranscript.value = text
      callbacks.onTranscript?.(text, isFinal)
    })

    socket.on('voice:transcript', ({ sessionId, transcript }: { sessionId: string; transcript: string }) => {
      if (sessionId !== activeSessionId) return
      partialTranscript.value = transcript
    })

    socket.on('message:response', (payload: VoiceResult) => {
      if (payload.sessionId !== activeSessionId) return
      voiceState.value = 'idle'
      partialTranscript.value = ''
      callbacks.onResult?.(payload)
    })

    socket.on('voice:tts', ({ sessionId, audioBase64 }: { sessionId: string; audioBase64: string }) => {
      if (sessionId !== activeSessionId) return
      callbacks.onTts?.(audioBase64)
    })

    socket.on('voice:error', ({ code, message }: { code: string; message: string }) => {
      socketError.value = message
      stopRecorder(true) // abort — don't emit voice:end
      callbacks.onError?.(code, message)
      voiceState.value = 'idle' // reset so user can try again immediately
    })

    socket.on('disconnect', () => {
      if (voiceState.value === 'recording' || voiceState.value === 'processing') {
        socketError.value = 'Connection lost'
        stopRecorder(true)
        callbacks.onError?.('DISCONNECT', 'Connection lost')
        voiceState.value = 'idle'
      }
    })

    return socket
  }

  // ── MediaRecorder ─────────────────────────────────────────────────────────

  // abort=true silences onstop so voice:end is NOT sent (used on error paths)
  function stopRecorder(abort = false) {
    if (recorder) {
      if (abort) recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
    }
    recorder = null
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function startRecording(sessionId: string, cb: VoiceChatCallbacks = {}) {
    if (voiceState.value === 'recording') return
    callbacks = cb
    activeSessionId = sessionId
    partialTranscript.value = ''
    socketError.value = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const isDenied = err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      const code = isDenied ? 'MIC_DENIED' : 'MIC_ERROR'
      const msg = isDenied ? 'Microphone access denied' : 'Could not access microphone'
      socketError.value = msg
      callbacks.onError?.(code, msg)
      voiceState.value = 'idle' // reset — don't leave mic permanently blocked
      return
    }

    // Pick the best supported MIME type (Safari falls back to audio/mp4, Deepgram
    // live won't handle it — but batch STT in sendVoiceMessage handles any format)
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mpeg']
      .find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const sock = ensureSocket()

    sock.emit('voice:start', { sessionId, mimeType: recorder.mimeType || mimeType })

    recorder.ondataavailable = (e) => {
      if (!e.data.size) return
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = (reader.result as string).split(',')[1]
        if (b64) sock.emit('voice:chunk', { sessionId, data: b64 })
      }
      reader.readAsDataURL(e.data)
    }

    recorder.onstop = () => {
      sock.emit('voice:end', { sessionId })
      voiceState.value = 'processing'
    }

    recorder.onerror = () => {
      socketError.value = 'Recording error'
      stopRecorder(true)
      callbacks.onError?.('RECORDER_ERROR', 'Recording error')
      voiceState.value = 'idle'
    }

    recorder.start(250) // emit chunks every 250 ms for live preview
    voiceState.value = 'recording'
  }

  function stopRecording() {
    if (voiceState.value !== 'recording') return
    stopRecorder()
    // onstop fires → emits voice:end → state moves to 'processing' there
  }

  function disconnect() {
    stopRecorder()
    socket?.disconnect()
    socket = null
    voiceState.value = 'idle'
    partialTranscript.value = ''
  }

  onBeforeUnmount(disconnect)

  return {
    voiceState,
    partialTranscript,
    socketError,
    startRecording,
    stopRecording,
    disconnect,
  }
}
