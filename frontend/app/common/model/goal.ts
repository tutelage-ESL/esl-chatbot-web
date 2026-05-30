export type GoalType = 'VOCABULARY' | 'SPEAKING' | 'GRAMMAR' | 'CONVERSATION' | 'STUDY_TIME'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
export type GoalDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'

// Mirrors the goals DB table exactly
export interface Goal {
  id: string
  userId: string
  assignedByTutorId: string | null
  type: GoalType
  description: string
  target: number
  difficulty: GoalDifficulty | null
  status: GoalStatus
  progress: number
  actionPlan: string | null
  startDate: string
  targetDate: string | null
  completedDate: string | null
  lastProgressUpdate: string | null
  createdAt: string
  updatedAt: string
  // Nested relation returned by the API (not a DB column but always present)
  assignedByTutor: {
    id: string
    displayName: string
    avatarUrl: string | null
  } | null
}
