import { useEffect, useMemo, useState } from 'react'
import QuestionBuilder, { GeneratedQuestion } from './QuestionBuilder'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
  const [phase, setPhase] = useState<Phase>(restored ? 'quiz' : 'welcome')
  const [examTitle, setExamTitle] = useState(restored?.examTitle || 'Bài thi mẫu · Nền tảng Web')
  const [questionSet, setQuestionSet] = useState<Question[]>(QUESTIONS)
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
    setResult(calculateResult(answers, questionSet))
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
          <div className="quiz-header-meta"><div className="quiz-title"><span>Bộ Đề Thi
            
            </span><strong>{examTitle}</strong></div><div className={`timer ${isUrgent ? 'timer--urgent' : ''}`} aria-live="polite" aria-label={`Thời gian còn lại ${formatTime(timeLeft)}`}><Clock3 size={17} /><span>{formatTime(timeLeft)}</span>{isUrgent && <small>SẮP HẾT GIỜ</small>}</div><div className="topbar-separator" /><span className="quiz-code">BÀI THI #EF-001</span><button className="fullscreen-button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình'}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{isFullscreen ? 'Thoát fullscreen' : 'Toàn màn hình'}</span></button><button className="icon-button" aria-label="Trợ giúp"><HelpCircle size={20} /></button></div>
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

