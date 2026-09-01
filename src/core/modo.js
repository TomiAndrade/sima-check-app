import { invitadoApi } from './api/invitado'
import { tabletApi } from './api/tablet'

// Los dos modos en que se puede usar la app.
//
//   ALUMNO   — alguien del sistema entra con su DNI y rinde de verdad. El
//              resultado queda en su historial y cumple sus obligaciones.
//   INVITADO — alguien de afuera prueba la app dando sólo su nombre. Rinde
//              contenido real, pero el resultado va a una tabla aparte y no
//              cuenta como capacitación.
export const MODOS = { alumno: 'alumno', invitado: 'invitado' }

// Adaptador: las dos APIs bajo una misma forma, para que el flujo de pantallas
// (App.jsx) sea UNO SOLO y no dos copias.
//
// Las diferencias reales entre los dos contratos se resuelven acá y en ningún
// otro lado:
//
//   - `listar()` sale de endpoints distintos (`/pendientes` vs
//     `/invitado/modulos`) y devuelve formas parecidas pero no iguales: un
//     pendiente trae `asignacionId` y `reintentos`, un módulo de demo no.
//   - `registrar()` arma payloads distintos: el de invitado no lleva
//     `asignacionId` ni `claveIdempotencia`, y mandarlos daría 400 (el DTO del
//     backend corre con forbidNonWhitelisted).
//
// Lo que NO se resuelve acá es la copy ni los avisos de pantalla: eso lo decide
// cada componente mirando el `modo`, porque son decisiones de UI y no de datos.
export function apiDelModo(modo) {
  if (modo === MODOS.invitado) {
    return {
      listar: () => invitadoApi.modulos(),
      examen: (moduloId) => invitadoApi.examen(moduloId),
      registrar: ({ moduloVersionId, iniciadaEn, finalizadaEn, respuestas }) =>
        invitadoApi.registrarSesion({
          moduloVersionId,
          iniciadaEn,
          finalizadaEn,
          respuestas,
        }),
    }
  }
  return {
    listar: () => tabletApi.pendientes(),
    examen: (moduloId) => tabletApi.examen(moduloId),
    registrar: (payload) => tabletApi.registrarSesion(payload),
  }
}

// Identidad de una fila de la lista, para la `key` de React y para volver a
// pedir el examen al reintentar. `moduloId` y no `asignacionId` porque es el
// único campo que existe en los dos modos — y sigue siendo único en la lista de
// alumno, donde hay a lo sumo una asignación vigente por (usuario, módulo).
export const claveDeItem = (item) => item.moduloId
