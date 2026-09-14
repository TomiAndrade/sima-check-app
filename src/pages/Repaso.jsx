import Button from '../components/Button'
import { resolverImagenUrl } from '../core/api/imagenes'

// La opción de una pregunta de imagen es una CLAVE de storage; para mostrarla
// hay que buscar su url entre las opciones que trajo el examen. Si no aparece
// (no debería), se cae a la clave cruda antes que a una imagen rota.
function urlDeClave(pregunta, clave) {
  const opcion = (pregunta.opciones ?? []).find((o) => o?.clave === clave)
  return opcion ? resolverImagenUrl(opcion.url) : null
}

// Una respuesta, en el color del rol que cumple: roja la que se eligió, verde la
// que era. Misma tríada suave que el resto de las superficies de la app
// (fondo -50, borde -200, texto -700), no los tonos saturados de los botones de
// la evaluación: acá se lee, no se toca.
function Respuesta({ pregunta, valor, rotulo, tono }) {
  const colores =
    tono === 'correcta'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-red-50 border-red-200 text-red-800'
  const imagen = pregunta.tipo === 'OPCIONES_IMAGEN' ? urlDeClave(pregunta, valor) : null

  return (
    <div className={`rounded-xl border px-3 py-2 ${colores}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{rotulo}</p>
      {imagen ? (
        <img src={imagen} alt={rotulo} className="mt-2 w-24 h-24 object-cover rounded-lg border border-white/60" />
      ) : (
        <p className="text-base font-semibold leading-snug">{valor ?? 'Sin responder'}</p>
      )}
    </div>
  )
}

/**
 * Repaso de lo que se falló, después de rendir. Se muestra apruebe o no: el
 * objetivo es que la persona se vaya sabiendo lo que no sabía, y eso no depende
 * de si llegó al umbral.
 *
 * No pide nada al backend. Cada pregunta ya se corrigió de a una mientras se
 * rendía (ver Evaluation.jsx), así que el enunciado, lo que eligió y la correcta
 * ya están en memoria — y `GET /sesiones/:id`, que es el único endpoint que
 * devuelve `respuestaCorrecta`, sigue siendo exclusivo del backoffice.
 *
 * `sinVerificar` son las respuestas que no se pudieron corregir en el momento
 * (sin señal, y ni con reintentos). Se avisan arriba de todo porque esta lista
 * es lo único que la persona va a leer sobre su examen: si una de ésas estuvo
 * mal, no está acá, y callarlo hace que el repaso mienta por omisión.
 */
export default function Repaso({ module: mod, incorrectas, sinVerificar = 0, onVolver }) {
  const hayIncorrectas = incorrectas.length > 0
  return (
    // El alto lo pone el LAYOUT (min-h-0 + max-h-full), no un `max-h-[92vh]`
    // propio: el logo y los banners viven arriba de esta card, así que fijarse
    // una fracción del viewport por su cuenta la hacía sumar más que la
    // pantalla y quedar cortada arriba y abajo. Ver el comentario del
    // contenedor en App.jsx. El scroll pasa adentro, en el div de abajo.
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden min-h-0 max-h-full flex flex-col">
      <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex-shrink-0">
        <p className="text-red-600 font-semibold text-sm">{mod.nombre}</p>
        <h2 className="text-slate-900 text-xl font-bold mt-1">
          {!hayIncorrectas
            ? 'No pudimos revisar tu examen'
            : incorrectas.length === 1
              ? 'La pregunta que fallaste'
              : `Las ${incorrectas.length} preguntas que fallaste`}
        </h2>
        {hayIncorrectas && (
          <p className="text-slate-500 text-sm mt-1">Repasá esto antes de volver a rendir.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Ámbar: es una advertencia sobre lo que falta, no un error de la
            persona. Va arriba del listado y no al pie porque condiciona cómo
            hay que leer todo lo de abajo. */}
        {sinVerificar > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-amber-800 text-sm font-semibold leading-snug">
              {sinVerificar === 1
                ? 'Una pregunta no se pudo verificar por problemas de conexión.'
                : `${sinVerificar} preguntas no se pudieron verificar por problemas de conexión.`}
            </p>
            <p className="text-amber-700 text-sm leading-snug mt-1">
              {hayIncorrectas
                ? 'Tu respuesta quedó registrada igual, pero si alguna de ésas estuvo mal no aparece en esta lista.'
                : 'Tus respuestas quedaron registradas igual, pero no pudimos armar el repaso.'}
            </p>
          </div>
        )}
        {incorrectas.map(({ pregunta, respuestaDada, respuestaCorrecta }, i) => (
          <div key={pregunta.id} className="space-y-3">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {/* whitespace-pre-line por lo mismo que en QuestionCard: hay
                  enunciados que enumeran pasos en líneas aparte. */}
              <p className="text-slate-900 font-semibold leading-snug whitespace-pre-line">{pregunta.texto}</p>
            </div>
            {pregunta.imagen && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={resolverImagenUrl(pregunta.imagen.url)} alt="Imagen de referencia" className="w-full max-h-40 object-contain" />
              </div>
            )}
            <div className="space-y-2 pl-10">
              <Respuesta pregunta={pregunta} valor={respuestaDada} rotulo="Respondiste" tono="incorrecta" />
              <Respuesta pregunta={pregunta} valor={respuestaCorrecta} rotulo="Era" tono="correcta" />
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6 pt-4 border-t border-slate-200 flex-shrink-0">
        <Button variant="primary" onClick={onVolver} fullWidth>
          Volver al resultado
        </Button>
      </div>
    </div>
  )
}
