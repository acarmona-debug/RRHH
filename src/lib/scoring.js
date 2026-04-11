export const CLAVE = {
    1:'c',2:'b',3:'d',4:'b',5:'b',6:'b',7:'b',8:'b',9:'c',10:'c',
    11:'a',12:'c',13:'d',14:'d',15:'d',16:'d',17:'b',18:'d',19:'c',
    20:'b',21:'a',22:'a',23:'a',24:'d',25:'b',26:'c',27:'a',28:'c',
    29:'a',30:'d'
  }
  
  export const AREAS = {
    A: { nombre:'Habilidad en Supervisión',                      reactivos:[2,3,16,18,24,30],  escala:[0,17,34,50,67,84,100] },
    B: { nombre:'Capacidad de Decisión en Relaciones Humanas',   reactivos:[4,6,20,23,29],     escala:[0,20,40,60,80,100] },
    C: { nombre:'Evaluación de Problemas Interpersonales',       reactivos:[7,9,12,14,19,21,26,27], escala:[0,13,25,38,50,63,75,88,100] },
    D: { nombre:'Habilidad para Establecer Relaciones',          reactivos:[1,10,11,13,25],    escala:[0,20,40,60,80,100] },
    E: { nombre:'Sentido Común y Tacto',                         reactivos:[5,8,15,17,22,28],  escala:[0,17,34,50,67,84,100] },
  }
  
  export function calcularScores(respuestas) {
    const scores = {}
    let totalAciertos = 0
    let totalReactivos = 0
  
    for (const [letra, area] of Object.entries(AREAS)) {
      let aciertos = 0
      for (const num of area.reactivos) {
        if (respuestas[num] === CLAVE[num]) aciertos++
      }
      const pct = area.escala[aciertos]
      scores[letra] = { aciertos, pct, nombre: area.nombre }
      totalAciertos += aciertos
      totalReactivos += area.reactivos.length
    }
  
    scores.total = Math.round((totalAciertos / totalReactivos) * 100)
    return scores
  }