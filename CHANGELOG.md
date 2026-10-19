# Changelog - GameRadar

## v2.6.0 (2026-10-19) — Rediseño tipo tienda de apps

Se mantiene la paleta (tinta, violeta, lima) pero cambia el lenguaje visual
a algo más cercano a Play Store / App Store.

### 🎨 Interfaz
- **Fichas de app**: cada juego pasa de "tarjeta con banner y badges" a una
  ficha con la imagen insertada, **icono cuadrado, título, plataforma,
  valoración y precio** en una sola fila.
- **Precio como píldora**: "Gratis" en lima y el precio original tachado,
  como en una tienda.
- **Navegación inferior plana**: sin degradados ni indicador superior; el
  icono activo se marca con una píldora de acento, como las tabs de la
  tienda.
- **Cabeceras editoriales**: títulos de sección sin mayúsculas forzadas y
  con más aire.
- **Buscador** con forma de campo de tienda (relleno, sin borde, foco con
  anillo).
- **Ficha de producto**: el detalle gana el icono grande junto al título y
  el precio en píldora.
- **Rejilla más espaciada** y bordes sustituidos por superficies.

## v2.5.0 (2026-10-19) — Más contenido Android

### ✨ Nuevas fuentes
- **Google Play (juegos gratis destacados)**: nuevo servicio `playstore.js` que
  usa `google-play-scraper` para traer los más descargados de GAME,
  GAME_ACTION, GAME_PUZZLE y GAME_CASUAL (~40 juegos, 240 ms). Se marcan como
  "siempre gratis".
- **Reddit por RSS**: la API `.json` devuelve 403 desde IPs de servidor, así
  que el servicio pasa a leer los feeds `.rss` (que sí responden), con caché
  de 15 min, peticiones secuenciales y backoff si Reddit responde 429.

### 🐛 Correcciones
- `google-play-scraper` v10 es **ESM** y Vercel ejecuta Node 22, donde
  `require()` de ESM lanza `ERR_REQUIRE_ESM`: al importarlo en el top-level de
  `playstore.js` tumbaba la función completa (500 en `/api/health` incluido).
  Ahora se carga con `import()` dinámico y perezoso (`utils/gplay.js`) y el
  fallo queda contenido a esa fuente.
- `google-play-scraper` v10 exporta la API dentro de `default`: `googleplaydeals`
  y `notengosuelto` la importaban mal, por lo que la primera devolvía 0
  ofertas y la segunda lanzaba `ReferenceError`.
- `googleplaydeals` vuelve a aportar ~30 juegos de Play Store.

### 📊 Resultado
- La categoría Android pasa de ~6 a **~99 elementos** (40 Play Store + 30
  GooglePlayDeals + Reddit RSS + feeds + giveaways de GamerPower), sin
  depender de F-Droid ni de Puppeteer, que siguen desactivados en serverless.

## v2.4.0 (2026-10-19) — Rebrand visual

### 🎨 Nueva identidad
- **Paleta "radar nocturno"**: tinta azulada (`#08080c`), violeta eléctrico
  como acento primario y lima como color de *señal* (novedades, ahorro,
  cuenta atrás).
- **Acento violeta por defecto**, con el resto de acentos reajustados
  (menta, coral, azul, púrpura, ámbar, aqua) y `--on-accent` por acento.
- **Tipografía con carácter**: Space Grotesk para títulos y wordmark, Inter
  para interfaz, micro-etiquetas en mayúsculas con tracking.
- **Geometría más contenida**: radios 3/6/10/14/20 y bordes de 1px.
- **Logo propio**: glifo de radar (anillos + haz) y wordmark GAME·RADAR con
  la segunda mitad en lima.

### 🖼️ Assets
- Iconos generados y versionados: PWA 192/512, maskable, favicon, 96,
  apple-touch-icon; **ya no se usa el icono de un CDN de Flaticon**.
