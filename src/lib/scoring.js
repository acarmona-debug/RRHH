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

export function resultLevel(score) {
  if (score >= 80) return { label: 'Alto', color: 'good' }
  if (score >= 60) return { label: 'Adecuado', color: 'good' }
  if (score >= 40) return { label: 'Medio', color: 'warn' }
  return { label: 'Bajo', color: 'danger' }
}
