import { mossAreas, mossKey, mossQuestions } from './moss'

export const localTests = [
  {
    code: 'moss',
    name: 'Test de Moss',
    category: 'Liderazgo y relaciones humanas',
    description: 'Evalua criterio social, supervision, tacto y solucion de problemas interpersonales.',
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
    description: 'Catalogado desde Recursos/examen dos. Listo para cargar reactivos, claves y baremos.',
    durationMinutes: 45,
    questionCount: 102,
    status: 'draft',
    source: 'Recursos/examen dos',
    questions: [],
  },
  {
    code: 'zavic',
    name: 'Zavic',
    category: 'Valores e intereses',
    description: 'Catalogado desde Recursos/examen tres. Pendiente de captura estructurada de cuadernillo e interpretacion.',
    durationMinutes: 25,
    questionCount: 0,
    status: 'draft',
    source: 'Recursos/examen tres',
    questions: [],
  },
  {
    code: '360-lider',
    name: 'Evaluacion 360 lider',
    category: 'Desempeno',
    description: 'Catalogado desde Recursos/un examen. Pensado para evaluadores multiples y reporte consolidado.',
    durationMinutes: 30,
    questionCount: 0,
    status: 'draft',
    source: 'Recursos/un examen',
    questions: [],
  },
]

export function getLocalTest(code) {
  return localTests.find((test) => test.code === code)
}

export function normalizeTest(row) {
  const fallback = getLocalTest(row?.code)
  return {
    ...fallback,
    ...row,
    durationMinutes: row?.duration_minutes ?? fallback?.durationMinutes ?? 0,
    questionCount: row?.question_count ?? fallback?.questionCount ?? row?.questions?.length ?? 0,
    questions: row?.questions?.length ? row.questions : fallback?.questions ?? [],
    key: row?.answer_key || fallback?.key || {},
    areas: row?.areas || fallback?.areas || {},
    status: row?.status || fallback?.status || 'draft',
  }
}
