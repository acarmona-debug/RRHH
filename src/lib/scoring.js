import { mossAreas, mossKey } from '../data/moss'

export const CLAVE = mossKey
export const AREAS = mossAreas

export function scoreMoss(answers) {
  const scores = {}
  let totalHits = 0
  let totalQuestions = 0

  for (const [code, area] of Object.entries(mossAreas)) {
    let hits = 0
    for (const questionNumber of area.questions) {
      if (answers[String(questionNumber)] === mossKey[questionNumber]) hits += 1
    }
    scores[code] = {
      hits,
      pct: area.scale[hits] ?? 0,
      name: area.name,
    }
    totalHits += hits
    totalQuestions += area.questions.length
  }

  return {
    type: 'percent',
    total: Math.round((totalHits / totalQuestions) * 100),
    hits: totalHits,
    totalQuestions,
    areas: scores,
  }
}

export function scoreGeneric(test, answers) {
  if (test.code === 'moss') return scoreMoss(answers)
  if (test.code === '16pf-102') return score16pf(test, answers)
  if (test.code === 'zavic') return scoreZavic(test, answers)
  if (test.code === '360-lider') return score360(test, answers)

  const answerKey = test.key || {}
  const keyEntries = Object.entries(answerKey)
  if (!keyEntries.length) {
    return {
      type: 'raw',
      total: Object.keys(answers).length,
      answered: Object.keys(answers).length,
      message: 'Resultado capturado. Falta configurar clave/baremos para interpretacion automatica.',
      areas: {},
    }
  }

  const hits = keyEntries.filter(([number, correct]) => answers[String(number)] === correct).length
  return {
    type: 'percent',
    total: Math.round((hits / keyEntries.length) * 100),
    hits,
    totalQuestions: keyEntries.length,
    areas: {},
  }
}

function score16pf(test, answers) {
  const counts = { A: 0, B: 0, C: 0 }
  for (const value of Object.values(answers)) {
    const key = String(value || '').toUpperCase()
    if (counts[key] !== undefined) counts[key] += 1
  }
  const answered = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const totalQuestions = test.questions?.length || 102
  return {
    type: 'distribution',
    total: Math.round((answered / totalQuestions) * 100),
    answered,
    totalQuestions,
    areas: {
      A: { name: 'Respuestas A', hits: counts.A, pct: Math.round((counts.A / totalQuestions) * 100) },
      B: { name: 'Respuestas B', hits: counts.B, pct: Math.round((counts.B / totalQuestions) * 100) },
      C: { name: 'Respuestas C', hits: counts.C, pct: Math.round((counts.C / totalQuestions) * 100) },
    },
    message: '16 PF capturado. La hoja fuente incluida contiene baremos de conversion, pero no una matriz completa de factores legible para interpretacion automatica sin captura manual adicional.',
  }
}

function scoreZavic(test, answers) {
  const areas = Object.fromEntries(Object.entries(test.areas || {}).map(([code, area]) => [code, {
    name: area.name,
    raw: 0,
    max: 0,
    pct: 0,
  }]))

  for (const question of test.questions || []) {
    const ranked = answers[String(question.n)] || {}
    question.options.forEach((option, index) => {
      const code = option.area
      const rank = Number(ranked[['a', 'b', 'c', 'd'][index]] || 0)
      if (!areas[code]) areas[code] = { name: code, raw: 0, max: 0, pct: 0 }
      areas[code].raw += rank
      areas[code].max += 4
    })
  }

  for (const area of Object.values(areas)) {
    area.pct = area.max ? Math.round((area.raw / area.max) * 100) : 0
    area.hits = area.raw
  }

  const total = Math.round(Object.values(areas).reduce((sum, area) => sum + area.pct, 0) / Math.max(1, Object.keys(areas).length))
  return {
    type: 'zavic',
    total,
    areas,
    message: 'Perfil Zavic calculado con ranking 1 a 4 por situacion, conforme al cuadernillo fuente.',
  }
}

function score360(test, answers) {
  const areas = Object.fromEntries(Object.entries(test.areas || {}).map(([code, area]) => [code, {
    name: area.name,
    raw: 0,
    count: 0,
    pct: 0,
  }]))

  for (const question of test.questions || []) {
    const value = Number(answers[String(question.n)])
    if (Number.isNaN(value)) continue
    const code = question.area || 'general'
    if (!areas[code]) areas[code] = { name: code, raw: 0, count: 0, pct: 0 }
    areas[code].raw += value
    areas[code].count += 1
  }

  for (const area of Object.values(areas)) {
    const avg = area.count ? area.raw / area.count : 0
    area.hits = Number(avg.toFixed(1))
    area.pct = Math.round(avg * 10)
  }

  const answered = Object.keys(answers).length
  const totalQuestions = test.questions?.length || 0
  const average = totalQuestions ? Object.values(answers).reduce((sum, value) => sum + Number(value || 0), 0) / totalQuestions : 0
  return {
    type: 'scale',
    total: Math.round(average * 10),
    average: Number(average.toFixed(1)),
    answered,
    totalQuestions,
    areas,
    message: `Promedio 360: ${average.toFixed(1)} de 10.`,
  }
}

export function resultLevel(score) {
  if (score >= 80) return { label: 'Alto', color: 'good' }
  if (score >= 60) return { label: 'Adecuado', color: 'good' }
  if (score >= 40) return { label: 'Medio', color: 'warn' }
  return { label: 'Bajo', color: 'danger' }
}
