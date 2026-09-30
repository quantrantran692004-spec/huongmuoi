import { ChangeEvent, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, FileText, Globe2, LoaderCircle, Sparkles, Upload, WandSparkles } from 'lucide-react'

export type GeneratedQuestion = {
  id: number
  category: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

type SourceMode = 'text' | 'file' | 'url'

type QuestionBuilderProps = {
  onBack: () => void
  onStartExam: (questions: GeneratedQuestion[], title: string) => void
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Máy chủ trả về HTTP ${response.status}.`)
  return payload
}

export default function QuestionBuilder({ onBack, onStartExam }: QuestionBuilderProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('text')
  const [sourceText, setSourceText] = useState('')
  const [sourceLabel, setSourceLabel] = useState('Chưa có nguồn')
  const [url, setUrl] = useState('')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState('10')
  const [difficulty, setDifficulty] = useState('Vừa')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState<'extract' | 'scrape' | 'generate' | 'export' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const sourcePreview = useMemo(() => sourceText.length > 300 ? `${sourceText.slice(0, 300)}…` : sourceText, [sourceText])

  function clearFeedback() {
    setError('')
    setNotice('')
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    clearFeedback()
    setLoading('extract')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const payload = await readJson(await fetch('/api/extract-file', { method: 'POST', body: formData }))
      setSourceText(payload.text)
      setSourceLabel(`${payload.filename} · ${payload.chars.toLocaleString('vi-VN')} ký tự`)
      setNotice('Đã đọc nội dung file. Bạn có thể tạo câu hỏi ngay.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đọc file.')
    } finally {
      setLoading(null)
    }
  }

  async function loadUrl() {
    if (!url.trim()) return setError('Hãy nhập URL công khai trước.')
    clearFeedback()
    setLoading('scrape')
    try {
      const payload = await readJson(await fetch('/api/scrape-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }))
      setSourceText(payload.text)
      setSourceLabel(`${payload.title} · ${payload.chars.toLocaleString('vi-VN')} ký tự`)
      setNotice('Đã lấy nội dung trang web. Hãy kiểm tra phần xem trước trước khi tạo.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đọc trang web.')
    } finally {
      setLoading(null)
    }
  }

  async function generateQuestions() {
    clearFeedback()
    if (sourceText.trim().length < 80 && topic.trim().length < 3) return setError('Hãy nhập chủ đề ở Bước 02, hoặc dán nội dung / tải file / đọc URL trước.')
    setLoading('generate')
    try {
      const payload = await readJson(await fetch('/api/generate-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceText, topic, count: Number(count), difficulty }) }))
      setQuestions(payload.questions)
      const modelLabel = Array.isArray(payload.models) ? payload.models.join(' → ') : payload.model
   setNotice(`Đã tạo bộ đề thành công! (${payload.questions.length} câu hỏi)${payload.qualityChecked ? ' · Đã kiểm định đáp án' : ''}`)

    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tạo câu hỏi.')
    } finally {
      setLoading(null)
    }
  }

  async function exportDocx(includeAnswers: boolean) {
    clearFeedback()
    if (!questions.length) return setError('Hãy tạo câu hỏi trước khi xuất Word.')
    setLoading('export')
    try {
      const response = await fetch('/api/export-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: topic || 'Bộ câu hỏi huongmuoi', questions, includeAnswers }) })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Không thể xuất file Word.')
      }
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = includeAnswers ? 'huongmuoi-de-co-dap-an.docx' : 'huongmuoi-de-trong.docx'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
      setNotice(includeAnswers ? 'Đã tải đề có đánh dấu đáp án và phần giải thích.' : 'Đã tải đề trống, không kèm đáp án.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xuất file Word.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="builder-shell">
      <header className="builder-topbar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Về trang chính</button>
        <div className="builder-brand"><span className="builder-brand-mark"><Sparkles size={15} /></span><span>TẠO BỘ ĐỀ KIỂM TRA</span></div>
        <div className="builder-status"><span className="status-dot" /> GROQ CONNECTED</div>
      </header>
      <section className="builder-page">
        <div className="builder-heading"><div className="eyebrow"><span className="eyebrow-dot" /> TẠO BỘ CÂU HỎI CHO BẠN</div><h1>Biến ý tưởng thành<br /><em>một bài thi rõ ràng.</em></h1><p>Dùng file học tập, nội dung bạn dán hoặc một trang web công khai. Không có tài liệu cũng được — chỉ cần nhập chủ đề, Groq sẽ tự xây dựng câu hỏi có đáp án và giải thích.</p></div>
        <div className="builder-grid">
          <section className="source-card builder-card">
            <div className="builder-card-heading"><div><span className="card-kicker">BƯỚC 01</span><h2>Chọn nguồn nội dung</h2></div><FileText size={20} /></div>
            <div className="source-tabs"><button className={sourceMode === 'text' ? 'source-tab source-tab--active' : 'source-tab'} onClick={() => setSourceMode('text')}><FileText size={15} /> Dán văn bản</button><button className={sourceMode === 'file' ? 'source-tab source-tab--active' : 'source-tab'} onClick={() => setSourceMode('file')}><Upload size={15} /> Thêm file</button><button className={sourceMode === 'url' ? 'source-tab source-tab--active' : 'source-tab'} onClick={() => setSourceMode('url')}><Globe2 size={15} /> Quét URL</button></div>
            {sourceMode === 'text' && <textarea className="source-textarea" value={sourceText} onChange={(event) => { setSourceText(event.target.value); setSourceLabel('Nội dung đã dán') }} placeholder="Dán nội dung bài học, tài liệu hoặc ghi chú vào đây…" aria-label="Nội dung nguồn" />}
            {sourceMode === 'file' && <label className="file-drop"><input type="file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} /><Upload size={27} /><strong>{loading === 'extract' ? 'Đang đọc file…' : 'Chọn TXT, PDF hoặc DOCX'}</strong><span>Tối đa 10 MB · Nội dung được xử lý ở backend</span>{sourceLabel !== 'Chưa có nguồn' && <small><CheckCircle2 size={14} /> {sourceLabel}</small>}</label>}
            {sourceMode === 'url' && <div className="url-input-wrap"><div className="url-input-row"><Globe2 size={17} /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/bai-viet" onKeyDown={(event) => event.key === 'Enter' && loadUrl()} /><button className="button button--primary" onClick={loadUrl} disabled={loading === 'scrape'}>{loading === 'scrape' ? <LoaderCircle className="spin" size={16} /> : 'Đọc trang'}</button></div><p>Chỉ quét trang HTML công khai, không yêu cầu đăng nhập.</p>{sourceLabel !== 'Chưa có nguồn' && <div className="loaded-source"><CheckCircle2 size={14} /> {sourceLabel}</div>}</div>}
            {sourceText && <div className="source-preview"><div className="source-preview-heading"><span>XEM TRƯỚC NGUỒN</span><strong>{sourceText.length.toLocaleString('vi-VN')} ký tự</strong></div><p>{sourcePreview}</p></div>}
          </section>
          <section className="settings-card builder-card">
            <div className="builder-card-heading"><div><span className="card-kicker">BƯỚC 02</span><h2>Thiết lập bài thi</h2></div><WandSparkles size={20} /></div>
            <label className="field-label">Chủ đề hoặc tên bài<span>Không bắt buộc</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ví dụ: JavaScript cơ bản" /></label>
            <div className="field-row"><label className="field-label">Số câu<select value={count} onChange={(event) => setCount(event.target.value)}>{[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => <option value={value} key={value}>{value} câu</option>)}</select></label><label className="field-label">Độ khó<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Dễ</option><option>Vừa</option><option>Khó</option></select></label></div>
            <div className="ai-note"><Sparkles size={16} /><p><strong>CÂU HỎI VÀ ĐÁP ÁN ĐÃ KIỂM ĐỊNH</strong><br />Chỉ nhập chủ đề cũng đủ. Mỗi câu được rà lại đáp án, lựa chọn trùng và độ mơ hồ trước khi hiển thị.</p></div>
            <button className="button button--primary button--generate" onClick={generateQuestions} disabled={loading === 'generate'}>{loading === 'generate' ? <><LoaderCircle className="spin" size={17} /> Đang tạo câu hỏi…</> : <><Sparkles size={17} /> Tạo bộ đề kiểm tra</>}</button>
          </section>
        </div>
        {(error || notice) && <div className={error ? 'builder-feedback builder-feedback--error' : 'builder-feedback'}>{error || notice}</div>}
        {questions.length > 0 && <section className="generated-section"><div className="generated-heading"><div><span className="card-kicker">BƯỚC 03 · ĐÃ TẠO</span><h2>Bộ câu hỏi của bạn <span>{questions.length}</span></h2><p>Kiểm tra nhanh nội dung trước khi dùng hoặc xuất thành file Word.</p></div><div className="generated-actions"><button className="button button--primary" onClick={() => exportDocx(true)} disabled={loading === 'export'}><Download size={16} /> Xuất có đáp án</button><button className="button button--secondary" onClick={() => exportDocx(false)} disabled={loading === 'export'}>{loading === 'export' ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Xuất đề trống</button><button className="button button--primary" onClick={() => onStartExam(questions, `Bộ đề Thi · ${topic.trim() || sourceLabel}`)}>Dùng để làm bài <Sparkles size={16} /></button></div></div><div className="generated-list">{questions.map((question, index) => <article className="generated-question" key={`${question.id}-${index}`}><div className="generated-number">{String(index + 1).padStart(2, '0')}</div><div className="generated-body"><div className="generated-meta"><span>{question.category}</span><span className="ai-badge"><Sparkles size={11} /> ĐÃ KIỂM TRA</span></div><h3>{question.prompt}</h3><div className="generated-options">{question.options.map((option, optionIndex) => <div className={optionIndex === question.correctIndex ? 'generated-option generated-option--correct' : 'generated-option'} key={option}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{optionIndex === question.correctIndex && <CheckCircle2 size={15} />}</div>)}</div><div className="generated-explanation"><strong>Giải thích:</strong> {question.explanation}</div></div></article>)}</div></section>}
      </section>
    </main>
  )
}
