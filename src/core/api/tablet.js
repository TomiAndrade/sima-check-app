import { api } from './client'

export const tabletApi = {
  login: (dni) => api.post('/tablet/login', { dni }, { auth: false }),
  pendientes: () => api.get('/tablet/pendientes'),
  examen: (moduloId) => api.get(`/tablet/modulos/${moduloId}/examen`),
  // Corrige UNA respuesta en el momento de tocarla. Es lo que permite el
  // feedback inmediato sin que la respuesta correcta viaje nunca dentro del
  // examen — ver corregir-una.ts en el backend.
  corregir: (payload) => api.post('/tablet/corregir', payload),
  registrarSesion: (payload) => api.post('/tablet/sesiones', payload),
}
