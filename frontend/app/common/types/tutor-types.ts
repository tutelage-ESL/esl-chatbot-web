export interface TutorDashboardData {
  classes: {
    total: number
    active: number
  }
  students: {
    total: number
    activeToday: number
    activeThisWeek: number
  }
  skills: {
    avgGrammar: number
    avgVocabulary: number
    avgFluency: number
    avgSpeaking: number
  }
  sessionsToday: number
  recentActivity: Array<{
    userId: string
    displayName: string
    avatarUrl: string | null
    sessionMode: 'TEXT' | 'VOICE'
    startedAt: string
    avgOverallScore: number | null
    className: string
  }>
}
