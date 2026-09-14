import { api } from './client'

// Modo invitado: probar la app sin estar en el sistema, dando sólo un nombre.
//
// Namespace propio en el backend (`/tablet/invitado/*`) con su propio token
// (`tipo: 'invitado'`), que los endpoints de alumno rechazan y viceversa. Por eso
// vive en un archivo aparte de tablet.js y no como cuatro funciones más ahí: son
// dos contratos que no se mezclan.
export const invitadoApi = {
  // Cambia un nombre por un token. `auth: false` igual que el login de alumno:
  // se entra sin ningún token previo.
  login: (nombre) => api.post('/tablet/invitado', { nombre }, { auth: false }),
  modulos: () => api.get('/tablet/invitado/modulos'),
  examen: (moduloId) => api.get(`/tablet/invitado/modulos/${moduloId}/examen`),
  // Espejo exacto del de alumno: la demo corrige igual y con la misma
  // función del backend.
  corregir: (payload) => api.post('/tablet/invitado/corregir', payload),
  // El nombre NO va en el payload: viaja firmado dentro del token y el backend
  // lo saca de ahí. Tampoco van `asignacionId` (un invitado no cumple ninguna
  // obligación) ni `claveIdempotencia` (es el mecanismo del modo offline, que
  // acá no aplica) — el backend rechaza los tres con un 400.
  registrarSesion: (payload) => api.post('/tablet/invitado/sesiones', payload),
}
