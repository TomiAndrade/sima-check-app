import Button from '../components/Button'
import { MODOS } from '../core/modo'
import { motivoBloqueo } from '../core/reintentos'

export default function Results({ usuario, module: mod, modo = MODOS.alumno, result, enviando, errorEnvio, incorrectas = [], sinVerificar = 0, onRepasar, onReintentarEnvio, onRetry, onGoToModules, onHome }) {
  // El aprobado/desaprobado sale de `aprobada` (el backend congela el umbral
  // por sesión, ver Sesion.umbralAprobacion) — nunca se recalcula contra un
  // 70 hardcodeado del lado del cliente. Vale igual en modo demo: lo corrige el
  // mismo código del backend, así que el resultado es el real.
  const aprobada = result?.aprobada
  const esDemo = modo === MODOS.invitado
  const bloqueoReintento = motivoBloqueo(result?.reintentos)
  // El repaso se ofrece apruebe o no: lo que importa es que se vaya sabiendo lo
  // que no sabía. Sin nada que mostrar el botón no va — una pantalla de repaso
  // vacía no es un premio, es una pantalla vacía.
  //
  // Las no verificadas también abren el repaso, aunque no haya ninguna
  // incorrecta: si no, el caso en que TODAS fallaron la corrección sería
  // justamente el único donde no se avisa nada, que es al revés de lo que hay
  // que hacer.
  const hayRepaso = incorrectas.length > 0 || sinVerificar > 0

  const feedbackMsg = result
    ? aprobada
      ? '¡Muy bien! Demostraste conocimiento sólido en seguridad.'
      : 'Necesitás repasar los contenidos del módulo antes de continuar.'
    : null

  return (
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-8">
      {enviando && (
        <div className="w-40 h-40 rounded-full border-8 border-slate-300 bg-slate-50 flex flex-col items-center justify-center mb-6 mx-auto text-center px-4">
          <span className="text-slate-500 text-sm font-bold leading-snug">Enviando resultado...</span>
        </div>
      )}

      {!enviando && errorEnvio && (
        <div className="w-40 h-40 rounded-full border-8 border-red-300 bg-red-50 flex flex-col items-center justify-center mb-6 mx-auto text-center px-4">
          <span className="text-red-600 text-sm font-bold leading-snug">No se pudo enviar</span>
        </div>
      )}

      {!enviando && !errorEnvio && result && (
        <>
          {/* Score circle */}
          <div className={`w-40 h-40 rounded-full border-8 flex flex-col items-center justify-center mb-6 mx-auto ${aprobada ? 'border-emerald-500 bg-emerald-50' : 'border-red-600 bg-red-50'}`}>
            <span className={`text-5xl font-black ${aprobada ? 'text-emerald-600' : 'text-red-600'}`}>{result.porcentaje}%</span>
            <span className={`text-xs font-bold mt-1 ${aprobada ? 'text-emerald-600' : 'text-red-600'}`}>
              {result.correctas} / {result.total} correctas
            </span>
          </div>

          {/* Badge */}
          <div className={`px-8 py-3 rounded-full text-xl font-black mb-4 text-center mx-auto w-fit ${aprobada ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
            {aprobada ? '✓ APROBADO' : '✗ DESAPROBADO'}
          </div>
          {/* Debajo del badge y no en el banner de arriba: un "APROBADO" verde
              en grande es justo el momento en que alguien puede creer que quedó
              certificado, así que la aclaración va pegada a él. */}
          {esDemo && (
            <p className="text-amber-700 text-sm font-semibold text-center mb-4">
              Resultado de demostración — no queda registrado
            </p>
          )}
        </>
      )}

      {/* Info */}
      <div className="text-center mb-8">
        <p className="text-slate-900 text-lg font-semibold mb-1">{usuario.name}</p>
        <p className="text-slate-500 text-sm">{mod.nombre}</p>
        {!enviando && errorEnvio && (
          <p className="mt-3 text-sm max-w-xs mx-auto leading-relaxed text-red-700">{errorEnvio}</p>
        )}
        {feedbackMsg && (
          <p className={`mt-3 text-sm max-w-xs mx-auto leading-relaxed ${aprobada ? 'text-emerald-700' : 'text-red-700'}`}>
            {feedbackMsg}
          </p>
        )}
      </div>

      {/* Actions */}
      {!enviando && errorEnvio && (
        <div className="space-y-3">
          <Button variant="primary" onClick={onReintentarEnvio} fullWidth>
            Reintentar envío
          </Button>
        </div>
      )}

      {!enviando && !errorEnvio && result && (
        <div className="space-y-3">
          {/* Primero y en primario, incluso por encima de salir: es la parte
              formativa de haber rendido, y si queda como última opción gris no
              la toca nadie. */}
          {hayRepaso && (
            <Button variant="primary" onClick={onRepasar} fullWidth>
              {incorrectas.length > 0
                ? `Ver qué fallé (${incorrectas.length})`
                : 'Ver aviso del examen'}
            </Button>
          )}
          <Button variant={hayRepaso ? 'secondary' : 'primary'} onClick={onGoToModules} fullWidth>
            {esDemo ? 'Probar otra' : 'Mis capacitaciones'}
          </Button>
          {/* Reintentar es SÓLO para quien desaprobó. Aprobado, el módulo ya
              salió de pendientes y volver a rendirlo no cambia nada: la
              asignación se cumple con la primera aprobación. El backend igual
              lo dejaría pasar --el contador de intentos se resetea justamente
              al aprobar-- así que si el botón estuviera, funcionaría, y lo
              único que haría es sumar sesiones al historial de la persona y
              darle la chance de "desaprobar" algo que ya tenía aprobado.

              El estado de reintentos lo recalcula el backend DESPUÉS de
              registrar esta sesión. Si ya no se puede, se dice por qué en vez de
              ofrecer un botón que devuelve 409.

              En modo DEMO el reintento se ofrece SIEMPRE, aprobado o no, y los
              dos motivos de arriba desaparecen: no hay obligación que se cumpla
              con la aprobación (la demo no toca ninguna asignación), el módulo
              no sale de ninguna lista, y no hay tope de intentos que contar
              porque no hay persona contra la cual contarlos. Volver a probar es
              exactamente lo que se espera que haga alguien mirando la app. */}
          {(esDemo || !aprobada) &&
            (bloqueoReintento && !esDemo ? (
              <p className="text-slate-500 text-sm leading-relaxed text-center px-2">{bloqueoReintento}</p>
            ) : (
              <Button variant="secondary" onClick={onRetry} fullWidth>
                {esDemo ? 'Volver a rendir esta' : 'Reintentar evaluación'}
              </Button>
            ))}
          <Button variant="secondary" onClick={onHome} fullWidth>
            {esDemo ? 'Salir de la demostración' : 'Volver al inicio'}
          </Button>
        </div>
      )}
    </div>
  )
}
