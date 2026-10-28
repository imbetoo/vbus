# Contexto Maestro · Vitrasa Tracker App

> Biblia técnica y visual del proyecto. Revisar antes de cada cambio para que
> componentes y diseño se alineen con lo descrito aquí.

## 1. Visión general

### Filosofía

App utilitaria, minimalista y ultra-rápida enfocada en el contexto del usuario
(rutinas). Estética estricta de Apple (iOS Human Interface Guidelines). Cero
fricción, sin mapas interactivos ni navegación compleja.

### Stack técnico

- **Actual:** Vite + React + Tailwind CSS (SWC plugin). PWA instalable
  ("VigoBus") con `vite-plugin-pwa`: manifest standalone, service worker de
  Workbox con `autoUpdate` que precachea el build (abre sin conexión; los
  tiempos de la API nunca se cachean) y metaetiquetas de iOS (barra de estado
  `black-translucent`, `apple-touch-icon`). Iconos en `public/`. Frontend en
  Vercel (`https://vbus-flame.vercel.app`).
- **Backend:** API propia en `backend/` (FastAPI + uvicorn, Python 3.13, sin
  base de datos) con los mismos endpoints y JSON que VigoBusAPI (`/status`,
  `/stop/{id}`, `/buses/{id}`), leyendo `datos.vigo.org` con caché en memoria y, como infobus, 1 minuto
  de margen restado a cada estimación; los refuerzos sin línea ("-") se
  descartan. En local: `npm run dev:api`.
  Puerto de `PORT`, CORS para localhost y Vercel, previews incluidas
  (`CORS_ORIGINS`, `CORS_ORIGIN_REGEX`). Desplegado en Render, plan free (pasos
  en el README, `render.yaml`): como se duerme sin uso, la app lo despierta al
  abrirse (`wakeApi()` → `/status`) y espera hasta 60 s por respuesta.
- **Futuro:** React Native / Expo para Android e iOS.
- **Almacenamiento:** Local (LocalStorage/AsyncStorage) para guardar paradas,
  tarjetas y preferencias. Sin base de datos externa en el cliente.

## 2. Guías de UI/UX

### Tipografía

Fuente principal: **Inter**. Mantener la proporción y jerarquía con clases
nativas de Tailwind:

| Elemento | Ejemplo | Tamaño orientativo | Peso |
| --- | --- | --- | --- |
| Títulos principales | "Buenos días", "Mis rutas" | `text-4xl` – `text-5xl` (escalas masivas) | `font-bold` ("Buenos días": `font-semibold`) |
| Títulos de tarjeta | "Ir al instituto" | `text-3xl` – `text-4xl`, `tracking-tight` | `font-bold` |
| Subtítulos y textos secundarios | "Desde Torrecedeira, 75", "Ver más autobuses" | `text-lg` – `text-xl` | `font-medium` |
| Nombres de ruta | "Chapela por G. Barbón" | `text-2xl` – `text-3xl` | `font-semibold` |
| Badges de línea | "C3d" | Equivalente a los subtítulos | `font-medium` |

Los tamaños finales (sm, md, lg, xl, 2xl…) se pueden ajustar para que el diseño
sea 100 % responsivo sin romper las tarjetas en pantallas pequeñas, pero los
**pesos de fuente se respetan estrictamente**.

### Elementos visuales

- **Fondo:** mesh gradient animado "perla iridiscente" (inspirado en Apple
  Music): azul `#A2C2FC`, lavanda `#E2B7FC`, blanco perla, índigo y azul
  rosáceo sobre lienzo `#F8F6FC`. `radial-gradient` en CSS puro y `@keyframes`
  lentos que solo animan `transform`, con velo blanco al 15 % (navy al 45 % en
  oscuro) y grano fino estático. Sin lag (60 fps).
- **Tarjetas del Dashboard:** grafito casi opaco `bg-[#272727]/80` con
  degradado interior sutil y **sin `backdrop-filter`** (el desenfoque en
  movimiento dejaba rastro negro en Chromium/WebKit), borde de 2px
  (`border-white/15` en claro, `border-[#272727]/60` en oscuro), sombra
  `shadow-glass` (brillo de 1px en el canto superior + sombra exterior suave),
  `rounded-[32px]` y `p-5`.
