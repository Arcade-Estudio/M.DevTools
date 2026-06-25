# ErudaArcade

**Mobile debugging toolkit** que inyecta automáticamente [Eruda](https://github.com/liriliri/eruda) + plugins custom en cualquier proyecto web mediante un Service Worker.

## Instalación

```bash
npm install eruda-arcade
```

## Uso rápido

### Opción A: Auto (recomendada)

Agrega el script al `<head>` de tu HTML:

```html
<script src="node_modules/eruda-arcade/index.js" data-auto></script>
```

Eruda aparecerá automáticamente en todas las páginas. Si el Service Worker no funciona (modo incógnito), carga Eruda directamente desde CDN.

### Opción B: Con bundler (Vite, Webpack, etc.)

```js
import { register } from 'eruda-arcade'
register()
```

### Opción C: CLI

```bash
npx eruda-arcade setup
```

Esto copia `sw.js` a tu proyecto y muestra instrucciones de configuración.

## Cómo funciona

1. **Service Worker** (`sw.js`): intercepta peticiones HTML y las modifica para inyectar Eruda + plugins custom antes de `</head>`.
2. **Fallback directo**: si el SW no puede inyectar (ej: incógnito), carga Eruda desde CDN tras 3 segundos.
3. **Plugins custom**: pestaña **AppTab** con 4 sub-tabs:

| Tab | Descripción |
|-----|-------------|
| **App** | Inspector completo: SW, localStorage, sessionStorage, IndexedDB, Cache API, Cookies, Network, Device, Battery, Performance, Console, Notifications, Sensores |
| **NetWat** | Waterfall en tiempo real con timing DNS / TCP / TLS / Request / Response |
| **Elements+** | Elementos DOM con event listeners |
| **Inspect** | Object tree viewer interactivo (`window`, `document`, cualquier objeto) |

## API

```js
import erudaArcade from 'eruda-arcade'

// Registrar Service Worker + fallback
await erudaArcade.register()
await erudaArcade.register({ swPath: '/custom-sw.js' })

// Auto-init (SW + fallback con timeout)
erudaArcade.auto()

// Inicializar Eruda manualmente (si ya está cargado)
erudaArcade.init({ transparency: 0.8, displaySize: 50 })

// Inyectar código de plugin en la página
erudaArcade.injectPlugin(pluginCodeString)
```

## Desarrollo local

```bash
git clone git@github.com:Arcade-Estudio/M.DevTools.git
cd M.DevTools
npm install
npx eruda-arcade setup
```

Abrí `test/index.html` en localhost para ver la demo.

## Estructura del paquete

```
eruda-arcade/
├── index.js       # Entry point: register(), auto(), init()
├── sw.js          # Service Worker (autocontenido)
├── plugins.js     # Plugin code (AppTab)
├── bin/cli.js     # CLI: npx eruda-arcade setup
├── test/          # Demo: SocialFeed
└── README.md
```

## Requisitos

- HTTPS en producción (Netlify, Vercel, GitHub Pages, etc.)
- En local: `http://localhost:xxxx`
- Node >= 14

---

[MIT License](LICENSE) — Creado por [Arcade Estudio](https://github.com/Arcade-Estudio)
