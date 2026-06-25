const ERUDA_CDN = 'https://cdn.jsdelivr.net/npm/eruda'
const SW_PATH = '/sw.js'

const defaults = {
  autoScale: true,
  defaults: {
    transparency: 0.9,
    displaySize: 60,
    theme: "Dark"
  }
}

function loadEruda() {
  return new Promise((resolve, reject) => {
    if (typeof eruda !== 'undefined' && typeof eruda.init === 'function') {
      resolve(window.eruda)
      return
    }
    const s = document.createElement('script')
    s.src = ERUDA_CDN
    s.onload = () => {
      if (typeof eruda !== 'undefined') {
        resolve(window.eruda)
      } else {
        reject(new Error('Eruda loaded but not found'))
      }
    }
    s.onerror = () => reject(new Error('Failed to load Eruda from CDN'))
    document.head.appendChild(s)
  })
}

function initEruda(config) {
  const opts = Object.assign({}, defaults, config || {})
  try {
    eruda.init(opts)
    console.log('[ErudaArcade] Eruda initialized')
    return true
  } catch (e) {
    console.warn('[ErudaArcade] eruda.init error:', e)
    return false
  }
}

export async function register(config) {
  const swPath = (config && config.swPath) || SW_PATH

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register(swPath)
      console.log('[ErudaArcade] Service Worker registered:', reg.scope)

      if (reg.active) {
        console.log('[ErudaArcade] SW already active')
      }

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (installing) {
          installing.addEventListener('statechange', () => {
            if (installing.state === 'activated') {
              console.log('[ErudaArcade] SW activated, reloading...')
              window.location.reload()
            }
          })
        }
      })

      return reg
    } catch (err) {
      console.warn('[ErudaArcade] SW registration failed:', err.message)
    }
  } else {
    console.warn('[ErudaArcade] Service Worker not supported')
  }

  console.log('[ErudaArcade] Falling back to direct CDN load...')
  try {
    const eruda = await loadEruda()
    initEruda(config)
    return null
  } catch (err) {
    console.error('[ErudaArcade] All methods failed:', err.message)
    return null
  }
}

export function registerLegacy() {
  const script = document.querySelector('script[data-eruda-arcade]')
  const swPath = (script && script.getAttribute('data-sw-path')) || SW_PATH
  return register({ swPath })
}

export function injectPlugin(code) {
  const s = document.createElement('script')
  s.textContent = code
  document.head.appendChild(s)
}

let initialized = false
export function auto() {
  if (initialized) return
  initialized = true

  const timeout = 3000
  const pollMs = 200
  let elapsed = 0

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(SW_PATH).catch(err => {
      console.warn('[ErudaArcade] SW registration failed:', err.message)
    })
  }

  const poll = setInterval(() => {
    elapsed += pollMs
    if (typeof eruda !== 'undefined' && typeof eruda.init === 'function') {
      clearInterval(poll)
      initEruda()
      return
    }
    if (elapsed >= timeout) {
      clearInterval(poll)
      console.log('[ErudaArcade] SW did not inject Eruda, loading from CDN...')
      const s = document.createElement('script')
      s.src = ERUDA_CDN
      s.onload = () => {
        initEruda()
      }
      document.head.appendChild(s)
    }
  }, pollMs)
}

if (typeof document !== 'undefined') {
  const script = document.currentScript
  if (script && script.getAttribute('data-auto') !== null) {
    auto()
  }
}

export default { register, registerLegacy, init: initEruda, auto, injectPlugin }
