import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { clearToken } from './core/api/client'
import { apiDelModo, MODOS } from './core/modo'
import UsuarioSelection from './pages/UsuarioSelection'
import ModuleSelection from './pages/ModuleSelection'
import Evaluation from './pages/Evaluation'
import Results from './pages/Results'
import Repaso from './pages/Repaso'
import BannerActualizacion from './components/BannerActualizacion'
import BannerDemo from './components/BannerDemo'

const STEPS = { usuario: 'usuario', module: 'module', evaluation: 'evaluation', results: 'results', repaso: 'repaso' }

export default function App() {
  const [step, setStep] = useState(STEPS.usuario)
  // 'alumno' | 'invitado'. Lo fija UsuarioSelection al identificarse y gobierna
  // dos cosas: contra qué API se habla (apiDelModo) y qué dice la copy. El flujo
  // de pantallas es EL MISMO en los dos — un modo invitado con su propio árbol de
  // componentes sería la misma app dos veces, condenada a divergir.
  const [modo, setModo] = useState(MODOS.alumno)
  const [usuario, setUsuario] = useState(null)
  // El ítem elegido de la lista. En modo alumno es un pendiente de
  // GET /tablet/pendientes (con asignacionId y reintentos); en modo invitado es
  // un módulo de GET /tablet/invitado/modulos (sin ninguno de los dos).
  const [pendiente, setPendiente] = useState(null)
  // Respuesta completa del examen ({ moduloId, moduloVersionId, modulo,
  // version, preguntas }). Misma forma en los dos modos.
  const [examen, setExamen] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [finalizadaEn, setFinalizadaEn] = useState(null)
  // UUID por INTENTO, generado al cargar el examen (no al enviarlo). Sólo se usa
  // en modo alumno: el endpoint de invitado no acepta claveIdempotencia (es el
  // mecanismo del modo offline, que en la demo no aplica).
  const [claveIdempotencia, setClaveIdempotencia] = useState(null)
  const [iniciadaEn, setIniciadaEn] = useState(null)
  const [result, setResult] = useState(null)
  // Las preguntas que se fallaron, con lo que eligió y lo que era. Las acumula
  // Evaluation mientras se rinde (cada respuesta se corrige al tocarla) y se
  // usan sólo para la pantalla de repaso — el resultado que vale lo sigue
  // calculando el backend al registrar la sesión.
  const [incorrectas, setIncorrectas] = useState([])
  // Cuántas respuestas no se pudieron corregir en el momento (sin señal, y ni
  // con reintentos). El repaso lo aclara: si alguna de ésas estuvo mal, no está
  // en la lista de incorrectas.
  const [sinVerificar, setSinVerificar] = useState(0)
  const [cargandoExamen, setCargandoExamen] = useState(false)
  const [errorExamen, setErrorExamen] = useState('')
  const [enviandoResultado, setEnviandoResultado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  const esDemo = modo === MODOS.invitado
  const api = apiDelModo(modo)

  const cargarExamen = async (item) => {
    setCargandoExamen(true)
    setErrorExamen('')
    try {
      const data = await api.examen(item.moduloId)
      setPendiente(item)
      setExamen(data)
      setClaveIdempotencia(crypto.randomUUID())
      setIniciadaEn(new Date())
      setStep(STEPS.evaluation)
    } catch (err) {
      // El examen puede tirar 409 si el módulo se archivó (o se quedó sin
      // preguntas activas) entre que se cargó la lista y se tocó el botón; en
      // modo demo, además, 404 si lo sacaron de la demo mientras tanto. No
      // navega: se queda en la lista con el error a la vista.
      setErrorExamen(
        err.status === undefined
          ? 'No hay conexión con el servidor. Intentá de nuevo en un momento.'
          : 'Esta capacitación ya no está disponible para rendir. Probá con otra o volvé más tarde.',
      )
    } finally {
      setCargandoExamen(false)
    }
  }

  const startEvaluation = (item) => cargarExamen(item)

  // Recibe respuestas/momentoFin explícitos en vez de leerlos de
  // `respuestas`/`finalizadaEn` (state) porque finishEvaluation los necesita
  // ANTES de que el setState correspondiente se refleje en este closure;
  // reintentarEnvio, en cambio, sí puede leerlos del state.
  const enviarResultado = async (respuestasPayload, momentoFin) => {
    setEnviandoResultado(true)
    setErrorEnvio('')
    try {
      // Los campos que sólo existen en modo alumno se mandan siempre; el
      // adaptador de `core/modo.js` es el que los descarta en modo invitado
      // (mandarlos ahí daría 400 por forbidNonWhitelisted).
      const resultado = await api.registrar({
        moduloVersionId: examen.moduloVersionId,
        asignacionId: pendiente.asignacionId,
        claveIdempotencia,
        iniciadaEn: iniciadaEn.toISOString(),
        finalizadaEn: momentoFin.toISOString(),
        respuestas: respuestasPayload,
      })
      setResult(resultado)
    } catch (err) {
      setErrorEnvio(
        err.status === undefined
          ? 'No hay conexión con el servidor. Reintentá cuando tengas señal.'
          : 'No pudimos registrar el resultado. Reintentá en un momento.',
      )
    } finally {
      setEnviandoResultado(false)
    }
  }

  const finishEvaluation = (answers, { incorrectas: incorrectasDelIntento, sinVerificar: noVerificadas }) => {
    // answers = { [preguntaId]: respuestaDada }, ver Evaluation.jsx — no
    // depende del orden en que se hayan recorrido las preguntas.
    const respuestasPayload = examen.preguntas.map((q) => ({ preguntaId: q.id, respuestaDada: answers[q.id] ?? null }))
    const momentoFin = new Date()
    setRespuestas(respuestasPayload)
    setIncorrectas(incorrectasDelIntento)
    setSinVerificar(noVerificadas)
    setFinalizadaEn(momentoFin)
    setStep(STEPS.results)
    enviarResultado(respuestasPayload, momentoFin)
  }

  // Corrige UNA respuesta apenas se toca, para el feedback inmediato. Vive acá
  // y no en Evaluation por la misma regla que el resto: las pantallas son de
  // presentación y no piden datos por su cuenta — así el componente no necesita
  // saber en qué modo está ni de dónde sale el moduloVersionId.
  //
  // No atrapa el error: Evaluation necesita distinguir "se corrigió" de "no se
  // pudo" para decidir si pinta color, y eso se hace con el throw.
  const corregirRespuesta = (preguntaId, respuestaDada) =>
    api.corregir({
      moduloVersionId: examen.moduloVersionId,
      preguntaId,
      respuestaDada,
    })

  // Reintentar el ENVÍO (no la evaluación): mismas respuestas y, en modo alumno,
  // la misma claveIdempotencia — si el POST anterior sí había llegado y sólo se
  // perdió la respuesta, el backend dedupe en vez de duplicar la sesión. En modo
  // invitado no hay dedupe (ver el schema): un reintento que llegue dos veces
  // deja dos filas en el reporte de demo, que es un costo aceptado.
  const reintentarEnvio = () => enviarResultado(respuestas, finalizadaEn)

  const retry = () => {
    setResult(null)
    setIncorrectas([])
    setSinVerificar(0)
    setErrorEnvio('')
    cargarExamen(pendiente)
  }

  const limpiarIntento = () => {
    setPendiente(null)
    setExamen(null)
    setRespuestas([])
    setIncorrectas([])
    setSinVerificar(0)
    setFinalizadaEn(null)
    setClaveIdempotencia(null)
    setIniciadaEn(null)
    setResult(null)
    setErrorExamen('')
    setErrorEnvio('')
  }

  const goToModules = () => {
    limpiarIntento()
    setStep(STEPS.module)
  }

  const goHome = () => {
    limpiarIntento()
    setUsuario(null)
    // El token se descarta al volver al inicio, en los dos modos: el atril es
    // compartido y el siguiente que se acerque tiene que empezar de cero. Sin
    // esto, un invitado dejaría su token vivo (30 min) para el que venga atrás.
    clearToken()
    setModo(MODOS.alumno)
    setStep(STEPS.usuario)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden"
      style={{ backgroundImage: "url('/SIMACHECK-FONDO.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* h-full + min-h-0: esta columna mide EXACTAMENTE el alto del viewport
          (se lo da el `fixed inset-0` del padre) y deja que sus hijos encojan.
          Sin eso, la card se limitaba por su cuenta a 92vh y encima de ella
          iban el logo (64px), el gap y el padding del padre — la suma pasaba de
          100vh, y como el padre es overflow-hidden lo que sobraba se cortaba
          arriba y abajo sin forma de scrollear. Así, en cambio, el reparto lo
          hace flex: el logo y los banners se quedan con lo suyo y la card se
          come lo que queda, scrolleando por dentro.

          `h-full` y no `h-[100dvh]`: con el padre en `fixed inset-0` esto ya es
          el alto visible real, así que no hay que pelearse con lo que `vh` mide
          en Chrome Android cuando la barra de direcciones aparece y desaparece. */}
      <div className="relative z-10 w-full h-full min-h-0 flex flex-col items-center justify-center gap-5">
        {/* El logo horizontal, no el isotipo: acá hay ancho de sobra y se lee
            la marca completa. La palabra "CHECK" es BLANCA, así que este archivo
            depende del fondo industrial de atrás — sobre una superficie clara
            desaparecería media marca. Por eso vive fuera de la card. */}
        {/* flex-shrink-0 acá y en los banners: son alturas fijas que no se
            achican. Lo que cede es la card. */}
        <img src="/simacheck-logo.png" alt="SIMA CHECK" className="h-16 w-auto object-contain drop-shadow-md flex-shrink-0" />
        {/* El banner de demo se muestra en TODAS las pantallas del modo, la
            evaluación incluida — ver el comentario de BannerDemo. */}
        {esDemo && step !== STEPS.usuario && <BannerDemo onSalir={goHome} />}
        {needRefresh && (step === STEPS.usuario || step === STEPS.module) && (
          <BannerActualizacion onActualizar={() => updateServiceWorker(true)} />
        )}
        {step === STEPS.usuario && (
          <UsuarioSelection
            onSelect={(u, modoElegido) => {
              setUsuario(u)
              setModo(modoElegido)
              setStep(STEPS.module)
            }}
          />
        )}
        {step === STEPS.module && (
          <ModuleSelection
            usuario={usuario}
            modo={modo}
            onSelect={startEvaluation}
            onBack={goHome}
            cargandoExamen={cargandoExamen}
            errorExamen={errorExamen}
          />
        )}
        {step === STEPS.evaluation && (
          <Evaluation
            usuario={usuario}
            module={pendiente}
            questions={examen?.preguntas ?? []}
            onCorregir={corregirRespuesta}
            onFinish={finishEvaluation}
            onBack={() => setStep(STEPS.module)}
          />
        )}
        {step === STEPS.repaso && (
          <Repaso
            module={pendiente}
            incorrectas={incorrectas}
            sinVerificar={sinVerificar}
            onVolver={() => setStep(STEPS.results)}
          />
        )}
        {step === STEPS.results && (
          <Results
            usuario={usuario}
            module={pendiente}
            modo={modo}
            result={result}
            enviando={enviandoResultado}
            errorEnvio={errorEnvio}
            onReintentarEnvio={reintentarEnvio}
            incorrectas={incorrectas}
            sinVerificar={sinVerificar}
            onRepasar={() => setStep(STEPS.repaso)}
            onRetry={retry}
            onGoToModules={goToModules}
            onHome={goHome}
          />
        )}
      </div>
    </div>
  )
}
