/* =========================================================
   DUAL.INFODOSE v4.5 — NEURAL ENGINE (FULL SYSTEM)
   Sincronização Total: Voz + UI + Estado + Feedback
========================================================= */

const STORAGE = {
    API_KEY: 'KDX_API_KEY', MODEL: 'KDX_MODEL', 
    SYSTEM_ROLE: 'KDX_SYSTEM_ROLE', USER_ID: 'KDX_USER_ID', 
    BG_IMAGE: 'KDX_BG_IMAGE', CUSTOM_CSS: 'KDX_CUSTOM_CSS', 
    SOLAR_MODE: 'KDX_SOLAR_MODE', SOLAR_AUTO: 'KDX_SOLAR_AUTO'
};

const FOOTER_TEXTS = {
    closed: { 
        ritual: [ "tocar o campo é consentir", "registro aguarda presença", "abrir é escolher ouvir" ], 
        tecnico: [ "latência detectada", "campo em espera", "aguardando input" ] 
    },
    open: { 
        sustentado: [ "campo ativo", "consciência expandida", "fluxo de dados aberto" ], 
        estavel: [ "sinal estabilizado", "link neural firme", "processando..." ] 
    },
    loading: [ "sintonizando frequência...", "buscando dados no éter...", "processando resposta...", "consultando oráculo..." ],
    error: [ "falha na matrix", "sinal interrompido", "ruído estático detectado" ]
};

let lastText = null;
function getRandomText(arr) { 
    if(!arr || arr.length === 0) return "Sinal neutro";
    let t; do { t = arr[Math.floor(Math.random() * arr.length)]; } while (t === lastText && arr.length > 1); 
    lastText = t; return t; 
}

