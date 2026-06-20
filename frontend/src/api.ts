/**
 * Typed API client for Lullow.
 * All types mirror backend/app/models/schemas.py exactly.
 * Base URL: /api (proxied to http://localhost:8000 in dev via vite.config.ts).
 */

const BASE = import.meta.env.VITE_API_BASE ?? ''

// ------------------------------------------------------------------ //
// Enums
// ------------------------------------------------------------------ //

export type Emotion =
  | 'scared'
  | 'lonely'
  | 'sad'
  | 'missing_parent'
  | 'worried'
  | 'overstimulated'
  | 'angry'
  | 'cant_sleep'
  | 'unsure'

export type SpeakerType = 'child' | 'parent'

export type VisualMode = 'off' | 'low_stimulation'

export type ConflictIntensity = 'none' | 'low' | 'medium'

export type InputSource = 'voice' | 'text'

export type StoryStatus = 'draft' | 'parent_approved'

// ------------------------------------------------------------------ //
// Memory schemas
// ------------------------------------------------------------------ //

export interface ChildProfile {
  child_id: string
  name: string
  age: number
  preferred_language?: string
  favorite_animals: string[]
  favorite_settings: string[]
  comfort_objects: string[]
  sensitive_topics: string[]
  preferred_story_length_minutes: number
}

export interface ParentSafetySettings {
  child_id: string
  allow_child_initiated_sessions: boolean
  blocked_topics: string[]
  blocked_words: string[]
  max_story_length_minutes: number
  visual_mode: VisualMode
  requires_parent_review_for_new_themes: boolean
  emergency_contact_enabled: boolean
  bedtime_cutoff?: string | null
}

export interface RecurringCharacter {
  name: string
  species: string
  traits: string[]
  reference_image_url?: string | null
}

export interface StoryWorld {
  child_id: string
  story_world_id: string
  recurring_setting: string
  recurring_characters: RecurringCharacter[]
  past_themes: string[]
  successful_rituals: string[]
}

// ------------------------------------------------------------------ //
// Voice schemas
// ------------------------------------------------------------------ //

export interface TranscriptResult {
  text: string
  is_mock: boolean
}

export interface TTSResult {
  audio_base64: string
  mime_type: string
  is_mock: boolean
}

// ------------------------------------------------------------------ //
// Emotion check-in
// ------------------------------------------------------------------ //

export interface EmotionExtraction {
  emotion: Emotion
  trigger?: string | null
  target_outcome: string
  avoid: string[]
  safety_flag: boolean
  reflection: string
  confidence: number
}

export interface SafetyEscalation {
  triggered: boolean
  category?: string | null
  spoken_response: string
  show_help_button: boolean
}

export interface CheckInRequest {
  child_id: string
  speaker: SpeakerType
  text: string
}

export interface CheckInResponse {
  extraction: EmotionExtraction
  escalation?: SafetyEscalation | null
}

// ------------------------------------------------------------------ //
// Safety
// ------------------------------------------------------------------ //

export interface SafetyEvaluation {
  age_appropriate: boolean
  too_scary: boolean
  parent_constraints_followed: boolean
  sleep_friendly: boolean
  emotional_warmth: number
  blocked_topic_hits: string[]
  notes: string
  passed: boolean
}

// ------------------------------------------------------------------ //
// Story pipeline
// ------------------------------------------------------------------ //

export interface StoryPlan {
  theme: string
  tone: string
  conflict_intensity: ConflictIntensity
  avoid: string[]
  resolution: string
  ritual: string
  main_character?: string | null
  setting?: string | null
}

export interface StoryScene {
  index: number
  text: string
  image_prompt: string
  image_url?: string | null
  clip_url?: string | null
  narration_audio_base64?: string | null
  is_image_mock: boolean
  is_clip_mock: boolean
}

export interface Ritual {
  name: string
  steps: string[]
  spoken: string
}

export interface ReviewTrail {
  story_id: string
  title: string
  child_said?: string | null
  parent_request?: string | null
  emotion_target: string
  memory_used: string[]
  safety_constraints_applied: string[]
  avoided_topics: string[]
  parent_edits: string[]
  final_status: StoryStatus
}

export interface Story {
  story_id: string
  child_id: string
  title: string
  body: string
  plan: StoryPlan
  scenes: StoryScene[]
  ritual: Ritual
  review_trail: ReviewTrail
  safety_evaluation: SafetyEvaluation
  visual_mode: VisualMode
  emotion: Emotion
  created_at: string
}

export interface StoryGenerateResponse {
  story: Story | null
  escalation: SafetyEscalation | null
  used_mock: Record<string, boolean>
}

