import { useState } from 'react'
import { tabletApi } from '../core/api/tablet'
import { invitadoApi } from '../core/api/invitado'
import { setToken } from '../core/api/client'
import { MODOS } from '../core/modo'

// Pantalla de ingreso, con DOS caminos.
//
// El DNI es el camino principal y se queda con toda la jerarquía visual (campo
// grande, botón rojo). La demo va abajo, separada, como acción secundaria: quien
// viene a rendir en serio no se equivoca de botón, y quien pasa a mirar
// encuentra por dónde entrar.
//
// El nombre se pide ANTES de probar y no al final, después de rendir. Dos
// motivos: el flujo del invitado queda idéntico al del alumno (ingreso → lista →
// examen → resultado) en vez de meter una pantalla en el medio, y el nombre
// puede viajar firmado dentro del token — así el POST del resultado no puede
// mentir sobre a nombre de quién quedó, igual que el usuarioId del alumno.
export default function UsuarioSelection({ onSelect }) {
  // 'dni' | 'invitado'. Estado local y no una pantalla propia de App.jsx: es el
  // mismo paso del flujo (identificarse), con dos formas de completarlo.
  const [vista, setVista] = useState('dni')
  const [dni, setDni] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const irA = (siguiente) => {
    setVista(siguiente)
    setError('')
  }

  const handleSubmit = async () => {
    const trimmed = dni.trim()
    if (!trimmed) {
      setError('Ingresá tu DNI para continuar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { access_token, usuario } = await tabletApi.login(trimmed)
      setToken(access_token)
      onSelect(
        {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          name: `${usuario.nombre} ${usuario.apellido}`.trim(),
        },
        MODOS.alumno,
      )
    } catch (err) {
      if (err.status === 401) {
        setError('No se encontró ningún usuario con ese DNI. Verificá el número e intentá de nuevo.')
      } else if (err.status === undefined) {
        setError('No hay conexión con el servidor. Intentá de nuevo en un momento.')
      } else {
        setError('Ocurrió un error inesperado. Intentá de nuevo.')
      }
      setLoading(false)
    }
  }

  const handleDemo = async () => {
    const trimmed = nombre.trim()
    // Mismo mínimo que el DTO del backend (@Length(2, 120)), validado acá para
    // no gastar un request en un 400 previsible.
    if (trimmed.length < 2) {
      setError('Escribí tu nombre para empezar la demostración.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { access_token, invitado } = await invitadoApi.login(trimmed)
      setToken(access_token)
      // `name` con la misma forma que en el modo alumno: es lo que las pantallas
      // de abajo muestran, y así no tienen que saber de qué modo vienen.
      onSelect({ nombre: invitado.nombre, name: invitado.nombre }, MODOS.invitado)
    } catch (err) {
      setError(
        err.status === undefined
          ? 'No hay conexión con el servidor. Intentá de nuevo en un momento.'
          : 'No pudimos iniciar la demostración. Intentá de nuevo.',
      )
      setLoading(false)
    }
  }

  const handleKeyDown = (accion) => (e) => {
    if (e.key === 'Enter' && !loading) accion()
  }

  if (vista === 'invitado') {
    return (
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-h-full overflow-y-auto">
        <div className="space-y-5">
          <div>
            <label className="block text-slate-700 text-lg font-bold mb-1 text-center">
              ¿Cómo te llamás?
            </label>
            <p className="text-slate-500 text-sm text-center mb-3 leading-snug">
              Es sólo para la demostración. No queda registrado como capacitación.
            </p>
            <input
              type="text"
              maxLength={120}
              placeholder="Tu nombre"
              autoFocus
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown(handleDemo)}
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-4 text-slate-900 text-xl text-center focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-400 placeholder:text-base"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm text-center leading-snug">{error}</p>
            </div>
          )}

          {/* Ámbar y no el rojo de la marca: el color es la primera señal de que
              esto no es una rendición real, antes de leer un solo cartel. */}
          <button
            onClick={handleDemo}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-colors touch-manipulation"
          >
            {loading ? 'INICIANDO...' : 'COMENZAR DEMOSTRACIÓN'}
          </button>

          <button
            onClick={() => irA('dni')}
            disabled={loading}
            className="w-full text-slate-500 hover:text-slate-700 text-sm font-semibold py-2 touch-manipulation disabled:opacity-50"
          >
            ‹ Volver al ingreso con DNI
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-h-full overflow-y-auto">
      <div className="space-y-5">
        <div>
          <label className="block text-slate-700 text-lg font-bold mb-2 text-center">
            Ingrese su DNI
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="Solo números, sin puntos"
            value={dni}
            onChange={(e) => {
              setDni(e.target.value.replace(/\D/g, ''))
              setError('')
            }}
            onKeyDown={handleKeyDown(handleSubmit)}
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-4 text-slate-900 text-2xl text-center tracking-widest font-mono focus:outline-none focus:border-red-600 transition-colors placeholder:text-slate-400 placeholder:text-base placeholder:tracking-normal"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm text-center leading-snug">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-colors touch-manipulation"
        >
          {loading ? 'INGRESANDO...' : 'INGRESAR'}
        </button>
      </div>

      {/* La demo, claramente subordinada: divisor de por medio, sin color de
          acento y con el texto explicando para quién es. */}
      <div className="mt-6 pt-5 border-t border-slate-200 text-center">
        <p className="text-slate-500 text-sm mb-2">¿Querés ver cómo funciona?</p>
        <button
          onClick={() => irA('invitado')}
          disabled={loading}
          className="w-full bg-white border border-slate-300 hover:border-amber-500 hover:text-amber-600 text-slate-700 font-semibold py-3 rounded-xl transition-colors touch-manipulation disabled:opacity-50"
        >
          Probar la app sin ingresar
        </button>
      </div>

      <p className="text-center text-slate-400 text-xs mt-6">Ingeniería Sima · Oil &amp; Gas</p>
    </div>
  )
}
