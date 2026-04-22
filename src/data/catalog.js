import { mossAreas, mossKey, mossQuestions } from './moss'
import { leader360Areas, leader360Questions, pf16Questions, zavicAreas, zavicQuestions } from './psychometrics'

export const localTests = [
  {
    code: 'moss',
    name: 'Test de Moss',
    category: 'Liderazgo y relaciones humanas',
    description: 'Evalúa criterio social, supervisión, tacto y solución de problemas interpersonales.',
    durationMinutes: 25,
    questionCount: 30,
    status: 'active',
    source: 'Transcrito en la app actual',
    questions: mossQuestions,
    key: mossKey,
    areas: mossAreas,
  },
  {
    code: '16pf-102',
    name: '16 PF 102 items',
    category: 'Personalidad',
    description: 'Cuestionario de 102 reactivos capturado desde Recursos/examen dos.',
    durationMinutes: 45,
    questionCount: 102,
    status: 'active',
    source: 'Recursos/examen dos/16 PF CUESTINARIO DE PERSONALIDAD 102 ITEMS.doc',
    questions: pf16Questions,
    areas: {
      A: { name: 'Respuestas A' },
      B: { name: 'Respuestas B' },
      C: { name: 'Respuestas C' },
    },
  },
  {
    code: 'zavic',
    name: 'Zavic',
    category: 'Valores e intereses',
    description: 'Ranking de valores e intereses capturado desde Recursos/examen tres.',
    durationMinutes: 25,
    questionCount: 20,
    status: 'active',
    source: 'Recursos/examen tres/Cuadernillo.doc y zavicinterpreta.doc',
    questions: zavicQuestions,
    areas: zavicAreas,
  },
  {
    code: '360-lider',
    name: 'Evaluacion 360 lider',
    category: 'Desempeno',
    description: 'Evaluación 360 a líderes en escala 0 a 10 capturada desde Recursos/un examen.',
    durationMinutes: 30,
    questionCount: 40,
    status: 'active',
    source: 'Recursos/un examen/evaluacion-de 360 desempeño-lider.xls',
    questions: leader360Questions,
    areas: leader360Areas,
  },
]

export function getLocalTest(code) {
  return localTests.find((test) => test.code === code)
}

export function normalizeTest(row) {
  const fallback = getLocalTest(row?.code)
  const useFallbackQuestions = !row?.questions?.length && fallback?.questions?.length
  return {
    ...fallback,
    ...row,
    durationMinutes: row?.duration_minutes ?? fallback?.durationMinutes ?? 0,
    questionCount: useFallbackQuestions ? fallback.questionCount : row?.question_count ?? fallback?.questionCount ?? row?.questions?.length ?? 0,
    questions: useFallbackQuestions ? fallback.questions : row?.questions?.length ? row.questions : [],
    key: row?.answer_key || fallback?.key || {},
    areas: row?.areas || fallback?.areas || {},
    status: useFallbackQuestions ? fallback.status : row?.status || fallback?.status || 'draft',
  }
}
