# ErudaArcade - Mobile DevTools

**ErudaArcade** es un toolkit de debugging para dispositivos móviles que inyecta automáticamente [Eruda](https://github.com/liriliri/eruda) (una consola de desarrollo para mobile) y **plugins custom** en cualquier página web mediante un Service Worker.

## Estructura del proyecto

```
📁 M.DevTools/
├── ErudaArcade-sw.js     # Service Worker que inyecta Eruda + plugins
├── int.txt               # Instrucciones de instalación
├── test/
│   ├── index.html        # Demo: SocialFeed con scroll infinito, likes, etc.
│   └── eruda-inject.js   # Fallback standalone de plugins (sin SW)
└── README.md
```

## Cómo funciona

### 1. Service Worker (`ErudaArcade-sw.js`)

- Se registra en el navegador y **escucha peticiones `navigate`** (carga de páginas HTML).
- Cuando detecta una, **inyecta Eruda desde CDN + plugins custom** en el HTML antes de entregarlo.
- Esto significa que **Eruda aparece automáticamente** en todas las páginas del proyecto sin tener que agregar nada manualmente.

```
Navegador → request → SW intercepta → inyecta Eruda → responde HTML modificado
```

### 2. Fallback directo (`test/eruda-inject.js`)

Si el Service Worker no puede inyectar Eruda (ej: modo incógnito donde los SW no funcionan), el `index.html` carga Eruda directamente desde CDN tras 3 segundos de timeout.

### 3. Plugins custom (AppTab)

Todos los plugins están unificados en una sola pestaña **AppTab** con 4 sub-tabs:

| Tab | Descripción |
|-----|-------------|
| **App** | Inspector completo del navegador: Service Worker, localStorage, sessionStorage, IndexedDB, Cache API, Cookies, Network info, Device info, Battery, Performance, Console history, Notifications, Sensores |
| **NetWat** | Waterfall en tiempo real con timing DNS / TCP / TLS / Request / Response |
| **Elements+** | Lista de elementos DOM con sus event listeners (click, touch, teclado, etc.) |
| **Inspect** | Object tree viewer interactivo: explorá `window`, `document`, `navigator` o cualquier objeto JS con getters/setters |

### Tabs incluidas (Eruda nativas)

- Console, Elements, Network, Resources, Info, Snippets, Sources, Settings

## Instalación

Agregá esto en el `<head>` de tu HTML o en tu entry point JS:

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/ErudaArcade-sw.js')
}
</script>
```

**Requisitos:**
- El archivo `ErudaArcade-sw.js` debe estar en la **raíz** del proyecto (`/ErudaArcade-sw.js`).
- En desarrollo local: usar `http://localhost:xxxx` (NO `127.0.0.1`).
- En producción: requiere HTTPS (Netlify, Vercel, GitHub Pages, Hostinger con SSL, etc.).

## Demo

Abrí `test/index.html` en localhost para ver un SocialFeed funcional con:
- Scroll infinito
- Likes con animación
- Composer de tweets
- Eruda inyectado automáticamente (via SW o fallback directo)
- Debug badge en tiempo real

## Stack

- [Eruda](https://github.com/liriliri/eruda) - Consola de debugging mobile
- Service Worker API
- PerformanceObserver / Performance API
- IndexedDB, Cache Storage, Network Information API, Battery API, Sensors API

---

Creado por [Arcade Estudio](https://github.com/Arcade-Estudio)
