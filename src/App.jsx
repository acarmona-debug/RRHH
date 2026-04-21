import { useEffect, useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { localTests, normalizeTest } from './data/catalog'
import { supabase } from './lib/supabase'
import { resultLevel, scoreGeneric } from './lib/scoring'
import './App.css'

const roles = {
  admin: 'Administrador',
  rrhh: 'RRHH',
  user: 'Usuario',
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function publicLink(path) {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#${path}`
}

function useAuth() {
  const [state, setState] = useState({ loading: true, session: null, profile: null })

  useEffect(() => {
    let mounted = true

    async function loadProfile(session) {
      if (!session?.user) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (data) return data
      const fallback = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email,
        role: 'rrhh',
      }
      await supabase.from('profiles').insert(fallback)
      return fallback
    }

    async function boot() {
      const { data } = await supabase.auth.getSession()
      const profile = await loadProfile(data.session)
      if (mounted) setState({ loading: false, session: data.session, profile })
    }

    boot()
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session)
      if (mounted) setState({ loading: false, session, profile })
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return state
}

function Protected({ auth, children }) {
  if (auth.loading) return <Shell center><Loader text="Cargando sesion..." /></Shell>
  if (!auth.session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const auth = useAuth()

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login auth={auth} />} />
        <Route path="/apply/:token" element={<Apply />} />
        <Route path="/results/:token" element={<Results review={false} />} />
        <Route path="/review/:token" element={<Results review />} />
        <Route path="/admin" element={<Protected auth={auth}><Dashboard auth={auth} /></Protected>} />
        <Route path="/" element={<Navigate to={auth.session ? '/admin' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  )
}

function Login({ auth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (auth.session) return <Navigate to="/admin" replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError('No se pudo iniciar sesion. Revisa correo y contrasena.')
    setBusy(false)
  }

  return (
    <Shell center>
      <form className="login-card" onSubmit={submit}>
        <div>
          <p className="eyebrow">Psicometricos UUC</p>
          <h1>Acceso interno</h1>
          <p className="muted">Ingresa con tu cuenta de administrador o RRHH.</p>
        </div>
        <label>
          Correo
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Contrasena
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Validando...' : 'Entrar'}</button>
      </form>
    </Shell>
  )
}

function Dashboard({ auth }) {
  const [tests, setTests] = useState(localTests)
  const [apps, setApps] = useState([])
  const [users, setUsers] = useState([])
  const [active, setActive] = useState('applications')
  const [form, setForm] = useState({ candidate_name: '', candidate_email: '', position: '', tests: ['moss'] })
  const [newLink, setNewLink] = useState('')
  const [busy, setBusy] = useState(false)

  const canAdmin = auth.profile?.role === 'admin'
  const activeTests = tests.filter((test) => test.status === 'active' && test.questions?.length)

  async function fetchAll() {
    const [{ data: testRows }, { data: appRows }, { data: profileRows }] = await Promise.all([
      supabase.from('tests').select('*').order('name'),
      supabase
        .from('applications')
        .select('*, application_tests(*, tests(*), results(*))')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ])

    if (testRows?.length) setTests(testRows.map(normalizeTest))
    if (appRows) setApps(appRows)
    if (profileRows) setUsers(profileRows)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
  }, [])

  function toggleTest(code) {
    setForm((current) => {
      const next = current.tests.includes(code)
        ? current.tests.filter((item) => item !== code)
        : [...current.tests, code]
      return { ...current, tests: next.length ? next : [code] }
    })
  }

  async function createApplication(event) {
    event.preventDefault()
    if (!form.candidate_name.trim() || !form.position.trim() || !form.tests.length) return
    setBusy(true)
    const applicationToken = token()
    const { data: created, error } = await supabase
      .from('applications')
      .insert({
        token: applicationToken,
        candidate_name: form.candidate_name.trim(),
        candidate_email: form.candidate_email.trim() || null,
        position: form.position.trim(),
        created_by: auth.session.user.id,
      })
      .select()
      .single()

    if (!error && created) {
      const selectedRows = tests
        .filter((test) => form.tests.includes(test.code))
        .map((test) => ({ application_id: created.id, test_id: test.id, status: 'pending' }))
      await supabase.from('application_tests').insert(selectedRows)
      setNewLink(publicLink(`/apply/${applicationToken}`))
      setForm({ candidate_name: '', candidate_email: '', position: '', tests: ['moss'] })
      await fetchAll()
    }
    setBusy(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('applications').update({ status }).eq('id', id)
    await fetchAll()
  }

  async function removeApplication(id) {
    if (!confirm('Eliminar esta aplicacion y sus resultados?')) return
    await supabase.from('applications').delete().eq('id', id)
    await fetchAll()
  }

  return (
    <Shell>
      <header className="topbar">
        <div>
          <p className="eyebrow">Panel de aplicacion</p>
          <h1>Psicometricos UUC</h1>
        </div>
        <div className="account">
          <span>{roles[auth.profile?.role] || 'RRHH'}</span>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={active === 'applications' ? 'is-active' : ''} onClick={() => setActive('applications')}>Aplicaciones</button>
        <button className={active === 'tests' ? 'is-active' : ''} onClick={() => setActive('tests')}>Evaluaciones</button>
        {canAdmin && <button className={active === 'users' ? 'is-active' : ''} onClick={() => setActive('users')}>Usuarios</button>}
      </nav>

      {active === 'applications' && (
        <div className="dashboard-grid">
          <form className="panel" onSubmit={createApplication}>
            <div className="section-head">
              <div>
                <h2>Nueva aplicacion</h2>
                <p>RRHH selecciona exactamente los examenes disponibles para el link.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>Nombre del candidato<input value={form.candidate_name} onChange={(event) => setForm({ ...form, candidate_name: event.target.value })} required /></label>
              <label>Correo del candidato<input value={form.candidate_email} onChange={(event) => setForm({ ...form, candidate_email: event.target.value })} type="email" /></label>
              <label className="span-2">Puesto<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} required /></label>
            </div>
            <div className="test-picker">
              {tests.map((test) => (
                <button key={test.code} type="button" disabled={test.status !== 'active' || !test.questions?.length} className={form.tests.includes(test.code) ? 'selected' : ''} onClick={() => toggleTest(test.code)}>
                  <strong>{test.name}</strong>
                  <span>{test.status === 'active' ? `${test.questionCount} reactivos` : 'En captura'}</span>
                </button>
              ))}
            </div>
            <button className="primary" disabled={busy || !activeTests.length}>{busy ? 'Generando...' : 'Generar link'}</button>
            {newLink && (
              <div className="link-box">
                <code>{newLink}</code>
                <button type="button" className="ghost" onClick={() => navigator.clipboard.writeText(newLink)}>Copiar</button>
              </div>
            )}
          </form>

          <ApplicationTable apps={apps} onArchive={(id) => updateStatus(id, 'archived')} onRestore={(id) => updateStatus(id, 'pending')} onDelete={removeApplication} />
        </div>
      )}

      {active === 'tests' && <TestsPanel tests={tests} />}
      {active === 'users' && canAdmin && <UsersPanel users={users} />}
    </Shell>
  )
}

function ApplicationTable({ apps, onArchive, onRestore, onDelete }) {
  return (
    <section className="panel wide">
      <div className="section-head">
        <div>
          <h2>Aplicaciones</h2>
          <p>Seguimiento operativo de links, avance y resultados.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Puesto</th>
              <th>Pruebas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const completed = app.application_tests?.filter((item) => item.status === 'completed').length || 0
              const total = app.application_tests?.length || 0
              return (
                <tr key={app.id}>
                  <td><strong>{app.candidate_name}</strong><span>{app.candidate_email || 'Sin correo'}</span></td>
                  <td>{app.position}</td>
                  <td>{completed}/{total} completadas</td>
                  <td><span className={`pill ${app.status}`}>{app.status}</span></td>
                  <td className="actions">
                    <a href={publicLink(`/apply/${app.token}`)} target="_blank" rel="noreferrer">Link</a>
                    <a href={publicLink(`/results/${app.token}`)} target="_blank" rel="noreferrer">Resultado</a>
                    <a href={publicLink(`/review/${app.token}`)} target="_blank" rel="noreferrer">Revision</a>
                    {app.status === 'archived' ? <button onClick={() => onRestore(app.id)}>Restaurar</button> : <button onClick={() => onArchive(app.id)}>Archivar</button>}
                    <button className="danger" onClick={() => onDelete(app.id)}>Eliminar</button>
                  </td>
                </tr>
              )
            })}
            {!apps.length && <tr><td colSpan="5" className="empty">Sin aplicaciones todavia.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TestsPanel({ tests }) {
  return (
    <section className="cards">
      {tests.map((test) => (
        <article className="test-card" key={test.code}>
          <div>
            <span className={`pill ${test.status}`}>{test.status === 'active' ? 'Activo' : 'En captura'}</span>
            <h2>{test.name}</h2>
            <p>{test.description}</p>
          </div>
          <dl>
            <div><dt>Categoria</dt><dd>{test.category}</dd></div>
            <div><dt>Reactivos</dt><dd>{test.questionCount || test.questions?.length || 'Pendiente'}</dd></div>
            <div><dt>Fuente</dt><dd>{test.source || 'Base de datos'}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  )
}

function UsersPanel({ users }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Usuarios internos</h2>
          <p>La alta de cuentas se hace en Supabase Auth; aqui se audita el rol operativo.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th></tr></thead>
          <tbody>
            {users.map((user) => <tr key={user.id}><td>{user.full_name || '-'}</td><td>{user.email}</td><td>{roles[user.role] || user.role}</td></tr>)}
            {!users.length && <tr><td colSpan="3" className="empty">Sin perfiles visibles.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Apply() {
  const { token: applicationToken } = useParams()
  const [state, setState] = useState({ loading: true, application: null, items: [] })
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select('*, application_tests(*, tests(*))')
        .eq('token', applicationToken)
        .maybeSingle()
      const items = data?.application_tests?.map((item) => ({ ...item, test: normalizeTest(item.tests) })) || []
      setState({ loading: false, application: data, items })
    }
    load()
  }, [applicationToken])

  const current = state.items[index]
  const test = current?.test
  const pendingItems = state.items.filter((item) => item.status !== 'completed')
  const currentAnswers = answers[current?.id] || {}
  const progress = test?.questions?.length ? Object.keys(currentAnswers).length / test.questions.length : 0
  const allDone = state.items.length > 0 && pendingItems.length === 0

  async function submitCurrent() {
    if (!current || Object.keys(currentAnswers).length < test.questions.length) return
    setSubmitting(true)
    const score = scoreGeneric(test, currentAnswers)
    await supabase.from('responses').upsert({
      application_test_id: current.id,
      answers: currentAnswers,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'application_test_id' })
    await supabase.from('results').upsert({
      application_test_id: current.id,
      score_total: score.total,
      score_payload: score,
      interpretation: buildInterpretation(test, score),
    }, { onConflict: 'application_test_id' })
    await supabase.from('application_tests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', current.id)

    const nextItems = state.items.map((item) => item.id === current.id ? { ...item, status: 'completed' } : item)
    const remaining = nextItems.filter((item) => item.status !== 'completed')
    if (!remaining.length) await supabase.from('applications').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', state.application.id)
    setState({ ...state, items: nextItems, application: { ...state.application, status: remaining.length ? 'pending' : 'completed' } })
    setIndex(Math.max(0, nextItems.findIndex((item) => item.status !== 'completed')))
    setSubmitting(false)
  }

  if (state.loading) return <Shell center><Loader text="Cargando evaluacion..." /></Shell>
  if (!state.application) return <Shell center><Message title="Link invalido" text="No encontramos una aplicacion vigente con este token." /></Shell>
  if (allDone) return <Shell center><Message title="Evaluacion completada" text={`Gracias ${state.application.candidate_name}. RRHH ya puede revisar tus resultados.`} /></Shell>
  if (!test?.questions?.length) return <Shell center><Message title="Evaluacion no disponible" text="El link existe, pero la prueba asignada aun no tiene reactivos configurados." /></Shell>

  return (
    <Shell narrow>
      <header className="candidate-head">
        <div>
          <p className="eyebrow">{test.name}</p>
          <h1>Hola, {state.application.candidate_name}</h1>
          <p className="muted">Puesto: {state.application.position}</p>
        </div>
        <span className="counter">{index + 1}/{state.items.length}</span>
      </header>
      <div className="progress"><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="questions">
        {test.questions.map((question) => (
          <Question
            key={question.n}
            question={question}
            value={currentAnswers[String(question.n)]}
            onChange={(value) => setAnswers((bag) => ({ ...bag, [current.id]: { ...(bag[current.id] || {}), [String(question.n)]: value } }))}
          />
        ))}
      </div>
      <button className="submit-test" disabled={submitting || progress < 1} onClick={submitCurrent}>
        {progress < 1 ? `Faltan ${test.questions.length - Object.keys(currentAnswers).length} respuestas` : submitting ? 'Guardando...' : 'Enviar prueba'}
      </button>
    </Shell>
  )
}

function Question({ question, value, onChange }) {
  return (
    <article className="question">
      <p><span>{question.n}.</span>{question.text}</p>
      <div>
        {question.options.map((option, index) => {
          const letter = ['a', 'b', 'c', 'd', 'e'][index]
          return (
            <button key={letter} className={value === letter ? 'selected' : ''} onClick={() => onChange(letter)}>
              <b>{letter})</b>{option}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function Results({ review }) {
  const { token: applicationToken } = useParams()
  const [state, setState] = useState({ loading: true, application: null })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select('*, application_tests(*, tests(*), results(*), responses(*))')
        .eq('token', applicationToken)
        .maybeSingle()
      setState({ loading: false, application: data })
    }
    load()
  }, [applicationToken])

  if (state.loading) return <Shell center><Loader text="Cargando resultados..." /></Shell>
  if (!state.application) return <Shell center><Message title="No encontrado" text="No encontramos resultados para este token." /></Shell>

  return (
    <Shell narrow>
      <header className="candidate-head">
        <div>
          <p className="eyebrow">{review ? 'Revision de respuestas' : 'Resultados'}</p>
          <h1>{state.application.candidate_name}</h1>
          <p className="muted">Puesto: {state.application.position}</p>
        </div>
        <Link className="ghost link" to="/admin">Panel</Link>
      </header>
      <div className="result-list">
        {state.application.application_tests?.map((item) => (
          <ResultCard key={item.id} item={item} review={review} />
        ))}
      </div>
    </Shell>
  )
}

function ResultCard({ item, review }) {
  const test = normalizeTest(item.tests)
  const result = item.results?.[0]
  const response = item.responses?.[0]
  const payload = result?.score_payload
  const level = resultLevel(result?.score_total || 0)

  return (
    <article className="result-card">
      <div className="result-top">
        <div>
          <h2>{test.name}</h2>
          <p>{test.category}</p>
        </div>
        {result ? <span className={`score ${level.color}`}>{result.score_total}</span> : <span className="pill pending">Pendiente</span>}
      </div>
      {result && (
        <>
          <p className="interpretation">{result.interpretation || payload?.message}</p>
          {payload?.areas && <AreaBars areas={payload.areas} />}
        </>
      )}
      {review && response && <AnswerReview test={test} answers={response.answers || {}} />}
    </article>
  )
}

function AreaBars({ areas }) {
  return (
    <div className="bars">
      {Object.entries(areas).map(([code, area]) => (
        <div key={code}>
          <label><span>{area.name}</span><b>{area.pct}%</b></label>
          <div><span style={{ width: `${area.pct}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

function AnswerReview({ test, answers }) {
  return (
    <div className="answer-review">
      {test.questions.map((question) => {
        const selected = answers[String(question.n)]
        const correct = test.key?.[question.n]
        return (
          <div key={question.n}>
            <strong>{question.n}</strong>
            <span>{selected || '-'}</span>
            {correct && <em className={selected === correct ? 'ok' : 'bad'}>{correct}</em>}
          </div>
        )
      })}
    </div>
  )
}

function buildInterpretation(test, score) {
  if (test.code !== 'moss') return score.message || 'Resultado capturado para revision de RRHH.'
  const level = resultLevel(score.total).label.toLowerCase()
  return `Resultado ${level} en Test de Moss (${score.total}%). Revise las areas especificas para decidir entrevista, referencias y ajuste al puesto.`
}

function Shell({ children, center, narrow }) {
  return <main className={`app-shell ${center ? 'center' : ''} ${narrow ? 'narrow' : ''}`}>{children}</main>
}

function Loader({ text }) {
  return <p className="loader">{text}</p>
}

function Message({ title, text }) {
  return <section className="message"><h1>{title}</h1><p>{text}</p></section>
}
