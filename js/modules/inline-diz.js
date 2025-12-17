/* =========================================================
   DUAL.INFODOSE v4.5 — NEURAL ENGINE (FULL INTEGRATION)
   Core: Solar Cycle | Assets: IndexedDB | Voice: Neural TTS
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
    // Adicionado para suportar o feedback de carregamento da v4.5
    loading: [ "sincronizando neuro-link...", "buscando no éter...", "decodificando sinal...", "aguarde a fusão..." ],
    cristalizacao: [ "cristalizando memória...", "gravando no éter...", "fusão de dados..." ]
};

let lastText = null;
function getRandomText(arr) { 
    if (!arr || arr.length === 0) return "Processando...";
    let t; 
    do { t = arr[Math.floor(Math.random() * arr.length)]; } while (t === lastText && arr.length > 1); 
    lastText = t; 
    return t; 
}

/* --- APP CORE --- */
const App = {
    state: { 
        open: false, 
        messages: [], 
        isAutoSolar: true, 
        solarMode: 'night',
        isProcessing: false // v4.5: Bloqueio de estado
    },
    
    init() {
        // 1. Carregar Dados Básicos
        const s = localStorage;
        document.getElementById('apiKeyInput').value = s.getItem(STORAGE.API_KEY) || '';
        document.getElementById('systemRoleInput').value = s.getItem(STORAGE.SYSTEM_ROLE) || 'Você é o Oráculo.';
        document.getElementById('inputUserId').value = s.getItem(STORAGE.USER_ID) || 'Anônimo Δ7';
        document.getElementById('inputModel').value = s.getItem(STORAGE.MODEL) || 'google/gemini-2.0-flash-exp:free';

        // 2. Estado Solar
        const savedAuto = s.getItem(STORAGE.SOLAR_AUTO);
        this.state.isAutoSolar = savedAuto === 'false' ? false : true;
        
        if (this.state.isAutoSolar) {
            this.autoByTime();
        } else {
            this.setMode(s.getItem(STORAGE.SOLAR_MODE) || 'night');
        }

        // 3. Assets (DB)
        this.indexedDB.loadCustomCSS();
        this.indexedDB.loadBackground();

        // 4. Iniciar UI e Eventos
        this.bindEvents();
        this.updateUI();
        this.toggleField(false, true); // Inicia fechado e silencioso
        
        if(typeof particlesJS !== 'undefined') particlesJS('particles-js', {particles:{number:{value:30},color:{value:"#ffffff"},opacity:{value:0.5},size:{value:2},line_linked:{enable:true,distance:150,color:"#ffffff",opacity:0.2,width:1}}});
    },

    /* --- 1. MOTOR DE VOZ E FEEDBACK (v4.5) --- */
    announce(text, isError = false) {
        this.showToast(text, isError); // Visual
        this.speakText(text);         // Auditivo
    },

    speakText(text) {
        if (!text || window.innerWidth < 768) return; // Opcional: silenciar em mobile
        
        window.speechSynthesis.cancel(); // v4.5: Interrompe falas anteriores
        
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR'; 
        u.rate = 1.2;
        window.speechSynthesis.speak(u);
    },

    /* --- 2. LÓGICA DE ENVIO (v4.5 - Neural Engine) --- */
    async handleSend() {
        const input = document.getElementById('userInput');
        const txt = input.value.trim();
        
        // Proteção contra múltiplos cliques e vazio
        if (!txt || this.state.isProcessing) return;
        
        input.value = '';
        this.addMessage('user', txt);
        this.state.isProcessing = true; // Bloqueia novos inputs
        
        // Feedback Visual de Carregamento no Rodapé
        const footerHandle = document.getElementById('field-toggle-handle');
        // Adiciona classe pulse se tiver CSS para isso, ou apenas muda o texto
        footerHandle.innerHTML = `<span class="footer-dot pulse" style="background:var(--accent)"></span> ${getRandomText(FOOTER_TEXTS.loading)}`;

        const key = localStorage.getItem(STORAGE.API_KEY);
        const model = document.getElementById('inputModel').value;

        // Verificação de Segurança: Permite modelos :free sem key
        if (!key && !model.includes(':free')) {
            this.announce("Erro: API Key necessária ou use modelo gratuito.", true);
            this.addMessage('ai', "⚠️ **Erro:** Configure a API Key no Cockpit ou selecione um modelo com sufixo `:free`.");
            this.state.isProcessing = false;
            this.toggleField(true, true); // Restaura footer
            return;
        }

        try {
            document.body.classList.add('loading');
            
            // Abre o campo se estiver fechado, mas sem falar (user já interagiu)
            if (!this.state.open) this.toggleField(true, true);

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

            const data = await res.json();
            
            if (data.error) throw new Error(data.error.message || "Erro desconhecido da API");

            const aiTxt = data.choices?.[0]?.message?.content || "Sinal perdido no vácuo.";
            this.addMessage('ai', aiTxt);

            // v4.5: IA fala o início da resposta automaticamente
            if (this.state.open) {
                // Fala apenas os primeiros 150 caracteres para não ser cansativo
                const speakChunk = aiTxt.length > 150 ? aiTxt.substring(0, 150) + "..." : aiTxt;
                this.speakText(speakChunk);
            }

        } catch (e) {
            this.announce("Falha crítica na conexão.", true);
            this.addMessage('system', `**Erro de Rede:** ${e.message}`);
        } finally {
            document.body.classList.remove('loading');
            this.state.isProcessing = false; // Libera o sistema
            
            // Restaura o texto do rodapé para o estado normal (estável/sustentado)
            // O true, true força a atualização visual sem falar novamente
            this.toggleField(this.state.open, true);
        }
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
        
        if (this.state.solarMode === 'day') this.setMode('sunset');
        else if (this.state.solarMode === 'sunset') this.setMode('night');
        else this.setMode('day');
        
        this.speakText(`Modo Manual: ${this.translateMode(this.state.solarMode)}`);
    },

    enableAutoSolar() {
        this.state.isAutoSolar = true;
        localStorage.setItem(STORAGE.SOLAR_AUTO, 'true');
        this.autoByTime();
        this.announce("Sincronização Automática Ativada.");
    },

    autoByTime() {
        if (!this.state.isAutoSolar) return;
        const h = new Date().getHours();
        let m = 'night';
        if (h >= 6 && h < 17) m = 'day';
        else if (h >= 17 && h < 19) m = 'sunset';
        
        if (this.state.solarMode !== m) {
             this.setMode(m);
        } else {
             this.updateUI();
        }
    },

    translateMode(m) {
        if(m==='day') return 'DIA';
        if(m==='sunset') return 'OCASO';
        return 'NOITE';
    },

    /* --- UI GERAL --- */
    toggleField(forceState, silent = false) {
        const isOpen = forceState !== undefined ? forceState : !this.state.open;
        this.state.open = isOpen;
        
        const chat = document.getElementById('chat-container');
        chat.classList.toggle('collapsed', !isOpen);
        document.body.classList.toggle('field-closed', !isOpen);
        
        // Se estiver processando, não substitui o texto de loading
        if (this.state.isProcessing) return;

        const msgs = this.state.messages.length;
        const type = isOpen ? (msgs > 5 ? 'estavel' : 'sustentado') : (msgs > 5 ? 'tecnico' : 'ritual');
        const text = getRandomText(FOOTER_TEXTS[isOpen ? 'open' : 'closed'][type]);
        
        const handle = document.getElementById('field-toggle-handle');
        handle.innerHTML = `<span class="footer-dot"></span> ${text}`;
        
        if (!silent) this.speakText(text);
        if (isOpen) chat.scrollTop = chat.scrollHeight;
    },

    addMessage(role, text) {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div');
        d.className = `msg-block ${role}`;
        
        let html = role === 'ai' ? marked.parse(text) : text.replace(/\n/g, '<br>');
        
        if(role !== 'system') {
            html += `<div class="msg-tools">
                <button class="tool-btn" onclick="Utils.copy(this)"><svg><use href="#icon-copy"></use></svg></button>
                <button class="tool-btn" onclick="Utils.speak(this)"><svg><use href="#icon-mic"></use></svg></button>
                ${role === 'user' ? `<button class="tool-btn" onclick="Utils.edit(this)"><svg><use href="#icon-edit"></use></svg></button>` : ''}
            </div>`;
            this.state.messages.push({ role: role==='ai'?'assistant':'user', content: text });
        }
        
        d.innerHTML = html;
        c.appendChild(d);
        c.scrollTop = c.scrollHeight;
    },

    updateUI() {
        const m = this.state.solarMode;
        const auto = this.state.isAutoSolar;
        const label = document.getElementById('statusSolarMode');
        const ind = document.getElementById('modeIndicator');
        const btnAuto = document.getElementById('btnAutoSolar');
        
        label.textContent = `${this.translateMode(m)} ${auto ? '(AUTO)' : '(MANUAL)'}`;
        label.style.color = auto ? 'var(--primary)' : 'orange';
        
        ind.textContent = `SISTEMA: ${this.translateMode(m)} // ${auto ? 'SYNC' : 'OVERRIDE'}`;
        btnAuto.style.opacity = auto ? '1' : '0.5';
        
        document.getElementById('usernameDisplay').textContent = document.getElementById('inputUserId').value;
    },

    /* --- EVENTOS --- */
    bindEvents() {
        // Envio Principal
        document.getElementById('btnSend').onclick = () => this.handleSend();
        document.getElementById('userInput').onkeypress = (e) => { if(e.key==='Enter') this.handleSend(); };
        
        // Toggle do Campo
        document.getElementById('field-toggle-handle').onclick = () => this.toggleField();
        
        // Menu Orb
        document.getElementById('orbToggle').onclick = () => { 
            toggleDrawer('drawerProfile'); 
            this.speakText("Cockpit"); 
        };
        
        // Controles Solares
        document.getElementById('btnCycleSolar').onclick = () => this.cycleSolar();
        document.getElementById('btnAutoSolar').onclick = () => { this.enableAutoSolar(); this.updateUI(); };

        // Inputs com Feedback de Voz (v4.5)
        document.getElementById('inputUserId').onchange = (e) => {
            localStorage.setItem(STORAGE.USER_ID, e.target.value);
            this.updateUI();
            this.announce(`Identidade redefinida: ${e.target.value}`);
        };

        document.getElementById('inputModel').onchange = (e) => {
            localStorage.setItem(STORAGE.MODEL, e.target.value);
            this.updateUI();
            this.showToast("Modelo Atualizado");
        };

        // Salvar Configurações (v4.5)
        document.getElementById('btnSaveConfig').onclick = () => {
            localStorage.setItem(STORAGE.API_KEY, document.getElementById('apiKeyInput').value);
            localStorage.setItem(STORAGE.SYSTEM_ROLE, document.getElementById('systemRoleInput').value);
            this.indexedDB.saveCustomCSS(document.getElementById('customCssInput').value);
            toggleDrawer('drawerSettings');
            this.announce("Configurações salvas e aplicadas.");
        };

        // Outros Botões
        document.getElementById('bgUploadInput').onchange = (e) => this.indexedDB.handleBackgroundUpload(e.target.files[0]);
        document.getElementById('btnSettings').onclick = () => toggleDrawer('drawerSettings');
        document.getElementById('btnDeck').onclick = () => toggleDrawer('drawerDeck');
        document.getElementById('btnClearCss').onclick = () => this.indexedDB.clearAsset(STORAGE.CUSTOM_CSS);
        
        // Voz (Input)
        document.getElementById('btnVoice').onclick = () => this.startVoice();
    },
    
    startVoice() {
        if (!('webkitSpeechRecognition' in window)) return alert("Sem suporte a voz");
        const r = new webkitSpeechRecognition();
        r.lang = 'pt-BR';
        r.onstart = () => document.getElementById('btnVoice').classList.add('listening');
        r.onend = () => document.getElementById('btnVoice').classList.remove('listening');
        r.onresult = (e) => { 
            document.getElementById('userInput').value = e.results[0][0].transcript;
            this.handleSend();
        };
        r.start();
    },

    showToast(msg, isError = false) {
        const t = document.getElementById('nv-toast');
        t.textContent = msg; 
        t.style.borderLeft = isError ? '4px solid #ff4444' : '4px solid var(--primary)';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    /* --- INDEXEDDB (Assets) --- */
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
    copy(btn) { navigator.clipboard.writeText(btn.closest('.msg-block').innerText); App.showToast("Copiado"); },
    speak(btn) { App.speakText(btn.closest('.msg-block').innerText.replace(/<[^>]*>?/gm, '')); },
    edit(btn) {
        const blk = btn.closest('.msg-block'); 
        const txt = blk.innerText.replace("content_copy", "").trim(); 
        document.getElementById('userInput').value = txt;
        blk.remove();
    }
};

function toggleDrawer(id) { document.getElementById(id).classList.toggle('open'); }
window.onload = () => App.init();
