/* =========================================================
   EXPANSION MODULE: SOLAR VOICE & PWA FIX
   Cole este bloco dentro do objeto App ou logo abaixo
========================================================= */

// 1. MÓDULO DE VOZ (TTS)
App.say = function(text) {
    if (!text) return;
    window.speechSynthesis.cancel(); // Evita encavalar falas
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    window.speechSynthesis.speak(utterance);
};

// 2. NARRAÇÃO DO STATUS (O que você pediu para o "filtro de mensagens")
App.narrateStatus = function(msg) {
    // Atualiza o texto visual (se o elemento existir)
    const statusEl = document.getElementById('field-toggle-handle');
    if (statusEl) {
        // Preserva a bolinha (dot) e muda só o texto
        const dot = statusEl.querySelector('.footer-dot')?.outerHTML || '';
        statusEl.innerHTML = `${dot}${msg}`;
    }
    this.say(msg); // Fala o que apareceu
};

// 3. SOBRESCREVENDO O CICLO SOLAR (Totalmente Automático)
App.syncSolar = function() {
    const h = new Date().getHours();
    let mode = 'night';
    if (h >= 6 && h < 16) mode = 'day';
    else if (h >= 16 && h < 19) mode = 'sunset';
    
    this.setMode(mode);
    this.say(`Sincronização concluída: Ciclo ${mode} ativo.`);
};

// 4. FIX DO CLIQUE NO ORBE (Para PWA não bugar)
// Procure no seu bindEvents() e substitua a linha do orb.onclick por esta:
App.setupOrb = function() {
    const orb = document.getElementById('orbToggle');
    if (!orb) return;

    // Remove ouvintes antigos
    orb.onclick = null; 
    
    // Clique Único: Agora ele abre o painel direto (mais seguro)
    orb.onclick = (e) => {
        e.preventDefault();
        toggleDrawer('drawerSettings'); // Ou 'drawerProfile', conforme sua preferência
        this.say("Acessando interface de configuração.");
    };
    
    // Opcional: Clique direito/Segurar para forçar troca solar (Apenas para Dev)
    orb.oncontextmenu = (e) => {
        e.preventDefault();
        this.cycleSolar();
    };
};

/* =========================================================
   HOOKS DE INTEGRAÇÃO
   Adicione estas chamadas dentro das suas funções originais
========================================================= */

// DENTRO DO SEU App.init():
// Adicione no final:
// this.setupOrb();
// this.syncSolar();

// DENTRO DO SEU App.handleSend() (na parte da resposta da IA):
// Após receber a resposta da API:
// App.say(aiResponse); 

// DENTRO DO SEU setField(open):
// No final da função, adicione:
// App.say(open ? "Campo aberto" : "Campo em latência");
