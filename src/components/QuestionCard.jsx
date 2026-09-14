import { resolverImagenUrl } from '../core/api/imagenes'
import { FEEDBACK } from '../core/feedbackRespuesta'

const LETTERS = ['A', 'B', 'C', 'D']

// ✓ y ✕ DIBUJADOS, no emoji: un emoji lo resuelve la fuente del sistema y sale
// distinto en cada tablet (y en algunas, en color). Estos son dos paths con el
// mismo grosor de trazo y heredan el color del texto del botón.
function Marca({ tipo }) {
  const comun = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  return (
    <svg {...comun} className="w-6 h-6 flex-shrink-0 animate-marca-rebote">
      {tipo === FEEDBACK.correcta ? (
        <path d="M4 12.5 9.5 18 20 6.5" />
      ) : (
        <path d="M6 6l12 12M18 6L6 18" />
      )}
    </svg>
  )
}

// Cómo se pinta una opción. TODAS arrancan en el mismo gris —incluidas
// Verdadero y Falso, que antes venían verde y roja de entrada: ese color no
// decía nada sobre la respuesta y se leía como si una fuera la buena.
//
// El color aparece recién como RESULTADO: verde si acertó, rojo si no, y sólo
// sobre la opción que se tocó. La correcta NO se resalta cuando se erró — eso
// se ve al final, en el repaso.
function estiloOpcion(esElegida, feedback) {
  const gris = 'bg-white border-slate-300 text-slate-800'
  if (!esElegida) return gris

  if (feedback === FEEDBACK.correcta) {
    return 'bg-emerald-600 border-emerald-600 text-white'
  }
  if (feedback === FEEDBACK.incorrecta) {
    return 'bg-red-600 border-red-600 text-white'
  }
  // Elegida pero todavía sin veredicto (corrigiendo, o no se pudo corregir):
  // el gris oscuro de "seleccionada" que la app ya usaba, sin insinuar
  // resultado.
  return 'bg-slate-900 border-slate-900 text-white'
}

export default function QuestionCard({ question, selectedAnswer, feedback, onSelect }) {
  const isTF = question.tipo === 'VERDADERO_FALSO'
  const isImageOpts = question.tipo === 'OPCIONES_IMAGEN'
  const options = isTF ? ['Verdadero', 'Falso'] : question.opciones
  // Una vez tocada una opción no se acepta otra: la respuesta es definitiva.
  const bloqueado = selectedAnswer !== undefined && selectedAnswer !== null
  const marca =
    feedback === FEEDBACK.correcta || feedback === FEEDBACK.incorrecta ? feedback : null

  return (
    <div className="space-y-4">
      {/* whitespace-pre-line: hay enunciados que enumeran pasos en líneas
          aparte (las 5 reglas de oro para trabajo sin tensión, la regla de las
          cuatro "M", las cuatro prohibiciones del vehículo). Sin esto los saltos
          de línea se colapsan y quedan como un párrafo corrido. */}
      <p className="text-slate-900 text-2xl font-semibold leading-snug whitespace-pre-line">{question.texto}</p>
      {question.imagen && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={resolverImagenUrl(question.imagen.url)} alt="Imagen de referencia" className="w-full max-h-64 object-contain" />
        </div>
      )}
      <div className={`grid gap-3 mt-6 ${isTF || isImageOpts ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((opt, i) => {
          if (isImageOpts) {
            // opt es { clave, url }: se MUESTRA la url (resuelta contra el backend)
            // pero se GUARDA/COMPARA la clave — el backend corrige contra la clave
            // cruda de storage (corregir.ts), nunca contra la url armada. Si acá se
            // mandara `opt.url` como respuesta, ninguna quedaría bien y todos
            // desaprobarían siempre.
            const esElegida = selectedAnswer === opt.clave
            const anillo =
              !esElegida
                ? 'border-slate-200'
                : marca === FEEDBACK.correcta
                  ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                  : marca === FEEDBACK.incorrecta
                    ? 'border-red-600 ring-2 ring-red-600/30'
                    : 'border-slate-900 ring-2 ring-slate-900/20'
            return (
              <button
                key={opt.clave}
                onClick={() => onSelect(opt.clave)}
                disabled={bloqueado}
                className={`relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-150 touch-manipulation select-none ${anillo}`}
              >
                <img src={resolverImagenUrl(opt.url)} alt={`Opción ${LETTERS[i]}`} className="w-full h-full object-cover" />
                {/* En una opción de imagen no hay "derecha del texto" donde
                    poner la marca, así que va sobre la esquina, en una pastilla
                    del mismo color que tendría el botón. Mismo ícono y mismo
                    rebote que en las de texto. */}
                {esElegida && marca && (
                  <span
                    className={`absolute top-2 right-2 rounded-full p-1.5 text-white shadow-lg ${
                      marca === FEEDBACK.correcta ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  >
                    <Marca tipo={marca} />
                  </span>
                )}
              </button>
            )
          }

          // Verdadero/Falso y opción múltiple comparten el mismo botón: la única
          // diferencia era el color de arranque de V/F, que ya no existe. Lo que
          // queda distinto es la letra A) B), que en V/F no va.
          const esElegida = selectedAnswer === opt
          return (
            <button
              key={i}
              onClick={() => onSelect(opt)}
              disabled={bloqueado}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-semibold border-2 transition-all duration-150 touch-manipulation select-none ${estiloOpcion(esElegida, feedback)}`}
            >
              {!isTF && <span className="opacity-50">{LETTERS[i]})</span>}
              {/* El texto se lleva todo el ancho sobrante (flex-1) y la marca
                  queda pegada a la derecha del botón. En V/F eso deja además el
                  texto centrado sin necesidad de justify-center, que habría
                  arrastrado la marca al centro junto con la palabra. */}
              <span className={`flex-1 ${isTF ? 'text-center' : 'text-left'}`}>{opt}</span>
              {esElegida && marca && <Marca tipo={marca} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
