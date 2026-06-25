#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_DIR = resolve(__dirname, '..')

function showHelp() {
  console.log(`
ErudaArcade CLI - Mobile debugging toolkit

USAGE:
  npx eruda-arcade <command>

COMMANDS:
  setup     Copy sw.js to current project root and show setup instructions
  init      Alias for setup
  plugin    Copy plugins.js to current directory
  help      Show this help

EXAMPLES:
  npx eruda-arcade setup
  npx eruda-arcade plugin
`)
}

function copyToCwd(filename) {
  const src = resolve(PKG_DIR, filename)
  const dest = resolve(process.cwd(), filename)

  if (!existsSync(src)) {
    console.error(`[ErudaArcade] Source file not found: ${src}`)
    process.exit(1)
  }

  if (existsSync(dest)) {
    console.log(`[ErudaArcade] ${filename} already exists, skipping.`)
  } else {
    copyFileSync(src, dest)
    console.log(`[ErudaArcade] Copied ${filename} to ${dest}`)
  }
}

function showSetupInstructions(swPath) {
  console.log(`
[ErudaArcade] SETUP COMPLETE

1. Add this to your HTML (in <head> or before </body>):

   <!-- Option A: Auto-init (recommended) -->
   <script src="node_modules/eruda-arcade/index.js" data-auto><\\/script>

   <!-- Option B: Manual init -->
   <script type="module">
     import { register, auto } from './node_modules/eruda-arcade/index.js'
     auto()
   <\\/script>

2. If using a bundler (Vite, Webpack, etc.):

   import { register } from 'eruda-arcade'
   register()

3. Make sure sw.js is served at the root of your project
   (or pass a custom path: register({ swPath: '/custom-sw.js' }))

4. Start your dev server on http://localhost:PORT
   Eruda will appear automatically in every page.

5. For production: deploy on HTTPS (Netlify, Vercel, etc.)
`)
}

const cmd = process.argv[2] || 'help'

switch (cmd) {
  case 'setup':
  case 'init':
    copyToCwd('sw.js')
    showSetupInstructions('/sw.js')
    break
  case 'plugin':
    copyToCwd('plugins.js')
    console.log(`\n[ErudaArcade] plugins.js copied. Import it in your HTML or JS.`)
    break
  case 'help':
  default:
    showHelp()
    break
}
