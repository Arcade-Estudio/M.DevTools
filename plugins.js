export const PLUGIN_CODE = `
(function(){
  if (window.__appTabLoaded) return
  window.__appTabLoaded = true

  var __origAddEventListener = EventTarget.prototype.addEventListener
  var __origRemoveEventListener = EventTarget.prototype.removeEventListener

  EventTarget.prototype.addEventListener = function(type, handler, opts) {
    if (!this.__erudaListeners) this.__erudaListeners = []
    this.__erudaListeners.push({type: type, handler: handler, opts: opts})
    __origAddEventListener.call(this, type, handler, opts)
  }

  EventTarget.prototype.removeEventListener = function(type, handler, opts) {
    if (this.__erudaListeners) {
      this.__erudaListeners = this.__erudaListeners.filter(function(l) {
        return !(l.type === type && l.handler === handler)
      })
    }
    __origRemoveEventListener.call(this, type, handler, opts)
  }

  try {
    Node.prototype.addEventListener = function(type, handler, opts) {
      if (!this.__erudaListeners) this.__erudaListeners = []
      this.__erudaListeners.push({type: type, handler: handler, opts: opts})
      __origAddEventListener.call(this, type, handler, opts)
    }
    Node.prototype.removeEventListener = function(type, handler, opts) {
      if (this.__erudaListeners) {
        this.__erudaListeners = this.__erudaListeners.filter(function(l) {
          return !(l.type === type && l.handler === handler)
        })
      }
      __origRemoveEventListener.call(this, type, handler, opts)
    }
  } catch(e) {}

  function createAppTab(eruda) {
    var $ = eruda.util.el
    var evalCss = eruda.util.evalCss
    var isErudaEl = eruda.util.isErudaEl
    var style
    var activeTab = 'App'
    var requests = []
    var sensorHandler = null
    var _$el, _$tabbar, _$content

    var AppTab = {
      name: 'AppTab',
      init: function($el) {
        _$el = $el
        this._setupConsoleCapture()
        this._startNetObserver()
        style = evalCss('\
.eruda-apptab-wrap{display:flex;flex-direction:column;height:100%}\
.eruda-apptab-tabbar{display:flex;background:var(--highlight);border-bottom:2px solid var(--accent);flex-shrink:0;overflow-x:auto;position:sticky;top:0;z-index:2}\
.eruda-apptab-tabbar::-webkit-scrollbar{height:2px}\
.eruda-apptab-tabbar::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}\
.eruda-apptab-tab{padding:8px 14px;cursor:pointer;font-size:11px;white-space:nowrap;border-bottom:2px solid transparent;color:var(--dark);transition:all .15s;user-select:none;-webkit-user-select:none}\
.eruda-apptab-tab:hover{background:var(--border);color:var(--foreground)}\
.eruda-apptab-tab.active{border-bottom-color:var(--accent);color:var(--foreground);font-weight:bold}\
.eruda-apptab-panels{flex:1;overflow-y:auto;overflow-x:hidden;position:relative;min-height:0}\
.eruda-apptab-panel{display:none;height:100%}\
.eruda-apptab-panel.active{display:block}\
.eruda-apptab-section{margin:6px;border:1px solid var(--border);border-radius:4px;overflow:hidden}\
.eruda-apptab-header{padding:8px 12px;background:var(--highlight);cursor:pointer;font-weight:bold;display:flex;justify-content:space-between;font-size:12px}\
.eruda-apptab-header:hover{background:var(--accent);color:#fff}\
.eruda-apptab-body{padding:6px;display:none;font-size:12px}\
.eruda-apptab-body.open{display:block}\
.eruda-apptab-item{padding:4px 8px;border-bottom:1px solid var(--border);font-size:12px;word-break:break-all}\
.eruda-apptab-item:last-child{border-bottom:none}\
.eruda-apptab-key{color:var(--keywordColor);font-weight:bold}\
.eruda-apptab-val{color:var(--stringColor)}\
.eruda-apptab-btn{padding:2px 8px;margin:2px;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:var(--highlight);color:var(--foreground);font-size:11px}\
.eruda-apptab-btn:hover{background:var(--accent);color:#fff}\
.eruda-apptab-empty{padding:8px;color:var(--dark);font-style:italic}\
.eruda-apptab-table{width:100%;border-collapse:collapse;font-size:11px}\
.eruda-apptab-table td,.eruda-apptab-table th{padding:5px 6px;border:1px solid var(--border);text-align:left}\
.eruda-apptab-table th{background:var(--highlight);font-weight:bold}\
.eruda-netwat-table{width:100%;border-collapse:collapse;font-size:11px}\
.eruda-netwat-table th{padding:6px 4px;background:var(--highlight);border:1px solid var(--border);position:sticky;top:0;z-index:1;font-size:10px}\
.eruda-netwat-table td{padding:4px;border:1px solid var(--border);vertical-align:middle}\
.eruda-netwat-waterfall{position:relative;height:14px;background:var(--border);border-radius:2px;overflow:hidden;min-width:80px}\
.eruda-netwat-bar{position:absolute;height:100%;border-radius:2px}\
.eruda-netwat-bar-dns{background:#4caf50}\
.eruda-netwat-bar-tcp{background:#ff9800}\
.eruda-netwat-bar-tls{background:#f44336}\
.eruda-netwat-bar-req{background:#2196f3}\
.eruda-netwat-bar-res{background:#9c27b0}\
.eruda-netwat-url{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block}\
.eruda-netwat-time{font-size:10px;color:var(--dark)}\
.eruda-netwat-clear{padding:6px 12px;margin:4px;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:var(--highlight);color:var(--foreground)}\
.eruda-netwat-clear:hover{background:var(--accent);color:#fff}\
.eruda-netwat-info{padding:8px;color:var(--dark);font-style:italic}\
.eruda-netwat-header{display:flex;justify-content:space-between;padding:4px 8px;align-items:center}\
.eruda-eplus-item{padding:6px 10px;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer}\
.eruda-eplus-item:hover{background:var(--highlight)}\
.eruda-eplus-tag{color:var(--tagNameColor);font-weight:bold}\
.eruda-eplus-event{display:inline-block;padding:2px 6px;margin:2px;border-radius:3px;font-size:10px;cursor:pointer}\
.eruda-eplus-click{background:#4caf50;color:#fff}\
.eruda-eplus-touch{background:#ff9800;color:#fff}\
.eruda-eplus-keyboard{background:#2196f3;color:#fff}\
.eruda-eplus-mouse{background:#9c27b0;color:#fff}\
.eruda-eplus-scroll{background:#607d8b;color:#fff}\
.eruda-eplus-other{background:var(--border);color:var(--foreground)}\
.eruda-eplus-info{padding:12px;font-style:italic;color:var(--dark)}\
.eruda-eplus-count{padding:6px 8px;font-size:11px}\
.eruda-eplus-handler{margin:4px 0;padding:4px;background:var(--highlight);border-radius:3px;font-size:10px;font-family:monospace;white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:auto}\
.eruda-objtree{padding:6px;font-size:12px}\
.eruda-objtree-node{margin-left:14px;border-left:1px solid var(--border);padding-left:6px}\
.eruda-objtree-key{color:var(--keywordColor);font-weight:bold}\
.eruda-objtree-val{color:var(--stringColor)}\
.eruda-objtree-type{font-size:10px;color:var(--dark);margin-left:4px}\
.eruda-objtree-number{color:var(--numberColor)}\
.eruda-objtree-bool{color:var(--operatorColor)}\
.eruda-objtree-null{color:var(--dark);font-style:italic}\
.eruda-objtree-fn{color:var(--functionColor);font-family:monospace;font-size:10px;white-space:pre-wrap;max-height:50px;overflow:auto;display:inline-block;max-width:250px}\
.eruda-objtree-toggle{cursor:pointer;color:var(--accent);margin-right:4px}\
.eruda-objtree-toggle:hover{color:var(--primary)}\
.eruda-objtree-item{padding:2px 0}\
.eruda-objtree-header{padding:6px;margin-bottom:6px;background:var(--highlight);border-radius:4px;font-size:12px}\
.eruda-objtree-input{width:100%;padding:6px;border:1px solid var(--border);border-radius:3px;background:var(--background);color:var(--foreground);font-family:monospace;font-size:12px;box-sizing:border-box}\
.eruda-objtree-btn{padding:6px 12px;margin:4px 0;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:var(--highlight);color:var(--foreground)}\
.eruda-objtree-btn:hover{background:var(--accent);color:#fff}\
.eruda-objtree-error{color:#f44336;padding:6px}\
.eruda-objtree-proto{color:var(--dark);font-style:italic;font-size:11px;padding:2px 0}\
')
        this.render()
      },

      _setupConsoleCapture: function() {
        if (window.__consoleHistory) return
        window.__consoleHistory = []
        var methods = ['log','warn','error','info','debug']
        methods.forEach(function(m) {
          var orig = console[m]
          console[m] = function() {
            var args = Array.prototype.slice.call(arguments)
            var text = args.map(function(a) {
              try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a) } catch(e) { return String(a) }
            }).join(' ')
            window.__consoleHistory.push({level: m, text: text, time: Date.now()})
            if (window.__consoleHistory.length > 500) window.__consoleHistory.shift()
            return orig.apply(console, args)
          }
        })
      },

      _startNetObserver: function() {
        var self = this
        if (window.PerformanceObserver) {
          try {
            var obs = new PerformanceObserver(function(list) {
              list.getEntries().forEach(function(entry) {
                if (entry.entryType === 'resource') {
                  self._addRequest(entry)
                }
              })
            })
            obs.observe({entryTypes: ['resource']})
          } catch(e) {}
        }
        if (window.performance && window.performance.getEntriesByType) {
          var entries = window.performance.getEntriesByType('resource')
          entries.forEach(function(entry) { self._addRequest(entry) })
        }
      },

      _addRequest: function(entry) {
        var req = {
          name: entry.name,
          initiatorType: entry.initiatorType || 'other',
          duration: entry.duration,
          startTime: entry.startTime,
          domainLookupStart: entry.domainLookupStart,
          domainLookupEnd: entry.domainLookupEnd,
          connectStart: entry.connectStart,
          connectEnd: entry.connectEnd,
          secureConnectionStart: entry.secureConnectionStart,
          requestStart: entry.requestStart,
          responseStart: entry.responseStart,
          responseEnd: entry.responseEnd,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize
        }
        for (var i = 0; i < requests.length; i++) {
          if (requests[i].name === req.name && Math.abs(requests[i].startTime - req.startTime) < 1) return
        }
        requests.push(req)
        var panel = _$content && _$content.querySelector('[data-panel="NetWat"]')
        if (panel && panel.classList.contains('active')) {
          var el = panel.querySelector('.eruda-netwat-list')
          if (el) el.innerHTML = this._renderNetwatRows()
        }
      },

      switchTab: function(name) {
        if (activeTab === name) return
        activeTab = name
        var tabs = _$tabbar.querySelectorAll('.eruda-apptab-tab')
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name)
        }
        var panels = _$content.querySelectorAll('.eruda-apptab-panel')
        for (var j = 0; j < panels.length; j++) {
          panels[j].classList.toggle('active', panels[j].getAttribute('data-panel') === name)
        }
        if (name === 'App') this._refreshCurrentApp()
        if (name === 'NetWat') this._refreshNetwat()
        if (name === 'Elements') this._refreshElements()
        if (name === 'Inspect') this._refreshInspect()
        for (var k = 0; k < tabs.length; k++) {
          if (tabs[k].getAttribute('data-tab') === name) {
            tabs[k].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})
            break
          }
        }
      },

      _refreshCurrentApp: function() {
        var panel = _$content && _$content.querySelector('[data-panel="App"]')
        if (panel) {
          var inner = panel.querySelector('.eruda-apptab-inner')
          if (inner) inner.innerHTML = this._renderAppSections()
        }
      },

      _refreshNetwat: function() {
        var panel = _$content && _$content.querySelector('[data-panel="NetWat"]')
        if (panel) {
          var el = panel.querySelector('.eruda-netwat-list')
          if (el) el.innerHTML = this._renderNetwatRows()
        }
      },

      _refreshElements: function() {
        var panel = _$content && _$content.querySelector('[data-panel="Elements"]')
        if (panel) {
          var el = panel.querySelector('.eruda-eplus-list')
          if (el) el.innerHTML = this._renderElementsContent()
        }
      },

      _refreshInspect: function() {
        var panel = _$content && _$content.querySelector('[data-panel="Inspect"]')
        if (panel) {
          var el = panel.querySelector('.eruda-objtree-result')
          if (el) {
            try {
              el.innerHTML = this._inspectObject(window, 'window (global object)')
            } catch(e) {
              el.innerHTML = '<div class="eruda-objtree-error">Error: '+e.message+'</div>'
            }
          }
        }
      },

      render: function() {
        var self = this
        var s = '<div class="eruda-apptab-wrap">'
        s += '<div class="eruda-apptab-tabbar" id="eruda-apptab-bar">'
        var tabNames = ['App', 'NetWat', 'Elements', 'Inspect']
        for (var i = 0; i < tabNames.length; i++) {
          var t = tabNames[i]
          s += '<div class="eruda-apptab-tab' + (t === activeTab ? ' active' : '') + '" data-tab="' + t + '" onclick="var at=eruda.get(\'AppTab\');if(at)at.switchTab(\'' + t + '\')">' + t + '</div>'
        }
        s += '</div>'
        s += '<div class="eruda-apptab-panels" id="eruda-apptab-panels">'
        s += '<div class="eruda-apptab-panel' + (activeTab === 'App' ? ' active' : '') + '" data-panel="App"><div class="eruda-apptab-inner">' + this._renderAppSections() + '</div></div>'
        s += '<div class="eruda-apptab-panel' + (activeTab === 'NetWat' ? ' active' : '') + '" data-panel="NetWat"><div class="eruda-netwat-list">' + this._renderNetwatRows() + '</div></div>'
        s += '<div class="eruda-apptab-panel' + (activeTab === 'Elements' ? ' active' : '') + '" data-panel="Elements"><div class="eruda-eplus-list">' + this._renderElementsContent() + '</div></div>'
        s += '<div class="eruda-apptab-panel' + (activeTab === 'Inspect' ? ' active' : '') + '" data-panel="Inspect">'
        s += '<div style="padding:6px;display:flex;gap:4px">'
        s += '<input id="eruda-obj-input" class="eruda-objtree-input" placeholder="Ej: window, document, location, navigator..." value="window">'
        s += '<button class="eruda-objtree-btn" onclick="var at=eruda.get(\'AppTab\');var v=document.getElementById(\'eruda-obj-input\').value;try{at._doInspect(eval(\'(\'+v+\')\')||eval(v),v)}catch(e){at._showInspectError(e.message)}">Inspect</button>'
        s += '</div>'
        s += '<div class="eruda-objtree-result">'
        try {
          s += this._inspectObject(window, 'window (global object)')
        } catch(e) {
          s += '<div class="eruda-objtree-error">Error: '+e.message+'</div>'
        }
        s += '</div></div>'
        s += '</div></div>'
        _$el.html(s)
        _$tabbar = _$el.querySelector('#eruda-apptab-bar')
        _$content = _$el.querySelector('#eruda-apptab-panels')
        if (activeTab === 'App') this._startSensorListeners()
      },

      _renderAppSections: function() {
        var self = this
        var s = ''
        s += self._section('Service Worker',
          function() { return '<div id="eruda-sw-info">'+self._renderSW()+'</div>' },
          function() { self._refreshSW() }
        )
        s += self._section('localStorage',
          function() { return self._renderStorage('local') },
          function() { self._refreshStorage('local') }
        )
        s += self._section('sessionStorage',
          function() { return self._renderStorage('session') },
          function() { self._refreshStorage('session') }
        )
        s += self._section('IndexedDB',
          function() { return '<div id="eruda-idb-content">'+self._renderIDB()+'</div>' },
          function() { self._refreshIDB() }
        )
        s += self._section('Cache API',
          function() { return '<div id="eruda-cache-content">'+self._renderCache()+'</div>' },
          function() { self._refreshCache() }
        )
        s += self._section('Cookies',
          function() { return '<div id="eruda-cookies-content">'+self._renderCookies()+'</div>' },
          function() { self._refreshCookies() }
        )
        s += self._section('Network Info',
          function() { return '<div id="eruda-network-content">'+self._renderNetwork()+'</div>' },
          function() { self._refreshNetwork() }
        )
        s += self._section('Device Info',
          function() { return '<div id="eruda-device-content">'+self._renderDevice()+'</div>' },
          function() { self._refreshDevice() }
        )
        s += self._section('Battery',
          function() { return '<div id="eruda-battery-content">'+self._renderBattery()+'</div>' },
          function() { self._refreshBattery() }
        )
        s += self._section('Performance',
          function() { return '<div id="eruda-perf-content">'+self._renderPerformance()+'</div>' },
          function() { self._refreshPerformance() }
        )
        s += self._section('Console',
          function() { return '<div id="eruda-console-content">'+self._renderConsole()+'</div>' },
          function() { self._refreshConsole() }
        )
        s += self._section('Notifications',
          function() { return '<div id="eruda-notif-content">'+self._renderNotifications()+'</div>' },
          function() { self._refreshNotifications() }
        )
        s += self._section('Sensors',
          function() { return '<div id="eruda-sensor-content">'+self._renderSensors()+'</div>' },
          function() { self._refreshSensors() }
        )
        return s
      },

      _section: function(title, contentFn, refreshFn) {
        var id = title.replace(/\\s+/g,'')
        return '<div class="eruda-apptab-section">'
          + '<div class="eruda-apptab-header" onclick="var b=this.nextElementSibling;b.classList.toggle(\'open\');this.querySelector(\'.eruda-apptab-arrow\').textContent=b.classList.contains(\'open\')?\'\\u25BC\':\'\\u25B6\'">'
          + '<span>'+title+'</span>'
          + '<div><span class="eruda-apptab-arrow">\\u25B6</span>'
          + '<span class="eruda-apptab-refresh" onclick="event.stopPropagation();('+refreshFn.toString()+')()" style="margin-left:8px;cursor:pointer">\\u21BB</span></div>'
          + '</div>'
          + '<div class="eruda-apptab-body" id="eruda-'+id+'">'
          + contentFn()
          + '</div></div>'
      },

      _renderSW: function() {
        if (!('serviceWorker' in navigator)) return '<div class="eruda-apptab-empty">Service Worker no soportado</div>'
        var s = '<table class="eruda-apptab-table">'
        s += '<tr><th>Propiedad</th><th>Valor</th></tr>'
        if (navigator.serviceWorker.controller) {
          s += '<tr><td>Estado</td><td style="color:#4caf50;font-weight:bold">ACTIVO</td></tr>'
          s += '<tr><td>Script</td><td>'+navigator.serviceWorker.controller.scriptURL+'</td></tr>'
          s += '<tr><td>Estado</td><td>'+navigator.serviceWorker.controller.state+'</td></tr>'
        } else {
          s += '<tr><td>Estado</td><td style="color:#ff9800">Sin controller</td></tr>'
        }
        s += '</table>'
        return s
      },
      _refreshSW: function() {
        var el = _$content && _$content.querySelector('#eruda-sw-info')
        if (el) el.innerHTML = this._renderSW()
      },

      _renderStorage: function(type) {
        var storage = type === 'local' ? localStorage : sessionStorage
        var items = []
        for (var i = 0; i < storage.length; i++) {
          var k = storage.key(i)
          items.push({key: k, val: storage.getItem(k)})
        }
        if (items.length === 0) return '<div class="eruda-apptab-empty">Vacio</div>'
        var s = '<table class="eruda-apptab-table"><tr><th>Key</th><th>Value</th><th>Accion</th></tr>'
        for (var j = 0; j < items.length; j++) {
          var v = items[j].val
          if (v.length > 80) v = v.substring(0,80)+'...'
          v = v.replace(/</g,'&lt;').replace(/>/g,'&gt;')
          s += '<tr>'
          s += '<td class="eruda-apptab-key">'+items[j].key.replace(/</g,'&lt;')+'</td>'
          s += '<td class="eruda-apptab-val">'+v+'</td>'
          s += \`<td><button class="eruda-apptab-btn" onclick="\${type}Storage.removeItem('\${items[j].key.replace(/'/g,"\\\\'")}');var r=eruda.get('AppTab');if(r)r._refreshStorage('\${type}')">Delete</button></td>\`
          s += '</tr>'
        }
        s += '</table>'
        return s
      },
      _refreshStorage: function(type) {
        var el = _$content && _$content.querySelector('#eruda-'+type+'Storage .eruda-apptab-body')
        if (el) el.innerHTML = this._renderStorage(type)
      },

      _renderIDB: function() {
        if (!window.indexedDB) return '<div class="eruda-apptab-empty">IndexedDB no soportado</div>'
        var div = document.createElement('div')
        div.className = 'eruda-apptab-empty'
        div.textContent = 'Cargando...'
        var self = this
        window.indexedDB.databases().then(function(dbs) {
          if (dbs.length === 0) {
            div.textContent = 'No hay bases de datos'
            div.className = 'eruda-apptab-empty'
            return
          }
          var s = '<table class="eruda-apptab-table"><tr><th>Base de datos</th><th>Version</th><th>Object Stores</th></tr>'
          var pending = dbs.length
          dbs.forEach(function(dbInfo) {
            var req = window.indexedDB.open(dbInfo.name, dbInfo.version)
            req.onsuccess = function(e) {
              var db = e.target.result
              var stores = Array.from(db.objectStoreNames).join(', ') || 'ninguna'
              s += '<tr><td>'+db.name+'</td><td>'+db.version+'</td><td>'+stores+'</td></tr>'
              db.close()
              pending--
              if (pending === 0) {
                s += '</table>'
                div.innerHTML = s
                div.className = ''
              }
            }
            req.onerror = function() {
              s += '<tr><td>'+dbInfo.name+'</td><td>'+dbInfo.version+'</td><td>Error al abrir</td></tr>'
              pending--
              if (pending === 0) {
                s += '</table>'
                div.innerHTML = s
                div.className = ''
              }
            }
          })
        }).catch(function() {
          div.textContent = 'Error al listar bases de datos'
        })
        return div.outerHTML
      },
      _refreshIDB: function() {
        var el = _$content && _$content.querySelector('#eruda-idb-content')
        if (el) el.innerHTML = this._renderIDB()
      },

      _renderCache: function() {
        if (!('caches' in window)) return '<div class="eruda-apptab-empty">Cache API no soportado</div>'
        var div = document.createElement('div')
        div.className = 'eruda-apptab-empty'
        div.textContent = 'Cargando...'
        window.caches.keys().then(function(names) {
          if (names.length === 0) {
            div.textContent = 'No hay caches'
            div.className = 'eruda-apptab-empty'
            return
          }
          var s = '<table class="eruda-apptab-table"><tr><th>Cache Name</th><th>Entries</th></tr>'
          var pending = names.length
          names.forEach(function(name) {
            window.caches.open(name).then(function(cache) {
              cache.keys().then(function(requests) {
                s += '<tr><td>'+name+'</td><td>'+requests.length+' entradas</td></tr>'
                pending--
                if (pending === 0) {
                  s += '</table>'
                  div.innerHTML = s
                  div.className = ''
                }
              })
            })
          })
        }).catch(function() {
          div.textContent = 'Error al listar caches'
        })
        return div.outerHTML
      },
      _refreshCache: function() {
        var el = _$content && _$content.querySelector('#eruda-cache-content')
        if (el) el.innerHTML = this._renderCache()
      },

      _renderCookies: function() {
        var c = document.cookie
        if (!c || c === '') return '<div class="eruda-apptab-empty">No hay cookies</div>'
        var items = c.split(';').map(function(x) {
          var p = x.indexOf('=')
          return {key: x.substring(0,p).trim(), val: x.substring(p+1).trim()}
        })
        var s = '<table class="eruda-apptab-table"><tr><th>Cookie</th><th>Value</th><th>Accion</th></tr>'
        for (var i = 0; i < items.length; i++) {
          s += '<tr>'
          s += '<td class="eruda-apptab-key">'+items[i].key.replace(/</g,'&lt;')+'</td>'
          s += '<td class="eruda-apptab-val">'+items[i].val.replace(/</g,'&lt;')+'</td>'
          s += \`<td><button class="eruda-apptab-btn" onclick="document.cookie='\${items[i].key.replace(/'/g,"\\\\'")}=;max-age=0;path=/';var r=eruda.get('AppTab');if(r)r._refreshCookies()">Delete</button></td>\`
          s += '</tr>'
        }
        s += '</table>'
        return s
      },
      _refreshCookies: function() {
        var el = _$content && _$content.querySelector('#eruda-cookies-content')
        if (el) el.innerHTML = this._renderCookies()
      },

      _renderNetwork: function() {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        var s = '<table class="eruda-apptab-table"><tr><th>Propiedad</th><th>Valor</th></tr>'
        s += '<tr><td>Online</td><td style="color:'+(navigator.onLine?'#4caf50':'#f44336')+'">'+(navigator.onLine?'Si':'No')+'</td></tr>'
        if (conn) {
          s += '<tr><td>Tipo conexion</td><td>'+(conn.type||'N/A')+'</td></tr>'
          s += '<tr><td>Effective Type</td><td>'+(conn.effectiveType||'N/A')+'</td></tr>'
          s += '<tr><td>Downlink</td><td>'+(conn.downlink?conn.downlink+' Mbps':'N/A')+'</td></tr>'
          s += '<tr><td>RTT</td><td>'+(conn.rtt?conn.rtt+' ms':'N/A')+'</td></tr>'
          s += '<tr><td>Data Saver</td><td>'+(conn.saveData?'Activo':'Inactivo')+'</td></tr>'
        } else {
          s += '<tr><td colspan="2" style="color:var(--dark);font-style:italic">Network Information API no disponible</td></tr>'
        }
        s += '</table>'
        return s
      },
      _refreshNetwork: function() {
        var el = _$content && _$content.querySelector('#eruda-network-content')
        if (el) el.innerHTML = this._renderNetwork()
      },

      _renderDevice: function() {
        var mem = navigator.deviceMemory ? navigator.deviceMemory+' GB' : 'N/A'
        var cpu = navigator.hardwareConcurrency ? navigator.hardwareConcurrency+' nucleos' : 'N/A'
        var s = '<table class="eruda-apptab-table"><tr><th>Propiedad</th><th>Valor</th></tr>'
        s += '<tr><td>User Agent</td><td style="word-break:break-all;font-size:10px">'+navigator.userAgent.replace(/</g,'&lt;')+'</td></tr>'
        s += '<tr><td>Plataforma</td><td>'+(navigator.platform||'N/A')+'</td></tr>'
        s += '<tr><td>Idioma</td><td>'+(navigator.language||'N/A')+'</td></tr>'
        s += '<tr><td>Pantalla</td><td>'+screen.width+'x'+screen.height+' (@'+window.devicePixelRatio+'x)</td></tr>'
        s += '<tr><td>Viewport</td><td>'+window.innerWidth+'x'+window.innerHeight+'</td></tr>'
        s += '<tr><td>Memoria RAM</td><td>'+mem+'</td></tr>'
        s += '<tr><td>CPUs</td><td>'+cpu+'</td></tr>'
        s += '<tr><td>Vendedor</td><td>'+(navigator.vendor||'N/A')+'</td></tr>'
        s += '</table>'
        return s
      },
      _refreshDevice: function() {
        var el = _$content && _$content.querySelector('#eruda-device-content')
        if (el) el.innerHTML = this._renderDevice()
      },

      _renderBattery: function() {
        if (!navigator.getBattery) return '<div class="eruda-apptab-empty">Battery API no disponible</div>'
        var div = document.createElement('div')
        div.className = 'eruda-apptab-empty'
        div.textContent = 'Cargando...'
        navigator.getBattery().then(function(b) {
          var s = '<table class="eruda-apptab-table"><tr><th>Propiedad</th><th>Valor</th></tr>'
          s += '<tr><td>Nivel</td><td>'+(b.level*100)+'%</td></tr>'
          s += '<tr><td>Cargando</td><td style="color:'+(b.charging?'#4caf50':'#ff9800')+'">'+(b.charging?'Si':'No')+'</td></tr>'
          s += '<tr><td>Tiempo carga restante</td><td>'+(b.chargingTime===Infinity?'N/A':b.chargingTime+' s')+'</td></tr>'
          s += '<tr><td>Tiempo descarga restante</td><td>'+(b.dischargingTime===Infinity?'N/A':b.dischargingTime+' s')+'</td></tr>'
          s += '</table>'
          div.innerHTML = s
          div.className = ''
        }).catch(function() { div.textContent = 'Error al leer bateria' })
        return div.outerHTML
      },
      _refreshBattery: function() {
        var el = _$content && _$content.querySelector('#eruda-battery-content')
        if (el) el.innerHTML = this._renderBattery()
      },

      _renderPerformance: function() {
        if (!window.performance) return '<div class="eruda-apptab-empty">Performance API no disponible</div>'
        var s = '<table class="eruda-apptab-table"><tr><th>Metrica</th><th>Valor</th></tr>'
        var nav = performance.getEntriesByType('navigation')[0]
        if (nav) {
          s += '<tr><td>DOM Content Loaded</td><td>'+(nav.domContentLoadedEventEnd-nav.domContentLoadedEventStart).toFixed(2)+' ms</td></tr>'
          s += '<tr><td>DOM Interactive</td><td>'+nav.domInteractive.toFixed(2)+' ms</td></tr>'
          s += '<tr><td>DOM Complete</td><td>'+nav.domComplete.toFixed(2)+' ms</td></tr>'
          s += '<tr><td>Load Event</td><td>'+(nav.loadEventEnd-nav.loadEventStart).toFixed(2)+' ms</td></tr>'
          s += '<tr><td>Carga total</td><td>'+nav.loadEventEnd.toFixed(2)+' ms</td></tr>'
        } else if (performance.timing) {
          var t = performance.timing
          s += '<tr><td>DOM Content Loaded</td><td>'+(t.domContentLoadedEventEnd-t.domContentLoadedEventStart)+' ms</td></tr>'
          s += '<tr><td>DOM Complete</td><td>'+(t.domComplete-t.domLoading)+' ms</td></tr>'
          s += '<tr><td>Carga total</td><td>'+(t.loadEventEnd-t.navigationStart)+' ms</td></tr>'
        }
        if (performance.memory) {
          var m = performance.memory
          s += '<tr><td>Heap usado</td><td>'+(m.usedJSHeapSize/1048576).toFixed(2)+' MB</td></tr>'
          s += '<tr><td>Heap total</td><td>'+(m.totalJSHeapSize/1048576).toFixed(2)+' MB</td></tr>'
          s += '<tr><td>Heap limite</td><td>'+(m.jsHeapSizeLimit/1048576).toFixed(2)+' MB</td></tr>'
        }
        s += '</table>'
        return s
      },
      _refreshPerformance: function() {
        var el = _$content && _$content.querySelector('#eruda-perf-content')
        if (el) el.innerHTML = this._renderPerformance()
      },

      _renderConsole: function() {
        if (!window.__consoleHistory || window.__consoleHistory.length === 0) {
          return '<div class="eruda-apptab-empty">No hay logs capturados</div>'
        }
        var logs = window.__consoleHistory.slice(-100)
        var s = '<div style="padding:4px;font-size:11px;color:var(--dark)">Ultimos '+logs.length+' de '+window.__consoleHistory.length+' logs</div>'
        s += '<div style="font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-all">'
        for (var i = 0; i < logs.length; i++) {
          var l = logs[i]
          var color = l.level === 'error' ? '#f44336' : l.level === 'warn' ? '#ff9800' : l.level === 'info' ? '#2196f3' : '#e7e9ea'
          s += '<div style="padding:2px 4px;border-bottom:1px solid var(--border)"><span style="color:'+color+';font-weight:bold">['+l.level.toUpperCase()+']</span> '+l.text.replace(/</g,'&lt;')+'</div>'
        }
        s += '</div>'
        return s
      },
      _refreshConsole: function() {
        var el = _$content && _$content.querySelector('#eruda-console-content')
        if (el) el.innerHTML = this._renderConsole()
      },

      _renderNotifications: function() {
        if (!('Notification' in window)) return '<div class="eruda-apptab-empty">Notification API no disponible</div>'
        var s = '<table class="eruda-apptab-table"><tr><th>Propiedad</th><th>Valor</th></tr>'
        s += '<tr><td>Soportado</td><td>Si</td></tr>'
        s += '<tr><td>Permiso</td><td style="font-weight:bold;color:'+(Notification.permission==='granted'?'#4caf50':Notification.permission==='denied'?'#f44336':'#ff9800')+'">'+Notification.permission+'</td></tr>'
        s += '</table>'
        s += '<div style="padding:8px">'
        if (Notification.permission === 'granted') {
          s += '<button class="eruda-apptab-btn" onclick="new Notification(\'AppTab Test\',{body:\'Notificacion funcionando!\'})">Enviar notificacion test</button>'
        } else if (Notification.permission === 'default') {
          s += '<button class="eruda-apptab-btn" onclick="Notification.requestPermission().then(function(){var r=eruda.get(\'AppTab\');if(r)r._refreshNotifications()})">Solicitar permiso</button>'
        } else {
          s += '<span style="color:#f44336;font-size:12px">Permiso denegado. Habilitalo en ajustes del sistema.</span>'
        }
        s += '</div>'
        return s
      },
      _refreshNotifications: function() {
        var el = _$content && _$content.querySelector('#eruda-notif-content')
        if (el) el.innerHTML = this._renderNotifications()
      },

      _renderSensors: function() {
        var hasAccel = 'Accelerometer' in window || 'DeviceMotionEvent' in window
        var hasGyro = 'Gyroscope' in window || 'DeviceOrientationEvent' in window
        var hasLight = 'AmbientLightSensor' in window
        var s = '<table class="eruda-apptab-table"><tr><th>Sensor</th><th>Disponible</th></tr>'
        s += '<tr><td>Acelerometro</td><td style="color:'+(hasAccel?'#4caf50':'#f44336')+'">'+(hasAccel?'Si':'No')+'</td></tr>'
        s += '<tr><td>Giroscopio</td><td style="color:'+(hasGyro?'#4caf50':'#f44336')+'">'+(hasGyro?'Si':'No')+'</td></tr>'
        s += '<tr><td>Luz ambiental</td><td style="color:'+(hasLight?'#4caf50':'#f44336')+'">'+(hasLight?'Si':'No')+'</td></tr>'
        s += '</table>'
        if (hasAccel || hasGyro) {
          s += '<div style="padding:8px;margin-top:4px;background:var(--highlight);border-radius:4px;font-size:11px">'
          s += '<div style="margin-bottom:4px">Datos en vivo:</div>'
          s += '<div id="eruda-sensor-data" style="font-family:monospace">Escuchando...</div>'
          s += '</div>'
        }
        return s
      },
      _refreshSensors: function() {
        var el = _$content && _$content.querySelector('#eruda-sensor-content')
        if (el) el.innerHTML = this._renderSensors()
        this._startSensorListeners()
      },
      _startSensorListeners: function() {
        var dataEl = document.getElementById('eruda-sensor-data')
        if (!dataEl) return
        if (sensorHandler) {
          window.removeEventListener('devicemotion', sensorHandler)
          window.removeEventListener('deviceorientation', sensorHandler)
        }
        var self = this
        sensorHandler = function(e) {
          var el = document.getElementById('eruda-sensor-data')
          if (!el) return
          if (e.type === 'devicemotion') {
            var a = e.accelerationIncludingGravity || {}
            el.textContent = 'Accel: x='+(a.x||0).toFixed(2)+' y='+(a.y||0).toFixed(2)+' z='+(a.z||0).toFixed(2)
          } else if (e.type === 'deviceorientation') {
            el.textContent = 'Orient: alpha='+(e.alpha||0).toFixed(1)+' beta='+(e.beta||0).toFixed(1)+' gamma='+(e.gamma||0).toFixed(1)
          }
        }
        window.addEventListener('devicemotion', sensorHandler)
        window.addEventListener('deviceorientation', sensorHandler)
      },

      // NetWat
      _renderNetwatRows: function() {
        if (requests.length === 0) {
          return '<div class="eruda-netwat-info">Esperando requests... Las peticiones apareceran aqui en tiempo real</div>'
        }
        var self = this
        var maxTime = this._netwatMaxWidth()
        var s = '<div class="eruda-netwat-header">'
          + '<span><strong>'+requests.length+'</strong> requests</span>'
          + '<button class="eruda-netwat-clear" onclick="var at=eruda.get(\'AppTab\');if(at)at._netwatClear()">Clear</button>'
          + '</div>'
          + '<div style="overflow-x:auto"><table class="eruda-netwat-table">'
          + '<tr><th>URL</th><th>Tipo</th><th>Tama\\u00f1o</th><th style="width:180px">Waterfall</th><th>Total</th></tr>'
        for (var i = Math.max(0, requests.length - 50); i < requests.length; i++) {
          var r = requests[i]
          var t = self._netwatCalcTiming(r)
          var name = r.name
          try { name = decodeURIComponent(new URL(r.name).pathname.split('/').pop() || r.name) } catch(e) {}
          var size = r.transferSize > 0 ? (r.transferSize / 1024).toFixed(1)+'KB' : '-'
          var bars = ''
          var offset = 0
          var totalW = 160
          if (t.total > 0) {
            var segments = [
              {key:'dns',val:t.dns,cls:'eruda-netwat-bar-dns',label:'DNS'},
              {key:'tcp',val:t.tcp,cls:'eruda-netwat-bar-tcp',label:'TCP'},
              {key:'tls',val:t.tls,cls:'eruda-netwat-bar-tls',label:'TLS'},
              {key:'req',val:t.request,cls:'eruda-netwat-bar-req',label:'Req'},
              {key:'res',val:t.response,cls:'eruda-netwat-bar-res',label:'Res'}
            ]
            for (var k = 0; k < segments.length; k++) {
              var seg = segments[k]
              if (seg.val > 0) {
                var w = Math.max(2, (seg.val / maxTime) * totalW)
                bars += '<div class="eruda-netwat-bar '+seg.cls+'" style="left:'+offset+'px;width:'+w+'px" title="'+seg.label+': '+seg.val.toFixed(2)+'ms"></div>'
                offset += w
              }
            }
          }
          bars = '<div class="eruda-netwat-waterfall">'+bars+'</div>'
          s += '<tr>'
            + '<td><span class="eruda-netwat-url" title="'+r.name.replace(/"/g,'&quot;')+'">'+name.replace(/</g,'&lt;')+'</span></td>'
            + '<td>'+r.initiatorType+'</td>'
            + '<td>'+size+'</td>'
            + '<td>'+bars+'</td>'
            + '<td class="eruda-netwat-time">'+this._netwatFormatTime(t.total)+'</td>'
          + '</tr>'
        }
        s += '</table></div>'
        return s
      },
      _netwatFormatTime: function(t) {
        if (t === undefined || t === null || t === 0) return '-'
        return (t).toFixed(2)+'ms'
      },
      _netwatCalcTiming: function(req) {
        var timing = {}
        timing.dns = req.domainLookupEnd > req.domainLookupStart ? req.domainLookupEnd - req.domainLookupStart : 0
        timing.tcp = req.connectEnd > req.connectStart ? req.connectEnd - req.connectStart : 0
        timing.tls = (req.secureConnectionStart && req.connectEnd > req.secureConnectionStart) ? req.connectEnd - req.secureConnectionStart : 0
        timing.request = req.responseStart > req.requestStart ? req.responseStart - req.requestStart : 0
        timing.response = req.responseEnd > req.responseStart ? req.responseEnd - req.responseStart : 0
        timing.total = req.duration || 0
        if (timing.tls > 0 && timing.tcp > timing.tls) timing.tcp = timing.tcp - timing.tls
        return timing
      },
      _netwatMaxWidth: function() {
        var m = 0
        for (var i = 0; i < requests.length; i++) {
          var t = this._netwatCalcTiming(requests[i])
          if (t.total > m) m = t.total
        }
        return m || 1
      },
      _netwatClear: function() {
        requests = []
        var panel = _$content && _$content.querySelector('[data-panel="NetWat"]')
        if (panel) {
          var el = panel.querySelector('.eruda-netwat-list')
          if (el) el.innerHTML = this._renderNetwatRows()
        }
      },

      // Elements+
      _renderElementsContent: function() {
        var self = this
        var allListeners = []
        var elements = document.querySelectorAll('*')
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i]
          if (el.__erudaListeners && el.__erudaListeners.length > 0) {
            var tagName = el.tagName.toLowerCase()
            var id = el.id ? '#'+el.id : ''
            var cls = ''
            if (el.className && typeof el.className === 'string') {
              cls = '.' + el.className.trim().split(/\\s+/).filter(function(c){return c}).join('.')
            }
            var selector = tagName + id + cls
            if (selector.length > 50) selector = selector.substring(0, 50)+'...'
            var grouped = {}
            for (var k = 0; k < el.__erudaListeners.length; k++) {
              var l = el.__erudaListeners[k]
              if (!grouped[l.type]) grouped[l.type] = []
              grouped[l.type].push(l.handler)
            }
            allListeners.push({
              el: el,
              selector: selector,
              listeners: grouped
            })
          }
        }
        if (allListeners.length === 0) {
          return '<div class="eruda-eplus-info">No se encontraron event listeners. Recarga la pagina para capturar listeners desde el inicio.</div>'
        }
        var s = '<div class="eruda-eplus-count"><strong>'+allListeners.length+'</strong> elementos con event listeners</div>'
        for (var j = 0; j < Math.min(allListeners.length, 30); j++) {
          var item = allListeners[j]
          var evTypes = Object.keys(item.listeners)
          var evHtml = ''
          for (var k = 0; k < evTypes.length; k++) {
            var cat = self._getEventCategory(evTypes[k])
            var handlers = item.listeners[evTypes[k]]
            var handlerInfo = ''
            for (var h = 0; h < Math.min(handlers.length, 3); h++) {
              var fnStr = (handlers[h] && handlers[h].toString ? handlers[h].toString().substring(0, 120) : 'anonymous') || 'anonymous'
              handlerInfo += '<div class="eruda-eplus-handler">'+fnStr.replace(/</g,'&lt;')+'</div>'
            }
            if (handlers.length > 3) handlerInfo += '<div class="eruda-eplus-handler">... y '+(handlers.length-3)+' mas</div>'
            evHtml += '<span class="eruda-eplus-event eruda-eplus-'+cat+'" onclick="var d=this.nextElementSibling;if(d)d.style.display=d.style.display===\'none\'?\'block\':\'none\'">'+evTypes[k]+' ('+handlers.length+')</span>'+handlerInfo
          }
          s += '<div class="eruda-eplus-item">'
            + '<span class="eruda-eplus-tag">&lt;'+item.selector.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'&gt;</span> '
            + evHtml
          + '</div>'
        }
        return s
      },
      _getEventCategory: function(type) {
        if (/^click|dblclick|contextmenu$/i.test(type)) return 'click'
        if (/^touch|gesture/i.test(type)) return 'touch'
        if (/^key|input|composition/i.test(type)) return 'keyboard'
        if (/^mouse|wheel|drag|drop|pointer/i.test(type)) return 'mouse'
        if (/^scroll|resize|orientation/i.test(type)) return 'scroll'
        return 'other'
      },

      // ObjInspect
      _doInspect: function(obj, title) {
        var panel = _$content && _$content.querySelector('[data-panel="Inspect"]')
        if (panel) {
          var el = panel.querySelector('.eruda-objtree-result')
          if (el) el.innerHTML = this._inspectObject(obj, title || 'Object')
        }
      },
      _showInspectError: function(msg) {
        var panel = _$content && _$content.querySelector('[data-panel="Inspect"]')
        if (panel) {
          var el = panel.querySelector('.eruda-objtree-result')
          if (el) el.innerHTML = '<div class="eruda-objtree-error">Error: '+msg+'</div>'
        }
      },
      _inspectObject: function(obj, title) {
        title = title || 'Object'
        var s = '<div class="eruda-objtree-header"><strong>'+title+'</strong> '+(typeof obj)+'</div>'
        s += '<div class="eruda-objtree">'
        try {
          var keys = Object.keys(obj)
          var ownKeys = Object.getOwnPropertyNames(obj)
          for (var i = 0; i < keys.length; i++) {
            try {
              s += this._renderValue(keys[i], obj[keys[i]], 0, 'root')
            } catch(e) {
              s += '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+keys[i]+'</span>: <span class="eruda-objtree-error">[error]</span></div>'
            }
          }
          for (var j = 0; j < ownKeys.length; j++) {
            if (keys.indexOf(ownKeys[j]) === -1) {
              var desc = Object.getOwnPropertyDescriptor(obj, ownKeys[j])
              if (desc) {
                if (desc.get) s += '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+ownKeys[j]+'</span> <span class="eruda-objtree-type">[getter]</span></div>'
                if (desc.set) s += '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+ownKeys[j]+'</span> <span class="eruda-objtree-type">[setter]</span></div>'
              }
            }
          }
        } catch(e) {
          s += '<div class="eruda-objtree-error">Error: '+e.message+'</div>'
        }
        s += '</div>'
        return s
      },
      _renderValue: function(key, val, depth, path) {
        depth = depth || 0
        path = path || ''
        var currentPath = path ? path+'.'+key : key
        if (depth > 5) {
          return '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+key+'</span>: <span class="eruda-objtree-val">[depth limit]</span></div>'
        }
        var id = 'obj-'+currentPath.replace(/[^a-zA-Z0-9]/g,'_')
        if (val === null) {
          return '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+key+'</span>: <span class="eruda-objtree-null">null</span></div>'
        }
        if (typeof val === 'function') {
          return '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+key+'</span>: <span class="eruda-objtree-fn">'+val.toString().substring(0,80)+(val.toString().length>80?'...':'')+'</span></div>'
        }
        if (typeof val !== 'object') {
          return '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+key+'</span>: '+this._stringify(val, depth)+'</div>'
        }
        var isArray = Array.isArray(val)
        var keys = Object.keys(val)
        var proto = Object.getPrototypeOf(val)
        var protoName = proto && proto.constructor ? proto.constructor.name : 'Object'
        var isExpanded = depth < 2
        var display = isArray ? 'Array['+val.length+']' : protoName+' {'+keys.length+'}'
        var st = '<div class="eruda-objtree-item">'
          + '<span class="eruda-objtree-toggle" onclick="var n=document.getElementById(\''+id+'\');n.style.display=n.style.display===\'none\'?\'block\':\'none\';this.textContent=this.textContent==\'\\u25B6\'?\'\\u25BC\':\'\\u25B6\'">'+(isExpanded?'\\u25BC':'\\u25B6')+'</span>'
          + '<span class="eruda-objtree-key">'+key+'</span>: '
          + '<span class="eruda-objtree-type">'+display+'</span>'
          + '<div id="'+id+'" class="eruda-objtree-node" style="display:'+(isExpanded?'block':'none')+'">'
        for (var i = 0; i < keys.length; i++) {
          try {
            st += this._renderValue(keys[i], val[keys[i]], depth+1, currentPath)
          } catch(e) {
            st += '<div class="eruda-objtree-item"><span class="eruda-objtree-key">'+keys[i]+'</span>: <span class="eruda-objtree-error">[error: '+e.message+']</span></div>'
          }
        }
        if (proto && proto !== Object.prototype && proto.constructor && proto.constructor.name !== 'Object') {
          st += '<div class="eruda-objtree-proto">[[Prototype]]: '+protoName+'</div>'
        }
        st += '</div></div>'
        return st
      },
      _stringify: function(val, depth) {
        depth = depth || 0
        if (depth > 3) return '...'
        if (val === null) return '<span class="eruda-objtree-null">null</span>'
        if (val === undefined) return '<span class="eruda-objtree-null">undefined</span>'
        if (typeof val === 'string') return '<span class="eruda-objtree-val">"'+val.replace(/</g,'&lt;').substring(0,100)+'"</span>'
        if (typeof val === 'number') return '<span class="eruda-objtree-number">'+val+'</span>'
        if (typeof val === 'boolean') return '<span class="eruda-objtree-bool">'+val+'</span>'
        if (typeof val === 'function') return '<span class="eruda-objtree-fn">'+val.toString().substring(0,100)+'...</span>'
        if (Array.isArray(val)) return '<span class="eruda-objtree-val">Array['+val.length+']</span>'
        if (typeof val === 'object') return '<span class="eruda-objtree-val">{'+Object.keys(val).length+' keys}</span>'
        return String(val)
      },

      show: function() {
        if (_$el) _$el.show()
        if (activeTab === 'App') {
          this._refreshCurrentApp()
          this._startSensorListeners()
        }
        if (activeTab === 'NetWat') this._refreshNetwat()
        if (activeTab === 'Elements') this._refreshElements()
        if (activeTab === 'Inspect') this._refreshInspect()
      },
      hide: function() {
        if (_$el) _$el.hide()
        if (sensorHandler) {
          window.removeEventListener('devicemotion', sensorHandler)
          window.removeEventListener('deviceorientation', sensorHandler)
          sensorHandler = null
        }
      },
      destroy: function() {
        if (style) eruda.util.evalCss.remove(style)
        if (sensorHandler) {
          window.removeEventListener('devicemotion', sensorHandler)
          window.removeEventListener('deviceorientation', sensorHandler)
        }
      }
    }
    return AppTab
  }

  function waitForEruda(cb) {
    var check = function() {
      if (window.eruda && window.eruda.add) cb(window.eruda)
      else setTimeout(check, 100)
    }
    check()
  }

  waitForEruda(function(eruda) {
    if (!eruda.get('AppTab')) {
      eruda.add(createAppTab(eruda))
    }
  })
})()
`;
