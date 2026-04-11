import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const G = {
  glass: 'rgba(255,255,255,0.07)',
  glass2: 'rgba(255,255,255,0.13)',
  border: 'rgba(255,255,255,0.55)',
  borderDim: 'rgba(255,255,255,0.14)',
  text: '#f0f0f2',
  text2: 'rgba(240,240,242,0.50)',
  text3: 'rgba(240,240,242,0.30)',
  font: "'DM Sans', sans-serif",
  mono: 'monospace',
}

const AREAS = {
  A: 'Habilidad en Supervisión',
  B: 'Capacidad de Decisión en Relaciones Humanas',
  C: 'Evaluación de Problemas Interpersonales',
  D: 'Habilidad para Establecer Relaciones',
  E: 'Sentido Común y Tacto',
}

function ScoreBar({ label, pct }) {
  const color = pct >= 70 ? '#5ecb8a' : pct >= 40 ? '#c9913a' : '#c96060'
  return (
    <div style={{ marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
        <span style={{ fontSize:'12px', color:G.text2 }}>{label}</span>
        <span style={{ fontSize:'12px', fontFamily:G.mono, color }}>{pct}%</span>
      </div>
      <div style={{ height:'4px', borderRadius:'99px', background:'rgba(255,255,255,0.08)' }}>
        <div style={{ height:'100%', borderRadius:'99px', background:color, width:`${pct}%`, transition:'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function Results() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: app } = await supabase
        .from('aplicaciones')
        .select('*, resultados(*)')
        .eq('token', token)
        .single()
      setData(app)
      setLoading(false)
    }
    fetch()
  }, [token])

  if (loading) return <Screen><p style={{ color:G.text2 }}>Cargando resultados...</p></Screen>
  if (!data) return <Screen><p style={{ color:'#c96060' }}>Resultados no encontrados.</p></Screen>

  const r = data.resultados?.[0]
  const pendiente = !r

  return (
    <div style={{ minHeight:'100vh', background:'#1a1d23', padding:'32px 20px', fontFamily:G.font, color:G.text }}>
      <div style={{ maxWidth:'760px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <p style={{ fontSize:'11px', color:G.text3, fontFamily:G.mono, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Test de Moss · Resultados</p>
          <h1 style={{ fontSize:'26px', fontWeight:400, letterSpacing:'-0.5px', marginBottom:'4px' }}>{data.nombre}</h1>
          <p style={{ fontSize:'13px', color:G.text2 }}>Puesto: {data.puesto} · {new Date(data.created_at).toLocaleDateString('es-MX')}</p>
        </div>

        {pendiente ? (
          <div style={{ borderRadius:'16px', border:`1px solid ${G.borderDim}`, background:G.glass, padding:'32px', textAlign:'center' }}>
            <p style={{ color:G.text2, fontSize:'14px' }}>El candidato aún no ha completado la evaluación.</p>
          </div>
        ) : (
          <>
            {/* Score total */}
            <div style={{ borderRadius:'16px', border:'1px solid rgba(94,203,138,0.25)', background:'rgba(94,203,138,0.06)', padding:'24px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:'11px', color:'rgba(94,203,138,0.7)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Score total</div>
                <div style={{ fontSize:'42px', fontWeight:300, letterSpacing:'-2px', color:'#5ecb8a' }}>{r.score_total}%</div>
              </div>
              <div style={{ fontSize:'11px', color:G.text3, textAlign:'right', fontFamily:G.mono }}>
                <div>Test de Moss</div>
                <div style={{ marginTop:'4px' }}>{data.puesto}</div>
              </div>
            </div>

            {/* Scores por área */}
            <div style={{ borderRadius:'16px', border:`1px solid ${G.borderDim}`, background:G.glass, backdropFilter:'blur(20px)', padding:'24px', marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'20px' }}>Resultados por área</div>
              <ScoreBar label={AREAS.A} pct={r.score_a} />
              <ScoreBar label={AREAS.B} pct={r.score_b} />
              <ScoreBar label={AREAS.C} pct={r.score_c} />
              <ScoreBar label={AREAS.D} pct={r.score_d} />
              <ScoreBar label={AREAS.E} pct={r.score_e} />
            </div>

            {/* Interpretación IA */}
            <div style={{ borderRadius:'16px', border:`1px solid ${G.borderDim}`, background:G.glass, backdropFilter:'blur(20px)', padding:'24px' }}>
              <div style={{ fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'16px' }}>Interpretación psicológica</div>
              {r.interpretacion ? (
                <p style={{ fontSize:'14px', lineHeight:1.8, color:G.text, whiteSpace:'pre-wrap' }}>{r.interpretacion}</p>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', color:G.text3 }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#c9913a', boxShadow:'0 0 5px #c9913a' }} />
                  <p style={{ fontSize:'13px' }}>Interpretación en proceso... refresca en unos segundos.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#1a1d23', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans', sans-serif" }}>
      {children}
    </div>
  )
}