- Iconos de Android por densidad (legacy, round y adaptive foreground),
  splash en las 11 variantes y fondo del icono adaptativo a `#08080C`.
- `feature-graphic.png` y `play-store-icon.png` regenerados con wordmark.
- `scripts/brand-icons.py` añadido: reproducible con `python scripts/brand-icons.py`.

### 🧩 Interfaz
- Cabecera con wordmark y buscador tipo píldora con anillo de foco.
- Navegación inferior con indicador activo; tarjetas con borde fino, hover
  elevado y badges de novedad en lima.
- Splash convertido en barrido de radar (anillos + haz animado).
- Barra de estado y de navegación de Android alineadas con la tinta.

## v2.3.1 (2026-10-19)

### 🐛 Correcciones
- **La API devolvía 500 en todas las rutas**: al dejar de versionar
  `data/vapid-keys.json`, el directorio `data/` desapareció del bundle de
  Vercel y los `fs.mkdirSync()` de `vapid.js`/`push.js` fallaban con `EROFS`
  al importar el módulo. Ahora están protegidos con `try/catch`.
- **Arranque en frío devolvía 0 juegos**: `updateAll()` esperaba a las 10
  fuentes y guardaba la caché después de las notificaciones. Ahora usa sólo
  fuentes rápidas en serverless, aplica timeout por fuente y escribe la caché
  antes de notificar (473 juegos en ~1 s).
- **Service Worker servía el HTML en cache-first sin caducidad**, dejando la
  app clavada en una versión antigua. Las navegaciones pasan a network-first.
- **Reintento de red**: `loadGames` hace dos intentos con 12 s de timeout
  antes de caer a la caché local.
- `/api/vapid-public-key` responde 503 explícito si faltan las claves, en vez
  de devolver una clave efímera distinta en cada instancia.

## v2.3.0 (2026-10-19)

### 🔒 Seguridad
- **Endpoints administrativos protegidos**: nuevo middleware `requireAdmin`
  (`Authorization: Bearer <ADMIN_TOKEN>`) en `/refresh`, `/test-telegram`,
  `/test-instagram`, `/send-push`, `/push-subscriptions` y `/update`.
  Fail-closed: sin token configurado en producción responde 503.
- **Anti-SSRF en push**: los endpoints se validan contra una allowlist de
  hosts oficiales (FCM, Mozilla, WNS, Apple) y se exigen las claves
  `p256dh`/`auth`.
- **Secretos fuera del repositorio**: `data/vapid-keys.json` y
  `gameradar-keystore-base64.txt` dejan de estar versionados. El patrón
  `*.base64.txt` no casaba con el nombre real del keystore.
- **`/api/stats`** deja de exponer `errors`, `sourceErrors`, `priceHistory`
  y `memoryUsage`.
- **VAPID**: las claves se leen de entorno; se avisa si faltan en producción.

### 🐛 Correcciones
- **El cron de Vercel apuntaba a `/api/update`, una ruta inexistente**: la
  caché nunca se refrescaba en producción.
- `getGames()` es async y se usaba sin `await` en `/stats` y `/refresh`.
- `notengosuelto` lanzaba `ReferenceError` (`gplay` fuera de alcance) y
  aportaba 0 apps siempre.
- Bucle de re-render en la detección de juegos nuevos (`lastVisit` estaba en
  las dependencias del efecto que lo reescribía).
- Confetti: la opacidad se construía como string inválido.
- `handleMarkClaimed` disparaba efectos secundarios dentro de un updater de
  `setState` (duplicaba logros en StrictMode).

### ✨ Mejoras
- **Gestos con bloqueo de eje**: deslizar un carrusel ya no abre la tienda ni
  comparte el juego; la hoja de detalle tampoco se cierra al arrastrar sus
  juegos similares.
- **Splash**: de 1,5 s fijos a 0,8 s, y se salta en visitas de la misma
  sesión o con `prefers-reduced-motion`.
