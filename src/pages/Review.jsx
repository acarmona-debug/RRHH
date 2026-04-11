import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CLAVE, AREAS } from '../lib/scoring'

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

const PREGUNTAS = [
  { n:1,  t:'Se le ha asignado un puesto en una gran empresa. La mejor forma de establecer relaciones amistosas y cordiales con sus nuevos compañeros será:', ops:['Evitando tomar nota de los errores en que incurran.','Hablando bien de ellos al jefe.','Mostrando interés en el trabajo de ellos.','Pidiéndoles les permitan hacer los trabajos que usted puede hacer mejor.'] },
  { n:2,  t:'Tiene usted un empleado muy eficiente pero que constantemente se queja del trabajo, sus quejas producen mal efecto en los demás empleados, lo mejor sería:', ops:['Pedir a los demás empleados que no hagan caso.','Averiguar la causa de esa actitud y procurar su modificación.','Cambiarlo de departamento donde quede a cargo de otro jefe.','Permitirle planear lo más posible acerca de su trabajo.'] },
  { n:3,  t:'Un empleado de 60 años de edad que ha sido leal a la empresa durante 25 años se queja del exceso de trabajo. Lo mejor sería:', ops:['Decirle que vuelva a su trabajo porque si no será desvinculado.','Despedirlo, substituyéndolo por alguien más joven.','Darle un aumento de sueldo que evite que continúe quejándose.','Aminorar su trabajo.'] },
  { n:4,  t:'Uno de los socios, sin autoridad sobre usted le ordena haga algo en forma bien distinta de lo que planeaba. ¿Qué haría usted?', ops:['Acatar la orden y no armar mayor revuelo.','Ignorar las indicaciones y hacerlo según había planeado.','Decirle que esto no es asunto que a usted le interesa y que usted hará las cosas a su modo.','Decirle que lo haga él mismo.'] },
  { n:5,  t:'Usted visita a un amigo íntimo que ha estado enfermo por algún tiempo. Lo mejor sería:', ops:['Platicarle sus diversiones recientes.','Platicarle nuevas cosas referentes a sus amigos mutuos.','Comentar su enfermedad.','Enfatizar lo mucho que le apena verle enfermo.'] },
  { n:6,  t:'Trabaja usted en una industria y su jefe quiere que tome un curso relacionado con su carrera pero que sea compatible con el horario de su trabajo. Lo mejor sería:', ops:['Continuar normalmente su carrera e informar al jefe si pregunta.','Explicar la situación u obtener su opinión en cuanto a la importancia relativa de ambas situaciones.','Dejar la escuela en relación a los intereses del trabajo.','Asistir en forma alterna y no hacer comentarios.'] },
  { n:7,  t:'Un agente viajero con 15 años de antigüedad decide, presionado por su familia sentar raíces. Se le cambia a las oficinas generales. Es de esperar que:', ops:['Guste de los descansos del trabajo de oficina.','Se sienta inquieto por la rutina de la oficina.','Busque otro trabajo.','Resulte muy ineficiente en el trabajo de oficina.'] },
  { n:8,  t:'Tiene dos invitados a cenar, el uno radical y el otro conservador. Surge una acalorada discusión respecto a la política. Lo mejor sería:', ops:['Tomar partido.','Intentar cambiar de tema.','Intervenir dando los propios puntos de vista y mostrar donde ambos pecan de extremosos.','Pedir cambien de tema para evitar mayor discusión.'] },
  { n:9,  t:'Un joven invita a una dama al teatro, al llegar se percata de que ha olvidado la cartera. Sería mejor:', ops:['Tratar de obtener boletos dejando el reloj en prenda.','Buscar algún amigo a quien pedir prestado.','Decidir de acuerdo con ella lo procedente.','Dar una excusa plausible para ir a casa por dinero.'] },
  { n:10, t:'Usted ha tenido experiencia como vendedor y acaba de conseguir de una tienda un empleo. La mejor forma de relacionarse con los empleados del departamento sería:', ops:['Permitirle hacer la mayoría de las ventas por unos días en tanto observa sus métodos.','Tratar de instituir los métodos que anteriormente le fueron útiles.','Adaptarse mejor a las condiciones y aceptar consejos de sus compañeros.','Pedir al jefe todo el consejo necesario.'] },
  { n:11, t:'Es usted un joven empleado que va a comer con una maestra a quien conoce superficialmente. Lo mejor sería iniciar la conversación acerca de:', ops:['Algún tópico de actualidad.','Algún aspecto interesante de su propio trabajo.','Las tendencias actuales en el terreno docente.','Las sociedades de padres de familia.'] },
  { n:12, t:'Una señora de especiales méritos que por largo tiempo ha dirigido trabajos benéficos dejando las labores de su casa a cargo de la servidumbre, se cambia a otra población. Es de esperarse que ella:', ops:['Se sienta insatisfecha de su nuevo hogar.','Se interese más por los trabajos domésticos.','Intervenga poco a poco en la vida de la comunidad, continuando así sus intereses.','Adopte nuevos intereses en la nueva comunidad.'] },
  { n:13, t:'Quiere pedirle un favor a un conocido con quien tiene poca confianza. La mejor forma de lograrlo sería:', ops:['Haciéndole creer que será él quien se beneficie más.','Enfatice la importancia que para usted tiene que se le conceda.','Ofrecer algo de retribución.','Decir que lo que desea en forma breve indicando los motivos.'] },
  { n:14, t:'Un joven de 24 años gasta bastante tiempo y dinero en diversiones, solo ha hecho ver que así no logrará el éxito en el trabajo. Probablemente cambie sus costumbres si:', ops:['Sus hábitos nocturnos lesionan su salud.','Sus amigos enfatizan el daño que se hace a sí mismo.','Su jefe se da cuenta y lo previene.','Se interesa en el desarrollo de alguna fase de su trabajo.'] },
  { n:15, t:'Tras de haber hecho un buen número de favores a un amigo, este empieza a dar por hecho que usted será quien le resuelva todas sus pequeñas dificultades. La mejor forma de readaptar la situación sin ofenderle sería:', ops:['Explicar el daño que se está causando.','Pedir a un amigo mutuo que trate de arreglar las cosas.','Ayudarle una vez más pero de tal manera que sienta que mejor hubiera sido no haberlo solicitado.','Darle una excusa para no seguir ayudándole.'] },
  { n:16, t:'Una persona recién ascendida a un mejor puesto de autoridad lograría mejor sus metas y la buena voluntad de los empleados:', ops:['Tratando de que cada empleado entienda qué es la verdadera eficiencia.','Ascendiendo cuanto antes a quienes considere lo merezcan.','Preguntando confidencialmente a cada empleado en cuanto a los cambios que estiman necesarios.','Seguir los sistemas del anterior jefe y gradualmente hacer los cambios necesarios.'] },
  { n:17, t:'Vive a 15 km. del centro y ha ofrecido llevar de regreso a un amigo a las 16:00 p.m. él lo espera desde las 15:00 y a las 16:00 horas usted se entera que no podrá salir antes de las 17:30, sería mejor:', ops:['Pedirle un taxi.','Explicarle y dejar que él decida.','Pedirle que espere hasta las 17:30 horas.','Proponerle que se lleve su auto.'] },
  { n:18, t:'Es usted un ejecutivo y dos de sus empleados se llevan mal, ambos son eficientes. Lo mejor sería:', ops:['Despedir al menos eficiente.','Dar trabajo en común que a ambos interese.','Hacerles ver el daño que se hacen.','Darles trabajos distintos.'] },
  { n:19, t:'El señor González ha estado conservando su puesto subordinado por 10 años, desempeña su trabajo callada y confidencialmente y se le extrañará cuando se vaya. De obtener el trabajo en otra empresa, muy probablemente:', ops:['Asuma fácilmente responsabilidad como supervisor.','Haga ver de inmediato su valor.','Sea lento para abrirse las necesarias oportunidades.','Renuncie ante la más ligera crítica de su trabajo.'] },
  { n:20, t:'Va usted a ser maestro de ceremonias, en una cena el próximo sábado día en que por la mañana, debido a enfermedad de su fam. se ve imposibilitado para asistir lo mejor sería:', ops:['Cancelar la cena.','Encontrar quien lo sustituya.','Detallar los planes que tenía y evitarlos.','Enviar una nota explicando la causa de su ausencia.'] },
  { n:21, t:'En igualdad de circunstancias el empleado que mejor se adapta a un nuevo puesto es aquel que:', ops:['Ha sido bueno en puestos anteriores.','Ha tenido éxito durante 10 años en su puesto.','Tiene sus propias ideas e invariablemente se rige por ellas.','Cuenta con una buena recomendación de su jefe anterior.'] },
  { n:22, t:'Un conocido le platica acerca de una afición que él tiene, su conversación le aburre. Lo mejor sería:', ops:['Escuchar de manera cortés, pero aburrida.','Escuchar con fingido interés.','Decirle francamente que el tema no le interesa.','Mirar el reloj con impaciencia.'] },
  { n:23, t:'Es usted un empleado ordinario en una oficina grande. El jefe entra cuando usted lee en vez de trabajar. Lo mejor sería:', ops:['Doblar el periódico y volver a trabajo.','Pretender que obtiene recortes necesarios al trabajo.','Tratar de interesar al jefe leyéndole un encabezado importante.','Seguir leyendo sin mostrar embarazo.'] },
  { n:24, t:'Es usted un maestro de primaria. Camino a la escuela tras de la primera nevada, algunos de sus alumnos lanzan bolas de nieve. Desde el punto de vista de la buena administración escolar, usted debería:', ops:['Castigarle ahí mismo por su indisciplina.','Decirles que de volverlo a hacer los castigará.','Pasar la queja a sus padres.','Tomarlo como broma y no hacer caso al respecto.'] },
  { n:25, t:'Preside el Comité de Mejoras Materiales en su colonia; las últimas reuniones han sido de escasa asistencia. Se mejoraría la asistencia:', ops:['Visitando vecinos prominentes explicándoles los problemas.','Avisar de un programa interesante para la reunión.','Poner avisos en los lugares públicos.','Enviar avisos personales.'] },
  { n:26, t:'Salinas, eficiente, pero de esos que "todo lo saben", critica a Montoya, el jefe opina que la idea de Montoya ahorra tiempo. Probablemente Salinas:', ops:['Pida otro trabajo al jefe.','Lo haga a su modo sin comentarios.','Lo haga con Montoya, pero siga criticándolo.','Lo haga con Montoya, pero mal a propósito.'] },
  { n:27, t:'Un hombre de 64 años tuvo algún éxito cuando joven como político, sus modos directos le han impedido descollar los últimos 20 años, lo más probable es que:', ops:['Persista en su manera de ser.','Cambie para lograr éxito.','Forme un nuevo partido político.','Abandone la política por inmoral.'] },
  { n:28, t:'Es usted un joven que encuentra en la calle a una mujer de más edad a quien apenas conoce y que parece haber estado llorando. Lo mejor sería:', ops:['Preguntarle por qué está triste.','Pasarle el brazo por el hombro y consolarla.','Simular no advertir su pena.','Simular no haberla visto.'] },
  { n:29, t:'Un compañero flojea de tal manera que usted le toca más de lo que le corresponde. La mejor forma de conservar las relaciones sería:', ops:['Explicar el caso al jefe cortésmente.','Cortésmente indicarle que debe hacer lo que le corresponde o que usted se quejará con el jefe.','Hacer tanto como pueda eficientemente y no decir nada del caso al jefe.','Dejar lo suyo y dejar pendiente lo que el compañero no haga.'] },
  { n:30, t:'Se le ha asignado un puesto ejecutivo, en una organización. Para ganar el respeto y la admiración de sus subordinados, sin perjuicio de sus planes, habría que:', ops:['Ceder en todos los pequeños puntos posibles.','Tratar de convencerlos de todas sus ideas.','Ceder parcialmente en todas las cuestiones importantes.','Abogar por muchas reformas.'] },
]