export interface StoryRequest {
  child_id: string
  input_source: InputSource
  speaker: SpeakerType
  raw_input: string
  visual_mode?: VisualMode | null
  extraction?: EmotionExtraction | null
}

export interface StoryReviseRequest {
  story_id: string
  child_id: string
  instruction: string
}

// ------------------------------------------------------------------ //
// Visual pipeline
// ------------------------------------------------------------------ //

export interface VisualGenerateRequest {
  story_id: string
  child_id: string
  animate: boolean
}

// ------------------------------------------------------------------ //
// Growth journal
// ------------------------------------------------------------------ //

export interface JournalEntry {
  story_id: string
  date: string
  emotion: Emotion
  theme: string
  title: string
}

export interface GrowthJournal {
  child_id: string
  period: string
  emotion_counts: Record<string, number>
  helpful_elements: string[]
  entries: JournalEntry[]
  reflection: string
}

// ------------------------------------------------------------------ //
// Annotation (Terac)
// ------------------------------------------------------------------ //

export interface AnnotationLabels {
  age_appropriate?: boolean | null
  too_scary?: boolean | null
  emotionally_warm?: boolean | null
  moral_clarity?: boolean | null
  parent_approval?: boolean | null
  rewrite_needed?: boolean | null
}

export interface AnnotationRequest {
  story_id: string
  labels: AnnotationLabels
  annotator?: string
  notes?: string
}

// ------------------------------------------------------------------ //
// Status
// ------------------------------------------------------------------ //

export interface FeatureStatus {
  anthropic: boolean
  deepgram: boolean
  redis: boolean
  pika: boolean
  image: boolean
  arize: boolean
  terac: boolean
}

export interface StatusResponse {
  features: FeatureStatus
}

// ------------------------------------------------------------------ //
// HTTP helpers
// ------------------------------------------------------------------ //

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.json() as Promise<T>
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' })
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })

// ------------------------------------------------------------------ //
// API functions — one per contract endpoint
// ------------------------------------------------------------------ //

// System
export const getStatus  = () => get<StatusResponse>('/api/status')
export const getHealth  = () => get<{ status: string; app: string }>('/api/health')

// Profile
export const getProfiles       = () => get<ChildProfile[]>('/api/profile')
export const getProfile        = (child_id: string) => get<ChildProfile>(`/api/profile/${child_id}`)
export const putProfile        = (profile: ChildProfile) => put<ChildProfile>('/api/profile', profile)
export const getStoryWorld     = (child_id: string) => get<StoryWorld>(`/api/profile/${child_id}/world`)
export const putStoryWorld     = (child_id: string, world: StoryWorld) =>
  put<StoryWorld>(`/api/profile/${child_id}/world`, world)

// Safety settings
export const getSettings = (child_id: string) => get<ParentSafetySettings>(`/api/settings/${child_id}`)
export const putSettings = (settings: ParentSafetySettings) => put<ParentSafetySettings>('/api/settings', settings)

// Emotion check-in
export const postCheckIn = (req: CheckInRequest) => post<CheckInResponse>('/api/session/checkin', req)

// Story pipeline
export const postGenerateStory  = (req: StoryRequest) => post<StoryGenerateResponse>('/api/story/generate', req)
export const postReviseStory    = (req: StoryReviseRequest) => post<StoryGenerateResponse>('/api/story/revise', req)
export const getStory           = (story_id: string) => get<Story>(`/api/story/${story_id}`)
export const getStoryHistory    = (child_id: string) => get<Story[]>(`/api/story?child_id=${child_id}`)
export const postApproveStory   = (story_id: string) => post<Story>(`/api/story/${story_id}/approve`)
export const postAnnotateStory  = (story_id: string, req: AnnotationRequest) =>
  post<unknown>(`/api/story/${story_id}/annotate`, req)
export const getAnnotations     = (story_id: string) => get<unknown[]>(`/api/story/${story_id}/annotations`)

// Voice
export const postSTT = (blob: Blob): Promise<TranscriptResult> => {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  return requestForm<TranscriptResult>('/api/voice/stt', form)
}
export const postTTS = (text: string) => post<TTSResult>('/api/voice/tts', { text })

// Visual pipeline
export const postGenerateVisuals = (req: VisualGenerateRequest) =>
  post<Story>('/api/visual/generate', req)

// Growth journal
export const getJournal      = (child_id: string) => get<GrowthJournal>(`/api/journal/${child_id}`)
export const getRecentEvals  = () => get<unknown[]>('/api/journal/evals/recent')
