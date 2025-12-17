/* =========================================================
   DUAL.INFODOSE ENGINE v4.4 PRO — SOLAR VOICE EDITION
   Integrando Monolith Core + Kobllux Solar + Voice Module
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
    closed: { 
        ritual: [ "tocar o campo é consentir", "o registro aguarda presença", "abrir é escolher ouvir" ], 
        tecnico: [ "há pulso em latência", "o campo escuta em silêncio", "aguardando emissão de pulso" ] 
    },
    open: { 
        sustentado: [ "campo ativo", "pulso sustentado", "registro em curso" ], 
        estavel: [ "campo estabilizado", "consciência transmitindo", "processamento em ordem" ] 
    },
    cristalizacao: [ "o mapa está se formando", "fusão de campos iniciada", "o oráculo se manifesta", "cristal em estabilização", "campo em ressonância máxima" ]
};

let lastText = null;
function getRandomText(arr) { 
    let t; 
    do { t = arr[Math.floor(Math.random() * arr.length)]; } while (t === lastText); 
    lastText = t; return t; 
}

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
    
    // NOVO: Narra o texto do filtro sempre que ele mudar
    App.say(text);
}

/* =========================
   APP CORE
========================= */
const App = {
    fieldState: { open: false, crystallizing: false },
    state: { messages: [], apiKey: '', model: '', systemRole: DEFAULT_SYSTEM_ROLE, userId: 'Anônimo Δ7', solarMode: 'night', isVoiceListening: false, isTtsActive: true },
    recognition: null,

    init() {
        this.state.apiKey = localStorage.getItem(STORAGE.API_KEY) || '';
        this.state.model  = localStorage.getItem(STORAGE.MODEL) || 'google/gemini-2.0-flash-exp';
        this.state.userId = localStorage.getItem(STORAGE.USER_ID) || 'Anônimo Δ7';
        this.state.systemRole = localStorage.getItem(STORAGE.SYSTEM_ROLE) || DEFAULT_SYSTEM_ROLE;
        
        document.getElementById('apiKeyInput').value = this.state.apiKey;
        document.getElementById('userInputID').value = this.state.userId;
        document.getElementById('systemRoleInput').value = this.state.systemRole;
        this.populateModelSelect(document.getElementById('modelSelect'));
        document.getElementById('modelSelect').value = this.state.model;

        this.indexedDB.loadCustomCSS();
        this.indexedDB.loadBackground();
        this.loadSolarState();
        this.syncSolar(); 

        this.bindEvents();
        this.updateStatusPanel();
        setField(false);

        // Mensagem inicial com voz
        setTimeout(() => {
            this.narrateStatus(`Sistema Solar Nebula Pro Ativo. Bem-vindo, ${this.state.userId}`);
        }, 1000);

        // Destrava áudio em navegadores mobile
        document.addEventListener('click', () => {
            const s = new SpeechSynthesisUtterance("");
            window.speechSynthesis.speak(s);
        }, { once: true });
    },

    /* =========================
       AUDIO MODULE (TTS)
    ========================= */
    say(text) {
        if (!this.state.isTtsActive || !text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1; 
        window.speechSynthesis.speak(utterance);
    },

    narrateStatus(msg) {
        this.addSystemMsg(msg);
        this.say(msg);
    },

    /* Lógica Solar */
    loadSolarState() {
        const saved = localStorage.getItem(STORAGE.SOLAR_MODE);
        if (saved) this.setMode(saved);
    },

    setMode(mode) {
        this.state.solarMode = mode;
        document.body.classList.remove('mode-day', 'mode-sunset', 'mode-night');
        document.body.classList.add(`mode-${mode}`);
        localStorage.setItem(STORAGE.SOLAR_MODE, mode);
        
        const labels = { 
            day: "Dia Pleno. Captação solar ativa.", 
            sunset: "Ocaso detectado. Transição de frequência.", 
            night: "Rede Noturna. Pulso de baixa latência." 
        };
        
        const displayLabels = { day: "DIA · CAPTAÇÃO ☀️", sunset: "PÔR DO SOL · TRANSIÇÃO 🌇", night: "NOITE · REDE 🌙" };
        document.getElementById('modeIndicator').textContent = displayLabels[mode];
        
        this.updateStatusPanel();
        this.say(labels[mode]); // Narra a mudança de modo
    },

    syncSolar() {
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
        this.say(msg); // Opcional: fala o toast também
    },

    bindEvents() {
        document.getElementById('btnSend').onclick = () => this.handleSend();
        document.getElementById('userInput').onkeypress = e => { if (e.key === 'Enter') this.handleSend(); };
        document.getElementById('field-toggle-handle').onclick = () => setField(!this.fieldState.open);
        document.getElementById('btnVoice').onclick = () => this.startVoiceInput();
        
        document.getElementById('btnSettings').onclick = () => {
            toggleDrawer('drawerSettings');
            this.say("Acessando painel de configuração.");
        };

        // ORB SOLAR - Clique único agora abre o perfil/painel (Fim do Bug do PWA)
        const orb = document.getElementById('orbToggle');
        orb.onclick = () => {
            toggleDrawer('drawerProfile');
            this.say("Identidade de usuário.");
        };

        document.getElementById('btnSyncGeo').onclick = () => {
             if (navigator.geolocation) {
                 this.showToast("Buscando posição geográfica...");
                 navigator.geolocation.getCurrentPosition(() => {
                     this.autoByTime();
                     this.showToast("Sincronizado com o sol local.");
                 }, () => this.showToast("Erro de localização. Usando relógio interno."));
             }
        };
    },

    saveConfiguration() {
        const key = document.getElementById('apiKeyInput').value.trim();
        const mod = document.getElementById('modelSelect').value;
        const role = document.getElementById('systemRoleInput').value.trim();
        const userId = document.getElementById('userInputID').value.trim() || 'Anônimo Δ7';
        
        localStorage.setItem(STORAGE.API_KEY, key);
        localStorage.setItem(STORAGE.MODEL, mod);
        localStorage.setItem(STORAGE.SYSTEM_ROLE, role);
        localStorage.setItem(STORAGE.USER_ID, userId);
        
        this.state.apiKey = key; this.state.model = mod; this.state.systemRole = role; this.state.userId = userId;

        toggleDrawer('drawerSettings');
        this.showToast("Parâmetros atualizados com sucesso.");
        this.updateStatusPanel();
    },

    /* Messaging */
    async handleSend() {
        const input = document.getElementById('userInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.addMessage('user', text);
        setField(true);

        try {
            document.body.classList.add('field-crystallizing');
            this.addSystemMsg("Invocando Oráculo...", 'pulse-oracular');
            
            const response = await this.fetchAI(text);
            this.addMessage('ai', response);
            this.say(response); // IA fala a resposta
        } catch (e) {
            this.narrateStatus("Falha na conexão: " + e.message);
        } finally {
            document.body.classList.remove('field-crystallizing');
            const lastSys = document.querySelector('.msg-block.system.pulse-oracular:last-child');
            if (lastSys) lastSys.remove();
        }
    },

    async fetchAI(prompt) {
        const msgs = this.state.messages.slice(-20);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.state.apiKey || 'FREE'}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.state.model,
              messages: [ { role: 'system', content: this.state.systemRole }, ...msgs.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: prompt } ]
            })
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'Sem resposta.';
    },

    addMessage(role, text, extraClass = '') {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div');
        d.className = `msg-block ${role} ${extraClass}`;
        
        const content = role === 'ai' ? marked.parse(text) : text.replace(/\n/g, '<br>');
        let tools = role !== 'system' ? `
            <div class="msg-tools">
                <button class="tool-btn" onclick="Utils.copy(this)"><svg><use href="#icon-copy"></use></svg></button>
                <button class="tool-btn" onclick="Utils.speak(this)"><svg><use href="#icon-mic"></use></svg></button>
                <button class="tool-btn" onclick="Utils.delete(this)"><svg><use href="#icon-trash"></use></svg></button>
            </div>` : '';
        
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
    }
};

/* =========================
   UTILS
========================= */
const Utils = {
    copy(btn) { 
        navigator.clipboard.writeText(btn.closest('.msg-block').querySelector('.msg-content').innerText); 
        App.showToast("Copiado para o cache."); 
    },
    speak(btn) { 
        App.say(btn.closest('.msg-block').querySelector('.msg-content').innerText); 
    },
    delete(btn) { btn.closest('.msg-block').remove(); }
};

/* =========================
   START
========================= */
function toggleDrawer(id) { document.getElementById(id).classList.toggle('open'); }

window.onload = () => { 
    App.init(); 
};
