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
  `black-translucent`, `apple-touch-icon`). Icono maestro vectorial
  `public/icon.svg` (favicon y manifest), "símbolo de tránsito" al estilo de
  Cartera o App Store: un único símbolo focal grande, legible de 16 a 512 px.
  "Squircle" rx 115 con fondo azul profundo (`#1F5BD8` → `#0B1E4A`, luz
  arriba a la izquierda, y un rayo de luz diagonal muy tenue, blanco al 9 %,
  difuminado y desvanecido antes de la mitad) y un autobús de frente reducido
  un 7 % sobre su centro (`scale(0.93)`, ~60 % del ancho, con más espacio
  negativo; carrocería blanca → `#DCE6F7`, sin retrovisores ni detalles finos;
  parabrisas grande, rótulo y faros en cristal azul noche con un reflejo cian
  `#5AC8FA`, el único acento). El autobús es una losa de vidrio esmerilado
  (luz interior arriba, sombra interior abajo) con sombra larga y suave; el
  lienzo lleva reflejo convexo arriba, sombra interior y bisel (blanco arriba
  → negro abajo). Sin imágenes incrustadas. Los PNG (192, 512, maskable y
  apple-touch-icon a sangre) se generan con `npm run icons`
  (`scripts/generate-icons.js`, `sharp`). Frontend en
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
  modales grafito opacos con asa, título + X circular; contenedores
  internos `rounded-3xl bg-white/[0.06] border border-white/10`; inputs
  `rounded-2xl bg-white/10` con borde y anillo azul iOS (`accent` `#0A84FF`) al
  enfocar; acción principal en píldora blanca a todo el ancho (`PillButton`).
- **Buscador predictivo de paradas (hoja "Nueva tarjeta"):** combobox
  accesible (`StopSearchField`): por dirección ("conde de torrecedeira", sin
  importar tildes ni orden de palabras) o por número ("84…"); las coincidencias
  salen debajo en una lista con scroll (hasta 15: primero coincidencias en el
  nombre principal, luego entre paréntesis; dentro de una calle, por número de
  portal) y se eligen con el dedo o con flechas + Enter (Escape cierra la
  lista). Cada sugerencia enseña el nombre entero (pasa a dos líneas si hace
  falta; la última palabra va pegada al número del portal, que nunca se corta:
  en una calle hay muchas paradas) y debajo "Parada N · líneas". Elegir una la
  busca por número como siempre. Alias del callejero (`normalizeSearchText`,
  aplicado a la consulta y, una vez, a los nombres del índice): sin tildes ni
  mayúsculas, y las formas completas o abreviadas de castellano y gallego van
  a un mismo token como palabra entera (avenida/avda/av → avda;
  travesía/trav → tva; plaza/praza → pza; camino/camiño → cno; calle/rúa →
  rua; estrada/carretera/ctra → est; doctor/doutor → dr; arquitecto → arq;
  ingeniero/enxeñeiro → ing), así "Avenida de Europa" encuentra "Avda. de
  Europa" y "Plaza de América" encuentra "Praza de América"; la última
  palabra también vale a medio escribir ("aveni" → avda). Fuente
  (`src/data/stops.js`):
  `src/data/stopsList.json` con las 1157 paradas de Vitrasa de los datos
  abiertos del Concello (`datos.vigo.org/data/transporte/paradas.json`; su
  `id` es el número de la marquesina), en un fichero aparte (`loadStopsList`) que `App.jsx` precarga en segundo
  plano (`requestIdleCallback` 1,5 s después de arrancar), así ya está listo
  al abrir la hoja; se regenera con `node scripts/update-stops.mjs`. Además,
  las paradas ya encontradas por número (`vbus:stops`) y las de las tarjetas,
  por si alguna nueva aún no está. Rendimiento: al cargar la lista se
  construye una vez un índice (nombre normalizado, nombre principal, calle y
  portal), las paradas extra se cachean y solo se recalculan si cambia lo
  guardado, el input busca con 200 ms de debounce y `useMemo`
  (`useStopSearch`, sobre `useDebouncedValue`), y la lista corta (15) no
  necesita virtualización. Cada sugerencia lleva sus coordenadas (`lat`,
  `lon`) si se conocen.
