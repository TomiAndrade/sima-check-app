# SIMA CHECK — App de evaluación

App tablet para capacitaciones y evaluaciones industriales. Consume la API real de la plataforma **SIMA TRAINING** de Ingeniería Sima ([`sima-training-api`](https://github.com/TomiAndrade/sima-training)) — no tiene datos mockeados.

Salió del monorepo `sima-training` como repo propio (`git subtree split`, conservó su historial) por ser 100% autocontenida: propio `package.json`, cero imports cruzados hacia el resto de la plataforma, sólo consume la API real por HTTP contra `/tablet/*`. El backend sigue siendo la fuente de verdad de esos endpoints — ver `docs/decisiones/tablet.md` en ese repo.

## Stack

- Vite + React, sin router (el flujo es un state machine de 4 pasos en `App.jsx`)
- Tailwind CSS v3
- **Conectada al backend real**: login por DNI contra `POST /tablet/login`, capacitaciones pendientes y examen contra `/tablet/pendientes` y `/tablet/modulos/:id/examen`, resultado calculado por el backend vía `POST /tablet/sesiones` — la app nunca conoce la respuesta correcta ni calcula el score
- **PWA instalable** (`vite-plugin-pwa`): manifest, íconos, precache del shell y banner de actualización

## Correr en dev

```bash
npm install
cp .env.example .env   # VITE_API_URL apunta al backend (default http://localhost:3000)
npm run dev             # → http://localhost:5174
```

Requiere `sima-training-api` corriendo — ver su README para levantarlo.

## Probar la PWA

El service worker **no corre con `npm run dev`** (Vite en dev no lo registra). Para probarlo hace falta buildear y servir el build:

```bash
npm run build
npm run preview   # → http://localhost:4173
```

Para probar la instalación en un dispositivo real (tablet/celular) hace falta HTTPS — `localhost` no sirve desde otro dispositivo en la red. La forma más simple es un túnel:

```bash
cloudflared tunnel --url http://localhost:4173
```

`preview.allowedHosts` y `server.allowedHosts` en `vite.config.js` ya tienen whitelisteado `.trycloudflare.com`. `vite.config.js` también define un proxy de demo (`/tablet`, `/uploads`, `/auth` → `http://localhost:3000`) para que la app y la API salgan por el mismo origen del túnel, sin CORS que configurar — con `VITE_API_URL` vacío, `BASE_URL` queda en `''` y todos los fetch salen relativos.

## Estructura

```
src/
├── core/
│   ├── api/         client.js (fetch + token en sessionStorage, no localStorage:
│   │                 el atril es compartido y el token muere al cerrar la pestaña) ·
│   │                 tablet.js (login/pendientes/examen/registrarSesion) ·
│   │                 imagenes.js (resuelve { clave, url } contra BASE_URL)
│   └── reintentos.js  Traduce a texto el estado de reintentos que manda el
│                      backend (puedeRendir/motivo/intentosRestantes/
│                      proximoIntentoEn) — la regla la decide el backend
│                      siempre, esto sólo evita ofrecer un botón que daría 409
├── components/       Button · ProgressBar · QuestionCard (tipos VERDADERO_FALSO /
│                     OPCIONES_IMAGEN / texto libre) · BannerActualizacion
└── pages/            UsuarioSelection · ModuleSelection · Evaluation · Results
```

## Flujo de la app

1. **Ingreso por DNI** (`UsuarioSelection`) — `POST /tablet/login`; guarda el `access_token` (JWT `tipo: 'alumno'`, propio de la tablet) en `sessionStorage`
2. **Capacitaciones pendientes** (`ModuleSelection`) — `GET /tablet/pendientes`: asignaciones vigentes sin aprobar. Un módulo bloqueado por tope de intentos o espera **sigue listado**, sólo que sin poder rendirse — la obligación no desaparece
3. **Evaluación** (`Evaluation`) — `GET /tablet/modulos/:moduloId/examen` trae las preguntas ya sorteadas por el backend (según `preguntasPorExamen` del módulo); la barra de progreso avanza al responder, no al llegar
4. **Resultado** (`Results`) — `POST /tablet/sesiones` manda las respuestas crudas; **el backend calcula el score y el aprobado/desaprobado**, la app nunca lo hace localmente porque nunca recibe la respuesta correcta. "Reintentar evaluación" sólo se ofrece si desaprobó y todavía tiene intentos disponibles

Si la persona aprueba, el módulo sale de "pendientes" (la `Asignacion` sigue vigente, lo que cambia es que ya tiene una sesión aprobada). Si desaprueba, sigue en la lista y puede reintentar mientras no agote el tope de intentos.

## Tipos de pregunta

| `tipo` (backend) | Descripción | Renderizado |
|---|---|---|
| `VERDADERO_FALSO` | Verdadero / Falso | 2 botones (verde/rojo) |
| `OPCION_MULTIPLE` (default) | Opción múltiple con texto | Lista vertical, selección resaltada en oscuro |
| `OPCIONES_IMAGEN` | Opciones como imágenes | Grid 2×2, selección con borde rojo |

Cada opción de `OPCIONES_IMAGEN` llega como `{ clave, url }`: se **muestra** la `url` (resuelta contra `BASE_URL`) pero se **guarda/compara** la `clave` — el backend corrige contra la clave cruda de storage, nunca contra la URL armada. Una pregunta puede traer además un campo `imagen` (mismo formato `{ clave, url }`) que muestra una imagen de contexto encima de las opciones.

## Imágenes propias de la app

- Fondo de pantalla: `public/SIMACHECK-FONDO.webp` (generado con `npm run iconos` a partir de `SIMACHECK-FONDO.png`)
- Logo: `public/SIMA_CHECK-logo.png`
- Íconos de la PWA: `public/icons/`

Las imágenes de preguntas y opciones **no viven acá** — las sirve el backend (`GET /uploads/*`) y la app sólo las resuelve por URL relativa (`core/api/imagenes.js`).
