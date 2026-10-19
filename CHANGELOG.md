# Changelog - GameRadar

## Sin publicar

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
