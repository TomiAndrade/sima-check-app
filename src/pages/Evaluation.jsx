import { useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import ProgressBar from '../components/ProgressBar'

export default function Evaluation({ usuario, module: mod, questions, onFinish, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // Indexado por preguntaId (no por posición): así App.jsx puede armar
  // `respuestas` sin depender de que este componente recorra las preguntas
  // en el mismo orden que examen.preguntas.
  const [answers, setAnswers] = useState({})

  const current = questions[currentIndex]
  const currentAnswer = answers[current.id]
  const isLast = currentIndex === questions.length - 1

  // Tocar una opción ES la respuesta: no hay confirmación ni botón de siguiente.
  // La opción queda definitiva y se avanza solo.
  //
  // El guard de arriba es lo que hace cumplir "definitiva": una pregunta ya
  // contestada ignora cualquier toque posterior. Se chequea contra
  // `answers[current.id]` y no contra un booleano suelto, porque la clave es la
  // PREGUNTA — un flag por índice se desincroniza apenas el índice avanza y
  // puede terminar bloqueando (o dejando pasar) la pregunta equivocada.
  const handleSelect = (answer) => {
    if (currentAnswer !== undefined) return

    // Se arma el objeto completo acá en vez de leer `answers` después del
    // setState: el de la última pregunta se le pasa a onFinish en este mismo
    // tick, y el state todavía no está actualizado.
    const siguientes = { ...answers, [current.id]: answer }
    setAnswers(siguientes)

    if (isLast) {
      onFinish(siguientes)
    } else {
      setCurrentIndex((i) => i + 1)
    }
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
          onSelect={handleSelect}
        />
      </div>
    </div>
  )
}