- **Rendimiento (Android):** la app no usa `backdrop-filter` en ningún sitio:
  todo lo que hay delante del mesh animado lo recalculaba en cada fotograma.
  Botones de la cabecera en blanco más opaco (`bg-white/70`, `bg-white/15` en
  oscuro); hojas y modales `bg-graphite` opacos sobre un velo `bg-black/50`
  sin desenfoque. Los contenedores con scroll llevan `transform-gpu`; las
  animaciones (reloj, modales, hojas, tirar para actualizar) solo tocan
  `transform`/`opacity` con su `will-change`, y ninguna transición usa
  `transition-all` (`PRESSABLE` transiciona `transform`, `opacity` y
  `background-color`).
- **Relieve 3D:** `shadow-relief` (luz interior arriba, sombra interior abajo)
  en distintivos de línea, pastillas de icono y círculos del selector de color.
- **Scroll:** ningún contenedor muestra barra de desplazamiento (regla global
  en `index.css`); el scroll sigue funcionando.
- **Estilo Bento / Soft Dark (referencia: extensión del usuario):** hojas y
  modales grafito casi opacos con asa, título + X circular; contenedores
  internos `rounded-3xl bg-white/[0.06] border border-white/10`; inputs
  `rounded-2xl bg-white/10` con borde y anillo azul iOS (`accent` `#0A84FF`) al
  enfocar; acción principal en píldora blanca a todo el ancho (`PillButton`).
- **Buscador predictivo de paradas (hoja "Nueva tarjeta"):** combobox
  accesible (`StopSearchField`): por dirección ("conde de torrecedeira", sin
  importar tildes ni orden de palabras) o por número ("84…"); las coincidencias
  salen debajo en una lista con scroll (hasta 30: primero coincidencias en el
  nombre principal, luego entre paréntesis; dentro de una calle, por número de
  portal) y se eligen con el dedo o con flechas + Enter (Escape cierra la
  lista). Cada sugerencia enseña el nombre entero (pasa a dos líneas si hace
  falta; la última palabra va pegada al número del portal, que nunca se corta:
  en una calle hay muchas paradas) y debajo "Parada N · líneas". Elegir una la
  busca por número como siempre. Fuente (`src/data/stops.js`):
  `src/data/stopsList.json` con las 1157 paradas de Vitrasa de los datos
  abiertos del Concello (`datos.vigo.org/data/transporte/paradas.json`; su
  `id` es el número de la marquesina), en un fichero aparte que se carga al
  abrir la hoja (`loadStopsList`); se regenera con `node
  scripts/update-stops.mjs`. Además, las paradas ya encontradas por número
  (`vbus:stops`) y las de las tarjetas, por si alguna nueva aún no está.
- **Cabecera:** a la izquierda "Buenos días" / "Mis rutas"; a la derecha, en
  columna, el reloj `hh:mm` (Inter semibold, `tabular-nums`, color del tema; al
  cambiar el minuto la hora anterior sube y sale mientras la nueva entra desde
  abajo, 600 ms, en un contenedor con `overflow: hidden`) y debajo tres botones
  circulares: Editar (lápiz/✓), Sol/Luna y Ajustes. "Mis rutas" no se parte en
  pantallas estrechas (baja de tamaño por debajo de 380 px).
- **Botones de icono:** circulares de 40px (área táctil ampliada a 48px),
  sutiles (`bg-white/70` en claro, `bg-white/15` en oscuro, sin blur).
- **Físicas:** al pulsar, tarjetas, botones, "Ver más autobuses" y pasos de la
  hoja rebotan con `active:scale-[0.97]` en 400 ms y curva
  `cubic-bezier(0.25, 1, 0.5, 1)` (`ease-spring`), definido una sola vez en
  `src/components/ui/pressable.js`.
- **Tema:** claro/oscuro con el botón Sol/Luna de la cabecera (se recuerda en
  LocalStorage; si no se ha elegido, sigue al sistema). El cambio usa View
  Transitions: la página entera funde en 500 ms `ease-in-out`, así todo cambia
  exactamente a la vez (nada de transiciones de color por elemento).
