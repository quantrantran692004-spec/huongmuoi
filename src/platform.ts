export type PlatformQuestion = {
  id: number
  category: string
  prompt: string
  context?: string
  options: string[]
  correct: number
  explanation: string
}

export type SavedExam = {
  id: string
  title: string
  questions: PlatformQuestion[]
  durationMinutes?: number
  createdAt: string
  updatedAt: string
}

export type SavedAttempt = {
  id: string
  examId: string
  title: string
  score: number
  correct: number
  total: number
  unanswered: number
  completedAt: string
  review?: AttemptReviewItem[]
}

export type AttemptReviewItem = {
  questionId: number
  category: string
  prompt: string
  options: string[]
  selectedIndex: number | null
  correctIndex: number
  explanation: string
}

const EXAMS_KEY = 'huongmuoi-exams-v1'
const ATTEMPTS_KEY = 'huongmuoi-attempts-v1'
const AUTH_KEY = 'huongmuoi-auth-v1'

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

export function getSavedExams() { return read<SavedExam[]>(EXAMS_KEY, []) }
export function getSavedAttempts() { return read<SavedAttempt[]>(ATTEMPTS_KEY, []) }
export function saveExam(exam: Omit<SavedExam, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const next = { ...exam, id: id('exam'), createdAt: now, updatedAt: now }
  write(EXAMS_KEY, [next, ...getSavedExams()].slice(0, 50))
  return next
}
export function saveAttempt(attempt: Omit<SavedAttempt, 'id' | 'completedAt'>) {
  const next = { ...attempt, id: id('attempt'), completedAt: new Date().toISOString() }
  write(ATTEMPTS_KEY, [next, ...getSavedAttempts()].slice(0, 100))
  return next
}
export function removeSavedExam(examId: string) { write(EXAMS_KEY, getSavedExams().filter((exam) => exam.id !== examId)) }
export function removeSavedAttempt(attemptId: string) { write(ATTEMPTS_KEY, getSavedAttempts().filter((attempt) => attempt.id !== attemptId)) }
export function removeLocalHistory() { localStorage.removeItem(EXAMS_KEY); localStorage.removeItem(ATTEMPTS_KEY) }

export type AuthSession = { accessToken: string; refreshToken?: string; email?: string; userId?: string }
export function getAuthSession() { return read<AuthSession | null>(AUTH_KEY, null) }
export function setAuthSession(session: AuthSession | null) { session ? write(AUTH_KEY, session) : localStorage.removeItem(AUTH_KEY) }

function encodeUtf8(value: string) { return btoa(unescape(encodeURIComponent(value))) }
function decodeUtf8(value: string) { return decodeURIComponent(escape(atob(value))) }
export function createShareUrl(exam: Pick<SavedExam, 'title' | 'questions' | 'durationMinutes'>) {
  const payload = encodeUtf8(JSON.stringify({ title: exam.title, questions: exam.questions, durationMinutes: exam.durationMinutes }))
  return `${window.location.origin}${window.location.pathname}#exam=${encodeURIComponent(payload)}`
}
export function readSharedExam(): { title: string; questions: PlatformQuestion[]; durationMinutes?: number } | null {
  const match = window.location.hash.match(/(?:^|#)exam=([^&]+)/)
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeUtf8(decodeURIComponent(match[1])))
    if (!parsed?.title || !Array.isArray(parsed.questions) || !parsed.questions.length) return null
    return parsed
  } catch { return null }
}

export async function cloudRequest<T>(path: string, body: unknown, session?: AuthSession | null): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}) }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Tài khoản online chưa được cấu hình.')
  return payload as T
}