- **Filtros con borrador**: los chips ya no aplican al instante; "Aplicar"
  confirma y cerrar descarta.
- **Accesibilidad**: `Escape`, foco atrapado, `aria-modal` y devolución del
  foco en filtros, detalle, ajustes y modales; toasts con `aria-live`;
  `prefers-reduced-motion` también para framer-motion; zoom desbloqueado.
- **Contraste**: `--text-muted` pasa de 2.36:1 a 5.58:1; nuevo token
  `--on-accent` (ámbar pasaba de 2.05:1 a 8.31:1).
- **Escala tipográfica** en tokens (`--fs-*`), sin textos por debajo de 10px.
- **Rendimiento**: chunks separados para React y framer-motion, tarjetas sin
  animación duplicada ni `backdrop-filter` por elemento, `content-visibility`
  en las vistas verticales.
- **API**: `/api/free-games` acepta `platform`, `q`, `limit` y `offset`, y
  `/api/docs` documenta lo que realmente hace.

## v2.0.0 (2026-01-30)

### 🎉 Nuevas Características

#### Backend
- **Arquitectura modular**: Código reorganizado en módulos separados
- **Variables de entorno**: Credenciales y configuración movidas a `.env`
- **Nueva fuente**: Integración con Epic Games API
- **Rate limiting**: Protección contra abuso de API
- **Logging mejorado**: Sistema de logs con timestamps y colores
- **Manejo de errores**: Middleware centralizado de errores
- **Health checks**: Endpoint para monitoreo

#### Frontend
- **UI completamente rediseñada**: Diseño más moderno y pulido
- **3 Temas visuales**: Default (azul), Cyberpunk (morado), Matrix (verde)
- **Animaciones**: Transiciones suaves y efectos hover
- **Fondo animado**: Orbs degradados flotantes
- **Skeleton loading**: Estados de carga visuales
- **Toast notifications**: Notificaciones no intrusivas
- **Mejor UX**: Atajos de teclado, feedback visual

#### Funcionalidades
- **Sistema de favoritos mejorado**: Persistencia mejorada
- **Juegos ocultos**: Posibilidad de ocultar y recuperar juegos
- **Estado "visto"**: Marcar juegos ya reclamados
- **Búsqueda mejorada**: Con debounce y limpiar búsqueda
- **Ordenamiento**: Múltiples opciones (precio, fecha, título)
- **Detección de cupones**: Extrae códigos de las descripciones
- **Notificaciones push**: Soporte para notificaciones del navegador

#### PWA
- **Service Worker v2**: Estrategias de cacheo optimizadas
- **Manifest mejorado**: Más metadatos para instalación
- **Offline support**: Funciona sin conexión
- **Background sync**: Sincronización en segundo plano

#### Panel de Admin
- **Diseño renovado**: Tarjetas de estadísticas visuales
- **Más métricas**: Uso de memoria, tiempo de actividad formateado
- **Acciones**: Actualizar manual, probar Telegram, health check

### 🔒 Seguridad
- Credenciales en variables de entorno
- Rate limiting en endpoints
- Sanitización de inputs
- Validación de datos

### 📁 Estructura de Carpetas
```
src/
├── config/          # Configuración centralizada
├── middleware/      # Middleware Express
├── routes/          # Rutas API
├── services/        # Servicios externos
└── utils/           # Utilidades
```

### 🛠️ Scripts
- `npm start` - Iniciar servidor
- `npm run dev` - Modo desarrollo con nodemon
- `npm test` - Ejecutar tests
- `npm run lint` - Linting

### 📦 Dependencias Nuevas
- `dotenv` - Variables de entorno

---

## v1.0.0 (2026-01-19)

### Características Iniciales
- Integración con GamerPower API
- Integración con Reddit r/googleplaydeals
- Notificaciones Telegram
- Sistema de caché
- Filtros básicos (género, plataforma)
- Favoritos con localStorage
- Temas básicos
- PWA básica
