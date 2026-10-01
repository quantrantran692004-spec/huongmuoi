import { useEffect, useMemo, useState } from 'react'
import QuestionBuilder, { GeneratedQuestion } from './QuestionBuilder'
import { AttemptReviewItem, AuthSession, SavedAttempt, SavedExam, cloudRequest, createShareUrl, getAuthSession, readSharedExam, saveAttempt, saveExam } from './platform'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Flag,
  HelpCircle,
  ListChecks,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  TimerReset,
  Trophy,
  XCircle,
} from 'lucide-react'

type Phase = 'welcome' | 'builder' | 'quiz' | 'result'
type Answers = Record<number, number>

type Question = {
  id: number
  category: string
  prompt: string
  context?: string
  options: string[]
  correct: number
  explanation: string
}

type SessionState = {
  answers: Answers
  marked: number[]
  currentIndex: number
  timeLeft: number
  examTitle?: string
}

type Result = {
  score: number
  correct: number
  total: number
  unanswered: number
  categories: { name: string; correct: number; total: number }[]
}

type History = {
  exams: SavedExam[]
  attempts: SavedAttempt[]
}

type HistoryTab = 'attempts' | 'exams'

const EXAM_DURATION = 12 * 60
const SESSION_KEY = 'examflow-session-v1'

const QUESTIONS: Question[] = [
  {
    id: 1,
    category: 'HTML',
    prompt: 'Thẻ HTML nào mô tả phần điều hướng chính của một trang web?',
    options: ['<section>', '<nav>', '<aside>', '<header>'],
    correct: 1,
    explanation: 'Thẻ <nav> dành cho một khu vực chứa các liên kết điều hướng chính hoặc quan trọng.',
  },
  {
    id: 2,
    category: 'CSS',
    prompt: 'Thuộc tính CSS nào giúp một phần tử trở thành flex container?',
    options: ['position: flex', 'layout: flex', 'display: flex', 'flex: container'],
    correct: 2,
    explanation: 'display: flex biến phần tử thành flex container để bố trí các phần tử con theo trục.',
  },
  {
    id: 3,
    category: 'JavaScript',
    prompt: 'Giá trị của biểu thức dưới đây là gì?',
    context: 'const scores = [8, 9, 10]\nscores.filter(score => score > 8).length',
    options: ['1', '2', '3', 'undefined'],
    correct: 1,
    explanation: 'Hai giá trị 9 và 10 lớn hơn 8, nên mảng kết quả có độ dài là 2.',
  },
  {
    id: 4,
    category: 'UX',
    prompt: 'Đâu là cách tốt nhất để cải thiện khả năng tiếp cận của nhóm nút chọn đáp án?',
    options: [
      'Chỉ dùng màu để phân biệt lựa chọn',
      'Ẩn label và tăng kích thước icon',
      'Dùng label rõ ràng, trạng thái focus và vùng bấm đủ lớn',
      'Tắt outline để giao diện gọn hơn',
    ],
    correct: 2,
    explanation: 'Label rõ, focus nhìn thấy và vùng tương tác đủ lớn giúp nhiều nhóm người dùng thao tác tốt hơn.',
  },
  {
    id: 5,
    category: 'HTML',
    prompt: 'Thuộc tính nào giúp mô tả nội dung của một hình ảnh khi ảnh không thể tải?',
    options: ['title', 'alt', 'caption', 'description'],
    correct: 1,
    explanation: 'alt cung cấp văn bản thay thế cho ảnh và hỗ trợ cả trình đọc màn hình.',
  },
  {
    id: 6,
    category: 'JavaScript',
    prompt: 'Từ khóa nào tạo ra một biến có phạm vi block và không thể gán lại?',
    options: ['var', 'let', 'const', 'static'],
    correct: 2,
    explanation: 'const tạo binding không thể gán lại và có phạm vi trong block chứa nó.',
  },
  {
    id: 7,
    category: 'CSS',
    prompt: 'Trong CSS Grid, thuộc tính nào định nghĩa số cột của grid?',
    options: ['grid-template-columns', 'grid-column-count', 'columns', 'grid-layout'],
    correct: 0,
    explanation: 'grid-template-columns định nghĩa track và kích thước của các cột trong grid container.',
  },
  {
    id: 8,
    category: 'UX',
    prompt: 'Khi đồng hồ làm bài sắp hết thời gian, phản hồi nào phù hợp nhất?',
    options: [
      'Không thay đổi gì để tránh gây lo lắng',
      'Hiển thị cảnh báo dễ nhận biết bằng màu, chữ và thông báo rõ',
      'Tự động đổi toàn bộ giao diện sang màu đỏ ngay lập tức',
      'Ẩn đồng hồ để người dùng tập trung hơn',
    ],
    correct: 1,
    explanation: 'Cảnh báo đa kênh, vừa đủ nổi bật, giúp người dùng nhận biết mà không tạo giật mình không cần thiết.',
  },
]

function loadSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState
    if (!parsed || parsed.timeLeft <= 0) return null
    return parsed
  } catch {
    return null
  }
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function calculateResult(answers: Answers, questionSet: Question[]): Result {
  const correct = questionSet.filter((question) => answers[question.id] === question.correct).length
  const unanswered = questionSet.filter((question) => answers[question.id] === undefined).length
  const categories = Array.from(new Set(questionSet.map((question) => question.category))).map((name) => {
    const questions = questionSet.filter((question) => question.category === name)
    return {
      name,
      total: questions.length,
      correct: questions.filter((question) => answers[question.id] === question.correct).length,
    }
  })
  return {
    score: Math.round((correct / questionSet.length) * 100),
    correct,
    total: questionSet.length,
    unanswered,
    categories,
  }
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="huongmuoi">
      <span className="brand-mark" aria-hidden="true"><i>&lt;</i><b>/</b><i>&gt;</i></span>
      {!compact && <span className="brand-name">huong<span>muoi</span></span>}
    </div>
  )
}

function App() {
  const restored = useMemo(() => loadSession(), [])
  const shared = useMemo(() => readSharedExam(), [])
  const [phase, setPhase] = useState<Phase>(restored || shared ? 'quiz' : 'welcome')
  const [examTitle, setExamTitle] = useState(restored?.examTitle || shared?.title || 'Bài thi mẫu · Nền tảng Web')
  const [questionSet, setQuestionSet] = useState<Question[]>(shared?.questions?.map((question) => ({ ...question })) || QUESTIONS)
  const [currentIndex, setCurrentIndex] = useState(restored?.currentIndex ?? 0)
  const [answers, setAnswers] = useState<Answers>(restored?.answers ?? {})
  const [marked, setMarked] = useState<number[]>(restored?.marked ?? [])
  const [timeLeft, setTimeLeft] = useState(restored?.timeLeft ?? EXAM_DURATION)
  const [result, setResult] = useState<Result | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [wasAutoSubmitted, setWasAutoSubmitted] = useState(false)
  const [currentExamId, setCurrentExamId] = useState('')
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getAuthSession())
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [history, setHistory] = useState<History | null>(null)
  const [historyTab, setHistoryTab] = useState<HistoryTab>('attempts')
  const [reviewAttempt, setReviewAttempt] = useState<SavedAttempt | null>(null)

  const currentQuestion = questionSet[currentIndex]
  const answeredCount = Object.keys(answers).length
  const progress = Math.round((answeredCount / questionSet.length) * 100)
  const isUrgent = timeLeft <= 60

  useEffect(() => {
    if (phase !== 'quiz') return
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ answers, marked, currentIndex, timeLeft, examTitle }))
  }, [answers, currentIndex, examTitle, marked, phase, timeLeft])

  useEffect(() => {
    if (phase !== 'quiz') return
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0) {
      submitExam(true)
    }
  }, [phase, timeLeft])

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  async function enterFullscreen() {
    if (document.fullscreenElement) return
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen can be blocked by browser policy; the exam remains usable.
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Keep the regular layout available when fullscreen is unavailable.
    }
  }

  function startExam(generatedQuestions: GeneratedQuestion[] = [], title = 'Bài thi mẫu · Nền tảng Web') {
    const nextQuestionSet: Question[] = generatedQuestions.length
      ? generatedQuestions.map((question, index) => ({ id: index + 1, category: question.category, prompt: question.prompt, options: question.options, correct: question.correctIndex, explanation: question.explanation }))
      : QUESTIONS
    setQuestionSet(nextQuestionSet)
    setExamTitle(title)
    if (generatedQuestions.length && authSession) {
      const saved = saveExam({ title, questions: nextQuestionSet })
      setCurrentExamId(saved.id)
      if (authSession) void cloudRequest('/api/cloud/save-exam', { exam: saved }, authSession).catch(() => undefined)
    } else setCurrentExamId('')
    sessionStorage.removeItem(SESSION_KEY)
    setAnswers({})
    setMarked([])
    setCurrentIndex(0)
    setTimeLeft(EXAM_DURATION)
    setResult(null)
    setShowReview(false)
    setWasAutoSubmitted(false)
    setPhase('quiz')
    void enterFullscreen()
  }

  function submitExam(autoSubmitted = false) {
    const nextResult = calculateResult(answers, questionSet)
    const review: AttemptReviewItem[] = questionSet.map((question) => ({
      questionId: question.id,
      category: question.category,
      prompt: question.prompt,
      options: question.options,
      selectedIndex: answers[question.id] ?? null,
      correctIndex: question.correct,
      explanation: question.explanation,
    }))
    setResult(nextResult)
    if (authSession) {
      const savedAttempt = saveAttempt({ examId: currentExamId, title: examTitle, score: nextResult.score, correct: nextResult.correct, total: nextResult.total, unanswered: nextResult.unanswered, review })
      void cloudRequest('/api/cloud/save-attempt', { attempt: savedAttempt }, authSession).catch(() => undefined)
    }
    setShowSubmitDialog(false)
    sessionStorage.removeItem(SESSION_KEY)
    setPhase('result')
    setShowReview(true)
    setWasAutoSubmitted(autoSubmitted)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }

  function goHome() {
    sessionStorage.removeItem(SESSION_KEY)
    setShowSubmitDialog(false)
    setShowReview(false)
    setResult(null)
    setPhase('welcome')
  }

  async function exportQuestionSet(includeAnswers: boolean) {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: examTitle, includeAnswers, questions: questionSet.map((question) => ({ ...question, correctIndex: question.correct })) }) })
      if (!response.ok) throw new Error('Không thể xuất đề thi lúc này.')
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = includeAnswers ? 'huongmuoi-de-co-dap-an.docx' : 'huongmuoi-de-trong.docx'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } finally {
      setIsExporting(false)
    }
  }

  async function authenticate() {
    setAuthMessage('Đang xử lý…')
    try {
      const payload = await cloudRequest<AuthSession & { message?: string }>(authMode === 'login' ? '/api/auth/login' : '/api/auth/register', { email: authEmail, password: authPassword })
      if (!payload.accessToken) { setAuthMessage(payload.message || 'Hãy kiểm tra email để xác nhận tài khoản.'); return }
      const session = { accessToken: payload.accessToken, refreshToken: payload.refreshToken, email: payload.email, userId: payload.userId }
      setAuthSession(session); localStorage.setItem('huongmuoi-auth-v1', JSON.stringify(session)); setAuthMessage('Đã đăng nhập. Lịch sử mới sẽ được lưu online.'); setShowAuth(false)
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Không thể đăng nhập.') }
  }

  async function loadHistory() {
    if (!authSession) return setShowAuth(true)
    try {
      const payload = await cloudRequest<{ exams: Array<SavedExam & { updated_at?: string }>; attempts: Array<SavedAttempt & { exam_id?: string | null; completed_at?: string }> }>('/api/cloud/history', {}, authSession)
      setHistory({
        exams: payload.exams.map((exam) => ({ ...exam, updatedAt: exam.updatedAt || exam.updated_at || new Date().toISOString() })),
        attempts: payload.attempts.map((attempt) => ({ ...attempt, examId: attempt.examId || attempt.exam_id || '', completedAt: attempt.completedAt || attempt.completed_at || '' })),
      })
      setHistoryTab('attempts')
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Không thể tải lịch sử.') }
  }

  function formatHistoryDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Thời gian không xác định'
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  function startSavedExam(exam: SavedExam) {
    setHistory(null)
    setQuestionSet(exam.questions.map((question) => ({ ...question })))
    setExamTitle(exam.title)
    setCurrentExamId(exam.id)
    sessionStorage.removeItem(SESSION_KEY)
    setAnswers({})
    setMarked([])
    setCurrentIndex(0)
    setTimeLeft(EXAM_DURATION)
    setResult(null)
    setShowReview(false)
    setWasAutoSubmitted(false)
    setPhase('quiz')
    void enterFullscreen()
  }

  function shareCurrentExam(questions: GeneratedQuestion[], title: string) {
    const link = createShareUrl({ title, questions: questions.map((question, index) => ({ id: index + 1, category: question.category, prompt: question.prompt, options: question.options, correct: question.correctIndex, explanation: question.explanation })) })
    void navigator.clipboard?.writeText(link)
    setAuthMessage('Đã sao chép link chia sẻ vào bộ nhớ tạm.')
  }

  function toggleMarked(questionId: number) {
    setMarked((previous) => previous.includes(questionId)
      ? previous.filter((id) => id !== questionId)
      : [...previous, questionId])
  }

  function selectAnswer(optionIndex: number) {
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: optionIndex }))
  }

  if (phase === 'builder') {
    return <QuestionBuilder onBack={() => setPhase('welcome')} onStartExam={(generatedQuestions, title) => startExam(generatedQuestions, title)} />
  }

  if (phase === 'welcome') {
    return (
      <main className="app-shell app-shell--welcome">
        <header className="topbar topbar--welcome">
          <AppLogo />
          <div className="topbar-note"><LockKeyhole size={15} /> Phiên làm bài riêng tư</div>
        </header>
        <section className="welcome-layout">
          <div className="welcome-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> KHÔNG GIAN ÔN LUYỆN &amp; THI ONLINE</div>
            <h1>huongmuoi<br /><em>Học chắc, thi tốt.</em></h1>
            <p className="welcome-lede">Một không gian gọn gàng để bạn luyện tập, kiểm tra kiến thức và nhìn thấy tiến bộ của mình qua từng câu hỏi.</p>
            <button className="button button--primary button--large" onClick={() => startExam()}>
              Bắt đầu bài thi mẫu <ArrowRight size={18} />
            </button>
            <div className="welcome-trust"><CheckCircle2 size={16} /> Không cần đăng nhập · Tự động lưu trong phiên</div>
            <button className="builder-entry" onClick={() => setPhase('builder')}><Sparkles size={15} /> Tạo bộ đề kiểm tra <ArrowRight size={14} /></button>
            <div className="account-actions"><button className="button button--ghost" onClick={() => setShowAuth(true)}>{authSession ? `Đã đăng nhập: ${authSession.email || 'tài khoản'}` : 'Đăng nhập để lưu lịch sử online'}</button>{authSession && <button className="button button--secondary" onClick={loadHistory}>Xem lịch sử</button>}</div>
          </div>
          <div className="welcome-card-wrap welcome-card-wrap--portrait">
            <div className="floating-label floating-label--top"><Sparkles size={14} /> Sẵn sàng chưa?</div>
            <div className="welcome-portrait-frame">
              <img src="/huongmuoi-banner.webp" alt="huongmuoi — học chắc, thi tốt" />
              <div className="portrait-caption"><span className="portrait-caption-kicker">HUONGMUOI EXAM SPACE</span><strong>Làm bài tập trung.<br />Hiểu bài sâu hơn.</strong><span className="portrait-caption-note"><BookOpen size={14} /> Trắc nghiệm · Theo dõi tiến độ</span></div>
            </div>
            <div className="floating-label floating-label--bottom"><span className="mini-avatar">H</span> Tiến bộ từng câu một</div>
          </div>
        </section>
        <footer className="welcome-footer"><span>© 2024 huongmuoi</span><span>Thiết kế cho sự tập trung <span className="footer-symbol">✦</span></span></footer>
        {showAuth && <div className="dialog-backdrop" role="presentation" onClick={() => setShowAuth(false)}><div className="submit-dialog auth-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>{authMode === 'login' ? 'Đăng nhập huongmuoi' : 'Tạo tài khoản'}</h2><p>Chỉ tài khoản đã đăng nhập mới lưu bộ đề và lịch sử online trên nhiều thiết bị.</p><input className="auth-input" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" /><input className="auth-input" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mật khẩu từ 6 ký tự" /><div className="dialog-actions"><button className="button button--ghost" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Tạo tài khoản' : 'Đã có tài khoản'}</button><button className="button button--primary" onClick={authenticate}>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button></div>{authMessage && <div className="builder-feedback">{authMessage}</div>}</div></div>}
        {history && <div className="dialog-backdrop" role="presentation" onClick={() => setHistory(null)}><div className="submit-dialog history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" onClick={(event) => event.stopPropagation()}><div className="history-dialog-header"><div><span className="card-kicker">KHÔNG GIAN CỦA BẠN</span><h2 id="history-title">Lịch sử học tập</h2><p>Theo dõi kết quả và tiếp tục các bộ đề đã lưu.</p></div><div className="history-dialog-icon"><BarChart3 size={21} /></div></div><div className="history-summary"><div><strong>{history.exams.length}</strong><span>BỘ ĐỀ ĐÃ LƯU</span></div><div><strong>{history.attempts.length}</strong><span>LẦN LÀM BÀI</span></div><div><strong>{history.attempts.length ? Math.round(history.attempts.reduce((sum, attempt) => sum + attempt.score, 0) / history.attempts.length) : '—'}</strong><span>ĐIỂM TRUNG BÌNH</span></div></div><div className="history-tabs" role="tablist"><button className={historyTab === 'attempts' ? 'history-tab history-tab--active' : 'history-tab'} role="tab" aria-selected={historyTab === 'attempts'} onClick={() => setHistoryTab('attempts')}><BarChart3 size={15} /> Kết quả gần đây <b>{history.attempts.length}</b></button><button className={historyTab === 'exams' ? 'history-tab history-tab--active' : 'history-tab'} role="tab" aria-selected={historyTab === 'exams'} onClick={() => setHistoryTab('exams')}><BookOpenCheck size={15} /> Bộ đề của tôi <b>{history.exams.length}</b></button></div><div className="history-list">{historyTab === 'attempts' ? (history.attempts.length ? history.attempts.slice(0, 8).map((attempt) => <article className="history-row" key={attempt.id}><div className="history-row-heading"><div><span className="history-row-kicker">KẾT QUẢ LÀM BÀI</span><strong>{attempt.title}</strong></div><span className="history-date"><CalendarDays size={13} /> {formatHistoryDate(attempt.completedAt)}</span></div><div className="history-row-stats"><span className="history-score">{attempt.score}/100 điểm</span><span>{attempt.correct}/{attempt.total} câu đúng</span><span>{attempt.unanswered} câu chưa trả lời</span></div><div className="history-row-actions"><button className="history-action" onClick={() => attempt.review?.length && setReviewAttempt(attempt)} disabled={!attempt.review?.length} title={attempt.review?.length ? 'Xem lại từng câu trả lời' : 'Lần làm bài cũ chưa có dữ liệu chi tiết'}><BookOpenCheck size={13} /> {attempt.review?.length ? 'Xem chi tiết' : 'Chưa có chi tiết'}</button>{attempt.examId ? <button className="history-action" onClick={() => { const exam = history.exams.find((item) => item.id === attempt.examId); if (exam) startSavedExam(exam); else setHistoryTab('exams') }}><Play size={13} /> Làm lại bộ đề</button> : <button className="history-action" onClick={() => { setHistory(null); startExam() }}><RotateCcw size={13} /> Làm lại bài mẫu</button>}</div></article>) : <div className="history-empty"><BarChart3 size={25} /><strong>Chưa có kết quả nào</strong><span>Hãy làm một bài thi để xem tiến bộ của bạn tại đây.</span></div>) : (history.exams.length ? history.exams.map((exam) => <article className="history-row" key={exam.id}><div className="history-row-heading"><div><span className="history-row-kicker">BỘ ĐỀ ĐÃ LƯU</span><strong>{exam.title}</strong></div><span className="history-date"><CalendarDays size={13} /> {formatHistoryDate(exam.updatedAt)}</span></div><div className="history-row-stats"><span>{exam.questions.length} câu hỏi</span><span>{new Set(exam.questions.map((question) => question.category)).size} chủ đề</span></div><div className="history-row-actions"><button className="history-action history-action--primary" onClick={() => startSavedExam(exam)}><Play size={13} /> Bắt đầu làm bài</button></div></article>) : <div className="history-empty"><BookOpenCheck size={25} /><strong>Chưa có bộ đề nào</strong><span>Tạo bộ đề đầu tiên từ tài liệu hoặc chủ đề của bạn.</span></div>)}</div><button className="button button--primary history-close" onClick={() => setHistory(null)}>Đóng</button></div></div>}
        {reviewAttempt && <div className="dialog-backdrop" role="presentation" onClick={() => setReviewAttempt(null)}><div className="submit-dialog attempt-review-dialog" role="dialog" aria-modal="true" aria-labelledby="attempt-review-title" onClick={(event) => event.stopPropagation()}><div className="history-dialog-header"><div><span className="card-kicker">CHI TIẾT KẾT QUẢ</span><h2 id="attempt-review-title">Xem lại câu trả lời</h2><p>{reviewAttempt.title} · {reviewAttempt.score}/100 điểm</p></div><div className="history-dialog-icon"><BookOpenCheck size={21} /></div></div><div className="attempt-review-list">{reviewAttempt.review?.map((item, index) => { const unanswered = item.selectedIndex === null; const correct = item.selectedIndex === item.correctIndex; const selectedLabel = unanswered ? 'Chưa chọn đáp án' : item.options[item.selectedIndex as number]; return <article className={`attempt-review-item ${correct ? 'attempt-review-item--correct' : unanswered ? 'attempt-review-item--unanswered' : 'attempt-review-item--wrong'}`} key={`${reviewAttempt.id}-${item.questionId}`}><div className="attempt-review-top"><span className="attempt-review-number">{String(index + 1).padStart(2, '0')}</span><span className="attempt-review-category">{item.category}</span><strong>{correct ? 'Đúng' : unanswered ? 'Chưa trả lời' : 'Sai'}</strong></div><h3>{item.prompt}</h3><div className="attempt-review-options">{item.options.map((option, optionIndex) => { const isCorrectOption = optionIndex === item.correctIndex; const isWrongSelection = item.selectedIndex === optionIndex && !isCorrectOption; return <div className={`attempt-review-option ${isCorrectOption ? 'attempt-review-option--correct' : isWrongSelection ? 'attempt-review-option--wrong' : ''}`} key={`${item.questionId}-${optionIndex}`}><span className="attempt-review-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{isCorrectOption && <CheckCircle2 size={17} />}{isWrongSelection && <XCircle size={17} />}</div>})}</div><p className="attempt-review-explanation"><b>Giải thích:</b> {item.explanation}</p></article>})}</div><button className="button button--primary history-close" onClick={() => setReviewAttempt(null)}>Đóng chi tiết</button></div></div>}
      </main>
    )
  }

  if (phase === 'result' && result) {
    return (
      <main className="app-shell app-shell--result">
        <header className="topbar">
          <AppLogo />
          <div className="topbar-right"><span className="session-pill"><CheckCircle2 size={15} /> Đã hoàn thành</span><button className="icon-button" aria-label="Trợ giúp"><HelpCircle size={20} /></button></div>
        </header>
        <section className="result-page">
          <div className="result-heading"><div className="eyebrow"><span className="eyebrow-dot" /> KẾT QUẢ PHIÊN LÀM BÀI</div><h1>{wasAutoSubmitted ? 'Hết giờ — bài đã được nộp.' : 'Bài thi đã được nộp.'}</h1><p>{wasAutoSubmitted ? 'Thời gian đã về 00:00 nên hệ thống tự động khóa bài và chấm điểm.' : 'Đây là bản tóm tắt nhanh để bạn biết điểm mạnh và bước tiếp theo.'}</p></div>
          <div className="result-grid">
            <section className="score-card">
              <div className="score-ring" style={{ '--score': `${result.score * 3.6}deg` } as React.CSSProperties}><div className="score-ring-inner"><strong>{result.score}</strong><span>/ 100</span></div></div>
              <div className="score-caption">ĐIỂM TỔNG</div>
              <div className="score-message"><Trophy size={18} /> {result.score >= 80 ? 'Nền tảng vững vàng' : result.score >= 60 ? 'Đang đi đúng hướng' : 'Cùng ôn lại một chút nhé'}</div>
            </section>
            <section className="result-detail-card">
              <div className="result-stat-row"><div className="result-stat"><span className="stat-icon stat-icon--green"><Check size={17} /></span><div><strong>{result.correct}/{result.total}</strong><span>CÂU ĐÚNG</span></div></div><div className="result-stat"><span className="stat-icon stat-icon--coral"><XCircle size={17} /></span><div><strong>{result.total - result.correct - result.unanswered}</strong><span>CÂU SAI</span></div></div><div className="result-stat"><span className="stat-icon stat-icon--yellow"><Clock3 size={17} /></span><div><strong>{result.unanswered}</strong><span>CHƯA TRẢ LỜI</span></div></div><div className="result-stat"><span className="stat-icon stat-icon--blue"><Flag size={17} /></span><div><strong>{formatTime(EXAM_DURATION - timeLeft)}</strong><span>THỜI GIAN LÀM</span></div></div></div>
              <div className="card-divider" />
              <div className="analysis-header"><div><h3>Phân tích theo chủ đề</h3><p>Bạn đang làm tốt ở đâu?</p></div><ListChecks size={21} /></div>
              <div className="category-list">{result.categories.map((category) => <div className="category-item" key={category.name}><div className="category-label"><span>{category.name}</span><strong>{category.correct}/{category.total}</strong></div><div className="category-track"><span style={{ width: `${(category.correct / category.total) * 100}%` }} /></div></div>)}</div>
            </section>
          </div>
          <section className="review-section">
            <div className="review-header"><div><h2>Xem lại câu trả lời</h2><p>Đọc lại giải thích để ghi nhớ lâu hơn.</p></div><button className="button button--secondary" onClick={() => setShowReview((previous) => !previous)}>{showReview ? 'Thu gọn' : 'Mở xem lại'} <ChevronRight size={16} className={showReview ? 'rotate-90' : ''} /></button></div>
            {showReview && <div className="review-list">{questionSet.map((question, index) => { const selected = answers[question.id]; const isAnswered = selected !== undefined; const isCorrect = selected === question.correct; const reviewClass = isCorrect ? 'review-item--correct' : isAnswered ? 'review-item--wrong' : 'review-item--unanswered'; return <div className={`review-item ${reviewClass}`} key={question.id}><div className="review-number">{String(index + 1).padStart(2, '0')}</div><div className="review-content"><div className="review-meta"><span>{question.category}</span>{isCorrect ? <span className="review-status review-status--correct"><CheckCircle2 size={14} /> Chính xác</span> : isAnswered ? <span className="review-status review-status--wrong"><XCircle size={14} /> Cần xem lại</span> : <span className="review-status review-status--unanswered"><Flag size={14} /> Chưa trả lời</span>}</div><h3>Câu {index + 1}: {question.prompt}</h3><p><strong>Bạn chọn:</strong> {isAnswered ? question.options[selected] : 'Chưa trả lời'}</p><p><strong>Đáp án đúng:</strong> {question.options[question.correct]}</p><p className="review-explanation"><strong>Giải thích:</strong> {question.explanation}</p></div></div> })}</div>}
          </section>
          <div className="result-actions"><button className="button button--primary" onClick={() => startExam()}><RotateCcw size={17} /> Làm lại bài thi</button><button className="button button--secondary" onClick={() => exportQuestionSet(true)} disabled={isExporting}><Download size={17} /> {isExporting ? 'Đang xuất Word…' : 'Xuất có đáp án'}</button><button className="button button--ghost" onClick={() => exportQuestionSet(false)} disabled={isExporting}><Download size={17} /> Xuất đề trống</button><button className="button button--ghost" onClick={goHome}><ArrowLeft size={17} /> Về trang chính</button><span>Muốn tiến bộ nhanh hơn? Hãy ghi chú lại những câu bạn còn phân vân.</span></div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell app-shell--quiz">
      <header className="topbar">
        <AppLogo />
          <div className="quiz-header-meta"><div className="quiz-title"><span>Bộ Đề Thi:

            </span><strong>{examTitle}</strong></div><div className={`timer ${isUrgent ? 'timer--urgent' : ''}`} aria-live="polite" aria-label={`Thời gian còn lại ${formatTime(timeLeft)}`}><Clock3 size={17} /><span>{formatTime(timeLeft)}</span>{isUrgent && <small>SẮP HẾT GIỜ</small>}</div><div className="topbar-separator" /><span className="quiz-code">Muối Là Vịt</span><button className="fullscreen-button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình'}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{isFullscreen ? 'Thoát fullscreen' : 'Toàn màn hình'}</span></button><button className="icon-button" aria-label="Trợ giúp"><HelpCircle size={20} /></button></div>
      </header>
      <div className="quiz-progress"><span style={{ width: `${progress}%` }} /></div>
      <section className="quiz-layout">
        <aside className="question-rail">
          <div className="rail-heading"><div><span className="eyebrow eyebrow--small">TIẾN ĐỘ CỦA BẠN</span><strong>{answeredCount} <small>/ {questionSet.length} câu đã trả lời</small></strong></div><span className="progress-percent">{progress}%</span></div>
          <div className="rail-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="question-nav-label"><span>CÂU HỎI</span><span><i className="legend-dot legend-dot--answered" /> Đã làm <i className="legend-dot legend-dot--marked" /> Đánh dấu</span></div>
          <div className="question-grid">{questionSet.map((question, index) => <button key={question.id} className={`question-number ${index === currentIndex ? 'question-number--current' : ''} ${answers[question.id] !== undefined ? 'question-number--answered' : ''} ${marked.includes(question.id) ? 'question-number--marked' : ''}`} onClick={() => setCurrentIndex(index)} aria-label={`Đến câu ${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span>{marked.includes(question.id) && <Flag size={11} fill="currentColor" />}</button>)}</div>
          <div className="rail-note"><TimerReset size={17} /><p><strong>Mẹo nhỏ</strong><br />Đánh dấu câu bạn chưa chắc để quay lại trước khi nộp bài.</p></div>
          <button className="submit-link" onClick={() => setShowSubmitDialog(true)}>Nộp bài <ArrowRight size={16} /></button>
        </aside>
        <section className="question-stage">
          <div className="question-stage-top"><div><div className="question-breadcrumb"><span>CÂU {String(currentIndex + 1).padStart(2, '0')}</span><span className="breadcrumb-line" /><span>{currentQuestion.category}</span>{marked.includes(currentQuestion.id) && <span className="marked-badge"><Flag size={13} fill="currentColor" /> Đã đánh dấu</span>}</div><div className="question-set-label">Bộ đề : <strong>{examTitle}</strong></div></div><button className="submit-now-button" onClick={() => setShowSubmitDialog(true)}><CheckCircle2 size={15} /> Nộp bài</button></div>
          <div className="question-heading"><h1>Câu {currentIndex + 1}: {currentQuestion.prompt}</h1><p>Chọn một đáp án đúng nhất.</p></div>
          {currentQuestion.context && <pre className="code-context"><code>{currentQuestion.context}</code></pre>}
          <div className="option-list">{currentQuestion.options.map((option, index) => { const isSelected = answers[currentQuestion.id] === index; return <button className={`option-card ${isSelected ? 'option-card--selected' : ''}`} key={option} onClick={() => selectAnswer(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="option-text">{option}</span><span className="option-check">{isSelected ? <CheckCircle2 size={21} /> : <span className="empty-radio" />}</span></button> })}</div>
          <div className="question-footer"><button className={`mark-button ${marked.includes(currentQuestion.id) ? 'mark-button--active' : ''}`} onClick={() => toggleMarked(currentQuestion.id)}><Flag size={16} fill={marked.includes(currentQuestion.id) ? 'currentColor' : 'none'} /> {marked.includes(currentQuestion.id) ? 'Bỏ đánh dấu' : 'Đánh dấu để xem lại'}</button><div className="nav-buttons"><button className="button button--ghost" onClick={() => setCurrentIndex((previous) => Math.max(0, previous - 1))} disabled={currentIndex === 0}><ChevronLeft size={17} /> Trước</button>{currentIndex < questionSet.length - 1 ? <button className="button button--primary" onClick={() => setCurrentIndex((previous) => Math.min(questionSet.length - 1, previous + 1))}>Câu tiếp theo <ChevronRight size={17} /></button> : <button className="button button--primary" onClick={() => setShowSubmitDialog(true)}>Xem kết quả <ArrowRight size={17} /></button>}</div></div>
        </section>
      </section>
      {showSubmitDialog && <div className="dialog-backdrop" role="presentation" onClick={() => setShowSubmitDialog(false)}><div className="submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(event) => event.stopPropagation()}><div className="dialog-icon"><Flag size={21} /></div><h2 id="submit-title">Nộp bài ngay?</h2><p>{answeredCount < questionSet.length ? `Bạn còn ${questionSet.length - answeredCount} câu chưa trả lời. Bạn vẫn có thể nộp bài và xem kết quả ngay.` : 'Bạn đã hoàn thành tất cả câu hỏi. Sẵn sàng xem kết quả chưa?'}</p><div className="dialog-actions"><button className="button button--ghost" onClick={() => setShowSubmitDialog(false)}>Tiếp tục làm</button><button className="button button--primary" onClick={() => submitExam(false)}>Nộp bài</button></div></div></div>}
    </main>
  )
}

export default App
