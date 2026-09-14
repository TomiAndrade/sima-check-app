/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // El rebote corto de la marca ✓/✕ al corregirse una respuesta. Se define
      // acá y no con `animate-bounce` de Tailwind porque aquélla es un loop
      // infinito: esto entra una vez y se queda quieto.
      //
      // El overshoot a 1.15 y la curva con rebote son lo que lo hace leerse como
      // un golpecito y no como un fade. `both` mantiene el estado final: sin eso
      // la marca vuelve a scale(0) al terminar y desaparece.
      keyframes: {
        'marca-rebote': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'marca-rebote':
          'marca-rebote 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
}
