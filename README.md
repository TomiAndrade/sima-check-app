# SIMA CHECK — App de evaluación

App tablet para capacitaciones y evaluaciones industriales. Consume la API real de la plataforma **SIMA TRAINING** de Ingeniería Sima ([`sima-training-api`](https://github.com/TomiAndrade/sima-training)) — no tiene datos mockeados.

Salió del monorepo `sima-training` como repo propio (`git subtree split`, conservó su historial) por ser 100% autocontenida: propio `package.json`, cero imports cruzados hacia el resto de la plataforma, sólo consume la API real por HTTP contra `/tablet/*`. El backend sigue siendo la fuente de verdad de esos endpoints — ver `docs/decisiones/tablet.md` en ese repo.

## Stack

- Vite + React, sin router (el flujo es un state machine de 4 pasos en `App.jsx`)
- Tailwind CSS v3
- **Conectada al backend real**: login por DNI contra `POST /tablet/login`, capacitaciones pendientes y examen contra `/tablet/pendientes` y `/tablet/modulos/:id/examen`, resultado calculado por el backend vía `POST /tablet/sesiones` — la app nunca conoce la respuesta correcta ni calcula el score
- **Dos modos en la misma app**: el de siempre (ingreso por DNI, rinde de verdad) y el **modo invitado**, para que alguien de afuera pueda probarla dando sólo su nombre — ver la sección más abajo
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
│   │                 invitado.js (el MODO INVITADO: namespace y token propios
│   │                 en el backend, archivo aparte porque son dos contratos
│   │                 que no se mezclan) ·
│   │                 imagenes.js (resuelve { clave, url } contra BASE_URL)
│   ├── modo.js        MODOS.alumno / MODOS.invitado y apiDelModo(): las dos
│   │                  APIs bajo una misma forma, para que el flujo de pantallas
│   │                  sea UNO SOLO. Acá y en ningún otro lado se resuelven las
│   │                  diferencias de contrato (pendientes vs módulos de demo, y
│   │                  qué campos lleva cada POST)
│   └── reintentos.js  Traduce a texto el estado de reintentos que manda el
│                      backend (puedeRendir/motivo/intentosRestantes/
│                      proximoIntentoEn) — la regla la decide el backend
│                      siempre, esto sólo evita ofrecer un botón que daría 409
├── components/       Button · ProgressBar · QuestionCard (tipos VERDADERO_FALSO /
│                     OPCIONES_IMAGEN / texto libre) · BannerActualizacion ·
│                     BannerDemo (fijo en TODAS las pantallas del modo invitado,
│                     la evaluación incluida — al revés que el de actualización)
└── pages/            UsuarioSelection · ModuleSelection · Evaluation · Results
                      (las cuatro sirven a los dos modos: la copy la deciden
                      mirando el prop `modo`)
```

## Flujo de la app

1. **Ingreso por DNI** (`UsuarioSelection`) — `POST /tablet/login`; guarda el `access_token` (JWT `tipo: 'alumno'`, propio de la tablet) en `sessionStorage`
2. **Capacitaciones pendientes** (`ModuleSelection`) — `GET /tablet/pendientes`: asignaciones vigentes sin aprobar. Un módulo bloqueado por tope de intentos o espera **sigue listado**, sólo que sin poder rendirse — la obligación no desaparece
3. **Evaluación** (`Evaluation`) — `GET /tablet/modulos/:moduloId/examen` trae las preguntas ya sorteadas por el backend (según `preguntasPorExamen` del módulo); la barra de progreso avanza al responder, no al llegar
4. **Resultado** (`Results`) — `POST /tablet/sesiones` manda las respuestas crudas; **el backend calcula el score y el aprobado/desaprobado**, la app nunca lo hace localmente porque nunca recibe la respuesta correcta. "Reintentar evaluación" sólo se ofrece si desaprobó y todavía tiene intentos disponibles

Si la persona aprueba, el módulo sale de "pendientes" (la `Asignacion` sigue vigente, lo que cambia es que ya tiene una sesión aprobada). Si desaprueba, sigue en la lista y puede reintentar mientras no agote el tope de intentos.

## Modo invitado

Segundo camino desde la pantalla de ingreso (**"Probar la app sin ingresar"**): alguien que no está en el sistema da su nombre y rinde un módulo real, para ver de qué se trata. Habla contra `/tablet/invitado/*` con un token propio (`tipo: 'invitado'`, TTL 30 min, **sin `sub`** — no hay usuario al que apunte), y los endpoints de alumno lo rechazan igual que los de invitado rechazan un token de alumno.

Qué cambia respecto del flujo de arriba:

1. **Ingreso** — el nombre se pide **antes** de probar, no después de rendir: así el flujo queda idéntico al del alumno y el nombre puede viajar **firmado dentro del token**, de modo que el POST del resultado no puede mentir sobre a nombre de quién quedó (mismo principio que el `usuarioId`).
2. **Lista** — `GET /tablet/invitado/modulos` devuelve los módulos que un admin tildó como `demoPublico` desde el backoffice, no las asignaciones de nadie. Sin tope de intentos: no hay persona contra la cual contarlos.
3. **Evaluación** — idéntica. Son las preguntas reales del módulo, con el mismo sorteo.
4. **Resultado** — lo calcula el mismo `corregir.ts` del backend y se guarda en `sesiones_invitado`, una tabla aparte de `sesiones`. **No cuenta como capacitación**, no toca ninguna `Asignacion`, y "volver a rendir" se ofrece siempre (aprobado o no).

Lo que el modo cuida no es el acceso sino la **confusión**: que alguien del sistema entre por acá, rinda entera una evaluación y crea que quedó registrada. Por eso el DNI conserva toda la jerarquía visual, todo el recorrido de demo va en ámbar en vez del rojo de la marca, `BannerDemo` está fijo en todas las pantallas (la evaluación incluida) y la aclaración del resultado va pegada al badge de APROBADO.

El porqué completo de cada decisión está en `docs/decisiones/tablet.md` del repo `sima-training`.

## Tipos de pregunta

| `tipo` (backend) | Descripción | Renderizado |
|---|---|---|
| `VERDADERO_FALSO` | Verdadero / Falso | 2 botones (verde/rojo) |
| `OPCION_MULTIPLE` (default) | Opción múltiple con texto | Lista vertical, selección resaltada en oscuro |
| `OPCIONES_IMAGEN` | Opciones como imágenes | Grid 2×2, selección con borde rojo |

Cada opción de `OPCIONES_IMAGEN` llega como `{ clave, url }`: se **muestra** la `url` (resuelta contra `BASE_URL`) pero se **guarda/compara** la `clave` — el backend corrige contra la clave cruda de storage, nunca contra la URL armada. Una pregunta puede traer además un campo `imagen` (mismo formato `{ clave, url }`) que muestra una imagen de contexto encima de las opciones.

## Imágenes propias de la app

Los **dos archivos de marca**, cada uno con su lugar:

- **`public/simacheck-logo.png`** — el logo horizontal (isotipo + "SIMA CHECK"). Es el que se ve dentro de la app, encima de la card. ⚠️ La palabra **"CHECK" es blanca**, así que sólo se lee sobre el fondo industrial: no sirve sobre una superficie clara, y por eso el logo va *fuera* de la card blanca y no adentro.
- **`public/simacheck-logo-icon.png`** — sólo el isotipo (la C con el check), cuadrado y transparente. Es el origen de **todos** los íconos, no el logo horizontal: un logo 3:1 metido en un lienzo cuadrado queda diminuto y con el texto ilegible a 192 px.

Todo lo demás se genera con **`npm run iconos`** y no se edita a mano: `public/icons/{icon-192,icon-512,icon-maskable-512}.png`, `public/apple-touch-icon.png` y `public/favicon-32.png`. El maskable y el de Apple van sobre **fondo blanco sólido** (Android recorta a la forma del launcher; iOS no respeta la transparencia y pintaría negro detrás).

- Fondo de pantalla: `public/SIMACHECK-FONDO.webp`. El `.png` original (1,6 MB) **no está versionado**, así que `npm run iconos` saltea ese paso y conserva el `.webp` existente en vez de fallar.

Las imágenes de preguntas y opciones **no viven acá** — las sirve el backend (`GET /uploads/*`) y la app sólo las resuelve por URL relativa (`core/api/imagenes.js`).
