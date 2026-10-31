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
  ("vBus") con `vite-plugin-pwa`: manifest standalone, service worker de
  Workbox que precachea el build (abre sin conexión; los tiempos de la API
  nunca se cachean; `importScripts` añade `public/sw-notifications.js`:
  tocar la notificación del modo viaje vuelve a la app, y al activarse una
  versión nueva borra cualquier caché que no sea el precache actual o las
  fuentes) y metaetiquetas de iOS (barra de estado
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
  Vercel (`https://vbus-flame.vercel.app`; `vercel.json` sirve `/`,
  `index.html`, `sw.js`, `sw-notifications.js` y el manifest con
  `Cache-Control: no-cache`).
- **Actualizaciones OTA (`useAppUpdate`, `UpdateToast`):** `registerType:
  'prompt'` e `injectRegister: false`; la app registra el service worker con
  `useRegisterSW` (`virtual:pwa-register/react`) y busca versiones nuevas al
  abrir, al volver a la app (`visibilitychange`: una PWA de iOS que se
  reanuda no navega) y cada hora (`registration.update()`, sin red no; programado una sola vez por
  página). La
  versión nueva se instala en segundo plano y espera (`needRefresh`): aviso
  flotante abajo, por encima de "Crear nueva tarjeta", sin bloquear nada
  (grafito opaco, sin `backdrop-filter`; entra y sale con `transform` y
  `opacity`): icono, "Nueva versión de vBus disponible.", "Actualizar"
  (píldora blanca; "Actualizando…" con indicador) y una X discreta ("Ahora
  no": vuelve a avisar en el próximo arranque o con la siguiente versión).
  "Actualizar" manda `SKIP_WAITING` → `skipWaiting()`; el nuevo toma el
  control (`clientsClaim`), Workbox poda el precache y
  `cleanupOutdatedCaches` borra el de versiones antiguas, y la página se
  recarga con el HTML, JS y CSS nuevos (si en 4 s no toma el control, se
  recarga igual). Sin service worker (navegador antiguo), sin aviso y sin
  errores.
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

- **Fondo:** mesh gradient animado (inspirado en Apple Music); en la paleta
  Vigo, "perla iridiscente": azul `#A2C2FC`, lavanda `#E2B7FC`, blanco perla,
  índigo y azul rosáceo sobre lienzo `#F8F6FC`. `radial-gradient` en CSS puro
  y `@keyframes` lentos que solo animan `transform`, con velo blanco al 15 %
  (navy al 45 % en oscuro) y grano fino estático. Sin lag (60 fps).
  `MeshBackground` va en `React.memo` (solo `lite` y `oled`).
- **Motor de temas (`src/lib/appearance.js`, ajustes "Tema" y
  "Dinamismo"):** CSS primero, sin React por fotograma. Cada paleta es un
  bloque `[data-palette='…']` de variables RGB en `index.css` (lienzo
  `--mesh-canvas`, manchas `--mesh-1…5`, velo `--mesh-veil`/`--mesh-veil-dark`
  y `--accent`), que leen las manchas (`bg-mesh-*`), el lienzo (`pearl`) y el
  acento de toda la interfaz (`accent` de Tailwind,
  `rgb(var(--accent) / <alpha-value>)`: foco, iconos azules, aviso de
  versión). Elegir solo escribe `data-palette`/`data-motion` en `<html>`
  (`applyAppearance`) dentro del mismo fundido de View Transitions que el
  Sol/Luna (`changeAppearance`); el script de `index.html` los pone antes del
  primer pintado (sin destello). Las muestras de Ajustes llevan su propio
  `data-palette`: el CSS es la única fuente de colores. Nueve paletas: Vigo
  (por defecto), Naturaleza, Atardecer, Océano, Cyberpunk (oscura), Lavanda,
  Nube (clara), Sombra (oscura) y OLED (negro puro: `MeshBackground` devuelve
  `null`, sin capas que componer, y `body` en `#000`). Las que fijan el modo
  (`scheme`) mandan sobre el Sol/Luna, que queda desactivado ("El tema Sombra
  siempre es oscuro"; `useTheme(forced)`) sin tocar la elección guardada,
  que vuelve al cambiar de paleta. Dinamismo: `--mesh-speed` escala duración
  y desfase de los `@keyframes` (Fluido 0,5: el doble de rápido; Relajado 1,
  por defecto) y Estático pausa las manchas (`animation-play-state:
  paused`, 0 % de CPU).
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
  en `index.css`); el scroll sigue funcionando. Las listas con scroll entre
  una cabecera y un pie fijos (consulta rápida, hojas como "Nueva tarjeta",
  modos viaje y salida) llevan `scroll-fade` (`index.css`): `mask-image` que
  desvanece lo que pasa bajo la cabecera (16 px, `--fade-top`) y sobre el pie
  (32 px, `--fade-bottom`) en vez de cortarlo en seco; el padding del
  contenedor es al menos ese tamaño (consulta rápida `pt-5 pb-10`), así en
  reposo el primer y el último elemento se ven enteros. En la consulta
  rápida, cabecera de campos y pie de botones son opacos (`bg-graphite`,
  `relative z-10`) y hermanos flex de la lista: nunca se solapan con ella.
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
  `id` es el número de la marquesina), en un fichero JSON aparte (`?url`, en el
  precache; `loadStopsList` lo lee con `fetchJsonAsset` de
  `src/lib/network.js`, con guarda de Lie-Fi y, si falla, reintento en la
  siguiente llamada: un `import()` dinámico fallido no se puede reintentar) que
  `App.jsx` precarga en segundo plano (`requestIdleCallback` 1,5 s después de
  arrancar), así ya está listo al abrir la hoja; índice `stopsById` (Map) para
  `stopLines`, `stopById` y `findStop` en O(1); se regenera con `node scripts/update-stops.mjs`. Además,
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
  vacío, la lista enseña "Recientes" (encabezado gris con la pista "Desliza
  ← para borrar", `RecentHeader`, fila de presentación del listbox) con las
  mismas filas que los resultados; al escribir, resultados normales. Sin
  botones de borrar: cada reciente se borra **deslizándola a la izquierda**
  como en Mail de iOS (`SwipeableOption`, framer-motion): la fila sigue al
  dedo 1:1 (resistencia hacia la derecha) y destapa un rojo `bg-urgent` con
  la papelera blanca (el rojo crece con `scaleX`, solo transform); al
  cruzar el umbral (110 px o un tercio de la fila) la papelera crece y da un
  toque háptico; al soltar pasado él (o con un gesto rápido) la fila sale
  por la izquierda con un muelle y su hueco se cierra (`grid-template-rows`,
  280 ms) → `removeRecentStop`; si no, vuelve con el muelle. Tocar sin
  arrastrar elige la parada; con teclado, Suprimir (o Retroceso con el campo
  vacío) borra la marcada. En el origen van debajo de
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
  - **Compartir ruta (`ShareRouteButton`, `src/lib/share.js`):** botón sutil
    (icono de compartir de iOS en Apple, de Android en el resto) arriba a la
    derecha de "Sale de" en una ruta directa. Texto: "🚌 Ruta vBus: De
    [subida] a [destino]. Líneas directas: […]. Consulta tiempos en [enlace]",
    con un enlace `/?origen=6860&destino=8480` que abre la app con ese
    trayecto (consulta rápida con Origen y Destino, sin pedir el GPS; el
    Dashboard limpia la URL). `navigator.share` (con `canShare`) en
    `try/catch`: cancelar el menú no avisa; sin Web Share o si falla, se copia
    (`clipboard.writeText` o, si no, `<textarea>` + `execCommand`) y un aviso
    "Ruta copiada al portapapeles" (2,2 s, `role="status"`). Un doble toque no
    abre dos menús.
  - **Compartir Mis rutas (sin backend, `src/lib/routesShare.js`):** todas las
    tarjetas viajan en el propio enlace, `/?tarjetas=…`, un parámetro aparte
    del de un trayecto (`origen`/`destino`, que no cambia). Formato `{ v: 1,
    t: [[stopId, alias, lines, color, busesToShow, note?], …] }` en JSON → UTF-8
    (alias con tildes y emoji) → base64url sin relleno; sin tiempos ni ids (se
    regeneran al importar; la nota, 6.º elemento opcional: los enlaces sin ella
    siguen valiendo). `decodeRoutes` nunca lanza: base64 o JSON rotos,
    versión desconocida, más de 50 tarjetas o ninguna válida → `null`; campo a
    campo (parada entera, alias ≤60, líneas de texto, color de `CARD_COLORS`,
    2 o 3 visibles). **Exportar:** en Ajustes, fila "Compartir mis rutas
    guardadas" (con al menos una tarjeta) → `ShareRoutesModal` (cargado con
    `lazy` la primera vez: el generador de QR no pesa en el arranque): QR del
    enlace generado en el cliente (`uqr`, corrección M, un único `<path>` SVG
    negro sobre blanco), la lista de lo que se comparte (`RoutesPreview`),
    "Compartir enlace" (menú nativo, si existe) y "Copiar enlace" (`copyText`
    de `share.js`, toque `select` y aviso "Enlace copiado" dentro del modal).
    **Importar:** el Dashboard lee `tarjetas` antes del primer render
    (`readImport`; `readLaunch` ignora esa URL) y abre `ImportRoutesSheet`, hoja
    de acciones al estilo de iOS: "Colección de rutas recibida", la lista,
    "Añadir a mis rutas" (sin duplicados exactos: misma parada, alias, líneas
    en orden, color y visibles, sin contar la nota; desactivado si ya las
    tienes todas),
    "Reemplazar mis rutas" (solo si ya tienes alguna; "Se borrarán tus N rutas
    actuales") y "Cancelar" en rojo (también Escape, tocar fuera o deslizar).
    `useRoutes.importRoutes(cards, 'merge' | 'replace')` las guarda y pide sus
    tiempos; los nombres de parada salen de `stopsList`. Avisos "2 rutas
    añadidas" / "Rutas reemplazadas" (`Toast` + `useToast`, `impact`). Tras
    elegir (también Cancelar) se quita `tarjetas` de la URL
    (`history.replaceState`): recargar no vuelve a preguntar. Enlace roto: sin
    hoja, aviso "Enlace inválido: no se pudieron leer las rutas" y URL limpia.
  - **Modo viaje · alarma de destino (`TripAlarm`, `TripSheet`, `useTrip`,
    `src/lib/tripTracker.js`):** botón de cristal "Avisarme" (campana ámbar)
    bajo las llegadas de una ruta directa. Decisión: **Wake Lock + polling en
    primer plano**, no temporizador en el service worker. El navegador mata
    un service worker inactivo en segundos (no puede llevar un `setTimeout`
    de 20 min), no hay notificaciones locales programadas en la web
    (Notification Triggers se abandonó) y una push de verdad necesita un
    servidor despierto (Render gratis se duerme); además el temporizador no
    se reajustaría con un atasco. El toque de "Avisarme" hace, en el mismo
    gesto (Safari lo exige), `keepScreenOn()` (`src/lib/wakeLock.js`: Screen
    Wake Lock, se recupera solo al volver a la pestaña; nunca hay dos peticiones
    en vuelo, así ningún bloqueo queda huérfano al terminar), desbloquea el sonido
    (el `Audio` del timbre) y pide `Notification.requestPermission()` sin esperarlo (con
    la versión de callback del Safari antiguo). Abre a pantalla completa un
    `<dialog>` negro puro (OLED, ahorro de batería) con "Bájate en [parada]"
    y tres fases:
    - **Esperando:** "Tu autobús" (el primero que llega a la subida o el que
      se elija entre las pastillas "¿Vas a coger otro?"), "Llegarías a tu
      parada en unos N min" y "Ya voy en el autobús". Pasa a "En camino" con
      ese botón, cuando el GPS ve que avanzas 150 m por el recorrido o, sin
      GPS, cuando ese autobús pasa por la parada de subida.
    - **En camino:** "Llegas a tu parada en N min" (enorme), la línea y, con
      GPS, "Quedan 4 paradas · 1,3 km".
    - **Aviso:** a ≤3 min según Vitrasa **o** a ≤700 m de recorrido según el
      GPS (gana la primera): vibración (Android), tres tonos, notificación
      "Prepárate para bajar" desde el service worker (`tag` `vbus-trip`) y
      el panel ámbar con "Entendido". Se apaga solo a los 5 min.
    - **Señales:** (1) tiempo real de la parada de **bajada**
      (`useStopArrivals` con `background`: cada 60 s, cada 20 s a ≤8 min;
      incluye el tráfico y se reajusta en cada lectura); la API no dice qué
      autobús es el tuyo, así que se sigue por continuidad (`pickBus`: el más
      cercano a lo esperado; al empezar, su llegada a la subida + metros del
      GTFS a 15 km/h; en la duda, el que llega antes: mejor pronto que
      tarde). (2) GPS en continuo (`useWatchPosition`, fijos de ≤150 m de
      precisión) proyectado sobre el tramo del GTFS (`tripPath` +
      `routeProgress`, solo avanza), que funciona sin red; sin recorrido
      verificado, línea recta a la parada.
    - **Sin APIs:** sin Wake Lock, "tócala de vez en cuando"; notificaciones
      denegadas o sin soporte, aviso solo en pantalla con sonido y
      vibración; iPhone en Safari, "añade vBus a la pantalla de inicio"
      (iOS solo notifica a apps instaladas, 16.4+); sin GPS, solo Vitrasa;
      sin red, solo GPS; sin ninguno, se dice. Siempre: "Mantén vBus
      abierta: si cambias de app o bloqueas el móvil, el aviso puede no
      llegar". Terminar (X, Escape o "Entendido") suelta la pantalla y quita
      la notificación. No se guarda nada.
  - **Modo salida · alarma de origen (`DepartureAlarm`, `LeadTimeModal`,
    `DepartureSheet`, `useDeparture`, `src/lib/departure.js`):** cada
    autobús de la lista de llegadas de la consulta rápida (solo origen o ruta
    directa) y de las tarjetas de Mis rutas (fuera del modo edición) lleva una
    campana (`DepartureBell`: `IconButton` `sm`, acción opcional de
    `BusLineItem`; las tarjetas avisan con `onDepartureAlarm({ stop, bus,
    fetchedAt })`, estable, y el Dashboard tiene un único `DepartureAlarm`
    para todas). Abre una ventana
    (`Modal`) "Avisarme para salir": "¿Con cuántos minutos de antelación
    quieres que te avisemos?", atajos 2, 3 y 5 min (`aria-pressed`) y un campo
    de minutos enteros (`inputMode="numeric"`, solo dígitos, 1–90); propone el
    mayor atajo que aún cabe. Caso límite (`leadProblem`): si el autobús ya
    está a esos minutos o menos, "El bus ya está más cerca de ese tiempo:
    llega en 4 min. Elige menos minutos." y no deja confirmar (también vacío,
    fuera de rango y "El bus ya está llegando: si quieres cogerlo, sal ya").
    Al confirmar (mismo toque), `useFocusSession` como el modo viaje y
    pantalla negra: "Esperando al C3d", "Te avisaremos cuando falte(n) X
    min" y "Tiempo actual estimado" enorme. Polling adaptativo
    (`useStopArrivals` con `background`): cada 60 s y cada 15 s cuando faltan
    ≤5 min para el aviso; entre lecturas, cuenta atrás con el reloj. El
    autobús se sigue por continuidad (misma línea y letrero, `pickBus`): un
    atasco retrasa el aviso; si desaparece de Vitrasa, se sigue con la última
    estimación y se dice. Con ETA ≤ X: vibración, tres tonos, notificación
    "¡Es hora de salir!" (`tag` `vbus-departure`) y panel ámbar con
    "Entendido" (suelta la pantalla y vuelve a la consulta).
  - **Infraestructura común de los modos que avisan:** sesión global
    (`src/lib/focusSession.js`, store con `useSyncExternalStore`; una sola a
    la vez: `{ id, kind: trip|departure, payload, view: full|pill,
    notifications }`). `startFocus` (en el toque: pantalla encendida, sonido
    y permiso; sustituye a la anterior), `minimizeFocus`, `restoreFocus`
    (`ensureScreenOn` + sonido, dentro del gesto) y `endFocus` (suelta la
    pantalla y quita la notificación). `TripAlarm` y `DepartureAlarm` solo
    la empiezan; la pinta un único `FocusHost` en `App.jsx`, fuera del
    Dashboard y de la consulta rápida, así sigue aunque se cierren.
    `TripSession` y `DepartureSession` corren `useTrip`/`useDeparture`
    **fuera** del `FocusDialog` (minimizar no los desmonta); el modo viaje
    pide él mismo las llegadas a la subida mientras espera (cada 30 s, con
    `background`, filtradas como en la consulta: `filterReachingBuses` con
    el `plan` del payload; empieza con las de la consulta, `seed`). Al
    terminar, la pantalla se funde 300 ms con lo último pintado y sin pedir
    nada (`live` a `false`). Además: `useAlarmEffect` + `fireAlert`
    (`alerts.js`: vibración, tonos y notificación; apagado solo a los 5
    min), `useNow` (cuenta atrás), `FocusScreen.jsx` (`FocusDialog` negro,
    `FocusLayout`, `AlarmPanel`, filas de estado de pantalla y
    notificaciones) y `tripTracker.js` (`etaNow`, `pickBus`, `minutesText`,
    `plural`).
  - **Píldora flotante ("Dynamic Island" interna, `FocusPill`):** el chevron
    "Minimizar" de la cabecera de los modos (a la izquierda de la X, solo
    con el aviso pendiente) cierra la pantalla negra sin cancelar nada: la
    pantalla sigue encendida, el polling, el GPS y la cuenta atrás siguen, y
    arriba en el centro aparece un óvalo negro opaco (`h-11`, `bg-black`,
    anillo blanco al 15 %, sin blur) con la campana ámbar y un punto que
    late y lo que queda en tiempo real: "C3d en 4 min" / "C3d llegando"
    (salida), "4A en 5 min" o "Esperando tu autobús" (viaje esperando),
    "Bajas en 6 min", "Quedan 1,3 km" o "En camino" (en camino). Cabe en la
    franja libre sobre el saludo (`safe-area` + 4 px). Entra con un muelle
    (escala 0,6 → 1 y opacidad; con movimiento reducido, fundido) cuando la
    pantalla negra termina de fundirse. Tocarla (o el "atrás" del historial)
    vuelve a la pantalla completa; al sonar, vuelve sola. Si el foco se
    había perdido al minimizar, lo recoge. Se pinta con `createPortal`: un
    `<dialog>` modal va en la *top layer* y deja inerte lo de fuera, así que
    va dentro del diálogo de arriba si lleva `data-island-host` (la consulta
    rápida: pantalla completa y sin transform) o en `body` sin diálogos; con
    otro encima (Ajustes, hojas, modales) se oculta y vuelve al cerrarlo
    (`MutationObserver` del atributo `open`, solo mientras se ve).
  - **Anti-cancelación (`FocusDialog`, los dos modos):** con la pantalla
    siempre encendida y el móvil en la mano, un toque sin querer no cancela
    la alarma. Tocar fuera no hace nada; la X, Escape, el "atrás" de Android
    (Chrome cancela el diálogo modal) y el "atrás" del historial (una entrada
    propia mientras dura la sesión, también minimizada, que se repone y se
    quita al terminar; con la píldora, "atrás" vuelve a la pantalla completa
    sin preguntar en vez de salir de la app) abren
    una alerta de iOS (`alertdialog`): "¿Detener el aviso?" · "Si sales
    ahora, se cancelará la alarma programada." con "Cancelar" (neutro, con el
    foco; también Escape o tocar fuera) y "Sí, detener" (rojo). Si el
    navegador cierra el diálogo a la fuerza, se reabre y pregunta. Tras sonar
    (`FocusLayout` `armed={false}`), la X sale sin preguntar; "Entendido" y
    el apagado solo, siempre directos.
  - **Ir andando a la parada (`WalkToStopButton`, `src/lib/walking.js`):**
    botón sutil de pisadas (`Footprints`, círculo de 32 px como las acciones
    de tarjeta) arriba a la derecha de "Sale de" (en una ruta directa, a la
    izquierda de compartir) y en la cabecera de cada tarjeta de Mis rutas, a
    la izquierda de la X (no en modo edición). Es un enlace en pestaña nueva
    a la ruta a pie en la app de mapas del sistema, hasta las coordenadas
    exactas de la parada (`stopsList.json`; las tarjetas solo guardan el
    número: se completan con la lista al tocar) y desde la ubicación actual
    (la pone la app de mapas): en iPhone, iPad y Mac, Apple Maps
    (`https://maps.apple.com/?daddr=lat,lon&dirflg=w`, siempre instalada y
    abre la app también desde la PWA); en el resto, Google Maps
    (`https://www.google.com/maps/dir/?api=1&destination=lat,lon&travelmode=walking`).
    Sin coordenadas, el nombre de la parada en Vigo.
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
- **Cabecera:** a la izquierda "Buenos días" (de noche, "Buenas noches" con
  una luna) / "Mis rutas"; a la derecha, en
  columna, el reloj `hh:mm` (Inter semibold, `tabular-nums`, color del tema; al
  cambiar el minuto la hora anterior sube y sale mientras la nueva entra desde
  abajo, 600 ms, en un contenedor con `overflow: hidden`) y debajo cuatro
  botones circulares: Consulta rápida (lupa), Editar (lápiz/✓), Sol/Luna y
  Ajustes (36 px por debajo de 400 px de ancho). "Mis rutas" no se parte en
  pantallas estrechas (baja de tamaño por debajo de 380 px).
