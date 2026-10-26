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

## PWA

La app se instala como "VigoBus" (`vite-plugin-pwa`, configurado en
`vite.config.js`). El service worker solo existe en el build: para probar la
instalación, `npm run build && npm run preview` y abrir `http://localhost:4173`.
En el móvil hace falta HTTPS (por IP de la red local el navegador no registra el
service worker); en Ajustes aparece "Instalar app" cuando se puede. Los iconos
(`public/pwa-*.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`) son
provisionales y se pueden sustituir con el mismo nombre y tamaño.

## Estructura

```
backend/         # API en Python para Render (main.py, tests, requirements)
src/
├── components/
│   ├── ui/           # genéricos (GlassCard, IconHeading, Sheet, MeshBackground…)
│   ├── bus/          # dominio de autobuses (RouteCard, BusLineItem, LineBadge, ArrivalTime)
│   ├── create-card/  # flujo "Crear nueva tarjeta" (botón, hoja y pasos)
│   └── settings/     # botón de tema y menú de ajustes
├── hooks/       # useRoutes, useSettings, useStopLookup, useTheme, useClock, useAnimatedDialog, usePullToRefresh, useInstallPrompt
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
una tarjeta con los tiempos adaptados (`toRouteCard`). Los tiempos de todas las
tarjetas se refrescan al abrir la app, cada 30 s (`useRoutes`) y al tirar hacia
abajo de la lista (`usePullToRefresh`).

## Backend (`backend/`)

API propia mínima en Python (FastAPI + uvicorn, sin base de datos) con los
mismos endpoints y el mismo JSON que VigoBusAPI, así el frontend no cambia:

| Endpoint | Respuesta |
| --- | --- |
| `GET /status` | `OK` (health check) |
| `GET /stop/{id}` | `{ stop_id, name, lat, lon }` · 404 si no existe |
| `GET /buses/{id}?get_all_buses=false` | `{ buses: [{ line, route, time, bus_id }], more_buses_available }` |

Lee los tiempos de la API de datos abiertos de Vigo
(`datos.vigo.org/vci_api_app/api2.jsp`, la misma que usa VigoBusAPI), con
caché en memoria (15 s los tiempos, 1 h las paradas). Como infobus, resta 1
minuto a cada estimación (margen para no perder el autobús) y descarta los
refuerzos sin línea (`"-"`). Si la fuente falla
responde 500 con `detail: "Error Vitrasa: …"`. El puerto sale de `PORT`
(8000 por defecto) y los orígenes CORS de `CORS_ORIGINS` (por defecto
`http://localhost:5173`, `http://localhost:4173` y
`https://vbus-flame.vercel.app`).

### En local

Desde la carpeta `backend`. Cada línea es un comando: escríbelas una a una.
`python -m pytest` pasa los tests (deben pasar 12) y el último comando deja
el servidor en marcha: no cierres esa ventana y abre
`http://localhost:5000/status` (→ `OK`).

**Windows · Símbolo del sistema (cmd)**

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
python -m pytest
set PORT=5000
python main.py
```

**Windows · PowerShell**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m pytest
$env:PORT=5000
python main.py
```

**macOS / Linux**

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest
PORT=5000 python main.py
```

En otra terminal, la app contra este backend (el proxy de Vite reenvía
`/vigobus/*` a `localhost:5000`):

```sh
npm run dev:api
```

(`npm run dev` a secas usa los datos simulados, donde solo existe la parada
3014; `dev:api` carga `.env.api`, con `VITE_VIGOBUS_MOCK=false`.)

### Despliegue en Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
   → conecta GitHub y elige el repo `vbus`.
2. Rellena:
   - **Name:** `vigobus-api` (la URL será `https://vigobus-api.onrender.com`).
   - **Branch:** la rama que quieras desplegar.
   - **Root Directory:** `backend`
   - **Runtime / Language:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python main.py`
   - **Instance Type:** `Free`
3. **Advanced** (o **Environment** después):
   - Variable `PYTHON_VERSION` = `3.13`.
   - (Opcional) `CORS_ORIGINS` si la app vive en otro dominio.
   - **Health Check Path:** `/status`.
4. **Create Web Service** y espera a "Live". Comprueba
   `https://vigobus-api.onrender.com/status` (→ `OK`) y
   `https://vigobus-api.onrender.com/buses/8480`.

Alternativa: **New** → **Blueprint** con este repo usa `render.yaml`, que
crea el mismo servicio.

El plan gratuito se duerme tras 15 min sin peticiones: la primera vuelve a
tardar ~1 min (la app puede mostrar un error de tiempo agotado; al tirar para
actualizar ya responde).

### Conectar la app de Vercel

En Vercel → proyecto → **Settings** → **Environment Variables**:

- `VITE_VIGOBUS_MOCK` = `false`
- `VITE_VIGOBUS_API_URL` = `https://vigobus-api.onrender.com`

Las variables `VITE_*` se leen al compilar: haz **Redeploy** después de
guardarlas.
