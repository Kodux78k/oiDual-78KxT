<script>
  /* =========================================================
   DUAL.INFODOSE v5.0 — AUTO SOLAR & VOICE FIX
   - Voz habilitada para Mobile
   - Tema Automático na inicialização
   - Saudação de Boas-Vindas Falada
   - Footer Interativo com Voz
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
    loading: [ "sincronizando neuro-link...", "buscando no éter...", "decodificando sinal...", "aguarde a fusão..." ]
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
        isProcessing: false 
    },
    
    init() {
        const s = localStorage;
        
        // Carregar Configs Básicas
        document.getElementById('apiKeyInput').value = s.getItem(STORAGE.API_KEY) || '';
        document.getElementById('systemRoleInput').value = s.getItem(STORAGE.SYSTEM_ROLE) || 'Você é o Oráculo.';
        
        const savedUser = s.getItem(STORAGE.USER_ID) || 'Viajante';
        document.getElementById('inputUserId').value = savedUser;
        document.getElementById('inputModel').value = s.getItem(STORAGE.MODEL) || 'google/gemini-2.0-flash-exp:free';

        // --- LÓGICA SOLAR CRÍTICA (Executa Primeiro) ---
        const savedAuto = s.getItem(STORAGE.SOLAR_AUTO);
        this.state.isAutoSolar = savedAuto === 'false' ? false : true;
        
        // Aplica o tema imediatamente antes de renderizar o resto
        if (this.state.isAutoSolar) {
            this.autoByTime();
        } else {
            this.setMode(s.getItem(STORAGE.SOLAR_MODE) || 'night');
        }

        // Carregar Assets Visuais
        this.indexedDB.loadCustomCSS();
        this.indexedDB.loadBackground();

        // Iniciar Eventos e UI
        this.bindEvents();
        this.updateUI();
        this.toggleField(false, true); // Fecha o campo silenciosamente no início
        this.renderDeck();
        
        // --- SAUDAÇÃO DE BOAS-VINDAS ---
        setTimeout(() => {
            const h = new Date().getHours();
            let greeting = "Bem-vindo de volta";
            
            if (h >= 5 && h < 12) greeting = "Bom dia";
            else if (h >= 12 && h < 18) greeting = "Boa tarde";
            else greeting = "Boa noite";

            // Dispara Toast e Voz
            this.announce(`Dual Infodose Online. ${greeting}, ${savedUser}.`);
        }, 1200); // Pequeno delay para garantir carregamento total

        // Iniciar Partículas
        if(typeof particlesJS !== 'undefined') particlesJS('particles-js', {particles:{number:{value:30},color:{value:"#ffffff"},opacity:{value:0.5},size:{value:2},line_linked:{enable:true,distance:150,color:"#ffffff",opacity:0.2,width:1}}});
    },

    /* --- SISTEMA DE VOZ (TTS) --- */
    speakText(text) {
        if (!text) return;
        
        // Cancela falas anteriores para evitar sobreposição (bug dos doces)
        window.speechSynthesis.cancel(); 

        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR'; 
        u.rate = 1.1; // Velocidade levemente ajustada
        u.pitch = 1.0;
        
        // Força a fala (obs: requer interação do usuário no Chrome para funcionar 100% na primeira vez)
        window.speechSynthesis.speak(u);
    },

    announce(text, isError = false) {
        this.showToast(text, isError);
        // O showToast já chama o speakText internamente
    },

    /* --- CRISTALIZAÇÃO (DECK) --- */
    async crystallizeSession() {
        if(this.state.messages.length === 0) {
            this.announce("O vazio não pode ser cristalizado.", true);
            return;
        }

        const title = this.state.messages.find(m => m.role === 'user')?.content || "Memória Sem Nome";
        const crystal = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            title: title.substring(0, 25) + (title.length>25 ? "..." : ""),
            data: [...this.state.messages]
        };

        await this.indexedDB.saveDeckItem(crystal);
        this.renderDeck();
        this.announce("Memória Cristalizada.");
        
        const d = document.getElementById('drawerDeck');
        if(!d.classList.contains('open')) toggleDrawer('drawerDeck');
    },

    async renderDeck() {
        const items = await this.indexedDB.getDeck();
        const container = document.getElementById('deckList');
        
        if(!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-muted); margin-top:20px">O vazio reina aqui.<br>Use o botão 💎 para salvar.</div>';
            return;
        }

        container.innerHTML = items.sort((a,b) => b.id - a.id).map(item => `
            <div class="deck-item">
                <div class="deck-info">
                    <h4>${item.title}</h4>
                    <span>${item.date} • ${item.data.length} msgs</span>
                </div>
                <div style="display:flex; gap:10px">
                    <button class="tool-btn" onclick="App.restoreMemory(${item.id})"><svg><use href="#icon-restore"></use></svg></button>
                    <button class="tool-btn" style="color:var(--danger)" onclick="App.deleteMemory(${item.id})"><svg><use href="#icon-trash"></use></svg></button>
                </div>
            </div>
        `).join('');
    },

    async restoreMemory(id) {
        const items = await this.indexedDB.getDeck();
        const item = items.find(i => i.id === id);
        if(item) {
            document.getElementById('chat-container').innerHTML = '';
            this.state.messages = [];
            item.data.forEach(msg => this.addMessage(msg.role === 'assistant' ? 'ai' : 'user', msg.content));
            toggleDrawer('drawerDeck');
            this.announce("Memória restaurada.");
        }
    },

    async deleteMemory(id) {
        if(!confirm("Quebrar este cristal?")) return;
        await this.indexedDB.deleteDeckItem(id);
        this.renderDeck();
        this.announce("Fragmentos dispersos.");
    },

    /* --- LÓGICA DE ENVIO (CHAT) --- */
    async handleSend() {
        const input = document.getElementById('userInput');
        const txt = input.value.trim();
        
        if (!txt || this.state.isProcessing) return;
        
        input.value = '';
        this.addMessage('user', txt);
        this.state.isProcessing = true;
        
        // Feedback no Footer + Voz de Carregamento
        const footerHandle = document.getElementById('field-toggle-handle');
        const loadTxt = getRandomText(FOOTER_TEXTS.loading);
        footerHandle.innerHTML = `<span class="footer-dot pulse" style="background:var(--primary)"></span> ${loadTxt}`;
        this.speakText(loadTxt); 

        const key = localStorage.getItem(STORAGE.API_KEY);
        const model = document.getElementById('inputModel').value;

        if (!key && !model.includes(':free')) {
            this.announce("Erro: API Key necessária.", true);
            this.state.isProcessing = false;
            this.toggleField(true, true); // Reabre sem falar
            return;
        }

        try {
            document.body.classList.add('loading');
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
            if (data.error) throw new Error(data.error.message || "Erro desconhecido");

            const aiTxt = data.choices?.[0]?.message?.content || "Sem sinal.";
            this.addMessage('ai', aiTxt);

            // Lê o início da resposta se o chat estiver aberto
            if (this.state.open) {
                // Limita a leitura a 200 caracteres para não ficar cansativo
                const speakChunk = aiTxt.length > 200 ? aiTxt.substring(0, 200) + "..." : aiTxt;
                this.speakText(speakChunk);
            }

        } catch (e) {
            this.announce("Falha na conexão.", true);
            this.addMessage('system', `Erro: ${e.message}`);
        } finally {
            document.body.classList.remove('loading');
            this.state.isProcessing = false; 
            // Atualiza o footer para estado estável
            this.toggleField(this.state.open, true);
        }
    },

    /* --- LÓGICA SOLAR (AUTO & MANUAL) --- */
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
        
        this.announce(`Modo ${this.translateMode(this.state.solarMode)}`);
    },

    enableAutoSolar() {
        this.state.isAutoSolar = true;
        localStorage.setItem(STORAGE.SOLAR_AUTO, 'true');
        this.autoByTime();
        this.announce("Sincronização Automática.");
    },

    autoByTime() {
        if (!this.state.isAutoSolar) return;
        
        const h = new Date().getHours();
        let m = 'night'; // Default Noite

        if (h >= 6 && h < 17) m = 'day';           // 06:00 as 16:59 -> Dia
        else if (h >= 17 && h < 19) m = 'sunset';  // 17:00 as 18:59 -> Pôr do Sol
        else m = 'night';                          // 19:00 as 05:59 -> Noite

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

    /* --- UI GERAL & FOOTER --- */
    toggleField(forceState, silent = false) {
        const isOpen = forceState !== undefined ? forceState : !this.state.open;
        this.state.open = isOpen;
        
        const chat = document.getElementById('chat-container');
        chat.classList.toggle('collapsed', !isOpen);
        document.body.classList.toggle('field-closed', !isOpen);
        
        if (this.state.isProcessing) return;

        const msgs = this.state.messages.length;
        const type = isOpen ? (msgs > 5 ? 'estavel' : 'sustentado') : (msgs > 5 ? 'tecnico' : 'ritual');
        const text = getRandomText(FOOTER_TEXTS[isOpen ? 'open' : 'closed'][type]);
        
        const handle = document.getElementById('field-toggle-handle');
        handle.innerHTML = `<span class="footer-dot"></span> ${text}`;
        
        // Se NÃO for silencioso (clique do usuário), fala o texto do footer
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
        document.getElementById('btnSend').onclick = () => this.handleSend();
        document.getElementById('userInput').onkeypress = (e) => { if(e.key==='Enter') this.handleSend(); };
        
        // Footer agora fala ao ser clicado (silent = false)
        document.getElementById('field-toggle-handle').onclick = () => this.toggleField(undefined, false);
        
        document.getElementById('orbToggle').onclick = () => { toggleDrawer('drawerProfile'); this.speakText("Cockpit Solar"); };
        document.getElementById('btnCrystallize').onclick = () => this.crystallizeSession();

        document.getElementById('btnCycleSolar').onclick = () => this.cycleSolar();
        document.getElementById('btnAutoSolar').onclick = () => { this.enableAutoSolar(); this.updateUI(); };

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

        document.getElementById('btnSaveConfig').onclick = () => {
            localStorage.setItem(STORAGE.API_KEY, document.getElementById('apiKeyInput').value);
            localStorage.setItem(STORAGE.SYSTEM_ROLE, document.getElementById('systemRoleInput').value);
            this.indexedDB.saveCustomCSS(document.getElementById('customCssInput').value);
            toggleDrawer('drawerSettings');
            this.announce("Configurações salvas.");
        };

        document.getElementById('bgUploadInput').onchange = (e) => this.indexedDB.handleBackgroundUpload(e.target.files[0]);
        document.getElementById('btnSettings').onclick = () => toggleDrawer('drawerSettings');
        document.getElementById('btnDeck').onclick = () => toggleDrawer('drawerDeck');
        document.getElementById('btnClearCss').onclick = () => this.indexedDB.clearAsset(STORAGE.CUSTOM_CSS);
        
        document.getElementById('btnVoice').onclick = () => this.startVoice();
    },
    
    startVoice() {
        if (!('webkitSpeechRecognition' in window)) return alert("Navegador sem suporte a voz");
        const r = new webkitSpeechRecognition();
        r.lang = 'pt-BR';
        r.onstart = () => {
            document.getElementById('btnVoice').classList.add('listening');
            this.showToast("Ouvindo..."); // Feedback visual e sonoro
        };
        r.onend = () => document.getElementById('btnVoice').classList.remove('listening');
        r.onresult = (e) => { 
            const txt = e.results[0][0].transcript;
            document.getElementById('userInput').value = txt;
            this.speakText(`Entendido: ${txt}`);
            setTimeout(() => this.handleSend(), 1000);
        };
        r.start();
    },

    showToast(msg, isError = false) {
        const t = document.getElementById('nv-toast');
        t.textContent = msg; 
        t.style.borderLeft = isError ? '4px solid #ff4444' : '4px solid var(--primary)';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
        
        // Garante a fala do Toast
        this.speakText(msg);
    },

    /* --- INDEXEDDB (Armazenamento Local) --- */
    indexedDB: {
        dbName: "InfodoseDB",
        async getDB() {
            return new Promise((res, rej) => {
                const r = indexedDB.open("InfodoseDB", 2);
                r.onupgradeneeded = e => {
                    const db = e.target.result;
                    if(!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', {keyPath: 'id'});
                    if(!db.objectStoreNames.contains('deck')) db.createObjectStore('deck', {keyPath: 'id'});
                };
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
        },
        async saveDeckItem(item) { const db = await this.getDB(); db.transaction(['deck'],'readwrite').objectStore('deck').put(item); },
        async getDeck() { const db = await this.getDB(); return new Promise(r => { const q = db.transaction(['deck'],'readonly').objectStore('deck').getAll(); q.onsuccess = () => r(q.result); }); },
        async deleteDeckItem(id) { const db = await this.getDB(); db.transaction(['deck'],'readwrite').objectStore('deck').delete(id); }
    }
};

const Utils = {
    copy(btn) { navigator.clipboard.writeText(btn.closest('.msg-block').innerText); App.showToast("Copiado para a área de transferência"); },
    speak(btn) { App.speakText(btn.closest('.msg-block').innerText.replace(/<[^>]*>?/gm, '')); },
    edit(btn) {
        const blk = btn.closest('.msg-block'); 
        const txt = blk.innerText.replace("content_copy", "").trim(); 
        document.getElementById('userInput').value = txt;
        blk.remove();
        App.speakText("Modo edição ativado");
    }
};

function toggleDrawer(id) { document.getElementById(id).classList.toggle('open'); }
window.onload = () => App.init();
</script>