- **Botones de icono:** circulares de 40px (área táctil ampliada a 48px),
  sutiles (`bg-white/70` en claro, `bg-white/15` en oscuro, sin blur).
- **Hápticos (`src/lib/haptics.js`):** todo lo que vibra pasa por aquí,
  comprobado y en `try/catch`. En Android, `navigator.vibrate` con sus
  duraciones y patrones. En iPhone, Safari no tiene Vibration API: desde iOS
  18, cada toque háptico es un clic en un `<input type="checkbox" switch>`
  oculto (dentro del diálogo abierto, si lo hay), que da el háptico del
  sistema; iOS solo lo permite dentro de un gesto (sirve para el nivel 1; la
  alarma, que salta sola, no vibra en iPhone: avisan el timbre y la
  notificación). `impact` son dos toques en iOS; al soltar un deslizar para
  borrar también hay uno (el umbral, a mitad de arrastre, no siempre cuenta
  como gesto). En iOS 17 o anterior y en escritorio, nada.
  Nivel 1, sutil: `select` 12 ms (interruptores y controles segmentados de
  Ajustes, solo si cambian), `impact` 20 ms (campana, confirmar un aviso,
  "Avisarme", "Sí, detener", levantar una tarjeta en el arrastre, QR
  leído), `tap` 10 ms (soltar la tarjeta, pulsación larga) y `threshold`
  15 ms (cruzar el umbral de deslizar para borrar). Nivel 2, `alarm`
  `[500, 200, 500, 200, 500]` en el aviso de los modos viaje y salida (y en
  su notificación), repetido 3 veces más cada 4 s mientras sigue en
  pantalla (`useAlarmEffect`; "Entendido" o cerrar lo corta con
  `haptics.stop()`). Timbre del aviso: un `Audio` real (WAV de los tres
  tonos, dos veces, generado en memoria como `Blob`) con `volume = 1.0`,
  desbloqueado en el toque de confirmar (se reproduce silenciado un
  instante): en iPhone suena aunque esté puesto el modo silencio, a
  diferencia de Web Audio, que queda como plan B (ganancia 1.0).
