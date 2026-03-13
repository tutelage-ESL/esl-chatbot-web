# ESL Chatbot Web API Documentation

This document outlines the standard REST API endpoints available in the backend and provides the TypeScript interfaces for both frontend consumption and backend development.

## Base URL
- Local: `http://localhost:3001`

---

## Standard Response Format

All API responses follow a standardized format. The frontend should define a generic type to handle all API responses:

```typescript
// Frontend & Backend Type Definition
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

---

## 1. Authentication Endpoints (JWT)

### `POST /api/auth/jwt/signup`
Creates a new user account.

**Frontend Request:**
```typescript
export interface SignupRequest {
  username: string; // Required
  email: string;    // Required, valid email
  password: string; // Required, min 6 chars
}
```

**Backend Response Payload (`data` field):**
```typescript
export interface AuthResponseData {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    subscriptionTier?: string;
  };
}
```

### `POST /api/auth/jwt/signin`
Authenticates a user and returns tokens.

**Frontend Request:**
```typescript
export interface SigninRequest {
  email: string;    // Required, valid email
  password: string; // Required
}
```

**Backend Response Payload (`data` field):**
`AuthResponseData` (Same as above)

### `POST /api/auth/jwt/refresh`
Refreshes the authentication tokens. Requires a valid refresh token.

**Frontend Request:**
```typescript
export interface RefreshRequest {
  refreshToken: string;
}
```

**Backend Response Payload (`data` field):**
`AuthResponseData` (Same as above)

### `POST /api/auth/jwt/logout`
Invalidates the current session/refresh token.

**Frontend Request:**
*(No Body Required)*

**Backend Response Payload:**
*(Standard success response without data)*

### `GET /api/auth/jwt/profile` (or `GET /api/auth/jwt/me`)
Retrieves the profile of the currently authenticated user.

**Headers Required:**
`Authorization: Bearer <token>`

**Backend Response Payload (`data` field):**
```typescript
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  subscriptionTier: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. Generic API Endpoints

### `GET /api/health`
Checks the server health and connected services.

**Backend Response Payload (`data` field):**
```typescript
export interface HealthCheckData {
  status: 'OK' | 'DEGRADED' | 'ERROR';
  timestamp: string;
  uptime: string;
  services: {
    database: boolean;
    gemini: boolean;
    elevenlabs: boolean;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}
```

### `GET /api/dashboard/stats`
Retrieves dashboard statistics for the logged-in user.

**Headers Required:** `Authorization: Bearer <token>`

**Backend Response Payload (`data` field):**
```typescript
export interface DashboardStats {
  lessonsCompleted: number;
  studyTime: string;
  wordsLearned: number;
  streakDays: number;
}
```

### `GET /api/usage`
Fetches usage limits and stats for the user's TTS limits.

**Headers Required:** `Authorization: Bearer <token>`

**Backend Response Payload (`data` field):**
```typescript
export interface UsageLimitsData {
  remainingUsage: number;
  usagePercentage: number;
  tierLimits: {
    ttsMinutes: number;
    [key: string]: any;
  };
}
```

---

## 3. Core Interaction & Progress

### `POST /api/chat`
Sends a message to the AI chatbot and returns the response.

**Headers Required:** `Authorization: Bearer <token>`

**Frontend Request:**
```typescript
export interface ChatRequest {
  message: string;
}
```

**Backend Response Payload (`data` field):**
```typescript
export interface ChatResponse {
  response: string;
}
```

### `GET /api/progress`
Retrieves user progress metrics.

**Headers Required:** `Authorization: Bearer <token>`

**Backend Response Payload (`data` field):**
```typescript
export interface UserProgressData {
  progress: number;
  chatMessageCount: number;
  totalWordsTyped: number;
  studyTime: string;
  dayStreak: number;
  level: string;
  activities: {
    type: string;
    message: string;
    timestamp: Date | string;
    score: number;
  }[];
}
```

---

## 4. Text-To-Speech (TTS) & Voice

### `GET /api/voices`
Lists available voices from ElevenLabs.

**Backend Response Payload:**
*(Custom structure without standard ApiResponse wrapper)*
```typescript
export interface VoicesResponse {
  available: boolean;
  voices?: {
    voice_id: string;
    name: string;
    category?: string;
    labels?: Record<string, string>;
  }[];
  error?: string;
  fallback?: boolean;
}
```

### `POST /api/text-to-speech`
Generates audio from text using ElevenLabs.

**Frontend Request:**
```typescript
export interface TTSRequest {
  text: string;
  voiceId?: string;
  options?: Record<string, any>;
}
```

**Backend Response:**
*(Returns raw binary audio file buffer, `Content-Type: audio/mpeg`)*

### `GET /api/voice-status`
Checks the availability of voice/TTS providers.

**Backend Response Payload:**
```typescript
export interface VoiceStatus {
  elevenLabs: {
    available: boolean;
    voiceCount: number;
  };
  browserTTS: {
    available: boolean;
    note: string;
  };
  freeTTS: {
    available: boolean;
    provider: string;
    voice: string | null;
    lang: string;
  };
}
```

---

## 5. User Settings

### `GET /api/settings/:userId`
Fetch settings for a specific user.

**Backend Response Payload (`data` field):**
```typescript
export interface UserSettings {
  userId: string;
  language: string;
  voiceSpeed: number;
  autoSpeak: boolean;
}
```

### `POST /api/settings`
Updates the user settings.

**Frontend Request:**
```typescript
export interface UpdateSettingsRequest {
  user_id: string;
  language: string;
  voiceSpeed: number | string;
  autoSpeak: 'on' | 'off' | boolean;
}
```

**Backend Response Payload (`data` field):**
`UserSettings`
