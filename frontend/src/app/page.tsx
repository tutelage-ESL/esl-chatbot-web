"use client"

import Link from "next/link"
import { AppHeader } from "@/components/AppHeader"
import { ConversationCard } from "@/components/ConversationCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Mic, BookOpen, TrendingUp, Users, Award } from "lucide-react"

const features = [
  {
    title: "AI Chat Practice",
    description: "Practice conversations with our intelligent AI tutor that adapts to your learning level and provides instant feedback.",
    icon: MessageCircle,
    href: "/chat",
    badge: "Popular"
  },
  {
    title: "Voice Practice", 
    description: "Improve your pronunciation with real-time feedback, speech recognition, and personalized coaching.",
    icon: Mic,
    href: "/voice",
    badge: "New"
  },
  {
    title: "Vocabulary Builder",
    description: "Expand your vocabulary with personalized word lists, spaced repetition, and contextual learning.",
    icon: BookOpen,
    href: "/vocabulary"
  },
  {
    title: "Progress Tracking",
    description: "Monitor your learning journey with detailed analytics, achievements, and personalized insights.",
    icon: TrendingUp,
    href: "/progress"
  }
]

const stats = [
  { label: "Active Learners", value: "10,000+", icon: Users },
  { label: "Conversations", value: "50,000+", icon: MessageCircle },
  { label: "Success Rate", value: "95%", icon: Award }
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        title="ESL Academy"
        subtitle="Master English with AI-powered learning"
        showChatActions={false}
      />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-12 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Learn English with
                <span className="text-blue-600"> AI-Powered </span>
                Conversations
              </h1>
              <p className="body-md text-gray-600 max-w-2xl mx-auto">
                Practice speaking, improve your vocabulary, and build confidence with our intelligent English tutor. 
                Get personalized feedback and track your progress every step of the way.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href="/chat">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Start Chatting
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                <Link href="/voice">
                  <Mic className="w-5 h-5 mr-2" />
                  Try Voice Practice
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="flex justify-center">
                    <stat.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="body-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Everything You Need to Master English
              </h2>
              <p className="body-md text-gray-600 max-w-2xl mx-auto">
                Our comprehensive platform offers multiple ways to practice and improve your English skills, 
                all powered by advanced AI technology.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {features.map((feature, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <feature.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      {feature.badge && (
                        <Badge variant={feature.badge === "Popular" ? "default" : "secondary"}>
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="body-md mt-2">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={feature.href}>
                        Get Started
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start Section */}
        <section className="px-6 py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Ready to Start Learning?
              </h2>
              <p className="body-md text-gray-600">
                Jump into a conversation or explore our learning features
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ConversationCard
                title="Quick Chat"
                description="Start a conversation with our AI tutor"
                isNewConversation={true}
                onClick={() => console.log("Quick chat clicked")}
              />
              <ConversationCard
                title="Grammar Practice"
                description="Focus on grammar rules and exercises"
                lastUpdated="Popular topic"
                href="/chat/grammar"
              />
              <ConversationCard
                title="Business English"
                description="Professional communication skills"
                lastUpdated="Trending now"
                href="/chat/business"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
