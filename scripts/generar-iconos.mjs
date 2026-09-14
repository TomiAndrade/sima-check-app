import { mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const raiz = join(__dirname, '..')

// Los DOS archivos de marca, y cada uno tiene su lugar:
//
//   simacheck-logo.png       el logo horizontal completo (isotipo + "SIMA
//                            CHECK"). Es el que se muestra dentro de la app,
//                            encima de la card. OJO: la palabra "CHECK" es
//                            BLANCA, así que sólo se lee sobre el fondo
//                            industrial — no sirve sobre una superficie clara.
//   simacheck-logo-icon.png  sólo el isotipo (la C con el check), cuadrado y
//                            con fondo transparente. Es el que va en todos los
//                            íconos.
//
// El ícono sale del ISOTIPO y no del logo horizontal, que es lo que se hacía
// antes: un logo 3:1 metido en un lienzo cuadrado queda diminuto, con dos
// bandas de aire arriba y abajo, y el texto ilegible a 192 px. El isotipo llena
// el cuadrado y se reconoce en la pantalla de inicio de una tablet, que es
// donde este ícono se mira de verdad.
const logo = join(raiz, 'public', 'simacheck-logo.png')
const isotipo = join(raiz, 'public', 'simacheck-logo-icon.png')
const carpetaIcons = join(raiz, 'public', 'icons')
const fondoOrigen = join(raiz, 'public', 'SIMACHECK-FONDO.png')
const fondoDestino = join(raiz, 'public', 'SIMACHECK-FONDO.webp')

// Fondo negro sólido y el logo a `proporcionLogo` del lienzo. Lo usan TODOS los
// íconos; lo único que cambia entre ellos es cuánto aire lleva el logo.
//
// Negro y no blanco: es el fondo que se ve al agregar la app a la pantalla de
// inicio, y un cuadrado blanco alrededor del isotipo rojo desentona contra
// cualquier wallpaper — negro lo deja flotando en vez de mostrar una tarjeta.
//
// La `proporcionLogo` es lo que absorbe el recorte de cada plataforma: el
// maskable va al 0,6 porque Android lo recorta a la forma del launcher (círculo,
// squircle…) y a tamaño completo los bordes quedan cortados; el apple-touch al
// 0,8 porque iOS sólo redondea las esquinas; los `any` al 1, porque ahí no
// recorta nadie.
async function generarSobreFondoNegro(destino, tamanio, proporcionLogo) {
  const logoTamanio = Math.round(tamanio * proporcionLogo)
  const capa = await sharp(isotipo)
    .resize(logoTamanio, logoTamanio, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: {
      width: tamanio,
      height: tamanio,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: capa, gravity: 'center' }])
    .png()
    .toFile(destino)
}

// El fondo original (1,6 MB) no está versionado — sólo su .webp, que es el que
// consume la app. Por eso el paso se saltea en vez de fallar: sin esto, `npm
// run iconos` explota en un clone limpio y no llega a generar ningún ícono.
async function generarFondoWebp() {
  if (!existsSync(fondoOrigen)) {
    console.log('· SIMACHECK-FONDO.png no está: se conserva el .webp existente')
    return
  }
  await sharp(fondoOrigen).webp({ quality: 80 }).toFile(fondoDestino)
  const { size } = await stat(fondoDestino)
  console.log(`· Fondo convertido a SIMACHECK-FONDO.webp (${(size / 1024).toFixed(1)} KB)`)
}

async function main() {
  if (!existsSync(isotipo)) {
    throw new Error(`Falta ${isotipo}: es el origen de todos los íconos`)
  }
  await mkdir(carpetaIcons, { recursive: true })

  // Los dos `purpose: any`. Antes salían TRANSPARENTES y se veían mal justo
  // donde más se miran: son los que usa Chrome en el diálogo de instalación y
  // en el launcher cuando no aplica el maskable, y sobre el blanco que les pone
  // el sistema el isotipo pierde sus partes blancas. Van a proporción 1 —el
  // isotipo llena el lienzo, como antes— porque acá nadie recorta: lo único que
  // cambió respecto de la versión transparente es que ahora hay fondo.
  await generarSobreFondoNegro(join(carpetaIcons, 'icon-192.png'), 192, 1)
  await generarSobreFondoNegro(join(carpetaIcons, 'icon-512.png'), 512, 1)
  await generarSobreFondoNegro(join(carpetaIcons, 'icon-maskable-512.png'), 512, 0.6)
  // apple-touch-icon: iOS no respeta un fondo transparente (lo rellena de
  // negro por su cuenta), así que le damos ese mismo negro nosotros — mismo
  // resultado, pero explícito en el archivo en vez de depender del relleno de
  // iOS. Menos aire que el maskable porque iOS recorta mucho menos (sólo
  // redondea las esquinas).
  await generarSobreFondoNegro(join(raiz, 'public', 'apple-touch-icon.png'), 180, 0.8)
  // Favicon de la pestaña. PNG y no SVG porque el isotipo es un PNG y no hay
  // versión vectorial; 32 px es el tamaño que usan los navegadores de escritorio.
  // Con fondo por lo mismo que los de arriba: en una pestaña de tema claro, el
  // isotipo transparente perdía el blanco.
  await generarSobreFondoNegro(join(raiz, 'public', 'favicon-32.png'), 32, 1)
  await generarFondoWebp()

  console.log('Íconos generados desde public/simacheck-logo-icon.png:')
  console.log('  public/icons/{icon-192,icon-512,icon-maskable-512}.png')
  console.log('  public/apple-touch-icon.png · public/favicon-32.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
