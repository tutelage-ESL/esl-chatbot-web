<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const {
  threadRef,
  composerRef,
  input,
  search,
  thinking,
  sending,
  ending,
  creating,
  refreshing,
  sessions,
  activeSessionId,
  activeSession,
  messages,
  userInitial,
  plan,
  limits,
  subActive,
  userMessageCount,
  cefrLabel,
  accuracyLabel,
  isSessionEnded,
  hardCapReached,
  composerDisabled,
  todayList,
  earlierList,
  sessionTimer,
  newSession,
  openSession,
  send,
  sendVoice,
  endCurrent,
  refreshCurrent,
  fillSuggestion,
  voiceState,
  partialTranscript,
  audioStream,
} = useChatPage()
</script>

<template>
  <div class="flex h-full overflow-hidden animate-card-enter" style="--delay:0ms">

    <!-- Sessions sidebar (fixed width, self-scrolling) -->
    <PagesDashboardChatSessionsSidebar
      :sessions="sessions"
      :today-list="todayList"
      :earlier-list="earlierList"
      :creating="creating"
      :search="search"
      @new-session="newSession"
      @open-session="openSession"
      @update:search="search = $event"
    />

    <!-- Main thread (fills remaining space, column flex) -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Thread header (fixed height, never scrolls) -->
        <PagesDashboardChatThreadHeader
          :topic="activeSession?.topic"
          :cefr-label="cefrLabel"
          :is-session-ended="isSessionEnded"
          :active-session-id="activeSessionId"
          :ending="ending"
          :refreshing="refreshing"
          @voice="toast.message('Voice playback — coming soon')"
          @refresh="refreshCurrent"
          @end="endCurrent"
        />
  
          <!-- Message thread (scrollable, grows to fill) -->
          <PagesDashboardChatMessageThread
          ref="threadRef"
          :messages="messages"
          :thinking="thinking"
          :sub-active="subActive"
          :active-session="activeSession"
          :user-initial="userInitial"
          @fill-suggestion="fillSuggestion"
          />

      <!-- Composer (fixed at bottom, never scrolls) -->
      <PagesDashboardChatComposer
        ref="composerRef"
        v-model="input"
        :sending="sending"
        :thinking="thinking"
        :composer-disabled="composerDisabled"
        :is-session-ended="isSessionEnded"
        :hard-cap-reached="hardCapReached"
        :sub-active="subActive"
        :active-session-id="activeSessionId"
        :cefr-label="cefrLabel"
        :plan="plan"
        :user-message-count="userMessageCount"
        :messages-per-session-hard="limits.messagesPerSessionHard"
        :session-timer="sessionTimer"
        :accuracy-label="accuracyLabel"
        :has-messages="messages.length > 0"
        :voice-state="voiceState"
        :partial-transcript="partialTranscript"
        :audio-stream="audioStream"
        @send="send"
        @fill-suggestion="fillSuggestion"
        @attach="toast.message('Attachments — coming soon')"
        @mic="sendVoice"
      />
    </div>

    <!-- Live coaching pane (fixed width, right side)
    <PagesDashboardChatCoachPane /> -->
  </div>
</template>