const App = {
    state: { 
        open: false, 
        messages: [], 
        isAutoSolar: true, 
        solarMode: 'night',
        isProcessing: false
    },
    
    init() {
        // 1. Carregar Preferências
        const s = localStorage;
        document.getElementById('apiKeyInput').value = s.getItem(STORAGE.API_KEY) || '';
        document.getElementById('systemRoleInput').value = s.getItem(STORAGE.SYSTEM_ROLE) || 'Você é o Oráculo.';
        document.getElementById('inputUserId').value = s.getItem(STORAGE.USER_ID) || 'Viajante Δ7';
        document.getElementById('inputModel').value = s.getItem(STORAGE.MODEL) || 'google/gemini-2.0-flash-exp';

        // 2. Estado Solar
        const savedAuto = s.getItem(STORAGE.SOLAR_AUTO);
        this.state.isAutoSolar = savedAuto === 'false' ? false : true;
        
        if (this.state.isAutoSolar) {
            this.autoByTime();
        } else {
            this.setMode(s.getItem(STORAGE.SOLAR_MODE) || 'night');
        }

        // 3. Carregar Assets Visuais
        this.indexedDB.loadCustomCSS();
        this.indexedDB.loadBackground();

        // 4. Iniciar UI e Eventos
        this.bindEvents();
        this.updateUI();
        this.toggleField(false, true); // Inicia fechado silencioso
        
        // Partículas (se existirem)
        if(typeof particlesJS !== 'undefined') particlesJS('particles-js', {particles:{number:{value:30},color:{value:"#ffffff"},opacity:{value:0.5},size:{value:2},line_linked:{enable:true,distance:150,color:"#ffffff",opacity:0.2,width:1}}});

        // 5. Saudação Neural
        setTimeout(() => this.announce("Sistema DUAL online. Link neural estabelecido.", "success"), 1000);
    },

    /* --- NERVE CENTER: SISTEMA DE ANÚNCIO UNIFICADO --- */
    announce(text, type = 'info', forceVoice = true) {
        // 1. Toast Visual
        this.showToast(text, type);
        
        // 2. Footer Update
        this.updateFooterStatus(text.toLowerCase());

        // 3. Voz (TTS)
        if(forceVoice) this.speakText(text);
    },

    showToast(msg, type) {
        const t = document.getElementById('nv-toast');
        if(!t) return;
        t.textContent = msg;
        // Reseta classes e adiciona a nova
        t.className = 'nv-toast'; 
        t.classList.add('show', type === 'error' ? 'error' : 'info');
        
        // Timer para sumir
        if(this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
    },

    updateFooterStatus(text, pulse = false) {
        const handle = document.getElementById('field-toggle-handle');
        const dotClass = pulse ? 'footer-dot pulse' : 'footer-dot active';
        if(handle) handle.innerHTML = `<span class="${dotClass}"></span> ${text}`;
    },

    /* --- LÓGICA SOLAR --- */
    setMode(mode) {
        this.state.solarMode = mode;
        document.body.classList.remove('mode-day', 'mode-sunset', 'mode-night');
        document.body.classList.add(`mode-${mode}`);
        localStorage.setItem(STORAGE.SOLAR_MODE, mode);
        this.updateUI();
    },
    
    cycleSolar() {
        this.state.isAutoSolar = false;
        localStorage.setItem(STORAGE.SOLAR_AUTO, 'false');
        
        let nextMode;
        if (this.state.solarMode === 'day') nextMode = 'sunset';
        else if (this.state.solarMode === 'sunset') nextMode = 'night';
        else nextMode = 'day';
        
        this.setMode(nextMode);
        this.announce(`Ambiente modulado para ${this.translateMode(nextMode)}`);
    },

    enableAutoSolar() {
        this.state.isAutoSolar = true;
        localStorage.setItem(STORAGE.SOLAR_AUTO, 'true');
        this.autoByTime();
        this.announce("Sincronização Solar Automática Ativada.");
    },

    autoByTime() {
        if (!this.state.isAutoSolar) return;
        const h = new Date().getHours();
        let m = 'night';
        if (h >= 6 && h < 17) m = 'day';
        else if (h >= 17 && h < 19) m = 'sunset';
        
        if (this.state.solarMode !== m) this.setMode(m);
        else this.updateUI(); // Apenas UI
    },

    translateMode(m) {
        const map = { 'day': 'DIA', 'sunset': 'OCASO', 'night': 'NOITE' };
        return map[m] || m.toUpperCase();
    },

    /* --- MESSAGING & TTS --- */
    speakText(text) {
        if(!text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR'; u.rate = 1.2; u.pitch = 1.0;
        window.speechSynthesis.speak(u);
    },

    toggleField(forceState, silent = false) {
        const isOpen = forceState !== undefined ? forceState : !this.state.open;
        this.state.open = isOpen;
        
        const chat = document.getElementById('chat-container');
        chat.classList.toggle('collapsed', !isOpen);
        document.body.classList.toggle('field-closed', !isOpen);
        
        // Define texto do footer baseado no estado
        const msgs = this.state.messages.length;
        const type = isOpen ? (msgs > 5 ? 'estavel' : 'sustentado') : (msgs > 5 ? 'tecnico' : 'ritual');
        const text = getRandomText(FOOTER_TEXTS[isOpen ? 'open' : 'closed'][type]);
        
        this.updateFooterStatus(text);
        
        if (!silent) this.speakText(text);
        if (isOpen) setTimeout(() => chat.scrollTop = chat.scrollHeight, 100);
    },

    async handleSend() {
        const input = document.getElementById('userInput');
        const txt = input.value.trim();
        if(!txt || this.state.isProcessing) return;
        
        input.value = '';
        this.addMessage('user', txt);
        this.state.isProcessing = true;
        
        // Efeito visual de carregamento (Fogo Neural)
        const loadText = getRandomText(FOOTER_TEXTS.loading);
        this.updateFooterStatus(loadText, true); // true ativa o pulse
        // Não falamos "carregando" para não ficar chato, apenas visual

        const key = localStorage.getItem(STORAGE.API_KEY);
        const model = document.getElementById('inputModel').value;

        // Validação de chave
        if(!key && !model.includes(':free')) {
            this.announce("Erro crítico: Chave de API ausente.", "error");
            this.addMessage('system', "⚠️ **ALERTA:** Insira sua API Key no Cockpit ou use um modelo gratuito.");
            this.state.isProcessing = false;
            this.toggleField(true, true); // Abre painel para ver erro
            return;
        }

        try {
            document.body.classList.add('loading');
            
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${key}`, 
                    'Content-Type': 'application/json',
                    'HTTP-Referer': location.origin
                },
                body: JSON.stringify({
                    model: model,
                    messages: [ 
                        { role: 'system', content: document.getElementById('systemRoleInput').value },
                        ...this.state.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: txt } 
                    ]
                })
            });
            
            if(!res.ok) throw new Error(`Status ${res.status}`);

            const data = await res.json();
            const aiTxt = data.choices?.[0]?.message?.content || "Sinal vazio recebido.";
            
            this.addMessage('ai', aiTxt);
            
            // Sucesso: Lê o início da resposta se o painel estiver aberto
            if(this.state.open) {
                // Lê apenas a primeira frase ou até 100 caracteres para não ser irritante
                const speakable = aiTxt.split('.')[0].substring(0, 150);
                this.speakText(speakable);
            }
            this.updateFooterStatus("Dados recebidos");

        } catch(e) {
            this.announce("Falha na conexão neural.", "error");
            this.addMessage('system', `❌ **ERRO:** ${e.message}`);
        } finally {
            document.body.classList.remove('loading');
            this.state.isProcessing = false;
            // Volta status normal após 2 seg
            setTimeout(() => {
                if(!this.state.isProcessing) this.updateFooterStatus(getRandomText(FOOTER_TEXTS.open.estavel));
            }, 2000);
        }
    },

    addMessage(role, text) {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div');
        d.className = `msg-block ${role}`;
        
        let html = role === 'ai' ? marked.parse(text) : text.replace(/\n/g, '<br>');
        
        // Adiciona ferramentas apenas para User e AI
        if(role !== 'system') {
            html += `<div class="msg-tools">
                <button class="tool-btn" title="Copiar" onclick="Utils.copy(this)"><svg><use href="#icon-copy"></use></svg></button>
                <button class="tool-btn" title="Ouvir" onclick="Utils.speak(this)"><svg><use href="#icon-mic"></use></svg></button>
                ${role === 'user' ? `<button class="tool-btn" title="Editar" onclick="Utils.edit(this)"><svg><use href="#icon-edit"></use></svg></button>` : ''}
            </div>`;
            this.state.messages.push({ role: role==='ai'?'assistant':'user', content: text });
        }
        
        d.innerHTML = html;
        c.appendChild(d);
        c.scrollTop = c.scrollHeight;
    },

    /* --- UI & EVENTS --- */
    updateUI() {
        const m = this.state.solarMode;
        const auto = this.state.isAutoSolar;
        
        // Status Cockpit
        const label = document.getElementById('statusSolarMode');
        const ind = document.getElementById('modeIndicator');
        const btnAuto = document.getElementById('btnAutoSolar');
        
        if(label) {
            label.textContent = `${this.translateMode(m)} ${auto ? '(AUTO)' : '(MANUAL)'}`;
            label.style.color = auto ? 'var(--primary)' : '#ff9800';
        }
        if(ind) ind.textContent = `SISTEMA: ${this.translateMode(m)} // ${auto ? 'SYNC' : 'OVERRIDE'}`;
        if(btnAuto) btnAuto.style.opacity = auto ? '1' : '0.5';
        
        const userDisplay = document.getElementById('usernameDisplay');
        if(userDisplay) userDisplay.textContent = document.getElementById('inputUserId').value;
    },

    bindEvents() {
        // Chat
        document.getElementById('btnSend').onclick = () => this.handleSend();
        document.getElementById('userInput').onkeypress = (e) => { if(e.key==='Enter') this.handleSend(); };
        document.getElementById('field-toggle-handle').onclick = () => this.toggleField();
        
        // Menu Principal (Orb)
        document.getElementById('orbToggle').onclick = () => { 
            toggleDrawer('drawerProfile'); 
            this.announce("Cockpit aberto."); 
        };
        
        // Solar Controls
        document.getElementById('btnCycleSolar').onclick = () => this.cycleSolar();
        document.getElementById('btnAutoSolar').onclick = () => { this.enableAutoSolar(); this.updateUI(); };

        // Inputs Auto-Save (com feedback de voz)
        const inputs = ['inputUserId', 'inputModel'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.onchange = (e) => {
                    const key = id === 'inputUserId' ? STORAGE.USER_ID : STORAGE.MODEL;
                    localStorage.setItem(key, e.target.value);
                    this.updateUI();
                    
                    const label = id === 'inputUserId' ? "Identidade" : "Engine";
                    this.announce(`${label} atualizada.`);
                };
            }
        });

        // Configurações Drawer
        document.getElementById('btnSettings').onclick = () => { toggleDrawer('drawerSettings'); this.speakText("Configurações"); };
        document.getElementById('btnSaveConfig').onclick = () => {
            localStorage.setItem(STORAGE.API_KEY, document.getElementById('apiKeyInput').value);
            localStorage.setItem(STORAGE.SYSTEM_ROLE, document.getElementById('systemRoleInput').value);
            this.indexedDB.saveCustomCSS(document.getElementById('customCssInput').value);
            
            toggleDrawer('drawerSettings');
            this.announce("Parâmetros gravados no núcleo.");
        };

        // CSS Clear
        document.getElementById('btnClearCss').onclick = () => {
            this.indexedDB.clearAsset(STORAGE.CUSTOM_CSS);
            this.announce("CSS customizado purgado.");
        };
        
        // Voice Control
        document.getElementById('btnVoice').onclick = () => this.startVoice();

        // Background Upload
        const bgInput = document.getElementById('bgUploadInput');
        if(bgInput) bgInput.onchange = (e) => this.indexedDB.handleBackgroundUpload(e.target.files[0]);
    },
      
    startVoice() {
        if (!('webkitSpeechRecognition' in window)) {
            return this.announce("Módulo de voz incompatível neste navegador.", "error");
        }
        
        const r = new webkitSpeechRecognition();
        r.lang = 'pt-BR';
        r.interimResults = false;
        r.maxAlternatives = 1;

        r.onstart = () => {
            document.getElementById('btnVoice').classList.add('listening');
            this.announce("Ouvindo...", "info", false); // false para não falar enquanto ouve
            this.updateFooterStatus("Aguardando comando de voz...", true);
        };
        
        r.onend = () => {
            document.getElementById('btnVoice').classList.remove('listening');
            this.updateFooterStatus("Processamento de voz encerrado.");
        };
        
        r.onresult = (e) => { 
            const transcript = e.results[0][0].transcript;
            document.getElementById('userInput').value = transcript;
            this.announce("Comando recebido.");
            setTimeout(() => this.handleSend(), 500); // Envia auto
        };
        
        r.onerror = (e) => {
             this.announce("Erro no reconhecimento de voz.", "error");
        };

        r.start();
    },

    /* --- DATA LAYER (INDEXEDDB) --- */
    indexedDB: {
        dbName: "InfodoseDB",
        async getDB() {
            return new Promise((res, rej) => {
                const r = indexedDB.open("InfodoseDB", 1);
                r.onupgradeneeded = e => e.target.result.createObjectStore('assets', {keyPath: 'id'});
                r.onsuccess = e => res(e.target.result);
                r.onerror = e => rej(e);
            });
        },
        async putAsset(id, data) { const db = await this.getDB(); db.transaction(['assets'],'readwrite').objectStore('assets').put({id, ...data}); },
        async getAsset(id) { const db = await this.getDB(); return new Promise(r => { const q = db.transaction(['assets'],'readonly').objectStore('assets').get(id); q.onsuccess = () => r(q.result); }); },
        async clearAsset(id) { 
            const db = await this.getDB(); db.transaction(['assets'],'readwrite').objectStore('assets').delete(id);
            if(id === STORAGE.CUSTOM_CSS) { document.getElementById('custom-styles').textContent = ''; document.getElementById('customCssInput').value = ''; }
            if(id === STORAGE.BG_IMAGE) { document.getElementById('bg-fake-custom').style.backgroundImage = 'none'; document.getElementById('bgStatusText').textContent = 'Nenhum'; }
        },
        
        async handleBackgroundUpload(file) {
            if(!file) return;
            await this.putAsset(STORAGE.BG_IMAGE, {blob: file});
            this.loadBackground();
            App.announce("Nova interface visual aplicada.");
        },
        async loadBackground() {
            const d = await this.getAsset(STORAGE.BG_IMAGE);
            if(d && d.blob) {
                document.getElementById('bg-fake-custom').style.backgroundImage = `url('${URL.createObjectURL(d.blob)}')`;
                document.getElementById('bgStatusText').textContent = 'Ativo';
            }
        },
        async saveCustomCSS(css) { await this.putAsset(STORAGE.CUSTOM_CSS, {css}); this.loadCustomCSS(); },
        async loadCustomCSS() { 
            const d = await this.getAsset(STORAGE.CUSTOM_CSS); 
            if(d?.css) {
                document.getElementById('custom-styles').textContent = d.css;
                document.getElementById('customCssInput').value = d.css;
            }
        }
    }
};

const Utils = {
    copy(btn) { 
        navigator.clipboard.writeText(btn.closest('.msg-block').innerText); 
        App.announce("Texto copiado."); 
    },
    speak(btn) { 
        // Limpa icones e meta dados antes de falar
        const text = btn.closest('.msg-block').innerText.replace(/content_copy|mic|edit/g, '').trim();
        App.speakText(text); 
    },
    edit(btn) {
        const blk = btn.closest('.msg-block'); 
        const txt = blk.innerText.replace(/content_copy|mic|edit/g, "").trim(); 
        document.getElementById('userInput').value = txt;
        blk.remove();
        App.announce("Editando mensagem...");
    }
};

function toggleDrawer(id) { 
    const d = document.getElementById(id);
    const isOpen = d.classList.contains('open');
    d.classList.toggle('open'); 
    
    if(!isOpen) App.speakText("Menu expandido"); // Feedback ao abrir
}

window.onload = () => App.init();
