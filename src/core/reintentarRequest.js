// Reintento de un request puntual. OJO, no confundir con `core/reintentos.js`,
// que es otra cosa completamente: aquél es el tope de veces que una persona
// puede RENDIR un módulo. Esto es red.
//
// Existe para la corrección de a una (ver Evaluation.jsx): pasa en el medio de
// un examen, y la mayoría de los fallos de red ahí son momentáneos — un túnel,
// un cambio de antena, la tablet que se durmió medio segundo. Darse por vencido
// al primer intento deja la pregunta sin verificar por algo que se arreglaba
// solo.

// Dos reintentos, con una espera corta y creciente. Corta porque la persona está
// mirando la pantalla esperando el color: en el peor caso esto agrega 1,2 s a
// los tres requests, y recién ahí se avisa que no se pudo.
const ESPERAS = [400, 800]

// Qué se reintenta: sólo lo que puede andar la próxima vez. Un error de red
// (sin `status`, ver client.js) o un 5xx del servidor. Un 4xx NO se reintenta —
// una pregunta que no pertenece a la versión, un token vencido o un body
// inválido van a fallar igual las tres veces, y reintentarlos sólo hace esperar
// de más para llegar al mismo lugar.
export function esReintentable(err) {
  return err?.status === undefined || err.status >= 500
}

export async function conReintentos(fn, esperas = ESPERAS) {
  for (let intento = 0; ; intento++) {
    try {
      return await fn()
    } catch (err) {
      if (intento >= esperas.length || !esReintentable(err)) throw err
      await new Promise((resolve) => setTimeout(resolve, esperas[intento]))
    }
  }
}