- **Físicas:** al pulsar, tarjetas, botones, "Ver más autobuses" y pasos de la
  hoja rebotan con `active:scale-[0.97]` en 400 ms y curva
  `cubic-bezier(0.25, 1, 0.5, 1)` (`ease-spring`), definido una sola vez en
  `src/components/ui/pressable.js`.
- **Tema:** claro/oscuro con el botón Sol/Luna de la cabecera (se recuerda en
  LocalStorage; si no se ha elegido, sigue al sistema; las paletas Sombra,
  Cyberpunk, OLED y Nube lo fijan y lo desactivan). El cambio usa View
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
- **Tarjetas inteligentes por GPS (Smart Sorting, `useNearestCard`,
  `src/lib/proximity.js`):** con el ajuste "Ordenar tarjetas por cercanía"
  (interruptor de iOS, `Switch`, activado por defecto) y al menos dos
  tarjetas, la de la parada más cercana se enseña la primera; el resto, en
  tu orden. Es solo una vista (`withNearestFirst` sobre `routes`): el orden
  manual de `vbus:routes` no se toca nunca; en modo edición se ve y se
  arrastra ese orden (`onReorder` solo editando) y, al desactivar el
  ajuste, vuelve al instante. Ubicación aproximada (`useWatchPosition` con
  `highAccuracy: false`, `maximumAge` 60 s, pausada con la app oculta) que
  solo avisa si te mueves ≥50 m; distancias con Haversine a las paradas de
  las tarjetas (`stopById`); histéresis de 30 m para que dos paradas casi a
  la misma distancia no se turnen; a más de 2 km de todas (de viaje), tu
  orden. Distancia redondeada a 10 m (las tarjetas memorizadas no se
  repintan por unos metros). La que sube lleva bajo el título "📍 A 120 m ·
  La más cercana" (azul iOS, `text-sm`); el salto lo anima `Reorder`
  (`layout="position"`). Sin permiso o sin GPS, tu orden, sin errores.
