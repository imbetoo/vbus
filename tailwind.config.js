import defaultTheme from 'tailwindcss/defaultTheme';

const transform = ([xy, deg, scale]) => ({
  transform: `translate3d(${xy}, 0) rotate(${deg}deg) scale(${scale})`,
});

/** Keyframes de una mancha: parte del origen y pasa por tres puntos. */
const orbit = (a, b, c) => ({
  '0%': transform(['0, 0', 0, 1]),
  '35%': transform(a),
  '70%': transform(b),
  '100%': transform(c),
});

/** @type {import('tailwindcss').Config} */
export default {
  // El tema lo decide la clase `dark` en <html> (botón Sol/Luna o, si el
  // usuario no ha elegido, la preferencia del sistema).
  darkMode: 'class',
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
        // Tarjetas (fondo al 50 %) y pastillas de icono.
        graphite: '#272727',
        // Lienzo del fondo: blanco perla con un punto lavanda.
        pearl: '#F8F6FC',
        // Estado de urgencia (llegada en < 3 min), rojo de sistema de iOS.
        urgent: '#FF3B30',
      },
      // Fondo "perla iridiscente". Cada mancha se desvanece a su propio color
      // con alfa 0 para que no aparezcan halos grises en los bordes.
      backgroundImage: {
        'mesh-blue': 'radial-gradient(closest-side, #A2C2FC 10%, rgb(162 194 252 / 0))',
        'mesh-lavender': 'radial-gradient(closest-side, #E2B7FC 10%, rgb(226 183 252 / 0))',
        'mesh-pearl': 'radial-gradient(closest-side, #FFFFFF 20%, rgb(255 255 255 / 0))',
        'mesh-indigo': 'radial-gradient(closest-side, #8E96E8, rgb(142 150 232 / 0))',
        'mesh-rose': 'radial-gradient(closest-side, #F2C4E8 10%, rgb(242 196 232 / 0))',
        // Grano fino (ruido SVG desaturado): se rasteriza una vez y solo se compone.
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      // Órbitas irregulares de 4 puntos: solo `transform` (desplazamiento,
      // rotación y escala) para que la GPU las mueva sin repintar.
      keyframes: {
        'mesh-1': orbit(['12vw, 8vh', 18, 1.1], ['4vw, 20vh', -8, 0.95], ['18vw, 14vh', 10, 1.15]),
        'mesh-2': orbit(['-14vw, 10vh', -15, 1.05], ['-6vw, -12vh', 12, 1.15], ['-20vw, 6vh', -6, 0.95]),
        'mesh-3': orbit(['-10vw, -8vh', 25, 1.1], ['8vw, 6vh', -20, 0.9], ['-4vw, 12vh', 35, 1.05]),
        'mesh-4': orbit(['14vw, -10vh', 10, 1.15], ['24vw, -4vh', -14, 1], ['10vw, -18vh', 20, 1.2]),
        'mesh-5': orbit(['-12vw, -12vh', -20, 1.1], ['-22vw, -4vh', 15, 0.95], ['-8vw, -20vh', -5, 1.15]),
        'sheet-up': { from: { transform: 'translateY(100%)' } },
      },
      // Duraciones desiguales y desfasadas para que nunca se muevan al compás.
      animation: {
        'mesh-1': 'mesh-1 35s ease-in-out infinite alternate',
        'mesh-2': 'mesh-2 42s ease-in-out -8s infinite alternate',
        'mesh-3': 'mesh-3 50s ease-in-out -17s infinite alternate',
        'mesh-4': 'mesh-4 57s ease-in-out -23s infinite alternate',
        'mesh-5': 'mesh-5 64s ease-in-out -31s infinite alternate',
        'sheet-up': 'sheet-up 450ms cubic-bezier(0.25, 1, 0.5, 1)',
      },
      // Curva tipo "spring" de Apple para transiciones de interfaz.
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};