- **Recientes (estilo Apple Maps):** `src/data/recentStops.js` guarda en
  LocalStorage (`vbus:recent`) las 5 últimas paradas elegidas, la más reciente
  primero y sin repetidas (elegir una que ya estaba la sube arriba). Se añaden
  al elegir una parada en la consulta rápida (origen o destino, también por
  QR) o en `StopPicker` (buscador, cercanas o QR). Con el campo enfocado y
  vacío, la lista enseña "Recientes" (encabezado gris con "Borrar" en azul,
  `RecentHeader`, fila de presentación del listbox) con las mismas filas que
  los resultados; al escribir, resultados normales. En el origen van debajo de
  "Mi ubicación actual"; en el destino, sin historial, siguen los tiempos.
  `useRecentStops` (`useSyncExternalStore`, también entre pestañas) completa
  cada parada con los datos actuales de `stopsList`. Un LocalStorage vacío,
  con JSON inválido o bloqueado deja el historial vacío sin errores.
- **Paradas cerca de mí (misma hoja):** botón de cristal con `LocateFixed` bajo
  el buscador (`NearbyStops`). Pide la ubicación (`getCurrentPosition` de
  `src/lib/geo.js`: alta precisión, 15 s) y con Haversine (sin librerías) ordena
  las 1157 paradas: enseña las 5 más cercanas a menos de 800 m (o las 5 más
  próximas si no hay ninguna tan cerca) con su distancia en la fila ("Parada
  8480 · 10 m · líneas"); elegir una la busca por número. Estados: "Buscando
  tu ubicación…", permiso denegado, sin señal/tiempo agotado, navegador sin
  GPS y fuera de Vigo (parada más cercana a más de 15 km). La ubicación no se
  guarda. Buscador y cercanas forman `StopPicker`, reutilizable: solo
  devuelve la parada elegida (`onSelect`), sin crear nada.
- **Consulta rápida (lupa de la cabecera) · Asistente de rutas directas:**
  `QuickLookSheet`, panel inferior con framer-motion dentro de un `<dialog>`
  modal (entra y sale deslizándose con muelle; alto fijo del 85 % para que
  nada salte al cambiar el contenido; se cierra con la X, Escape, tocando
  fuera o arrastrando el asa o la cabecera hacia abajo). Dentro,
  `RoutePlanner`: dos campos al estilo de Apple Maps (`RouteFields`, un
  bloque de cristal con línea punteada entre los iconos):
  - **Origen (A):** empieza como "Mi ubicación actual" (texto azul, flecha
    rellena): `useNearestStop` pide el GPS y lo ancla con Haversine a la
    parada más cercana. Al enfocarlo se busca otra; con el campo vacío la
    lista ofrece volver a "Mi ubicación actual". Sin permiso, sin señal, sin
    GPS o fuera de Vigo, queda vacío ("Buscar parada de origen…") con un
    aviso, y se escribe a mano.
  - **Destino (B):** búsqueda predictiva sobre `stopsList.json`.
  - Cada campo tiene su X para limpiarlo, y el botón ⇄ (`ArrowUpDown`) invierte
    el trayecto girando media vuelta con muelle. Las sugerencias del campo
    activo (`StopSuggestions`, combobox con flechas + Enter; Escape deja de
    editar sin cerrar el panel) sustituyen a los resultados mientras se
    escribe.
  - **Lógica con sentido de la marcha (`src/lib/directRoute.js`, todo en el
    cliente):** solo A → sus llegadas, como siempre. A y B → `planDirectRoute`
    con los recorridos del GTFS (`src/data/routes.json`, `[{ line, dir, head,
    stops, m }]`; `useRouteIndex` lo pide al abrir el panel, `fetch` de un
    asset con 10 s de límite, índice `parada → [recorrido, posición]` en ~5 ms,
    y el service worker lo precachea). Un trayecto es directo solo si algún
    recorrido pasa por A y después por B (`pos(B) > pos(A)`). B incluye las
    paradas a ≤150 m (`NEARBY_STOP_M`: la de enfrente; "Bájate en … · a 20 m de
    tu destino"), y si desde A no sale ninguna, se sube en la de alrededor que
    sí (aviso en azul y se piden sus tiempos). Cada línea con su mejor opción y
    de menos a más rodeo (`m[B] − m[A]` + 4× lo andado); las que doblan el
    recorrido de la mejor (+1 km) se descartan, y si hasta la mejor triplica la
    línea recta se avisa ("Da un rodeo…"). Los autobuses de la API se filtran
    por letrero (`route` = `head` del GTFS, sin tildes ni mayúsculas): las
    variantes cortas o de sentido contrario se ocultan ("Se oculta 1 autobús…");
    un letrero desconocido no se descarta. Sin autobuses que lleguen: "No hay
    autobuses próximos que lleguen hasta tu destino." Mientras cargan los
    recorridos: "Comprobando el sentido de la marcha…" (sin llamar a la API).
    Si no cargan (red, `[]`), cruce plano de antes (`findDirectLines`, sin
    distinguir mayúsculas ni espacios) con el aviso "No se pudo verificar el
    sentido. Confirma en Mapas." Sin línea directa NO se llama a la API:
    "Sin línea directa" y "Ver ruta con transbordos" como acción principal
    (píldora blanca). Misma parada → "Ya te encuentras en esta parada", sin
    llamada. API caída → aviso y Mapas sigue disponible.
  - **Datos de recorridos:** `scripts/generate-routes.mjs` (`npm run routes`)
    descarga el GTFS del Concello (`gtfs_vigo.zip`), lo descomprime en
    streaming con `fflate` (verificando CRC-32 y tamaño de cada fichero con el
    directorio central) y lee `stops.txt` (`stop_code` = marquesina),
    `routes.txt`, `trips.txt` y `stop_times.txt` fila a fila; un recorrido por
    línea + sentido + letrero + secuencia, metros por Haversine entre paradas
    consecutivas; escritura atómica. `prebuild` lo ejecuta con `--soft` (si
    falla, aviso y el build sigue con el fichero anterior o `[]`;
    `vercel.json` fija `npm run build`) y `update-routes.yml` (GitHub
    Actions, semanal) sin `--soft` y sube el resultado a `main`.
  - **Sin conexión (rutas offline):** `routes.json`, `stopsList` y la app van
    en el precache del service worker (al instalar; `assetsInlineLimit` impide
    que un JSON se incruste como `data:` y salga del precache), así que el plan
    con sentido de la marcha funciona en modo avión. Las peticiones a la API
    (`src/services/vigobus.js`) distinguen tres casos: modo avión
    (`navigator.onLine === false`: error `offline` sin intentarlo), Lie-Fi
    (router sin internet: si la API no contesta en 1 s, `probeNetwork` hace un
    HEAD a nuestro dominio, `icon.svg?probe=…`, fuera del precache, con 3 s de
    límite; si falla, `AbortController` aborta la petición → `offline` en
    ≤4 s) y servidor de Render despertando (la sonda contesta: se sigue
    esperando hasta 60 s; un corte ciego a los 4 s lo daría por caído). Un
    fallo inmediato de `fetch` también se clasifica con la sonda (`offline` o
    `network`). `useStopArrivals` no solapa peticiones, nunca deja una
    excepción suelta y recarga al volver la conexión (`online`). En la
    consulta rápida: aviso "Sin conexión…" arriba en modo avión
    (`useOnlineStatus`); solo origen → "Sin conexión. No se pueden cargar los
    tiempos en directo."; ruta directa → las líneas del GTFS igual y "Líneas
    directas estáticas (Sin conexión a los tiempos de Vitrasa)."; con tiempos
    previos, "Sin conexión: son los últimos tiempos recibidos". Mapas sigue
    disponible. `routes.json` desde la red (sin service worker) también tiene
    la guarda de Lie-Fi (`guardAgainstLieFi`).
  - **Mapas (`MapsLink`):** enlace universal
    `https://www.google.com/maps/dir/?api=1&origin=lat,lon&destination=lat,lon&travelmode=transit`
    (desde el GPS, la posición exacta del usuario; si una parada no tiene
    coordenadas, su nombre) en una pestaña nueva: el sistema lo abre en la app
    nativa. Botón de cristal al final de los resultados con ruta directa.
  - No se guarda nada: solo "Añadir a Mis Rutas" (botón secundario de
    cristal) crea la tarjeta de la parada de subida, con todas sus líneas o,
    en una ruta directa, solo las directas (de menos a más rodeo), y cierra
    el panel.
  - Rendimiento: búsquedas con debounce de 200 ms y `useMemo`
    (`useStopSearch`, compartido con "Nueva tarjeta"); el plan (~0,2 ms) y el
    filtrado con `useMemo` que solo dependen de A, B y los recorridos (escribir
    no los recalcula); manejadores con `useCallback` y `RouteResults` en
    `React.memo`.
- **Escáner QR de marquesinas (`ScannerSheet`):** a pantalla completa en un
  `<dialog>` (fundido), con la cámara trasera (`getUserMedia`, `playsinline`)
  y un visor cuadrado con esquinas redondeadas (el resto oscurecido con
  `box-shadow`; se pone verde al leer, vibra en Android y cierra). Se abre con
  el botón QR de la cabecera de la consulta rápida (la parada leída pasa a ser
  el Origen) y con "Escanear QR de la parada" en "Nueva tarjeta" (`StopPicker`
  → `onSelect`). Lectura: `BarcodeDetector` si existe (Chrome Android); si no
  (Safari/iOS), jsQR en un Web Worker (`src/lib/qrDecoder.js`,
  `qrWorker.js`, chunk aparte que solo se descarga al escanear), ~8
  fotogramas/s reducidos a 800 px. El texto se interpreta con `parseStopQr`
  (`src/lib/qrStop.js`): QR actual
  `https://infobus.vitrasa.es:8002/Default.aspx?parada=8480`, cualquier URL
  con `parada=`, el número solo y, en dominios de Vitrasa/Concello, parámetros
  genéricos o el número al final de la ruta; `findStop` da los datos de
  `stopsList`. Estados: navegador sin cámara, permiso denegado, sin cámara,
  QR que no es de Vitrasa (aviso que se borra solo y sigue escaneando). Plan B:
  "Hacer una foto" (`<input capture>`, se decodifica la imagen); linterna si la
  cámara la tiene. La cámara se apaga al cerrar. `useAnimatedDialog` (y la
  consulta rápida) ignora `cancel`/`close` de diálogos anidados, que React
  propaga al padre.
- **Cabecera:** a la izquierda "Buenos días" / "Mis rutas"; a la derecha, en
  columna, el reloj `hh:mm` (Inter semibold, `tabular-nums`, color del tema; al
  cambiar el minuto la hora anterior sube y sale mientras la nueva entra desde
  abajo, 600 ms, en un contenedor con `overflow: hidden`) y debajo cuatro
  botones circulares: Consulta rápida (lupa), Editar (lápiz/✓), Sol/Luna y
  Ajustes (36 px por debajo de 400 px de ancho). "Mis rutas" no se parte en
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
  derecha en lugar de la X (abre "Editar tarjeta", `EditCardModal`) y (3) el
  tirador ≡ fuera de la tarjeta, en el margen derecho y centrado (la tarjeta
  se encoge al 92 % desde la izquierda con `transform`, sin tocar márgenes ni
  layout, para dejarle sitio; el tirador no tiembla). Para no repintar de más,
  `RouteCard` y `EditableRouteItem` van en `React.memo` con callbacks estables
  del Dashboard (`onRemove(id)`, `onEditCard(id)`), y `Reorder.Item` usa
  `layout="position"`. La lista es un
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
  modo edición (`updateRoute`). Las tarjetas guardadas antes de existir
  `alias` lo reciben al cargar (su título si no era el de la parada).
- **Líneas visibles por tarjeta:** `lines` es el array de líneas visibles en
  orden de prioridad (las demás están ocultas). En "Editar tarjeta" (lápiz del
  modo edición: alias + "Líneas") salen todas las que pasan por la parada
  (datos abiertos + las de la tarjeta) como las pastillas de `LineChips`:
  encendidas se ven, en el orden en que se tocaron; al menos una. La tarjeta
  filtra sus llegadas por `lines`; al guardar se quitan las de líneas ocultas
  y se refresca para traer las que vuelven a mostrarse.
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
- **Selección de líneas:** las pastillas de "Nueva tarjeta" son las líneas
  teóricas de la parada en `stopsList.json` (`stopLines`), circulen o no en
  ese momento (de noche no pasan todas y la tarjeta puede ser para mañana); el
  contador "N líneas" usa esa misma lista. Solo si la parada no está en los
  datos abiertos se usan las que llegan ahora según la API. Pastillas de
  cristal de ancho fijo: el círculo de
  prioridad siempre ocupa su sitio (anillo vacío sin elegir, blanco con su
  número 1, 2, 3… al elegir), así nada salta de fila. El paso de líneas usa el
  icono `Route`.
- **Ajustes:** modal con filas Bento y controles segmentados estilo iOS
  (pulgar blanco que se desliza; accesibles como grupo de radios), con scroll
  si no cabe. Cuatro ajustes, en LocalStorage (`useSettings`, en `App.jsx`):
  "Ordenar autobuses por"; "Formato de tiempo": Relativo ("5 min") o Absoluto
  ("12:45", minutos sumados a `updatedAt`, la hora en que llegaron los
  tiempos, así no se desvía entre refrescos); "Actualizar datos": 15, 30
  (por defecto) o 60 s (el intervalo de `useRoutes` se rehace al cambiarlo); y
  "Fondo": Completo (5 manchas) o Ligero (3: azul, lavanda y
  perla) para móviles con tirones. Si el navegador permite instalar la app (`beforeinstallprompt`,
  `useInstallPrompt`) aparece la fila "Instalar app" con su botón; en Safari de
  iOS, la indicación "Compartir → Añadir a pantalla de inicio". Al pie, la
  versión en gris pequeño y centrada ("VigoBus v1.19 • Build: 29/10/2026,
  22:42 · 4c8e5b7"): versión de `package.json` sin el parche (se sube con cada
  PR: `npm version minor`; v1.19 = PR #19), hora de compilación
  (Europa/Madrid) y commit de Vercel, inyectados por `vite.config.js`
  (`__BUILD_INFO__`); si no coincide con el último despliegue, el móvil usa un
  build antiguo del caché.
- **Accesos directos del icono (manifest `shortcuts`):** al mantener pulsado
  el icono (Android y escritorio; iOS no los admite en apps web): "Escanear
  QR" (`/?accion=escanear`: consulta rápida con el escáner encima, la parada
  leída como Origen), "Buscar parada" (`/?accion=buscar`: consulta rápida con
  el Destino enfocado al terminar de subir) y "Nueva tarjeta"
  (`/?accion=nueva`). El Dashboard lee `accion` una vez y lo quita de la URL
  (recargar no lo repite; valores desconocidos se ignoran). Iconos
  `shortcut-*.png` (192 px, glifo de lucide en blanco sobre el azul del
  icono, a sangre) generados por `npm run icons`.
- **Urgencia:** tiempos < 3 min usan el rojo nativo de iOS y una animación
  sutil (`ping`).

## 3. Hoja de ruta

### Fase 1 · UI Core — *En curso*

- Tarjetas de rutinas con filtrado: mostrar solo líneas favoritas por defecto.
  El botón "Ver más autobuses" expande las líneas secundarias.
- Interfaz de "Crear nueva tarjeta" (botón + gigante con estilo consistente).

### Fase 2 · Motor de datos — *En curso*

- Hecho: refresco automático cada 30 s (15/30/60 s en Ajustes, `useRoutes`), también al abrir la app y
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

1. Hecho: escáner de QR integrado con la cámara (`ScannerSheet`, ver arriba).
2. Pegar la URL del QR o el ID numérico de la parada manualmente.
3. (Bonus futuro) Lector NFC para paradas compatibles.

## 4. Forma de trabajar

1. Este documento es la referencia técnica y visual del proyecto.
2. No implementar todo de golpe: se trabaja mediante "vibecoding" (iteraciones
   pequeñas y continuas).
3. Ante cada cambio, revisar primero este contexto para asegurar que los
   componentes y el diseño se alinean con la arquitectura descrita.
