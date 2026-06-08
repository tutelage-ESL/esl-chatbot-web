// Voice Lab — UI shapes for the spoken-conversation pipeline.
//
// These mirror what the /chat Socket.io voice pipeline actually returns
// (see backend src/socket/voice.socket.ts + voice-messages.service.ts).
// Pronunciation scoring is GOLD/PREMIUM-only (Azure); FREE/dev get `null`.

// A single per-word pronunciation flag from Azure (GOLD/PREMIUM only).
export interface VoicePronIssue {
  word: string
  issue: string
  suggestion: string
}

// Full pronunciation assessment — only present on GOLD/PREMIUM turns.
export interface VoicePronunciation {
  accuracyScore: number
  fluencyScore: number
  completenessScore: number
  prosodyScore: number | null // null on GOLD (basic), number on PREMIUM (full)
  overallScore: number
  issues: VoicePronIssue[]
}

// The skill breakdown the AI returns for every voice turn (all plans).
export interface VoiceEvaluation {
  grammarScore: number
  vocabularyScore: number
  vocabularyLevel: string
  fluencyScore: number
  overallScore: number
  detectedCefrLevel: string
  feedback: string
  pronunciationScore: number | null
}

// One exchange in the lab thread: the learner's spoken turn + the AI's reply.
export interface VoiceTurn {
  id: string
  // learner side
  transcript: string
  // assistant side
  reply: string
  replyAudioBase64: string | null // TTS MP3, attached when voice:tts arrives
  // scoring
  evaluation: VoiceEvaluation | null
  pronunciation: VoicePronunciation | null
  at: string // ISO timestamp
}
