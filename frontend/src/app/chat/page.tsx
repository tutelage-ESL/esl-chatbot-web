"use client"

import { AppHeader } from "@/components/AppHeader"
import { ConversationCard } from "@/components/ConversationCard"

// Mock data for conversations
const conversations = [
  {
    id: "1",
    title: "Daily Conversation Practice",
    description: "Practicing everyday English conversations and common phrases",
    lastUpdated: "2 hours ago",
    href: "/chat/1"
  },
  {
    id: "2", 
    title: "Business English",
    description: "Professional communication and workplace vocabulary",
    lastUpdated: "1 day ago",
    href: "/chat/2"
  },
  {
    id: "3",
    title: "Travel English",
    description: "Essential phrases for traveling and tourism",
    lastUpdated: "3 days ago", 
    href: "/chat/3"
  },
]

export default function ChatPage() {
  const handleMicrophoneClick = () => {
    console.log("Microphone clicked")
  }

  const handleTrashClick = () => {
    console.log("Trash clicked")
  }

  const handleHistoryClick = () => {
    console.log("History clicked")
  }

  const handleNewConversation = () => {
    console.log("New conversation clicked")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        title="Conversation History"
        subtitle="Continue your English learning journey"
        showChatActions={true}
        onMicrophoneClick={handleMicrophoneClick}
        onTrashClick={handleTrashClick}
        onHistoryClick={handleHistoryClick}
      />
      
      <main className="flex-1 p-6 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* New Conversation Card */}
          <ConversationCard
            title="New Conversation"
            isNewConversation={true}
            onClick={handleNewConversation}
          />
          
          {/* Existing Conversations */}
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              id={conversation.id}
              title={conversation.title}
              description={conversation.description}
              lastUpdated={conversation.lastUpdated}
              href={conversation.href}
            />
          ))}
        </div>
      </main>
    </div>
  )
}