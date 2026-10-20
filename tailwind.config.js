/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
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
        // Estado de urgencia (llegada en < 3 min), rojo de sistema de Apple.
        urgent: {
          DEFAULT: '#FF3B30',
          dark: '#FF453A',
        },
      },
      boxShadow: {
        card: '0 2px 10px rgba(29, 45, 68, 0.06)',
      },
    },
  },
  plugins: [],
};
