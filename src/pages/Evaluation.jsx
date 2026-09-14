import { useEffect, useRef, useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import ProgressBar from '../components/ProgressBar'
import { FEEDBACK } from '../core/feedbackRespuesta'
import { conReintentos } from '../core/reintentarRequest'

// Cuánto queda el color en pantalla antes de pasar a la pregunta siguiente. Se
// cuenta desde que se PINTA, no desde el toque: la corrección es un request, y
// arrancar el reloj antes dejaría el color 100 ms en pantalla cuando la red
// tarda 900.
const ESPERA_FEEDBACK = 1000
// Cuando no se pudo corregir no hay nada que mirar, así que se avanza casi de
// inmediato en vez de dejar un segundo de gris que parece que se colgó.
const ESPERA_SIN_COLOR = 300

export default function Evaluation({ usuario, module: mod, questions, onCorregir, onFinish, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // Indexado por preguntaId (no por posición): así App.jsx puede armar
  // `respuestas` sin depender de que este componente recorra las preguntas
  // en el mismo orden que examen.preguntas.
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState(null)

  // Las que se fallaron, para el repaso del final. En un ref y no en estado
  // porque nada de esta pantalla se re-renderiza por ellas: se acumulan acá y
  // se leen una sola vez, al terminar.
  const incorrectasRef = useRef([])
  // Cuántas no se pudieron corregir ni después de reintentar. Se cuentan para
  // avisarlo en el repaso: sin esto, una pregunta que se falló y no se pudo
  // verificar simplemente no aparece, y el repaso miente por omisión.
  const sinVerificarRef = useRef(0)
  const timerRef = useRef(null)
  const montadoRef = useRef(true)

  // Un intento se puede cortar a la mitad ("Cancelar"). El flag cubre el caso de
  // que eso pase MIENTRAS se está corrigiendo: sin él, el await termina sobre un
  // componente desmontado y programa un avance —o peor, un onFinish— de una
  // evaluación que ya no existe.
  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [])

  const current = questions[currentIndex]
  const currentAnswer = answers[current.id]
  const isLast = currentIndex === questions.length - 1

  // Tocar una opción ES la respuesta: no hay confirmación ni botón de siguiente.
  // Queda definitiva, se corrige, se pinta un segundo y se avanza solo.
  //
  // POR QUÉ DOS TOQUES RÁPIDOS NO REGISTRAN DOS RESPUESTAS NI SALTEAN UNA
  // PREGUNTA: el índice avanza al FINAL de la espera, no al principio. Durante
  // todo ese rato —el request más el segundo de color— la pregunta en pantalla
  // sigue siendo la misma y ya tiene respuesta, así que el guard de acá abajo
  // ignora cualquier toque, sobre la opción que sea. Y como no se avanzó
  // todavía, tampoco hay forma de que un segundo toque caiga sobre la pregunta
  // siguiente. No hace falta ningún flag extra: el bloqueo sale de que el
  // avance sea lo último que pasa.
  //
  // El guard se chequea contra `answers[current.id]` y no contra un booleano
  // suelto porque la clave es la PREGUNTA — un flag por índice se desincroniza
  // apenas el índice avanza y puede bloquear (o dejar pasar) la equivocada.
  const handleSelect = async (answer) => {
    if (currentAnswer !== undefined) return

    // Se arma el objeto completo acá en vez de leer `answers` después del
    // setState: el de la última pregunta se le pasa a onFinish en este mismo
    // flujo, y el state todavía no está actualizado.
    const pregunta = current
    const siguientes = { ...answers, [pregunta.id]: answer }
    setAnswers(siguientes)
    setFeedback(FEEDBACK.pendiente)

    let veredicto = FEEDBACK.sinVerificar
    try {
      // Dos reintentos antes de rendirse: la mayoría de los fallos de red a
      // mitad de un examen son momentáneos (ver reintentarRequest.js).
      const { correcta, respuestaCorrecta } = await conReintentos(() =>
        onCorregir(pregunta.id, answer),
      )
      veredicto = correcta ? FEEDBACK.correcta : FEEDBACK.incorrecta
      if (!correcta) {
        incorrectasRef.current.push({
          pregunta,
          respuestaDada: answer,
          respuestaCorrecta,
        })
      }
    } catch {
      // Ni con reintentos. La respuesta YA quedó tomada y viaja igual al cerrar
      // la sesión —la evaluación no se corta por esto, y el resultado que vale
      // lo calcula el backend al registrar, como siempre—, pero no sabemos si
      // estuvo bien: no se pinta color y se cuenta como no verificada para que
      // el repaso pueda decirlo. Sin cartel ni interrupción acá: la persona está
      // rindiendo, no es el momento de explicarle un problema de red.
      sinVerificarRef.current += 1
    }
    if (!montadoRef.current) return

    setFeedback(veredicto)
    timerRef.current = setTimeout(
      () => {
        if (isLast) {
          onFinish(siguientes, {
            incorrectas: incorrectasRef.current,
            sinVerificar: sinVerificarRef.current,
          })
        } else {
          setFeedback(null)
          setCurrentIndex((i) => i + 1)
        }
      },
      veredicto === FEEDBACK.sinVerificar ? ESPERA_SIN_COLOR : ESPERA_FEEDBACK,
    )
  }

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-500 text-sm">{usuario.name}</p>
            <p className="text-red-600 font-semibold text-sm">{mod.nombre}</p>
          </div>
          <button onClick={onBack} className="text-slate-400 text-sm hover:text-slate-700 touch-manipulation">
            Cancelar
          </button>
        </div>
        {/* answered=currentIndex: como se avanza al responder, el índice actual
            ES la cantidad de preguntas ya contestadas. */}
        <ProgressBar questionNum={currentIndex + 1} answered={currentIndex} total={questions.length} />
      </div>

      {/* Pregunta. No hay footer: se fue con el botón de siguiente, y con él el
          de volver a la pregunta anterior — sin confirmación no hay nada que
          editar ahí atrás, mostrarla de nuevo sólo invitaría a intentar
          cambiar una respuesta que ya es definitiva. */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        <QuestionCard
          question={current}
          selectedAnswer={currentAnswer}
          feedback={feedback}
          onSelect={handleSelect}
        />
      </div>
    </div>
  )
}