function getArea(n) {
  for (const [letra, area] of Object.entries(AREAS)) {
    if (area.reactivos.includes(n)) return letra
  }
  return null
}

const areaColor = {
  A: '#7eb8f7', B: '#5ecb8a', C: '#c9913a', D: '#b87ef7', E: '#f77eb8'
}

export default function Review() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [respuestas, setRespuestas] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: app } = await supabase
        .from('aplicaciones')
        .select('*, resultados(*)')
        .eq('token', token)
        .single()
      const { data: resp } = await supabase
        .from('respuestas')
        .select('*')
        .eq('aplicacion_id', app?.id)
        .single()
      setData(app)
      const raw = resp?.respuestas || {}
      const normalized = {}
      Object.keys(raw).forEach(k => { normalized[parseInt(k)] = raw[k] })
      setRespuestas(normalized)
      setLoading(false)
      console.log('app:', app)
      console.log('resp:', resp)
      console.log('normalized:', normalized)
    }
    fetch()
  }, [token])

  if (loading) return <Screen><p style={{ color:G.text2 }}>Cargando...</p></Screen>
  if (!data) return <Screen><p style={{ color:'#c96060' }}>No encontrado.</p></Screen>

  const aciertos = Object.keys(CLAVE).filter(n => respuestas[n] === CLAVE[n]).length

  return (
    <div style={{ minHeight:'100vh', background:'#1a1d23', padding:'32px 20px', fontFamily:G.font, color:G.text }}>
      <div style={{ maxWidth:'760px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <p style={{ fontSize:'11px', color:G.text3, fontFamily:G.mono, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Revisión de respuestas · Test de Moss</p>
          <h1 style={{ fontSize:'24px', fontWeight:400, letterSpacing:'-0.5px', marginBottom:'4px' }}>{data.nombre}</h1>
          <p style={{ fontSize:'13px', color:G.text2 }}>Puesto: {data.puesto} · {aciertos}/30 aciertos</p>
        </div>

        {/* Preguntas */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {PREGUNTAS.map(p => {
            const elegida = respuestas[String(p.n)]
            const correcta = CLAVE[p.n]
            const acertó = elegida === correcta
            const area = getArea(p.n)
            const color = areaColor[area]

            return (
              <div key={p.n} style={{
                borderRadius:'14px',
                border:`1px solid ${acertó ? 'rgba(94,203,138,0.25)' : 'rgba(201,96,96,0.25)'}`,
                background: acertó ? 'rgba(94,203,138,0.04)' : 'rgba(201,96,96,0.04)',
                padding:'18px 20px',
              }}>
                {/* Pregunta header */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px', gap:'12px' }}>
                  <p style={{ fontSize:'13px', lineHeight:1.6, color:G.text, flex:1 }}>
                    <span style={{ fontFamily:G.mono, color:G.text3, marginRight:'8px' }}>{p.n}.</span>
                    {p.t}
                  </p>
                  <span style={{ fontSize:'9px', padding:'2px 8px', borderRadius:'99px', border:`1px solid ${color}40`, background:`${color}10`, color, fontFamily:G.mono, flexShrink:0 }}>
                    Área {area}
                  </span>
                </div>

                {/* Opciones */}
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {['a','b','c','d'].map((letra, i) => {
                    const esElegida = elegida === letra
                    const esCorrecta = correcta === letra
                    const esError = esElegida && !acertó

                    let bg = 'transparent'
                    let border = G.borderDim
                    let textColor = G.text3

                    if (esCorrecta) { bg = 'rgba(94,203,138,0.10)'; border = 'rgba(94,203,138,0.4)'; textColor = '#5ecb8a' }
                    if (esError)    { bg = 'rgba(201,96,96,0.10)';  border = 'rgba(201,96,96,0.4)';  textColor = '#c96060' }

                    return (
                      <div key={letra} style={{
                        display:'flex', alignItems:'flex-start', gap:'10px',
                        padding:'8px 12px', borderRadius:'8px',
                        border:`1px solid ${border}`, background:bg,
                      }}>
                        <span style={{ fontFamily:G.mono, fontSize:'11px', color:textColor, flexShrink:0, marginTop:'1px' }}>
                          {esCorrecta ? '✓' : esError ? '✗' : letra})
                        </span>
                        <span style={{ fontSize:'13px', color:textColor, lineHeight:1.5 }}>{p.ops[i]}</span>
                        {esElegida && !acertó && (
                          <span style={{ marginLeft:'auto', fontSize:'10px', color:'#c96060', fontFamily:G.mono, flexShrink:0 }}>elegida</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
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