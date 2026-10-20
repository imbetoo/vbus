# vbus

vBus for Vigo busses: WebApp/PWA para consultar de un vistazo los tiempos de
llegada de Vitrasa en tus rutinas diarias. Pensada para portarse después a
iOS/Android (React Native/Expo).

## Stack

- React + Vite (`@vitejs/plugin-react-swc`)
- Tailwind CSS 3 (PostCSS + Autoprefixer)
- Iconos: `lucide-react`

## Scripts

```sh
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run preview  # sirve el build
npm run lint     # oxlint
```

## Estructura

```
src/
├── components/
│   ├── ui/           # genéricos (GlassCard, IconHeading, Sheet, MeshBackground…)
│   ├── bus/          # dominio de autobuses (RouteCard, BusLineItem, LineBadge, ArrivalTime)
│   └── create-card/  # flujo "Crear nueva tarjeta" (botón, hoja y pasos)
├── data/        # datos de ejemplo (mockRoutes)
├── hooks/       # acceso a datos (useRoutes; futuro: VigoBusAPI)
├── screens/     # pantallas completas (Dashboard)
├── App.jsx
├── index.css    # directivas de Tailwind y estilos base
└── main.jsx
```

## Paleta

Definida en `tailwind.config.js`:

| Token       | Color     | Uso                                   |
| ----------- | --------- | ------------------------------------- |
| `ice-50`    | `#EAF2F8` | Fondo de la app (modo claro)          |
| `ice-100`   | `#C9DCE8` | Bordes, contenedores secundarios      |
| `steel-300` | `#8AA9C4` | Iconos, acentos sutiles               |
| `slate-600` | `#3E5C76` | Botones principales, acentos          |
| `navy-900`  | `#1D2D44` | Títulos masivos, texto primario       |
| `graphite`  | `#272727` | Tarjetas (fondo al 50 %, borde 4px)   |
| `urgent`    | `#FF3B30` | Llegada en menos de 3 minutos         |

Tipografía: Inter (Google Fonts). El fondo es un mesh gradient animado con
estos mismos tonos (`src/components/ui/MeshBackground.jsx`).

## Datos

Fase 1: datos estáticos (`src/data/mockRoutes.js`) servidos por `useRoutes`.
Más adelante los favoritos se guardarán en LocalStorage y los tiempos reales
vendrán de VigoBusAPI (JSON), que evita los bloqueos de CORS.
