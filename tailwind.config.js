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
        // Azul de sistema de iOS: foco de inputs y elementos seleccionados.
        accent: '#0A84FF',
      },
      // Fondo "perla iridiscente". Cada mancha se desvanece a su propio color
      // con alfa 0 para que no aparezcan halos grises en los bordes.
      backgroundImage: {
        'mesh-blue': 'radial-gradient(closest-side, #A2C2FC 25%, rgb(162 194 252 / 0))',
        'mesh-lavender': 'radial-gradient(closest-side, #E2B7FC 25%, rgb(226 183 252 / 0))',
        'mesh-pearl': 'radial-gradient(closest-side, #FFFFFF 15%, rgb(255 255 255 / 0))',
        'mesh-indigo': 'radial-gradient(closest-side, #8E96E8 15%, rgb(142 150 232 / 0))',
        'mesh-rose': 'radial-gradient(closest-side, #F2C4E8 20%, rgb(242 196 232 / 0))',
        // Grano fino (ruido SVG desaturado): se rasteriza una vez y solo se compone.
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      // Órbitas irregulares de 4 puntos: solo `transform` (desplazamiento,
      // rotación y escala) para que la GPU las mueva sin repintar.
      keyframes: {
        'mesh-1': orbit(['17vw, 11vh', 25, 1.15], ['6vw, 28vh', -12, 0.92], ['25vw, 20vh', 14, 1.2]),
        'mesh-2': orbit(['-20vw, 14vh', -21, 1.08], ['-8vw, -17vh', 17, 1.2], ['-28vw, 8vh', -8, 0.92]),
        'mesh-3': orbit(['-14vw, -11vh', 35, 1.15], ['11vw, 8vh', -28, 0.88], ['-6vw, 17vh', 49, 1.08]),
        'mesh-4': orbit(['20vw, -14vh', 14, 1.2], ['34vw, -6vh', -20, 1], ['14vw, -25vh', 28, 1.28]),
        'mesh-5': orbit(['-17vw, -17vh', -28, 1.15], ['-31vw, -6vh', 21, 0.92], ['-11vw, -28vh', -7, 1.2]),
        // Entrada suave de textos que cambian (mensajes de estado, ayudas).
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' } },
        // Entrada de una tarjeta nueva: su hueco crece mientras aparece.
        'card-in': { from: { gridTemplateRows: '0fr', opacity: '0', transform: 'scale(0.9)' } },
      },
      // Duraciones desiguales y desfasadas para que nunca se muevan al compás.
      animation: {
        'mesh-1': 'mesh-1 35s ease-in-out infinite alternate',
        'mesh-2': 'mesh-2 42s ease-in-out -8s infinite alternate',
        'mesh-3': 'mesh-3 50s ease-in-out -17s infinite alternate',
        'mesh-4': 'mesh-4 57s ease-in-out -23s infinite alternate',
        'mesh-5': 'mesh-5 64s ease-in-out -31s infinite alternate',
        'fade-in': 'fade-in 250ms ease-out',
        'card-in': 'card-in 500ms ease-out',
      },
      // Cristal: brillo interior de 1px en el canto superior + sombra exterior
      // suave que despega la tarjeta del fondo.
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgb(255 255 255 / 0.12), 0 16px 40px -12px rgb(0 0 0 / 0.35)',
      },
      // Curva tipo "spring" de Apple para transiciones de interfaz.
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.25, 1, 0.5, 1)',
        // Curva de las hojas de iOS: arranque más suave que `spring`, ideal
        // para animar alturas sin que el inicio se perciba como un salto.
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
