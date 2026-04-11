import { useState, useEffect } from 'react'
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

const card = {
  borderRadius:'16px', border:`1px solid ${G.border}`,
  background: G.glass, backdropFilter:'blur(20px)',
  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.16)',
  overflow:'hidden',
}

const inputStyle = {
  width:'100%', boxSizing:'border-box',
  padding:'9px 12px', borderRadius:'8px',
  border:`1px solid ${G.border}`,
  background:'rgba(255,255,255,0.07)',
  color:'#f0f0f2', fontSize:'13px',
  fontFamily:"'DM Sans', sans-serif",
  outline:'none',
}

const statusColor = {
  pendiente: { color:'#c9913a', bg:'rgba(201,145,58,0.08)', border:'rgba(201,145,58,0.25)' },
  completado: { color:'#5ecb8a', bg:'rgba(94,203,138,0.08)', border:'rgba(94,203,138,0.25)' },
}

function generateToken() {
  return Math.random().toString(36).substring(2,10) + Date.now().toString(36)
}

export default function Admin() {
  const [apps, setApps] = useState([])
  const [nombre, setNombre] = useState('')
  const [puesto, setPuesto] = useState('')
  const [saving, setSaving] = useState(false)
  const [newLink, setNewLink] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchApps() }, [])

  async function fetchApps() {
    const { data } = await supabase.from('aplicaciones').select('*').order('created_at', { ascending: false })
    setApps(data || [])
  }

  async function handleCreate() {
    if (!nombre.trim() || !puesto.trim()) return
    setSaving(true)
    const token = generateToken()
    const { error } = await supabase.from('aplicaciones').insert([{ token, nombre, puesto }])
    if (!error) {
      const link = `${window.location.origin}/apply/${token}`
      setNewLink(link)
      setNombre('')
      setPuesto('')
      await fetchApps()
    }
    setSaving(false)
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleArchivar(id) {
    await supabase.from('aplicaciones').update({ status: 'archivado' }).eq('id', id)
    await fetchApps()
  }
  
  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta evaluación permanentemente?')) return
    await supabase.from('respuestas').delete().eq('aplicacion_id', id)
    await supabase.from('resultados').delete().eq('aplicacion_id', id)
    await supabase.from('aplicaciones').delete().eq('id', id)
    await fetchApps()
  }

  return (
    <div style={{ minHeight:'100vh', background:'#1a1d23', padding:'32px 36px', fontFamily:G.font, color:G.text }}>
      <div style={{ maxWidth:'900px', margin:'0 auto' }}>

        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontSize:'26px', fontWeight:400, letterSpacing:'-0.5px', marginBottom:'4px' }}>Panel RRHH</h1>
          <p style={{ fontSize:'13px', color:G.text2 }}>Gestión de evaluaciones psicométricas · Test de Moss</p>
        </div>

        {/* Crear nueva */}
        <div style={{ ...card, padding:'24px', marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'16px' }}>Nueva evaluación</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <div>
              <label style={{ fontSize:'11px', color:G.text2, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Nombre del candidato</label>
              <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:G.text2, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Puesto al que aplica</label>
              <input style={inputStyle} value={puesto} onChange={e => setPuesto(e.target.value)} placeholder="Ej. Gerente de Obra" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving}
            style={{ padding:'9px 20px', borderRadius:'10px', border:`1px solid ${G.border}`, background:G.glass2, color:G.text, fontSize:'13px', cursor:'pointer', fontFamily:G.font }}>
            {saving ? 'Generando...' : '+ Generar link'}
          </button>

          {newLink && (
            <div style={{ marginTop:'16px', padding:'14px 16px', borderRadius:'10px', border:`1px solid rgba(94,203,138,0.25)`, background:'rgba(94,203,138,0.08)' }}>
              <div style={{ fontSize:'11px', color:'#5ecb8a', marginBottom:'6px' }}>Link generado — comparte con el candidato</div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <code style={{ fontSize:'12px', color:G.text, flex:1, wordBreak:'break-all', fontFamily:G.mono }}>{newLink}</code>
                <button onClick={() => copyLink(newLink)}
                  style={{ padding:'6px 14px', borderRadius:'8px', border:`1px solid ${G.border}`, background:G.glass2, color:G.text, fontSize:'12px', cursor:'pointer', fontFamily:G.font, flexShrink:0 }}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista */}
        <div style={{ fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'10px' }}>Evaluaciones</div>
        <div style={{ ...card }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${G.borderDim}` }}>
                {['Candidato','Puesto','Status','Fecha','Acciones'].map(h => (
                  <th key={h} style={{ padding:'14px 16px', textAlign:'left', fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
  {apps.filter(a => a.status !== 'archivado').map((a, i, arr) => {
    const st = statusColor[a.status] || statusColor.pendiente
    const applyLink = `${window.location.origin}/apply/${a.token}`
    const resultsLink = `${window.location.origin}/results/${a.token}`
    return (
      <tr key={a.id} style={{ borderBottom: i < arr.length-1 ? `1px solid ${G.borderDim}` : 'none' }}>
        <td style={{ padding:'12px 16px', fontSize:'13px', fontWeight:500 }}>{a.nombre}</td>
        <td style={{ padding:'12px 16px', fontSize:'13px', color:G.text2 }}>{a.puesto}</td>
        <td style={{ padding:'12px 16px' }}>
          <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'99px', border:`1px solid ${st.border}`, background:st.bg, color:st.color, fontFamily:G.mono }}>{a.status}</span>
        </td>
        <td style={{ padding:'12px 16px', fontSize:'11px', color:G.text3, fontFamily:G.mono }}>
          {new Date(a.created_at).toLocaleDateString('es-MX')}
        </td>
        <td style={{ padding:'12px 16px' }}>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <a href={a.status === 'completado' ? `${window.location.origin}/review/${a.token}` : applyLink}
  target="_blank" rel="noreferrer"
  style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid ${G.borderDim}`, background:'transparent', color:G.text2, fontSize:'11px', cursor:'pointer', fontFamily:G.mono, textDecoration:'none' }}>
  {a.status === 'completado' ? 'Ver respuestas' : 'Ver test'}
</a>
            {a.status === 'completado' && (
              <a href={resultsLink} target="_blank" rel="noreferrer"
                style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid rgba(94,203,138,0.25)`, background:'rgba(94,203,138,0.08)', color:'#5ecb8a', fontSize:'11px', cursor:'pointer', fontFamily:G.mono, textDecoration:'none' }}>
                Ver resultado
              </a>
            )}
            <button onClick={() => handleArchivar(a.id)}
              style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid rgba(201,145,58,0.25)`, background:'rgba(201,145,58,0.08)', color:'#c9913a', fontSize:'11px', cursor:'pointer', fontFamily:G.font }}>
              Archivar
            </button>
            <button onClick={() => handleEliminar(a.id)}
              style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid rgba(201,96,96,0.25)`, background:'rgba(201,96,96,0.08)', color:'#c96060', fontSize:'11px', cursor:'pointer', fontFamily:G.font }}>
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    )
  })}
  {apps.filter(a => a.status !== 'archivado').length === 0 && (
    <tr><td colSpan={5} style={{ padding:'24px', textAlign:'center', color:G.text3, fontSize:'13px' }}>Sin evaluaciones aún</td></tr>
  )}
</tbody>
          </table>
        </div>

      {/* Archivados */}
{apps.filter(a => a.status === 'archivado').length > 0 && (
  <div style={{ marginTop:'32px' }}>
    <div style={{ fontSize:'11px', fontWeight:500, color:G.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'10px' }}>Archivados</div>
    <div style={{ ...card, opacity:0.6 }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${G.borderDim}` }}>
            {['Candidato','Puesto','Fecha','Acciones'].map(h => (
              <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:'11px', fontWeight:500, color:G.text2, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apps.filter(a => a.status === 'archivado').map((a, i, arr) => {
            const resultsLink = `${window.location.origin}/results/${a.token}`
            return (
              <tr key={a.id} style={{ borderBottom: i < arr.length-1 ? `1px solid ${G.borderDim}` : 'none' }}>
                <td style={{ padding:'12px 16px', fontSize:'13px', fontWeight:500, color:G.text2 }}>{a.nombre}</td>
                <td style={{ padding:'12px 16px', fontSize:'13px', color:G.text3 }}>{a.puesto}</td>
                <td style={{ padding:'12px 16px', fontSize:'11px', color:G.text3, fontFamily:G.mono }}>
                  {new Date(a.created_at).toLocaleDateString('es-MX')}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:'6px' }}>
                    {a.status === 'archivado' && (
                      <a href={resultsLink} target="_blank" rel="noreferrer"
                        style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid ${G.borderDim}`, background:'transparent', color:G.text3, fontSize:'11px', fontFamily:G.mono, textDecoration:'none' }}>
                        Ver resultado
                      </a>
                    )}
                    <button onClick={() => handleEliminar(a.id)}
                      style={{ padding:'5px 10px', borderRadius:'8px', border:`1px solid rgba(201,96,96,0.25)`, background:'rgba(201,96,96,0.08)', color:'#c96060', fontSize:'11px', cursor:'pointer', fontFamily:G.font }}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)}

      </div>
    </div>
  )
}