- **Alias:** cada tarjeta guarda `alias` ("Trabajo 💻"; vacío = sin alias) y
  `title` (lo que se enseña: el alias o el nombre de la parada). Con alias, el
  alias es el título y el nombre oficial va al subtítulo ("Desde Rúa do Conde
  de Torrecedeira, 81"); sin alias, el título es la parada y el subtítulo
  "Parada N". Se pone al crearla ("Nombre de la tarjeta") o con el lápiz del
  modo edición (`updateRoute`). Las tarjetas guardadas antes de existir
  `alias` lo reciben al cargar (su título si no era el de la parada).
- **Notas:** cada tarjeta puede guardar `note` (opcional, hasta 60
  caracteres, `NOTE_MAX` en `vigobusAdapter.js`): "Coger el de las 8:10". Se
  pone al crearla (campo "Nota" bajo el nombre) o con el lápiz del modo
  edición; se enseña en una sola línea gris (`text-sm`, truncada) bajo el
  título. Las tarjetas sin `note` (anteriores) se tratan como `""`. Viaja en
  el enlace de "Compartir Mis rutas" como 6.º elemento opcional (solo si hay)
  y no cuenta para los duplicados al importar.
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
  si no cabe. Ocho ajustes, en LocalStorage (`useSettings`, en `App.jsx`):
  "Tema" (`palette`: cuadrícula de 9 muestras circulares con un mini fondo
  de su paleta y su nombre, la elegida con anillo blanco y check, grupo de
  radios con flechas y toque háptico `select`; ver "Motor de temas"),
  "Dinamismo" (`motion`: Fluido, Relajado o Estático, control segmentado),
  "Ordenar autobuses por"; "Formato de tiempo": Relativo ("5 min") o Absoluto
  ("12:45", minutos sumados a `updatedAt`, la hora en que llegaron los
  tiempos, así no se desvía entre refrescos); "Actualizar datos": 15, 30
  (por defecto) o 60 s (el intervalo de `useRoutes` se rehace al cambiarlo); y
  "Fondo": Completo (5 manchas) o Ligero (3: azul, lavanda y
  perla) para móviles con tirones (oculto con OLED); y el interruptor "Ordenar tarjetas por
  cercanía" (`sortByProximity`, activado por defecto). Interruptor "Vibración"
  (`vibration`, activado por defecto): apagado, `haptics.js` no vibra nada
  (`setHapticsEnabled`, sincronizado en `App.jsx`), tampoco las alarmas ni
  su notificación; los avisos siguen sonando y notificando. "Compartir mis
  rutas guardadas" (QR y enlace: ver "Compartir Mis rutas"). Si el navegador permite instalar la app (`beforeinstallprompt`,
  `useInstallPrompt`) aparece la fila "Instalar app" con su botón; en Safari de
  iOS, la indicación "Compartir → Añadir a pantalla de inicio". Al pie, la
  versión en gris pequeño y centrada ("vBus v1.33 • Build: 31/10/2026,
  22:42 · 4c8e5b7"): versión de `package.json` sin el parche (se sube con cada
  PR: `npm version minor`; v1.33 = PR #33), hora de compilación
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
- **Smart Night Mode (`useNightMode`, `src/lib/nightMode.js`):** de 23:00 a
  06:00 (hora del dispositivo). `useNightMode` es un store único
  (`useSyncExternalStore`) con un temporizador programado justo para el
  próximo cambio (y comprobación al volver a la pestaña): si dan las 23:00 o
  las 06:00 con la app abierta, todo cambia solo, sin recargar. Indicadores
  discretos: el saludo pasa a "Buenas noches" con una luna pequeña y el
  subtítulo de la consulta rápida a "🌙 Modo nocturno". En la lista de
  llegadas de la consulta rápida y dentro de las tarjetas,
  `arrangeForNight`: las nocturnas (`isNightLine`: "N" + número, N1 y N4)
  con tiempo real (≤2 h) suben arriba; luego las diurnas que aún pasan esta
  noche, en su orden; las nocturnas lejanas, al final. Las diurnas
  terminadas (solo con estimaciones de más de 2 h, que son las de mañana, o
  sin ningún autobús entre las líneas de la parada o de la tarjeta) no se
  borran: van al final, plegadas, en "Servicio diurno finalizado · N
  líneas" (`DayServiceEnded`: `DisclosureButton` + `Collapse`), en gris
  (`opacity-50 grayscale`), sin campana y con "Primero a las 07:50" o "Sin
  autobuses hasta mañana". El autobús de mañana de una diurna que aún pasa
  esta noche no se enseña. Al cambiar de día a noche con la app abierta,
  las listas y el saludo entran con un fundido (al abrir la app, no). La
  campana (modo salida) sigue en todas las filas de la lista principal.
- **Códigos de línea:** siempre se comparan con `lineKey` (`src/lib/lines.js`:
  sin espacios ni mayúsculas, "PSA 1" = "PSA1", "C3d" = "C3D"), también al
  filtrar las llegadas de las tarjetas (`busesOfLines`), al guardarlas y al
  ordenarlas por preferencia.
- **Marca:** "vBus" en todo lo visible (manifest `name`/`short_name`,
  `<title>`, iOS, Ajustes, mensajes). Los identificadores técnicos
  (`VigoBusAPI`, `VigoBusError`, `/vigobus`, `vigobus-api.onrender.com`) no
  cambian.

## 3. Hoja de ruta

### Fase 1 · UI Core — *En curso*

- Tarjetas de rutinas con filtrado: mostrar solo líneas favoritas por defecto.
  El botón "Ver más autobuses" expande las líneas secundarias.
- Interfaz de "Crear nueva tarjeta" (botón + gigante con estilo consistente).

### Fase 2 · Motor de datos — *En curso*

- Hecho: refresco automático cada 30 s (15/30/60 s en Ajustes, `useRoutes`), también al abrir la app y
  al volver a la pestaña; pausado con la pestaña oculta. Con datos simulados,
  los minutos descuentan con el reloj real.
- Hecho: actualizaciones OTA de la PWA ("Nueva versión de vBus disponible",
  `useAppUpdate`).
- Hecho: "tirar para actualizar" (`usePullToRefresh` + `PullIndicator`) en
  Mis rutas y en la lista de la consulta rápida. Solo empieza con la lista
  arriba del todo y el dedo bajando (no si el toque empieza en algo con
  arrastre propio: `.touch-none`, como el tirador de una tarjeta, o
  `[data-no-pull]`); banda elástica de iOS; el indicador (círculo opaco;
  `tone="dark"` en la hoja grafito) baja, aparece y gira según lo que se tira.
  Al cruzar los 64 px, un toque háptico ligero (`haptics.threshold`, 15 ms;
  otra vez si se vuelve atrás y se cruza de nuevo). Pasado el umbral, la lista
  se queda a 56 px girando mientras se piden los tiempos (mínimo 700 ms) y
  vuelve con un muelle de 500 ms; por debajo, vuelve sin refrescar. En Mis
  rutas refresca todas las tarjetas (`refresh()` de `useRoutes`; desactivado
  en modo edición, también si se entra a mitad del gesto); en la consulta
  rápida, la parada de subida (`refresh()` de `useStopArrivals`, que devuelve
  la petición en vuelo si la hay), solo con tiempos que pedir y nunca con las
  sugerencias abiertas. Rendimiento: sin renders de React y una escritura por
  fotograma (`requestAnimationFrame`): el `transform` (`translate3d`) va
  directo en el contenedor de la lista (no se hereda: las tarjetas no
  recalculan estilo) y las variables (`--pull`, `--pull-progress`) solo en la
  raíz del indicador. `touchstart`, `touchend` y `touchcancel` son pasivos;
  `touchmove` no puede serlo (su `preventDefault()` frena el scroll y el
  rebote nativos mientras se tira) y sale en la primera línea sin gesto.

- Fuente: backend propio (`backend/`) sobre la API de datos abiertos del
  Concello (`datos.vigo.org`), con el mismo JSON que VigoBusAPI.
- Tiempo real: auto-refresh cada 30 segundos (invisible para el usuario) +
  pull-to-refresh nativo.
- Fallback de errores: si la API/Vitrasa falla, mostrar "Error Vitrasa" y
  enseñar la hora teórica en gris en lugar del tiempo real.

### Fase 3 · UX avanzada — *En curso*

- Hecho: tarjetas inteligentes por GPS (la parada más cercana, la primera;
  tu orden intacto).
- Orden inteligente: reordenar las tarjetas según la hora del día (p. ej.
  mañanas: "Ir al instituto" primero; tardes: "Volver a casa" primero).
- Hecho: alarma de destino ("Avisarme", modo viaje en la consulta rápida).
- Hecho: alarma de salida configurable ("Avisar cuando queden 5 min para el
  C3": campana de cada autobús en la consulta rápida y en Mis rutas, modo
  salida), con confirmación antes de cancelar.
- Hecho: Smart Night Mode (23:00–06:00: líneas N primero y "Servicio diurno
  finalizado" plegado).
- Hecho: ir andando a la parada (Apple Maps en Apple, Google Maps en el
  resto, modo a pie).
- Hecho: pulido nativo (deslizar para borrar recientes, hápticos
  centralizados y alarma contundente: vibración larga repetida y timbre a
  todo volumen).
- Hecho: píldora flotante ("Dynamic Island" interna): los modos viaje y
  salida se minimizan sin cancelar y siguen a la vista arriba.
- Hecho: motor de temas y dinamismo (9 paletas del fondo y los acentos,
  OLED sin fondo, y velocidad Fluido / Relajado / Estático).
- Hecho: compartir Mis rutas sin backend (QR y enlace `?tarjetas=` desde
  Ajustes; al abrirlo, añadir, reemplazar o cancelar).
- Hecho: notas personalizadas en las tarjetas (60 caracteres, también en el
  enlace compartido).

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
