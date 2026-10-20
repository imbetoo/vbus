import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        ice: {
          50: '#EAF2F8', // Fondo de la app (modo claro)
          100: '#C9DCE8', // Bordes y contenedores secundarios
        },
        steel: {
          300: '#8AA9C4', // Iconos y acentos sutiles
        },
        // Solo se sobrescribe el tono 600; el resto de `slate` conserva los
        // valores por defecto de Tailwind.
        slate: {
          600: '#3E5C76', // Botones principales y acentos
        },
        navy: {
          900: '#1D2D44', // Títulos masivos y texto primario
        },
        // Tarjetas: fondo al 50 %, borde y pastillas de icono al 100 %.
        graphite: '#272727',
        // Estado de urgencia (llegada en < 3 min), rojo de sistema de iOS.
        urgent: '#FF3B30',
      },
      // Manchas del fondo mesh. Cada una se desvanece a su propio color con
      // alfa 0 para que no aparezcan halos grises en los bordes.
      backgroundImage: {
        'mesh-light': 'radial-gradient(closest-side, #E6EEF5 15%, rgb(230 238 245 / 0))',
        'mesh-navy': 'radial-gradient(closest-side, #1D2D44 25%, rgb(29 45 68 / 0))',
        'mesh-steel':
          'radial-gradient(closest-side, #3E5C76, rgb(138 169 196 / 0.6) 55%, rgb(138 169 196 / 0))',
      },
      keyframes: {
        'mesh-1': { to: { transform: 'translate3d(-12vw, 10vh, 0) scale(1.15)' } },
        'mesh-2': { to: { transform: 'translate3d(-18vw, 12vh, 0) scale(1.1)' } },
        'mesh-3': { to: { transform: 'translate3d(15vw, -10vh, 0) scale(1.2)' } },
        'mesh-4': { to: { transform: 'translate3d(-10vw, -8vh, 0) scale(1.1)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' } },
      },
      animation: {
        'mesh-1': 'mesh-1 28s ease-in-out infinite alternate',
        'mesh-2': 'mesh-2 34s ease-in-out infinite alternate',
        'mesh-3': 'mesh-3 40s ease-in-out infinite alternate',
        'mesh-4': 'mesh-4 46s ease-in-out infinite alternate',
        'sheet-up': 'sheet-up 320ms cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
