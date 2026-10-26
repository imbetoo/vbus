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
│   ├── create-card/  # flujo "Crear nueva tarjeta" (botón, hoja y pasos)
│   └── settings/     # botón de tema y menú de ajustes
├── hooks/       # useRoutes, useSettings, useStopLookup, useTheme, useClock, useAnimatedDialog
├── lib/         # utilidades (motion)
├── screens/     # pantallas completas (Dashboard)
├── services/    # VigoBusAPI: cliente y adaptador de datos
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
| `graphite`  | `#272727` | Tarjetas Liquid Glass (fondo al 50 %) |
| `pearl`     | `#F8F6FC` | Lienzo del fondo perla                |
| `urgent`    | `#FF3B30` | Llegada en menos de 3 minutos         |
| `accent`    | `#0A84FF` | Foco de inputs (azul de iOS)          |

Tipografía: Inter (Google Fonts). El fondo es un mesh gradient animado
"perla iridiscente" (azul `#A2C2FC`, lavanda `#E2B7FC`, blanco, índigo y azul
rosáceo) en `src/components/ui/MeshBackground.jsx`.

## Datos

La app empieza sin tarjetas: el usuario las crea (y elimina con su X) y
`useRoutes` las guarda en LocalStorage (`vbus:routes`) con su nombre, color,
autobuses visibles y líneas en orden de prioridad. Los datos vienen de `src/services/`:

- `vigobus.js`: cliente de [VigoBusAPI](https://github.com/David-Lor/VigoBusAPI)
  (`getStop(id)`, `getBuses(id, { all })`) con errores tipados
  (`VigoBusError.kind`: `network`, `timeout`, `not_found`, `upstream`, `http`).
- `vigobusAdapter.js`: convierte las respuestas al formato de la UI
  (`{ id, line, color, destination, time, urgent }`).
- `vigobusMock.js`: respuestas simuladas con la forma exacta de la API. **Se
  usan por defecto** mientras no haya backend; `VITE_VIGOBUS_MOCK=false`
  vuelve a las peticiones reales.

La hoja "Nueva tarjeta" ya usa este servicio: al escribir un número de parada
(`useStopLookup`, con espera de 350 ms y cancelación) muestra la parada o un
error, despliega sus líneas como chips y "Crear tarjeta" añade al Dashboard
una tarjeta con los tiempos adaptados (`toRouteCard`). Los tiempos guardados
son los del momento de crearla: todavía no se refrescan.

Además, en desarrollo, `App.jsx` pide la parada 3014 y muestra el resultado adaptado
en la consola del navegador.

### Levantar VigoBusAPI en local

VigoBusAPI no tiene instancia pública: hay que ejecutarla aparte (Python +
MongoDB; ver su repositorio). Escucha en `http://localhost:5000`. Como no
envía cabeceras CORS, la app llama a `/vigobus/...` y Vite lo reenvía a la API
(`vite.config.js`). Para otro destino:

```sh
VIGOBUS_PROXY_TARGET=http://mi-servidor:5000 npm run dev
```

Ver `.env.example` para `VITE_VIGOBUS_API_URL`.
