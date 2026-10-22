# Contexto Maestro · Vitrasa Tracker App

> Biblia técnica y visual del proyecto. Revisar antes de cada cambio para que
> componentes y diseño se alineen con lo descrito aquí.

## 1. Visión general

### Filosofía

App utilitaria, minimalista y ultra-rápida enfocada en el contexto del usuario
(rutinas). Estética estricta de Apple (iOS Human Interface Guidelines). Cero
fricción, sin mapas interactivos ni navegación compleja.

### Stack técnico

- **Actual:** Vite + React + Tailwind CSS (SWC plugin). Configurado como PWA base.
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
- **Tarjetas (cristal):** `bg-[#272727]/50` con degradado interior sutil,
  `backdrop-blur-md`, borde de 2px (`border-white/15` en claro,
  `border-[#272727]/60` en oscuro), sombra `shadow-glass` (brillo de 1px en el
  canto superior + sombra exterior suave), `rounded-[32px]` y `p-5`.
- **Estilo Bento / Soft Dark (referencia: extensión del usuario):** hojas y
  modales grafito casi opacos con asa, título + X circular; contenedores
  internos `rounded-3xl bg-white/[0.06] border border-white/10`; inputs
  `rounded-2xl bg-white/10` con borde y anillo azul iOS (`accent` `#0A84FF`) al
  enfocar; acción principal en píldora blanca a todo el ancho (`PillButton`).
- **Botones de icono:** circulares de 40px (área táctil ampliada a 48px),
  sutiles (`bg-white/60` en claro, `bg-white/10` en oscuro), alineados con el
  título "Mis rutas".
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
  (95 % → 100 %); el resto de la pantalla se oscurece y desenfoca. Mientras
  hay un diálogo abierto el mesh se pausa (no se ve y así el desenfoque no se
  recalcula en cada fotograma).
- **Acordeones:** los pasos de la hoja se despliegan con `grid-template-rows`
  0fr → 1fr en 450 ms con la curva de hojas de iOS
  `cubic-bezier(0.32, 0.72, 0, 1)` (`ease-smooth`); el contenido aparece con
  un ligero retardo y se desvanece rápido al plegar.
- **Layout del Dashboard:** pantalla completa (`h-[100dvh]`, flex en
  columna): cabecera arriba, tarjetas con scroll propio en medio (sin barra,
  con máscara en degradado que las desvanece al llegar abajo) y "Crear nueva
  tarjeta" fijo abajo, respetando las safe areas. Cada tarjeta de cristal va
  en su propia capa de GPU (`transform-gpu`, `will-change-transform`,
  `backface-visibility: hidden`) para que el scroll no repinte el
  `backdrop-filter` (evita el rastro oscuro).
- **Tarjetas del usuario:** la app empieza vacía (mensaje "Aún no tienes
  rutas"); cada tarjeta tiene una X discreta arriba a la derecha para
  eliminarla. Al borrar, la tarjeta se desvanece y encoge (escala 0,9) mientras
  su hueco se cierra en 300 ms; solo entonces sale del estado.
- **Contenido de las tarjetas:** muestran 3 autobuses; "Ver más autobuses"
  despliega el resto con el mismo plegado animado que los acordeones
  (componente `Collapse`). Las líneas se ordenan por la prioridad elegida en
  la hoja (el orden en que se tocaron), y después el resto por hora.
- **Selección de líneas:** pastillas de cristal; al elegir una aparece un
  check junto al nombre. El paso de líneas usa el icono `Route`.
- **Urgencia:** tiempos < 3 min usan el rojo nativo de iOS y una animación
  sutil (`ping`).

## 3. Hoja de ruta

### Fase 1 · UI Core — *En curso*

- Tarjetas de rutinas con filtrado: mostrar solo líneas favoritas por defecto.
  El botón "Ver más autobuses" expande las líneas secundarias.
- Interfaz de "Crear nueva tarjeta" (botón + gigante con estilo consistente).

### Fase 2 · Motor de datos — *Pendiente*

- Fuente: VigoBusAPI (devuelve JSON limpio scrapeando el endpoint del
  ayuntamiento).
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
