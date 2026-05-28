import type { Class, ClassUser, Announcement } from '~/common/model/class'
import type { User } from '~/common/model/user'

// ─── API list / detail shapes (extend the base model) ────────────────────────

export interface ClassMember extends Pick<ClassUser, 'id' | 'role'> {
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
}

export interface ClassItem extends Omit<Class, 'classCodeRefreshedAt' | 'createdById' | 'updatedAt'> {
  memberCount: number
  myRole?: 'STUDENT' | 'TUTOR' | 'ADMIN'
}

export interface ClassDetail extends ClassItem {
  members: ClassMember[]
}

export interface AdminClassItem extends Omit<Class, 'classCodeRefreshedAt' | 'createdById' | 'updatedAt'> {
  memberCount: number
}

// ─── Student monitoring ───────────────────────────────────────────────────────

export interface ClassStudentSummary {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
  currentLevel: string | null
  targetLevel: string | null
  currentStreak: number
  estimatedLevel: string | null
  totalStudyTimeMinutes: number
  grammarSkill: number
  vocabularySkill: number
  vocabTotal: number
  vocabDueToday: number
}

export interface ClassStudentDetail {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
  learnerProfile: {
    currentLevel: string | null
    targetLevel: string | null
    learningPurpose: string | null
    topicsOfInterest: string[]
    weeklyGoalMinutes: number
    timezone: string | null
    aiPersonality: string | null
  } | null
  metrics: {
    currentStreak: number
    longestStreak: number
    estimatedLevel: string | null
    totalStudyTimeMinutes: number
    grammarSkill: number
    vocabularySkill: number
    fluencySkill: number
    speakingSkill: number
    lastStudyDate: string | null
  } | null
  vocabTotal: number
  vocabDueToday: number
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ClassAnalytics {
  classId: string
  className: string
  studentCount: number
  averageSkills: { grammar: number; vocabulary: number; fluency: number }
  mostCommonGrammarErrors: { error: string; count: number }[]
  vocabularyCoverage: number
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface AnnouncementItem extends Pick<Announcement, 'id' | 'classId' | 'authorId' | 'content' | 'createdAt'> {
  author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface ClassPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
