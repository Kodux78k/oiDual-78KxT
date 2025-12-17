/**
 * DUAL INFODOSE - KERNEL ONIPOTENTE v1.0
 * Integração: Solar, Arquétipos de Voz e Hero Cards
 */

(function() {
    const KERNEL_STORAGE = {
        SOLAR_AUTO: 'KDX_SOLAR_AUTO',
        HERO_CARDS: 'KDX_HERO_CARDS',
        ACTIVE_ARCHETYPE: 'ARCHETYPE_ACTIVE'
    };

    const Kernel = {
        state: {
            solarMode: 'night',
            isAuto: true,
            activeVoice: 'Atlas'
        },

        async init() {
            console.log("🚀 Kernel Onipotente Iniciado...");
            
            // 1. Iniciar Ciclo Solar Automático
            this.setupSolar();
            
            // 2. Registrar Listener de Voz (Conectar com seu inline-7.js)
            this.setupVoiceBridge();

            // 3. Carregar Hero Cards salvos do IndexedDB
            this.loadStoredCards();

            // 4. Saudação Inicial baseada no seu script de vozes
            this.bootSequence();
        },

        /* --- MÓDULO SOLAR --- */
        setupSolar() {
            const auto = localStorage.getItem(KERNEL_STORAGE.SOLAR_AUTO) !== 'false';
            this.state.isAuto = auto;
            
            const update = () => {
                if (!this.state.isAuto) return;
                const h = new Date().getHours();
                let mode = 'night';
                if (h >= 6 && h < 17) mode = 'day';
                else if (h >= 17 && h < 19) mode = 'sunset';
                
                document.body.className = document.body.className.replace(/mode-\w+/g, '');
                document.body.classList.add(`mode-${mode}`);
                this.state.solarMode = mode;
                console.log(`[Solar] Sincronizado: ${mode}`);
            };

            update();
            setInterval(update, 60000); // Checa a cada minuto
        },

        /* --- MÓDULO HERO CARDS (UPLOAD & ISOLAMENTO) --- */
        async importHeroCard(htmlContent, title = "Novo Widget") {
            const container = document.getElementById('hero-deck'); // Crie essa div no seu HTML
            if (!container) {
                console.warn("Crie uma div com id='hero-deck' para renderizar os cards.");
                return;
            }

            const cardId = `hero_${Date.now()}`;
            const wrapper = document.createElement('div');
            wrapper.className = 'hero-card-container';
            wrapper.dataset.id = cardId;

            // ISOLAMENTO TOTAL COM SHADOW DOM
            const shadow = wrapper.attachShadow({ mode: 'open' });
            
            // Aqui injetamos o HTML do seu card de "Bom Dia" ou qualquer outro
            shadow.innerHTML = `
                <style>
                    :host { display: block; margin-bottom: 15px; transition: all 0.3s; }
                    .card-frame { 
                        background: rgba(255,255,255,0.05); 
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 12px;
                        padding: 15px;
                    }
                </style>
                <div class="card-frame">
                    ${htmlContent}
                </div>
            `;

            container.prepend(wrapper);
            
            // Persistência no seu banco IndexedDB (aproveitando o que já temos no App.indexedDB)
            if (window.App && App.indexedDB) {
                await App.indexedDB.putAsset(cardId, { type: 'hero-card', data: htmlContent });
            }
        },

        /* --- VOZ E ARQUÉTIPOS --- */
        setupVoiceBridge() {
            // Escuta mudanças de arquétipo para ajustar a personalidade do Kernel
            window.addEventListener('storage', (e) => {
                if (e.key === KERNEL_STORAGE.ACTIVE_ARCHETYPE) {
                    this.state.activeVoice = e.newValue;
                    console.log(`[Kernel] Voz alterada para: ${e.newValue}`);
                }
            });
        },

        bootSequence() {
            setTimeout(() => {
                const arch = localStorage.getItem(KERNEL_STORAGE.ACTIVE_ARCHETYPE) || 'Atlas';
                const msg = `Kernel Onipotente Online. Modo Solar ${this.state.solarMode} ativo. Arquétipo ${arch} no controle.`;
                
                // Tenta usar a função de fala que já existe no seu projeto
                if (window.App && App.announce) {
                    App.announce(msg);
                } else if (window.speakBlock) {
                    // Fallback para o seu inline-7.js
                    console.log(msg);
                }
            }, 2000);
        },

        async loadStoredCards() {
            // Busca os cards salvos e renderiza no início
            if (window.App && App.indexedDB) {
                const deck = await App.indexedDB.getDeck();
                const heroCards = deck.filter(i => i.id.startsWith('hero_'));
                heroCards.forEach(c => this.importHeroCard(c.data));
            }
        }
    };

    // Expondo para o escopo global (Window)
    window.DualKernel = Kernel;

    // Auto-inicialização
    window.addEventListener('DOMContentLoaded', () => Kernel.init());
})();