- **Hojas y modales:** entran **y salen** animados (`useAnimatedDialog`): la
  hoja inferior sube/baja deslizándose y el menú de ajustes funde y escala
  (95 % → 100 %); el resto de la pantalla se oscurece (sin desenfoque).
  Mientras hay un diálogo abierto el mesh se pausa (no se ve y así no gasta
  GPU).
- **Acordeones:** los pasos de la hoja se despliegan con `grid-template-rows`
  0fr → 1fr en 450 ms con la curva de hojas de iOS
  `cubic-bezier(0.32, 0.72, 0, 1)` (`ease-smooth`); el contenido aparece con
  un ligero retardo y se desvanece rápido al plegar.
- **Layout del Dashboard:** pantalla completa (`h-[100dvh]`, flex en
  columna): cabecera arriba, tarjetas con scroll propio en medio (sin barra,
  con máscara en degradado que las desvanece al llegar abajo) y "Crear nueva
  tarjeta" fijo abajo, respetando las safe areas. El contenedor de la lista va
  en una única capa de GPU (`transform-gpu`, `will-change-transform`) y nada
  dentro usa `backdrop-filter`: el scroll no repinta nada.
- **Tarjetas del usuario:** se guardan en LocalStorage (`vbus:routes`, en
  `useRoutes`) con toda su personalización; la primera vez, o si el dato está
  vacío o corrupto, la app empieza vacía (mensaje "Aún no tienes rutas"); cada tarjeta tiene una X discreta arriba a la derecha para
  eliminarla. Al borrar, la tarjeta se desvanece y encoge (escala 0,9) mientras
  su hueco se cierra en 800 ms `ease-out`; solo entonces sale del estado. Las
  tarjetas recién creadas entran con la animación inversa (las ya guardadas
  aparecen directamente al abrir la app) y el mensaje de lista vacía
  funde al aparecer y desaparecer.
- **Modo edición (estilo iOS, según el mockup del usuario):** se entra con el
  tercer botón circular de la cabecera (lápiz, a la izquierda de Sol/Luna y
  Ajustes; pasa a ✓ mientras se edita) o con una pulsación larga de 500 ms en
  una tarjeta (`useLongPress`, vibra y se traga el clic). Las tarjetas tiemblan
  (`animate-jiggle`: ±1°, 260 ms, solo `transform`, desfasado por tarjeta) y
  muestran: (1) círculo rojo con aspa superpuesto arriba a la izquierda
  (borra con la animación de salida), (2) círculo oscuro con lápiz arriba a la
  derecha en lugar de la X (abre el modal de alias, `AliasModal`) y (3) el
  tirador ≡ fuera de la tarjeta, en el margen derecho y centrado (la tarjeta
  se estrecha 28 px para dejarle sitio; el tirador no tiembla). La lista es un
  `Reorder.Group` de framer-motion (eje Y; `EditableRouteItem` =
  `Reorder.Item`) y solo se arrastra desde el tirador (`useDragControls`,
  `touch-action: none`), así el scroll sigue funcionando; la tarjeta
  arrastrada se levanta (escala 1,03) y deja de temblar. Cada cambio de orden
  se guarda al momento (`reorderRoutes` → `vbus:routes`). En edición se
  desactiva "tirar para actualizar"; sin tarjetas, el modo se apaga solo.
