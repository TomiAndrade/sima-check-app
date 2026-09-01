// Aviso fijo del modo demostración.
//
// Se muestra en TODAS las pantallas del flujo de invitado, incluida la
// evaluación — a diferencia de BannerActualizacion, que se esconde mientras se
// rinde. Ahí el motivo era no interrumpir; acá es el contrario: el riesgo que
// este banner cubre es que alguien del sistema entre por la demo, rinda entera
// una evaluación y crea que quedó registrada. El único momento en que se puede
// desarmar esa confusión es mientras está pasando.
//
// Ámbar y no rojo: el rojo es el color de acción de la app (los botones de
// rendir), y un cartel permanente en ese color se lee como un error.
export default function BannerDemo({ onSalir }) {
  return (
    <div className="w-full max-w-xl bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center gap-3">
      <span className="text-amber-600 text-lg flex-shrink-0">●</span>
      <p className="text-amber-800 text-sm leading-snug flex-1">
        <span className="font-bold">Modo demostración.</span>{' '}
        Este resultado no se guarda como capacitación.
      </p>
      {onSalir && (
        <button
          onClick={onSalir}
          className="text-amber-700 hover:text-amber-900 text-sm font-semibold underline flex-shrink-0 touch-manipulation"
        >
          Salir
        </button>
      )}
    </div>
  )
}
