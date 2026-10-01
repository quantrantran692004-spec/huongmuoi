import crypto from 'node:crypto'

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

function configured() { return Boolean(supabaseUrl && supabaseAnonKey) }
function authToken(req) { return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() }
function requireConfig() { if (!configured()) throw new Error('Tài khoản online chưa được cấu hình. Hãy dùng Supabase Free và điền SUPABASE_URL, SUPABASE_ANON_KEY ở Render.') }
async function supabase(path, options = {}, token = '') {
  requireConfig()
  const response = await fetch(`${supabaseUrl}${path}`, { ...options, headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || body?.error || `Supabase HTTP ${response.status}`)
  return body
}
function jsonError(res, error) { res.status(422).json({ error: error.message || 'Không thể xử lý tài khoản online.' }) }
function userIdFromToken(token) {
  if (!token) throw new Error('Bạn cần đăng nhập để lưu dữ liệu online.')
  const payload = token.split('.')[1]
  if (!payload) throw new Error('Phiên đăng nhập không hợp lệ.')
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); return data.sub } catch { throw new Error('Phiên đăng nhập không hợp lệ.') }
}

export function registerCloudRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return res.status(400).json({ error: 'Hãy nhập email hợp lệ và mật khẩu từ 6 ký tự.' })
      const payload = await supabase('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
      res.json({ accessToken: payload.access_token, refreshToken: payload.refresh_token, email: payload.user?.email, userId: payload.user?.id, message: payload.access_token ? 'Tạo tài khoản thành công.' : 'Hãy kiểm tra email để xác nhận tài khoản.' })
    } catch (error) { jsonError(res, error) }
  })

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      const payload = await supabase('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) })
      res.json({ accessToken: payload.access_token, refreshToken: payload.refresh_token, email: payload.user?.email, userId: payload.user?.id })
    } catch (error) { jsonError(res, error) }
  })

  app.post('/api/cloud/save-exam', async (req, res) => {
    try {
      const token = authToken(req); const userId = userIdFromToken(token); const exam = req.body?.exam
      if (!exam?.title || !Array.isArray(exam.questions)) throw new Error('Bộ đề không hợp lệ.')
      const row = { id: exam.id || crypto.randomUUID(), user_id: userId, title: String(exam.title).slice(0, 160), questions: exam.questions, updated_at: new Date().toISOString() }
      await supabase('/rest/v1/exams?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) }, token)
      res.json({ ok: true, exam: row })
    } catch (error) { jsonError(res, error) }
  })

  app.post('/api/cloud/save-attempt', async (req, res) => {
    try {
      const token = authToken(req); const userId = userIdFromToken(token); const attempt = req.body?.attempt
      if (!attempt?.title) throw new Error('Lần làm bài không hợp lệ.')
      const row = { id: attempt.id || crypto.randomUUID(), user_id: userId, exam_id: attempt.examId || null, title: String(attempt.title).slice(0, 160), score: Number(attempt.score) || 0, correct: Number(attempt.correct) || 0, total: Number(attempt.total) || 0, unanswered: Number(attempt.unanswered) || 0, review: Array.isArray(attempt.review) ? attempt.review : null, completed_at: attempt.completedAt || new Date().toISOString() }
      await supabase('/rest/v1/attempts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }, token)
      res.json({ ok: true, attempt: row })
    } catch (error) { jsonError(res, error) }
  })

  app.post('/api/cloud/history', async (req, res) => {
    try {
      const token = authToken(req); userIdFromToken(token)
      const [exams, attempts] = await Promise.all([
        supabase('/rest/v1/exams?select=*&order=updated_at.desc&limit=50', { method: 'GET' }, token),
        supabase('/rest/v1/attempts?select=*&order=completed_at.desc&limit=100', { method: 'GET' }, token),
      ])
      res.json({ exams, attempts })
    } catch (error) { jsonError(res, error) }
  })
}