- **Alias:** cada tarjeta guarda `alias` ("Trabajo 💻"; vacío = sin alias) y
  `title` (lo que se enseña: el alias o el nombre de la parada). Con alias, el
  alias es el título y el nombre oficial va al subtítulo ("Desde Rúa do Conde
  de Torrecedeira, 81"); sin alias, el título es la parada y el subtítulo
  "Parada N". Se pone al crearla ("Nombre de la tarjeta") o con el lápiz del
  modo edición (`renameRoute`). Las tarjetas guardadas antes de existir
  `alias` lo reciben al cargar (su título si no era el de la parada).
- **Nada aparece de golpe:** mensajes de estado y textos que cambian entran con
  `animate-fade-in`; los subtítulos de los pasos de la hoja van en una sola
  línea para que su alto no cambie y no muevan el contenido.
- **Contenido de las tarjetas:** cada tarjeta tiene su propio nombre (si se
  deja vacío, el de la parada, y el subtítulo pasa a "Parada N") y su propio
  número de autobuses visibles (2 o 3) y su color de icono (8 colores
  predefinidos, `cardColors.js`), elegidos al crearla en el paso "Personaliza
  la tarjeta"; "Ver más autobuses" despliega el resto con el
  mismo plegado animado que los acordeones (componente `Collapse`) y su
  chevron (›) gira hacia arriba al expandir. El orden lo marca el ajuste
  "Ordenar autobuses por": llegada (menos minutos primero) o preferencia (el
  próximo de cada línea en el orden en que se eligieron, luego el resto).
- **Selección de líneas:** pastillas de cristal de ancho fijo: el círculo de
  prioridad siempre ocupa su sitio (anillo vacío sin elegir, blanco con su
  número 1, 2, 3… al elegir), así nada salta de fila. El paso de líneas usa el
  icono `Route`.
- **Ajustes:** modal con filas Bento y controles segmentados estilo iOS
  (pulgar blanco que se desliza; accesibles como grupo de radios). Dos ajustes:
  "Ordenar autobuses por" y "Fondo"; se guardan en LocalStorage (`useSettings`, en
  `App.jsx`). "Fondo": Completo (5 manchas) o Ligero (3: azul, lavanda y
  perla) para móviles con tirones. Si el navegador permite instalar la app (`beforeinstallprompt`,
  `useInstallPrompt`) aparece la fila "Instalar app" con su botón; en Safari de
  iOS, la indicación "Compartir → Añadir a pantalla de inicio".
- **Urgencia:** tiempos < 3 min usan el rojo nativo de iOS y una animación
  sutil (`ping`).

## 3. Hoja de ruta

### Fase 1 · UI Core — *En curso*

- Tarjetas de rutinas con filtrado: mostrar solo líneas favoritas por defecto.
  El botón "Ver más autobuses" expande las líneas secundarias.
- Interfaz de "Crear nueva tarjeta" (botón + gigante con estilo consistente).

### Fase 2 · Motor de datos — *En curso*

- Hecho: refresco automático cada 30 s (`useRoutes`), también al abrir la app y
  al volver a la pestaña; pausado con la pestaña oculta. Con datos simulados,
  los minutos descuentan con el reloj real.
- Hecho: "tirar para actualizar" (`usePullToRefresh` + `PullIndicator`). Solo
  empieza con la lista arriba del todo y el dedo bajando; banda elástica de
  iOS; el indicador de cristal baja, aparece y gira según lo que se tira.
  Pasados 64 px, la lista se queda a 56 px girando mientras `refresh()` de
  `useRoutes` pide los tiempos (mínimo 700 ms) y vuelve con un muelle de
  500 ms; por debajo, vuelve sin refrescar. La posición va en variables CSS
  (`--pull`, `--pull-progress`), sin renders de React, con `translate3d`.

- Fuente: backend propio (`backend/`) sobre la API de datos abiertos del
  Concello (`datos.vigo.org`), con el mismo JSON que VigoBusAPI.
- Tiempo real: auto-refresh cada 30 segundos (invisible para el usuario) +
  pull-to-refresh nativo.
- Fallback de errores: si la API/Vitrasa falla, mostrar "Error Vitrasa" y
  enseñar la hora teórica en gris en lugar del tiempo real.

### Fase 3 · UX avanzada — *Pendiente*

- Orden inteligente: reordenar las tarjetas según la hora del día (p. ej.
  mañanas: "Ir al instituto" primero; tardes: "Volver a casa" primero).
- Sistema de notificaciones: alarmas configurables por el usuario (p. ej.
  "Avisar cuando queden 5 min para el C3").

### Fase 4 · Onboarding — *Pendiente*

Métodos para añadir paradas:

1. Escáner de QR integrado con la cámara (para leer los QR de las marquesinas).
2. Pegar la URL del QR o el ID numérico de la parada manualmente.
3. (Bonus futuro) Lector NFC para paradas compatibles.

## 4. Forma de trabajar

1. Este documento es la referencia técnica y visual del proyecto.
2. No implementar todo de golpe: se trabaja mediante "vibecoding" (iteraciones
   pequeñas y continuas).
3. Ante cada cambio, revisar primero este contexto para asegurar que los
   componentes y el diseño se alinean con la arquitectura descrita.
