
    /* =========================================================
       DUAL.INFODOSE ENGINE v4.2 PRO — SOLAR EDITION
       Integrando Monolith Core + Kobllux Solar Patch
    ========================================================= */

    const STORAGE = {
      API_KEY: 'KDX_API_KEY', MODEL: 'KDX_MODEL', CUSTOM_MODEL: 'KDX_CUSTOM_MODEL',
      SYSTEM_ROLE: 'KDX_SYSTEM_ROLE', USER_ID: 'KDX_USER_ID', CARDS: 'KDX_CARDS',
      BG_IMAGE: 'KDX_BG_IMAGE', CUSTOM_CSS: 'KDX_CUSTOM_CSS', SOLAR_MODE: 'KDX_SOLAR_MODE'
    };
    const DEFAULT_SYSTEM_ROLE = 'Você é o Oráculo do Campo Infodose. Responda com clareza e precisão.';
    const DB_NAME = "InfodoseDB"; const DB_VERSION = 1;

    /* Textos do Rodapé */
    const FOOTER_TEXTS = {
      closed: { ritual: [ "tocar o campo é consentir", "o registro aguarda presença", "abrir é escolher ouvir" ], tecnico: [ "há pulso em latência", "o campo escuta em silêncio", "aguardando emissão de pulso" ] },
      open: { sustentado: [ "campo ativo", "pulso sustentado", "registro em curso" ], estavel: [ "campo estabilizado", "consciência transmitindo", "processamento em ordem" ] },
      cristalizacao: [ "o mapa está se formando", "fusão de campos iniciada", "o oráculo se manifesta", "cristal em estabilização", "campo em ressonância máxima" ]
    };
    let lastText = null;
    function getRandomText(arr) { let t; do { t = arr[Math.floor(Math.random() * arr.length)]; } while (t === lastText); lastText = t; return t; }

    /* Lógica de Toggle do Campo */
    function getFooterTone(messageCount, isOpen) {
      if (App.fieldState.crystallizing) return { type: 'cristalizacao', isOracular: true };
      const toneKey = messageCount >= 6 ? (isOpen ? 'estavel' : 'tecnico') : (isOpen ? 'sustentado' : 'ritual');
      return { type: isOpen ? 'open' : 'closed', toneKey };
    }

    function setField(open) {
      const chat = document.getElementById('chat-container');
      const handle = document.getElementById('field-toggle-handle');
      App.fieldState.open = open;
      chat.classList.toggle('collapsed', !open);
      document.body.classList.toggle('field-closed', !open);
      if (open) chat.scrollTop = chat.scrollHeight;

      const count = App.state.messages.filter(m => m.role !== 'system').length;
      const tone = getFooterTone(count, open);
      let text = tone.isOracular ? getRandomText(FOOTER_TEXTS.cristalizacao) : getRandomText(FOOTER_TEXTS[tone.type][tone.toneKey]);
      let color = tone.isOracular ? 'var(--secondary)' : 'var(--primary)';

      handle.innerHTML = `<span class="footer-dot" style="background:${color};box-shadow:0 0 10px ${color};"></span>${text}`;
    }

    /* =========================
       APP CORE
    ========================= */
    const App = {
      fieldState: { open: false, crystallizing: false },
      state: { messages: [], apiKey: '', model: '', systemRole: DEFAULT_SYSTEM_ROLE, userId: 'Anônimo Δ7', solarMode: 'night', isVoiceListening: false },
      recognition: null,

      init() {
        // Carrega Settings
        this.state.apiKey = localStorage.getItem(STORAGE.API_KEY) || '';
        this.state.model  = localStorage.getItem(STORAGE.MODEL) || 'google/gemini-2.0-flash-exp';
        this.state.userId = localStorage.getItem(STORAGE.USER_ID) || 'Anônimo Δ7';
        this.state.systemRole = localStorage.getItem(STORAGE.SYSTEM_ROLE) || DEFAULT_SYSTEM_ROLE;
        
        // Popula UI Settings
        document.getElementById('apiKeyInput').value = this.state.apiKey;
        document.getElementById('userInputID').value = this.state.userId;
        document.getElementById('systemRoleInput').value = this.state.systemRole;
        this.populateModelSelect(document.getElementById('modelSelect'));
        document.getElementById('modelSelect').value = this.state.model;

        // Assets e Solar
        this.indexedDB.loadCustomCSS();
        this.indexedDB.loadBackground();
        this.loadSolarState();
        this.syncSolar(); // Auto-detect

        this.bindEvents();
        this.updateStatusPanel();
        setField(false);
        this.addSystemMsg("Sistema Solar Nebula Pro v4.2 online.");
      },

      /* Lógica Solar (KOBLLUX Patch) */
      loadSolarState() {
        const saved = localStorage.getItem(STORAGE.SOLAR_MODE);
        if (saved) this.setMode(saved);
      },
      cycleSolar() {
        if (this.state.solarMode === 'day') this.setMode('sunset');
        else if (this.state.solarMode === 'sunset') this.setMode('night');
        else this.setMode('day');
        this.showToast(`Modo alterado: ${this.state.solarMode.toUpperCase()}`);
      },
      setMode(mode) {
        this.state.solarMode = mode;
        document.body.classList.remove('mode-day', 'mode-sunset', 'mode-night');
        document.body.classList.add(`mode-${mode}`);
        localStorage.setItem(STORAGE.SOLAR_MODE, mode);
        
        const labels = { day: "DIA · CAPTAÇÃO ☀️", sunset: "PÔR DO SOL · TRANSIÇÃO 🌇", night: "NOITE · REDE 🌙" };
        document.getElementById('modeIndicator').textContent = labels[mode];
        this.updateStatusPanel();
      },
      syncSolar() {
          // Fallback time-based se geo falhar ou na init
          this.autoByTime(); 
      },
      autoByTime() {
        const h = new Date().getHours();
        if (h >= 6 && h < 16) this.setMode('day');
        else if (h >= 16 && h < 19) this.setMode('sunset');
        else this.setMode('night');
      },
      showToast(msg) {
        const t = document.getElementById('nv-toast');
        t.textContent = msg; t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
      },

      bindEvents() {
        document.getElementById('btnSend').onclick = () => this.handleSend();
        document.getElementById('userInput').onkeypress = e => { if (e.key === 'Enter') this.handleSend(); };
        document.getElementById('field-toggle-handle').onclick = () => setField(!this.fieldState.open);
        document.getElementById('btnVoice').onclick = () => this.startVoiceInput();
        
        document.getElementById('btnSettings').onclick = () => {
            toggleDrawer('drawerSettings');
            this.indexedDB.getAsset(STORAGE.CUSTOM_CSS).then(d => { document.getElementById('customCssInput').value = d?.css || ''; });
        };
        document.getElementById('btnDeck').onclick = () => toggleDrawer('drawerDeck');
        document.getElementById('btnCrystallize').onclick = () => toggleDrawer('modalCrystal');
        document.getElementById('doCrystal').onclick = () => {
            this.showToast("Cristalizando...");
            setTimeout(() => { toggleDrawer('modalCrystal'); this.showToast("Memória Salva (Simulação)"); }, 1000);
        };

        // Configurações
        document.getElementById('btnSaveConfig').onclick = () => this.saveConfiguration();
        document.getElementById('bgUploadInput').onchange = (e) => this.indexedDB.handleBackgroundUpload(e.target.files[0]);
        document.getElementById('btnClearBg').onclick = () => this.indexedDB.clearAsset(STORAGE.BG_IMAGE);
        document.getElementById('cssUploadInput').onchange = (e) => this.indexedDB.handleCSSUpload(e.target.files[0]);
        document.getElementById('btnClearCss').onclick = () => this.indexedDB.clearAsset(STORAGE.CUSTOM_CSS);

        // ORB SOLAR LOGIC
        const orb = document.getElementById('orbToggle');
        // Clique normal: Ciclo Solar
        orb.onclick = () => this.cycleSolar();
        // Clique direito (Context Menu): Abre Perfil
        orb.oncontextmenu = (e) => { e.preventDefault(); toggleDrawer('drawerProfile'); };
        
        document.getElementById('btnSyncGeo').onclick = () => {
             if (navigator.geolocation) {
                 this.showToast("Buscando posição...");
                 navigator.geolocation.getCurrentPosition(() => {
                     this.autoByTime(); // Simplificação para demo
                     this.showToast("Sincronizado com horário local.");
                 }, () => this.showToast("Erro Geo. Usando horário."));
             }
        };
      },

      saveConfiguration() {
          const key = document.getElementById('apiKeyInput').value.trim();
          const mod = document.getElementById('modelSelect').value;
          const customMod = document.getElementById('customModelInput').value.trim();
          const role = document.getElementById('systemRoleInput').value.trim();
          const userId = document.getElementById('userInputID').value.trim() || 'Anônimo Δ7';
          const customCss = document.getElementById('customCssInput').value;
          
          localStorage.setItem(STORAGE.API_KEY, key);
          localStorage.setItem(STORAGE.MODEL, mod);
          localStorage.setItem(STORAGE.SYSTEM_ROLE, role);
          localStorage.setItem(STORAGE.USER_ID, userId);
          
          if (customMod && customMod !== mod) {
             localStorage.setItem(STORAGE.CUSTOM_MODEL, customMod);
          }

          this.state.apiKey = key; this.state.model = mod; this.state.systemRole = role; this.state.userId = userId;
          this.indexedDB.saveCustomCSS(customCss);

          toggleDrawer('drawerSettings');
          this.showToast("Configurações Salvas");
          this.updateStatusPanel();
      },
      
      populateModelSelect(selectElement) {
        const custom = localStorage.getItem(STORAGE.CUSTOM_MODEL);
        if (custom) {
          const option = document.createElement('option');
          option.value = custom; option.textContent = `⚡️ ${custom} (Custom)`;
          selectElement.prepend(option);
        }
      },

      /* STT */
      startVoiceInput() {
          if (!('webkitSpeechRecognition' in window)) return this.showToast("Navegador sem suporte a voz.");
          if (this.state.isVoiceListening) { this.recognition.stop(); return; }
          const btn = document.getElementById('btnVoice');
          const input = document.getElementById('userInput');
          
          this.recognition = new webkitSpeechRecognition();
          this.recognition.lang = 'pt-BR'; this.recognition.interimResults = true;
          this.recognition.onstart = () => { this.state.isVoiceListening = true; btn.classList.add('listening'); input.placeholder = "Ouvindo..."; };
          this.recognition.onresult = (e) => {
              let final = '';
              for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) final += e.results[i][0].transcript; }
              if(final) { input.value = final; this.handleSend(); }
          };
          this.recognition.onend = () => { this.state.isVoiceListening = false; btn.classList.remove('listening'); input.placeholder = "Emitir pulso..."; };
          this.recognition.start();
      },

      /* Messaging */
      async handleSend() {
        const input = document.getElementById('userInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.addMessage('user', text);
        setField(true);

        if (!this.state.apiKey && !this.state.model.includes(':free')) {
          this.addMessage('ai', "⚠️ **Sem chave de API.** Configure a OpenRouter ou use um modelo gratuito.");
          return;
        }

        try {
          document.body.classList.add('field-crystallizing');
          this.addSystemMsg("Invocando Oráculo...", 'pulse-oracular');
          
          const response = await this.fetchAI(text);
          this.addMessage('ai', response);
        } catch (e) {
          this.addSystemMsg("Erro: " + e.message);
        } finally {
          document.body.classList.remove('field-crystallizing');
          const lastSys = document.querySelector('.msg-block.system.pulse-oracular:last-child');
          if (lastSys) lastSys.remove();
          setField(this.fieldState.open);
        }
      },

      async fetchAI(prompt) {
        const msgs = this.state.messages.slice(-20);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.state.apiKey || 'FREE'}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin },
            body: JSON.stringify({
              model: this.state.model,
              messages: [ { role: 'system', content: this.state.systemRole }, ...msgs.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: prompt } ]
            })
        });
        if (!res.ok) throw new Error("Falha OpenRouter");
        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'Vazio.';
      },

      addMessage(role, text, extraClass = '') {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div');
        d.className = `msg-block ${role} ${extraClass}`;
        
        const content = role === 'ai' ? marked.parse(text) : text.replace(/\n/g, '<br>');
        let tools = '';
        if (role !== 'system') {
           tools = `<div class="msg-tools">
                <button class="tool-btn" onclick="Utils.copy(this)"><svg><use href="#icon-copy"></use></svg></button>
                ${role === 'user' ? `<button class="tool-btn" onclick="Utils.edit(this)"><svg><use href="#icon-edit"></use></svg></button>` : ''}
                <button class="tool-btn" onclick="Utils.speak(this)"><svg><use href="#icon-mic"></use></svg></button>
                <button class="tool-btn" onclick="Utils.delete(this)"><svg><use href="#icon-trash"></use></svg></button>
              </div>`;
        }
        
        d.innerHTML = `<div class="msg-content">${content}</div>${tools}`;
        c.appendChild(d);
        c.scrollTop = c.scrollHeight;
        if (role !== 'system') this.state.messages.push({ role: role === 'ai' ? 'assistant' : 'user', content: text });
      },
      addSystemMsg(text, extra='') { this.addMessage('system', text, extra); },

      updateStatusPanel() {
        document.getElementById('statusUser').textContent = this.state.userId;
        document.getElementById('statusModel').textContent = this.state.model;
        document.getElementById('usernameDisplay').textContent = this.state.userId;
        document.getElementById('statusSolarMode').textContent = this.state.solarMode.toUpperCase();
        
        this.indexedDB.getAsset(STORAGE.CUSTOM_CSS).then(d => { 
             document.getElementById('statusCustomCss').textContent = d && d.css ? 'Ativo' : 'Inativo'; 
        });
        this.indexedDB.getAsset(STORAGE.BG_IMAGE).then(d => { 
             document.getElementById('statusBgFake').textContent = d && d.blob ? 'Ativo' : 'Inativo'; 
        });
      }
    };

    /* =========================
       INDEXEDDB
    ========================= */
    App.indexedDB = {
        openDB() { return new Promise((resolve, reject) => {
            const r = indexedDB.open(DB_NAME, DB_VERSION);
            r.onerror = (e) => reject(e);
            r.onupgradeneeded = (e) => { if(!e.target.result.objectStoreNames.contains('assets')) e.target.result.createObjectStore('assets', { keyPath: 'id' }); };
            r.onsuccess = (e) => resolve(e.target.result);
        });},
        async getAsset(id) { try { const db = await this.openDB(); return new Promise(r => { const req = db.transaction(['assets'],'readonly').objectStore('assets').get(id); req.onsuccess = e => r(e.target.result); req.onerror = () => r(null); }); } catch{return null;} },
        async putAsset(id, data) { const db = await this.openDB(); const tx = db.transaction(['assets'],'readwrite'); tx.objectStore('assets').put({id,...data}); return new Promise(r=>tx.oncomplete=r); },
        async clearAsset(id) { 
            const db = await this.openDB(); db.transaction(['assets'],'readwrite').objectStore('assets').delete(id); 
            if(id===STORAGE.BG_IMAGE) { document.getElementById('bg-fake-custom').style.backgroundImage='none'; document.getElementById('bgUploadInput').value=''; }
            if(id===STORAGE.CUSTOM_CSS) { document.getElementById('custom-styles').textContent=''; document.getElementById('customCssInput').value=''; }
            App.showToast("Asset Removido"); App.updateStatusPanel();
        },
        async clearAll() { (await this.openDB()).transaction(['assets'],'readwrite').objectStore('assets').clear(); },
        
        async loadBackground() { const d = await this.getAsset(STORAGE.BG_IMAGE); if(d?.blob) document.getElementById('bg-fake-custom').style.backgroundImage = `url('${URL.createObjectURL(d.blob)}')`; },
        async handleBackgroundUpload(file) { if(!file)return; await this.putAsset(STORAGE.BG_IMAGE, {blob:file}); this.loadBackground(); App.showToast("BG Atualizado"); App.updateStatusPanel(); },
        
        async loadCustomCSS() { const d = await this.getAsset(STORAGE.CUSTOM_CSS); if(d?.css) { document.getElementById('custom-styles').textContent = d.css; document.getElementById('customCssInput').value = d.css; } },
        async saveCustomCSS(css) { if(!css) return this.clearAsset(STORAGE.CUSTOM_CSS); await this.putAsset(STORAGE.CUSTOM_CSS, {css, ts:Date.now()}); document.getElementById('custom-styles').textContent = css; App.updateStatusPanel(); },
        async handleCSSUpload(file) { if(!file)return; const r = new FileReader(); r.onload=e=>{ this.saveCustomCSS(e.target.result); document.getElementById('customCssInput').value = e.target.result; }; r.readAsText(file); }
    };

    /* =========================
       UTILS
    ========================= */
    const Utils = {
      copy(btn) { navigator.clipboard.writeText(btn.closest('.msg-block').querySelector('.msg-content').innerText); App.showToast("Copiado"); },
      speak(btn) { const u = new SpeechSynthesisUtterance(btn.closest('.msg-block').querySelector('.msg-content').innerText); u.lang = 'pt-BR'; speechSynthesis.speak(u); },
      delete(btn) { btn.closest('.msg-block').remove(); },
      edit(btn) {
          const blk = btn.closest('.msg-block'); const cnt = blk.querySelector('.msg-content'); const tls = blk.querySelector('.msg-tools');
          const area = document.createElement('textarea'); area.className = 'glass-textarea'; area.value = cnt.innerText;
          const save = document.createElement('button'); save.textContent = 'Salvar'; save.className = 'edit-save-btn'; save.style.width='100%';
          cnt.style.display='none'; tls.style.display='none'; blk.appendChild(area); blk.appendChild(save);
          save.onclick = () => { cnt.innerHTML = area.value.replace(/\n/g, '<br>'); area.remove(); save.remove(); cnt.style.display='block'; tls.style.display='flex'; };
      }
    };

    function toggleDrawer(id) { document.getElementById(id).classList.toggle('open'); }
    window.onload = () => { App.init(); if(typeof particlesJS !== 'undefined') particlesJS('particles-js', {particles:{number:{value:40},color:{value:"#ffffff"},opacity:{value:0.5},size:{value:2},line_linked:{enable:true,distance:150,color:"#ffffff",opacity:0.2,width:1}}}); };
  