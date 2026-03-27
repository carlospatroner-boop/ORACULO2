const API_KEY = "ed837b064312b708aa0afe18c2b91aca";
let map;
let marker;
let imagenesActuales = [];
let indiceImagenActual = 0;
let isMusicEnabled = false; // Manual por defecto
let audioActual = null;
let musicVolume = 0.7; 

// PERSISTENCIA EN LOCALSTORAGE (Arquitectura aislada)
const MAX_HISTORIAL_PUNTOS = 10;
const storageRepo = {
    getPuntos: () => JSON.parse(localStorage.getItem('hist_pts') || '[]'),
    setPuntos: (p) => localStorage.setItem('hist_pts', JSON.stringify(p.slice(-MAX_HISTORIAL_PUNTOS))),
    getImg: (nac) => JSON.parse(localStorage.getItem(`hist_img_${nac}`) || '[]'),
    setImg: (nac, imgs) => localStorage.setItem(`hist_img_${nac}`, JSON.stringify(imgs))
};

// Sistema de Memoria para Imágenes (Evitar repeticiones inmediatas)
let historialImagenesCultura = {}; 
let cacheGaleriasCultura = {}; // Cache para almacenamiento dinámico

// Helper para aleatoriedad inteligente (Pedido por el usuario)
function getRandomItems(array, count) {
    return [...array]
        .sort(() => Math.random() - 0.5)
        .slice(0, count || array.length);
}

// Pool de variantes históricas locales para mayor aleatoriedad
const HISTORIA_POOL = {
    "Kichwa": [
        "Las comunidades de la sierra mantienen el Inti Raymi como eje de su calendario cósmico y agrícola.",
        "El quichua o kichwa llegó a los Andes antes que el Inca, como lengua de comercio y alianza.",
        "Los centros ceremoniales como Ingapirca o Cojitambo son testimonios de la avanzada arquitectura andina."
    ],
    "Shuar": [
        "El pueblo Shuar es conocido por su resistencia histórica e indomable ante la colonización.",
        "La organización social Shuar se basa en la familia extendida y el respeto profundo a la selva.",
        "Sus tradiciones guerreras y rituales de Arutam buscan la conexión con la fuerza vital de las cascadas."
    ],
    "Montubio": [
        "El pueblo montubio nace del mestizaje en las llanuras costeras, forjando su identidad en el cacao.",
        "El sombrero de paja toquilla y el machete son símbolos de la labor constructora de la costa ecuatoriana.",
        "La cultura montubio fue clave en la gesta revolucionaria de Alfaro y la exportación de cacao fino de aroma."
    ],
    "Afroecuatoriano": [
        "El pueblo de Esmeraldas se formó tras el naufragio de barcos esclavistas, creando un territorio de libertad propia.",
        "La marimba esmeraldeña es patrimonio cultural que guarda los ritmos y saberes del África ancestral.",
        "Los valles del Chota y de Esmeraldas conservan saberes medicinales y ritos rítmicos únicos en el mundo."
    ],
    "Tsáchila": [
        "Los Tsáchilas, o 'Gente Verdadera', se distinguen por el uso del achiote como símbolo de vida y salud.",
        "Sus siete centros ceremoniales en Santo Domingo guardan la medicina botánica más rica de la región.",
        "El idioma Tsafiki es una lengua milenaria que conecta la selva baja con los ritos de sanación."
    ],
    "Waorani": [
        "Los Waorani han sido los guardianes ancestrales de la biósfera del Yasuní durante siglos.",
        "Su maestría en el uso de la cerbatana y el conocimiento de las plantas venenosas es legendaria.",
        "Para el Waorani, el territorio no es propiedad: es la vida misma que se hereda de los espíritus del bosque."
    ],
    "Galapagueño": [
        "La cultura galapagueña es una amalgama de pioneros que llegaron de todo el mundo a las islas encantadas.",
        "La vida en las islas se rige por la simbiosis sagrada con especies únicas en el planeta.",
        "El respeto al océano y la pesca artesanal responsable son los pilares de la identidad insular."
    ]
};
let currentReadingType = null;
let speechState = 'idle'; // 'idle', 'playing', 'paused'
let isVolumeAdjusting = false;

// Seguimiento persistente por sección
let sectionStates = { relato: 'idle', historia: 'idle', sabidurias: 'idle' };
let sectionPositions = { relato: 0, historia: 0, sabidurias: 0 };
let sectionTexts = { relato: "", historia: "", sabidurias: "" };

const LEXICO_ANCESTRAL = {
    "Kichwa": { palabra: "Alli Shamushca", significado: "Bienvenido (Que vengas con bien)" },
    "Shuar": { palabra: "Nakarum", significado: "Esperanza / Paz" },
    "Waorani": { palabra: "Waponi", significado: "Todo bien / Salud" },
    "Tsáchila": { palabra: "Sara", significado: "Maíz (Símbolo de vida)" },
    "Afroecuatoriano": { palabra: "Arrullo", significado: "Canto sagrado de paz" },
    "Montubio": { palabra: "Amorfino", significado: "Verso del corazón" },
    "Galapagueño": { palabra: "Halcón", significado: "Guardián de los cielos" },
    "Default": { palabra: "Ancestros", significado: "Los que guían nuestro camino" }
};

const MUSIC_DATABASE = {
    // Rutas Locales (Debes descargar los archivos a la carpeta web/audio/)
    "Kichwa": "./audio/sierra.mp3",
    "Shuar": "./audio/amazonia.mp3",
    "Waorani": "./audio/amazonia.mp3",
    "Tsáchila": "./audio/amazonia.mp3",
    "Afroecuatoriano": "./audio/costa.mp3",
    "Montubio": "./audio/costa.mp3",
    "Galapagueño": "./audio/galapagos.mp3",
    "Default": "./audio/inicio.mp3"
};

const ICONOS_LUNARES = {
    "Luna Nueva": "🌑",
    "Luna Creciente": "🌓",
    "Luna Llena": "🌕",
    "Luna Menguante": "🌗"
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarMapa();

    // PRECARGA DE VOCES (Elimina latencia en el primer clic de lectura)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    // Eventos de configuración
    document.getElementById('nacionalidad').addEventListener('change', (e) => {
        // Al cambiar manualmente el combo, SÍ queremos que se actualice la descripción y música (conAudio=true)
        actualizarDescripcionCosmovision(e.target.value, true);
    });

    // Activar música al interactuar con la página por primera vez
    const activarMusicaInicial = () => {
        if (!isMusicEnabled) {
            toggleMusic();
        }
        document.removeEventListener('click', activarMusicaInicial);
    };
    document.addEventListener('click', activarMusicaInicial);

    // BOTONES PRINCIPALES (CORREGIDO Y CENTRALIZADO)
    document.getElementById('btn-consultar').addEventListener('click', () => {
        const btn = document.getElementById('btn-consultar');
        if (btn.dataset.lat) {
            abrirOraculo(
                btn.dataset.lat,
                btn.dataset.lon,
                btn.dataset.ciudad,
                btn.dataset.provincia
            );
        } else {
            alert("Por favor, selecciona primero un punto en el mapa.");
        }
    });

    document.getElementById('btn-random-location').addEventListener('click', seleccionarUbicacionAleatoria);

    // Eventos de UI del Oráculo
    document.getElementById('btn-info').addEventListener('click', toggleInfo);
    document.getElementById('btn-close-info').addEventListener('click', toggleInfo);
    document.getElementById('btn-close-error').addEventListener('click', toggleError);
    document.getElementById('btn-close-sheet').addEventListener('click', cerrarResultados);
    document.getElementById('btn-back-map').addEventListener('click', cerrarResultados);
    document.getElementById('btn-music').addEventListener('click', toggleMusic);
    document.getElementById('btn-toggle-map').addEventListener('click', () => {
        MapProvider.toggle();
    });

    // Escuchar cambios de proveedor para actualizar la referencia global 'map'
    window.addEventListener('mapProviderChanged', (e) => {
        map = e.detail.adapter.map;
        // Re-adjuntar eventos al nuevo mapa
        map.on('click', (ev) => seleccionarLugarPorCoordenadas(ev.latlng.lat, ev.latlng.lng));
        
        // Re-crear marcador si existía
        const btn = document.getElementById('btn-consultar');
        if (btn && btn.dataset.lat) {
            seleccionarLugarPorCoordenadas(parseFloat(btn.dataset.lat), parseFloat(btn.dataset.lon));
        }
        
        // Los marcadores de clima han sido deshabilitados a petición del usuario
        // inicializarMapaClimatico();
    });

    // Inicializar botones de audio (idle + logo)
    initializeAudioButtons();

    // Inicializar estado visual del botón Música
    if (isMusicEnabled) {
        setAudioButtonMode(document.getElementById('btn-music'), 'listening');
    } else {
        setAudioButtonMode(null, 'idle');
    }

    actualizarEstadoAnimacionAudio();

    // Sincronización de Volumen (Dos sliders para misma música)
    const musicSlider = document.getElementById('music-volume');
    const topMusicSlider = document.getElementById('top-music-volume');
    
    const updateMusicVol = (val) => {
        musicVolume = parseFloat(val);
        if (audioActual) audioActual.volume = musicVolume;
        // Sincronizar el otro slider si existe
        if (musicSlider) musicSlider.value = val;
        if (topMusicSlider) topMusicSlider.value = val;
    };

    if (musicSlider) {
        musicSlider.addEventListener('input', (e) => updateMusicVol(e.target.value));
    }
    if (topMusicSlider) {
        topMusicSlider.addEventListener('input', (e) => updateMusicVol(e.target.value));
    }

    // Fijar ícono de cultura con el mismo personaje de los markers
    const identityIcon = document.querySelector('.identity-tag-main .identity-icon');
    if (identityIcon && typeof getPegmanSVG === 'function') {
        identityIcon.innerHTML = getPegmanSVG('sierra');
        identityIcon.style.width = '54px';
        identityIcon.style.height = '54px';
        identityIcon.classList.add('moving');
    }

    // Inicializar Ciclo Solar
    actualizarCicloSolar();
    setInterval(actualizarCicloSolar, 60000); // Revisar cada minuto
    actualizarEstadoAnimacionAudio();
});

// Reproducir música y lectura por defecto una vez cargado todo
window.addEventListener('load', () => {
    // Al abrir que aparezca la nacionalidad más grande (Montubio por defecto) 
    // y colocar música relacionada a la nacionalidad
    const selectNacionalidad = document.getElementById('nacionalidad');
    // Asegurarse que Autodetectar sea el seleccionado por defecto como se solicitó
    selectNacionalidad.value = '';
    
    // Forzamos la activacion de la musica para que inicie de una sola vez
    isMusicEnabled = true;
    const btn = document.getElementById('btn-music');
    if (btn) {
        btn.classList.add('active');
        setAudioButtonMode(btn, 'listening');
        initializeAudioButtons();
    }
    
    // Disparar la actualizacion inicial (esto activará la lectura y la musica al primer clic si el browser bloquea autoplay)
    // Most browsers block autoplay of audio and speech synthesis until the user interacts with the document.
    // So we'll try, but it might only trigger after the first click.
    actualizarDescripcionCosmovision('');
    
    // Si el navegador bloqueó el audio, lo intentaremos en el primer click en cualquier parte
    const playOnInteract = () => {
         if (isMusicEnabled && audioActual && audioActual.paused) {
             audioActual.play().catch(e => console.log("Autoplay blocked until interact"));
         }
         // Y si no leyó el relato inicial, lo leemos ahora
         if (!window.speechSynthesis.speaking && isMusicEnabled) {
              const nac = document.getElementById('nacionalidad').value || 'Default';
              if (nac && nac !== 'Default' && REGLAS_ANCESTRALES[nac]) {
                 const utterance = new SpeechSynthesisUtterance(`"${REGLAS_ANCESTRALES[nac].descripcion}"`);
                 utterance.lang = 'es-ES';
                 utterance.rate = 1.0; 
                 utterance.pitch = 1.0;
                 utterance.volume = 1.0;
                 window.speechSynthesis.speak(utterance);
              }
         }
         document.removeEventListener('click', playOnInteract);
    };
    document.addEventListener('click', playOnInteract);
});

function actualizarCicloSolar() {
    const hora = new Date().getHours();
    const body = document.body;
    const starBox = document.getElementById('stars-container');

    body.className = ''; // Limpiar
    
    if (hora >= 5 && hora < 7) {
        body.classList.add('dawn');
    } else if (hora >= 7 && hora < 17) {
        body.classList.add('day');
    } else if (hora >= 17 && hora < 19) {
        body.classList.add('sunset');
    } else {
        body.classList.add('night');
        generarEstrellas(starBox, 100);
    }
}

function getAssistantLogoHTML() {
    return `
        <div class="ai-assistant-container idle" id="aiAssistant">
            <svg class="uteq-logo-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="glowFlicker" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="pauseGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="atomGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <path id="uteqPathAdvanced" d="M 32 100 A 68 68 0 1 1 168 100" fill="none" />
                    <path id="fciPathAdvanced" d="M 25 105 A 75 75 0 0 0 175 105" fill="none" />
                </defs>
                <circle id="halo-energia" cx="100" cy="100" r="85"></circle>
                <circle id="anillo-exterior" cx="100" cy="100" r="95"></circle>
                <text class="text-path">
                    <textPath xlink:href="#fciPathAdvanced" startOffset="50%" text-anchor="middle" style="animation: textFlowFCI var(--text-flow-speed) ease-in-out infinite;">
                        Ciencias de la Ingeniería
                    </textPath>
                </text>
                <text class="text-path-uteq">
                    <textPath xlink:href="#uteqPathAdvanced" startOffset="50%" text-anchor="middle" style="animation: textFlowUTEQ var(--text-flow-speed) ease-in-out infinite;">
                        UTEQ
                    </textPath>
                </text>
                <g id="sistema-planetario" style="transform-origin: 100px 100px; transform: scale(0.95);">
                    <g id="cabeza-central" class="figura-dispersa">
                        <path id="cabeza-silueta" d="M70,100 C70,70 130,70 130,100 L110,100 L110,130 C110,150 90,150 90,130 L90,100 Z"/>
                        <circle class="destello destello-1" cx="85" cy="85" r="3" fill="#ffcd01" style="--flicker-on-point: var(--flicker-on-point-1); --flicker-off-point: var(--flicker-off-point-1);"/>
                        <circle class="destello destello-2" cx="100" cy="80" r="3" fill="white" style="--flicker-on-point: var(--flicker-on-point-2); --flicker-off-point: var(--flicker-off-point-2);"/>
                        <circle class="destello destello-3" cx="100" cy="120" r="3" fill="#007d3c" style="--flicker-on-point: var(--flicker-on-point-3); --flicker-off-point: var(--flicker-off-point-3);"/>
                        <circle class="destello destello-4" cx="95" cy="110" r="2.5" fill="white" style="animation-delay: 1s;"/>
                    </g>
                    <g id="engranaje" class="figura-dispersa">
                        <circle cx="100" cy="100" r="25"/>
                        <rect x="95" y="70" width="10" height="60" rx="2"/>
                        <rect x="95" y="70" width="10" height="60" rx="2" transform="rotate(60 100 100)"/>
                        <rect x="95" y="70" width="10" height="60" rx="2" transform="rotate(120 100 100)"/>
                        <circle cx="100" cy="100" r="15" fill="white"/>
                    </g>
                    <g id="atomo" filter="url(#atomGlow)" class="figura-dispersa">
                        <circle cx="100" cy="100" r="10" />
                        <ellipse cx="100" cy="100" rx="15" ry="5" />
                        <ellipse cx="100" cy="100" rx="15" ry="5" transform="rotate(60 100 100)"/>
                        <ellipse cx="100" cy="100" rx="15" ry="5" transform="rotate(120 100 100)"/>
                    </g>
                </g>
                <g id="pause-icon" style="display: none;" filter="url(#pauseGlow)">
                    <rect x="82" y="75" width="12" height="50" rx="3" fill="white" />
                    <rect x="106" y="75" width="12" height="50" rx="3" fill="white" />
                </g>
            </svg>
        </div>
    `;
}

function getAssistantLogoStyles() {
    return `
        .ai-assistant-container {
            width: 100%;
            height: 100%;
            position: relative;
            border-radius: 50%;
            background: transparent;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            transform-origin: center;
            --logo-main-speed: 40s;
            --head-speed: 30s;
            --gear-speed: 25s;
            --atom-speed: 15s;
            --flicker-speed: 10s;
            --text-flow-speed: 20s;
            animation: logoMainTurnFlat var(--logo-main-speed) linear infinite;
        }
        .uteq-logo-svg {
            width: 100%;
            height: 100%;
            display: block;
            position: relative;
            box-sizing: border-box;
        }
        #anillo-exterior {
            stroke: #ffcd01;
            stroke-width: 2.5;
            animation: greenPulse 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .text-path {
            fill: white;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.2px;
            text-transform: uppercase;
        }
        .text-path-uteq {
            fill: white;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -1px;
        }
        .figura-dispersa {
            transform-origin: 100px 100px;
            filter: url(#glowFlicker);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #cabeza-central {
            transform-origin: 100px 100px;
            fill: #6d6e71;
            animation: headScatter var(--head-speed) ease-in-out infinite, headPulse 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        #engranaje {
            transform-origin: 100px 100px;
            fill: #ffcd01;
            stroke: white;
            stroke-width: 1;
            animation: gearScatter var(--gear-speed) ease-in-out infinite;
        }
        #atomo {
            transform-origin: 100px 100px;
            stroke: #007d3c;
            stroke-width: 1.5;
            fill: none;
            animation: atomOrbital var(--atom-speed) linear infinite, atomVibrate 0.3s linear infinite;
        }
        .destello {
            opacity: 0;
            animation: flickerFlicker var(--flicker-speed) linear infinite;
        }
        #halo-energia {
            transform-origin: center;
            fill: none;
            stroke: #007d3c;
            stroke-width: 6;
            opacity: 0;
            filter: url(#glowFlicker);
        }
        @keyframes logoMainTurnFlat { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes greenPulse { 0%, 100% { fill: #007d3c; stroke: #ffcd01; } 50% { fill: #00bf5c; stroke: #ffdf01; } }
        @keyframes headScatter { 0%, 100% { transform: translate(0px, 0px) rotate(0deg); } 30% { transform: translate(8px, -5px) rotate(10deg); } 70% { transform: translate(-6px, 6px) rotate(-10deg); } }
        @keyframes gearScatter { 0%, 100% { transform: translate(0px, 0px) rotate(0deg); } 25% { transform: translate(-10px, 8px) rotate(-20deg); } 50% { transform: translate(8px, -6px) rotate(25deg); } 75% { transform: translate(-8px, -8px) rotate(-10deg); } }
        @keyframes atomOrbital { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.15); } 100% { transform: rotate(360deg) scale(1); } }
        @keyframes atomVibrate { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(1px, -1px); } }
        @keyframes headPulse { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.05); filter: brightness(1.3); } }
        @keyframes textFlowFCI { 0%, 100% { text-anchor: middle; startOffset: 50%; } 50% { text-anchor: middle; startOffset: 55%; } }
        @keyframes textFlowUTEQ { 0%, 100% { text-anchor: middle; startOffset: 50%; } 50% { text-anchor: middle; startOffset: 45%; } }
        @keyframes flickerFlicker { 0%, 100% { opacity: 0; } 10% { opacity: 1; } 30% { opacity: 0; } 40% { opacity: 1; } 60% { opacity: 0; } 70% { opacity: 1; } 90% { opacity: 0; } }
        @keyframes energyHaloPulse { 
            0% { transform: scale(1); opacity: 0; filter: blur(0px); } 
            50% { transform: scale(1.12); opacity: calc(var(--halo-max-opacity) * 0.9); filter: blur(2px); } 
            100% { transform: scale(1.13); opacity: 0; filter: blur(4px); } 
        }
        @keyframes auraBreath {
            0%, 100% { filter: brightness(1) contrast(1); }
            50% { filter: brightness(1.4) contrast(1.2); }
        }
        :root {
            --logo-main-speed: 25s;
            --head-speed: 15s;
            --gear-speed: 10s;
            --atom-speed: 5s;
            --flicker-speed: 4s;
            --halo-max-opacity: 0;
            --text-flow-speed: 8s;
            --flicker-on-point-1: 10%;
            --flicker-off-point-1: 30%;
            --flicker-on-point-2: 40%;
            --flicker-off-point-2: 60%;
            --flicker-on-point-3: 70%;
            --flicker-off-point-3: 90%;
        }
        .ai-assistant-container.idle { --logo-main-speed: 35s; --head-speed: 25s; --gear-speed: 20s; --atom-speed: 10s; --flicker-speed: 6s; }
        .ai-assistant-container.listening { --logo-main-speed: 15s; --head-speed: 10s; --gear-speed: 8s; --atom-speed: 5s; --flicker-speed: 2s; --halo-max-opacity: 0.8; }
        .ai-assistant-container.listening #halo-energia { animation: energyHaloPulse 2.5s ease-out infinite; }
        .ai-assistant-container.speaking { --logo-main-speed: 3s; --head-speed: 4s; --gear-speed: 2s; --atom-speed: 0.8s; --flicker-speed: 0.5s; --halo-max-opacity: 1; animation: logoMainTurnFlat var(--logo-main-speed) linear infinite, auraBreath 2s ease-in-out infinite; }
        .ai-assistant-container.speaking #halo-energia { stroke: #ffcd01; animation: energyHaloPulse 0.8s ease-out infinite; }
        
        /* ESTADO DE PAUSA (Inyectado Quirúrgicamente) */
        .ai-assistant-container.paused #pause-icon { display: block; animation: pulsePauseGlow 1.5s ease-in-out infinite; }
        .ai-assistant-container.paused #sistema-planetario { opacity: 0.15; filter: grayscale(1) blur(1px); }
        @keyframes pulsePauseGlow {
            0%, 100% { filter: drop-shadow(0 0 5px white); opacity: 0.7; transform: scale(1); }
            50% { filter: drop-shadow(0 0 25px #ffcd01); opacity: 1; transform: scale(1.1); }
        }
    `;
}

function initializeAudioButtons() {
    document.querySelectorAll('.audio-btn').forEach((btn) => {
        const small = btn.classList.contains('small');
        injectAssistantLogo(btn, small);
        btn.classList.remove('listening', 'speaking', 'idle');
        btn.classList.add('idle');
    });
}

function injectAssistantLogo(button, small = false) {
    if (!button) return;
    const container = button.closest('.audio-btn-container');
    if (!container) return;
    
    let wrapper = container.querySelector('.assistant-logo-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('span');
        wrapper.className = 'assistant-logo-wrapper' + (small ? ' small' : '');
        container.appendChild(wrapper); // Appends wrapper as a sibling to the button within the container
    } else {
        wrapper.classList.toggle('small', small);
    }

    if (!wrapper.shadowRoot) {
        const shadow = wrapper.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = getAssistantLogoStyles();
        shadow.appendChild(style);
        shadow.innerHTML += getAssistantLogoHTML();
    }
}

function setAudioButtonMode(targetButton, mode) {
    document.querySelectorAll('.audio-btn-container').forEach((container) => {
        container.classList.remove('idle', 'listening', 'speaking', 'paused');
        container.classList.add('idle');
        const wrapper = container.querySelector('.assistant-logo-wrapper');
        if (wrapper && wrapper.shadowRoot) {
            const innerContainer = wrapper.shadowRoot.querySelector('.ai-assistant-container');
            if (innerContainer) {
                innerContainer.classList.remove('idle', 'listening', 'speaking', 'paused');
                innerContainer.classList.add('idle');
            }
        }
    });

    if (!targetButton || !mode) return;

    const targetContainer = targetButton.closest('.audio-btn-container');
    if (!targetContainer) return;

    targetContainer.classList.remove('idle', 'listening', 'speaking', 'paused');
    targetContainer.classList.add(mode);
    
    const wrapper = targetContainer.querySelector('.assistant-logo-wrapper');
    if (wrapper && wrapper.shadowRoot) {
        const innerContainer = wrapper.shadowRoot.querySelector('.ai-assistant-container');
        if (innerContainer) {
            innerContainer.classList.remove('idle', 'listening', 'speaking', 'paused');
            innerContainer.classList.add(mode);
        }
    }
}

function actualizarEstadoAnimacionAudio() {
    const musicBtn = document.getElementById('btn-music');
    
    // 1. LIMPIEZA TOTAL DE TODOS LOS CONTENEDORES
    document.querySelectorAll('.audio-btn-container').forEach(c => {
        c.classList.remove('speaking', 'listening', 'paused');
    });

    // 2. APLICAR ESTADOS PERSISTENTES A LOS BOTONES DE NARRACIÓN
    Object.keys(sectionStates).forEach(type => {
        const btn = document.querySelector(`button[onclick*="readSection('${type}')"]`) || document.querySelector(`button[onpointerdown*="readSection('${type}')"]`);
        if (btn) {
            const container = btn.closest('.audio-btn-container');
            if (container) {
                if (sectionStates[type] === 'playing') {
                    container.classList.add('speaking');
                    setAudioButtonMode(btn, 'speaking');
                } else if (sectionStates[type] === 'paused') {
                    container.classList.add('paused');
                    setAudioButtonMode(btn, 'paused');
                }
            }
        }
    });

    // 3. MÚSICA DE AMBIENTE (Si no hay ninguna voz en 'playing')
    const hasAnyVoicePlaying = Object.values(sectionStates).includes('playing');
    const isMusicActive = isMusicEnabled && audioActual && !audioActual.paused;
    
    if (!hasAnyVoicePlaying && isMusicActive && musicBtn) {
        const container = musicBtn.closest('.audio-btn-container');
        if (container) {
            container.classList.add('listening');
            setAudioButtonMode(musicBtn, 'listening');
        }
    } else if (!hasAnyVoicePlaying && !isMusicActive) {
        setAudioButtonMode(null, 'idle');
    }
}

function generarEstrellas(box, count) {
    if (box.children.length > 0) return; // Ya generado
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 3 + 'px';
        const delay = Math.random() * 5 + 's';
        const dur = (2 + Math.random() * 3) + 's';

        star.style.left = x + '%';
        star.style.top = y + '%';
        star.style.width = size;
        star.style.height = size;
        star.style.setProperty('--d', delay);
        star.style.animationDuration = dur;
        box.appendChild(star);
    }
}

function inicializarMapa() {
    const bounds = L.latLngBounds(L.latLng(-6.0, -92.0), L.latLng(2.5, -75.0));
    
    // Usamos el MapProvider para inicializar el adaptador por defecto
    const adapter = MapProvider.init('default', {
        maxBounds: bounds,
        minZoom: 6
    });

    map = adapter.map;

    map.on('click', (e) => seleccionarLugarPorCoordenadas(e.latlng.lat, e.latlng.lng));

    // El control de zoom ya lo maneja el adaptador
    // document.querySelector('.leaflet-tile-pane').style.filter = 'grayscale(0.5) contrast(1.2) brightness(0.8)';
}

async function inicializarMapaClimatico() {
    const CIUDADES_CLAVE = [
        { nombre: "Quito", lat: -0.18, lon: -78.46 },
        { nombre: "Guayaquil", lat: -2.18, lon: -79.88 },
        { nombre: "Cuenca", lat: -2.90, lon: -79.00 },
        { nombre: "Tena", lat: -0.99, lon: -77.81 },
        { nombre: "Manta", lat: -0.96, lon: -80.71 },
        { nombre: "Esmeraldas", lat: 0.96, lon: -79.65 },
        { nombre: "Loja", lat: -3.99, lon: -79.20 },
        { nombre: "Puyo", lat: -1.48, lon: -77.99 },
        { nombre: "Puerto Ayora", lat: -0.74, lon: -90.31 },
        { nombre: "Tulcán", lat: 0.81, lon: -77.71 }
    ];

    CIUDADES_CLAVE.forEach(async (c) => {
        try {
            const clima = await obtenerClima(c.nombre, c.lat, c.lon);
            crearMarcadorClima(c, clima);
        } catch (e) {
            console.error("Error cargando clima para:", c.nombre);
        }
    });
}

function crearMarcadorClima(ciudad, clima) {
    const iconMap = { '01': 'sun', '02': 'cloud-sun', '03': 'cloud', '04': 'cloud', '09': 'cloud-showers-heavy', '10': 'cloud-rain', '11': 'bolt', '13': 'snowflake', '50': 'wind' };
    const faIcon = iconMap[(clima.icon || '01d').substring(0, 2)] || 'cloud-sun';

    const weatherIcon = L.divIcon({
        className: 'weather-marker',
        html: `<div class="weather-marker-content" title="${ciudad.nombre}: ${clima.desc}">
                <i class="fas fa-${faIcon}"></i>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    const m = L.marker([ciudad.lat, ciudad.lon], { icon: weatherIcon }).addTo(map);
    m.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        seleccionarLugarPorCoordenadas(ciudad.lat, ciudad.lon, true);
    });
}

async function seleccionarLugarPorCoordenadas(lat, lon, abrirAuto = false) {
    const btn = document.getElementById('btn-consultar');
    btn.dataset.lat = lat;
    btn.dataset.lon = lon;
    btn.dataset.ciudad = "Ubicación detectada";
    btn.dataset.provincia = "";

    if (marker) map.removeLayer(marker);
    
    // Crear un ícono de "muñequito" base vacilando hasta saber la región
    const defaultSvgIcon = typeof getPegmanSVG === 'function' ? getPegmanSVG('default') : '';
    const personIcon = L.divIcon({
        className: 'person-marker',
        html: `<div class="person-marker-content">${defaultSvgIcon}</div><div class="marker-label"></div>`,
        iconSize: [80, 100],
        iconAnchor: [40, 95]
    });

    marker = L.marker([lat, lon], { icon: personIcon, draggable: true }).addTo(map);

    // Actualizar coordenadas cuando el usuario deje de arrastrar el muñequito
    marker.on('dragend', function(e) {
        const position = marker.getLatLng();
        seleccionarLugarPorCoordenadas(position.lat, position.lng);
    });

    document.getElementById('selected-location').textContent = "Detectando...";
    btn.disabled = false;

    try {
        // Usar Nominatim (OpenStreetMap) en lugar de BigDataCloud (que está fallando)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`);
        const data = await response.json();

        if (data && data.address) {
            const addr = data.address;
            
            // Validar que el punto seleccionado esté dentro de Ecuador
            // Nominatim suele usar "ec" en minúsculas para country_code
            if (addr.country_code && addr.country_code.toUpperCase() !== "EC") {
                document.getElementById('selected-location').textContent = "Selección fuera de Ecuador";
                btn.disabled = true;
                if (marker) map.removeLayer(marker);
                toggleError();
                return;
            }

            // Detectar ciudad (más robusto: city, town, village, hamlet, etc.)
            const ciudad = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.county || "Ubicación rural";
            
            // Detectar provincia (state)
            const provincia = (addr.state || "").replace("Provincia de ", "").trim();

            document.getElementById('selected-location').textContent = ciudad;
            btn.dataset.ciudad = ciudad;
            btn.dataset.provincia = provincia;

            // Actualizar el label del marker (texto sobre la cabeza del muñeco)
            const markerElement = marker.getElement();
            if (markerElement) {
                const labelDiv = markerElement.querySelector('.marker-label');
                if (labelDiv) labelDiv.textContent = ciudad;
            }
            
            // Vestir al muñequito según la región
            actualizarVestimenta(provincia, marker);

            // AUTO-SELECCIONAR LA NACIONALIDAD SEGÚN LA PROVINCIA DETECTADA (PEDIDO POR EL USUARIO)
            const mapping = MAPPING_PROVINCIAS[provincia] || { pueblo: "Kichwa", asentamientos: "Ecuador" };
            const nacDetectada = normalizarNacionalidad(mapping.pueblo);
            const selectorNac = document.getElementById('nacionalidad');
            if (selectorNac) {
                selectorNac.value = nacDetectada;
                // Al mover el mapa solo actualizamos el visual si abrirAuto es false
                // Así cumplimos: "mientras se toca cosas en el mapa no debe cambiar la musica"
                actualizarDescripcionCosmovision(nacDetectada, abrirAuto);
            }

            if (abrirAuto) {
                abrirOraculo(lat, lon, ciudad, provincia);
            }
        }
    } catch (error) {
        console.warn("Geocodificación fallida");
        if (abrirAuto) abrirOraculo(lat, lon, "Sector Rural", "");
    }
}

// FUNCIÓN CENTRALIZADA PARA AMBOS BOTONES
async function abrirOraculo(lat, lon, ciudad, provincia) {
    const loadingDiv = document.getElementById('loading');
    let nacionalidadManual = document.getElementById('nacionalidad').value;

    // RESETEAR ESTADOS DE LECTURA PARA ESTA NUEVA SESIÓN
    sectionStates = { relato: 'idle', historia: 'idle', sabidurias: 'idle', clima: 'idle' };
    sectionPositions = { relato: 0, historia: 0, sabidurias: 0, clima: 0 };
    sectionTexts = { relato: "", historia: "", sabidurias: "", clima: "" };
    detenerLecturaVoz();


    // 1. Detección de cultura por provincia (Fallback)
    const mapping = MAPPING_PROVINCIAS[provincia] || { pueblo: "Montubio", asentamientos: "Territorio Ecuatoriano" };
    let nacFinal = nacionalidadManual || normalizarNacionalidad(mapping.pueblo);

    // Auto-seleccionar la nacionalidad detectada en el combobox
    const nacionalidadSelect = document.getElementById('nacionalidad');
    if (nacionalidadSelect) {
        for (let i = 0; i < nacionalidadSelect.options.length; i++) {
            if (nacionalidadSelect.options[i].value === nacFinal) {
                nacionalidadSelect.selectedIndex = i;
                actualizarDescripcionCosmovision(nacFinal);
                break;
            }
        }
    }

    loadingDiv.classList.remove('hidden');

    try {
        // Llamada al Backend Java (Javalin) en Azure
        const response = await fetch(`http://20.38.36.141:8080/api/consultar?ciudad=${encodeURIComponent(ciudad)}&nacionalidad=${encodeURIComponent(nacFinal)}`);

        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const data = await response.json();
        const { clima, recomendacion } = data;

        // Consultas paralelas para contenido extra (Wiki, Imágenes y Clima Preciso Front-End)
        let history = "Sabiduría en camino...";
        let images = null;
        let climaReal = null;

        try {
            [history, images, climaReal] = await Promise.all([
                obtenerHistoriaWiki(nacFinal),
                obtenerImagenCultural(nacFinal),
                obtenerClima(ciudad, lat, lon) // <-- Solapamos usando lat/lon exacto aquí
            ]);
        } catch (e) {
            console.warn("Fallo parcial en consultas extra, usando fallback", e);
        }

        const lunaInfo = { faseActual: clima.moonPhase };

        // SOLAPAMIENTO: Si tenemos el clima exacto (climaReal), lo usamos visualmente y para la recomendación. 
        // Si no, caemos en la data original del servidor.
        const climaAdaptado = climaReal ? {
            temp: climaReal.temp,
            humedad: climaReal.humedad || "--",
            desc: climaReal.desc,
            condicion: climaReal.condicion,
            icon: climaReal.icon,
            isNight: climaReal.isNight
        } : {
            temp: clima.temperature,
            humedad: "--",
            desc: mapConditionToUI(clima.condition),
            condicion: mapConditionToUI(clima.condition),
            icon: mapConditionToIcon(clima.condition, false),
            isNight: false
        };

        // Extraemos recomendación precisa sincronizada con el clima visual o usamos el backend
        let recFinal = recomendacion;
        if (climaReal && typeof REGLAS_ANCESTRALES !== 'undefined') {
            const condMap = { "Lluvia": "Rain", "Niebla": "Cloudy", "Viento": "Cloudy", "Despejado": "Clear" };
            const condicionGringa = condMap[climaReal.condicion] || "Clear";
            const reqLocal = obtenerRecomendacion(nacFinal, lunaInfo.faseActual, condicionGringa);
            if (reqLocal && reqLocal.labores_tierra) {
                recFinal = reqLocal;
            }
        }

        // Adaptar nombres de campos (El backend usa snake_case en JSON por Jackson)
        const recAdaptada = {
            labores_tierra: recFinal.labores_tierra,
            rituales_danzas: recFinal.rituales_danzas,
            vestimenta: recFinal.vestimenta,
            gastronomia: recFinal.gastronomia,
            medicina: recFinal.medicina
        };

        actualizarFondoDinamico(climaAdaptado);
        poblarInterfaz(climaAdaptado, lunaInfo, recAdaptada, nacFinal, history, images, mapping.asentamientos, ciudad, provincia);

    } catch (error) {
        console.error("Error crítico en oráculo:", error);
        alert("El Oráculo no pudo conectar con el servidor Java. Asegúrate de que el servidor esté corriendo en el puerto 8080.");
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

// Helpers para mapear la respuesta del backend a la UI
function mapConditionToUI(condition) {
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("drizzle") || c.includes("thunderstorm")) return "Lluvia";
    if (c.includes("mist") || c.includes("fog")) return "Niebla";
    if (c.includes("clear")) return "Despejado";
    return "Despejado";
}

function mapConditionToIcon(condition, isNight) {
    const c = condition.toLowerCase();
    let icon = "01";
    if (c.includes("rain")) icon = "10";
    else if (c.includes("cloud")) icon = "03";
    else if (c.includes("clear")) icon = "01";
    return icon + (isNight ? "n" : "d");
}

function normalizarNacionalidad(nombre) {
    if (nombre.includes("Kichwa")) return "Kichwa";
    if (nombre.includes("Shuar")) return "Shuar";
    if (nombre.includes("Montubio")) return "Montubio";
    if (nombre.includes("Afro")) return "Afroecuatoriano";
    if (nombre.includes("Tsáchila")) return "Tsáchila";
    if (nombre.includes("Waorani")) return "Waorani";
    if (nombre.includes("Galapagu")) return "Galapagueño";
    return "Montubio"; // Default cambiado a Montubio
}

function poblarInterfaz(clima, luna, rec, nac, hist, gallery, territories, ciudad, provincia) {
    // Clima
    document.getElementById('res-ciudad').textContent = ciudad;
    document.getElementById('res-provincia').textContent = provincia || "Ecuador";
    document.getElementById('res-temp').textContent = `${Math.round(clima.temp)}°C`;
    document.getElementById('res-clima-txt').textContent = clima.desc.charAt(0).toUpperCase() + clima.desc.slice(1);
    document.getElementById('res-humedad').textContent = `${clima.humedad}%`;
    document.getElementById('res-luna').textContent = luna.faseActual;
    document.getElementById('res-luna-icon').textContent = ICONOS_LUNARES[luna.faseActual] || "🌕";

    // Icono Clima
    const iconMap = { '01': 'sun', '02': 'cloud-sun', '03': 'cloud', '04': 'cloud', '09': 'cloud-showers-heavy', '10': 'cloud-rain', '11': 'bolt', '13': 'snowflake', '50': 'smog' };
    const faIcon = iconMap[(clima.icon || '01d').substring(0, 2)] || 'cloud-sun';
    document.getElementById('res-clima-icon').innerHTML = `<i class="fas fa-${faIcon}"></i>`;

    // Sabiduria
    document.getElementById('res-nacionalidad').textContent = nac;
    document.getElementById('card-labores').textContent = rec.labores_tierra;
    document.getElementById('card-rituales').textContent = rec.rituales_danzas;
    document.getElementById('card-vestimenta').textContent = rec.vestimenta;
    document.getElementById('card-gastronomia').textContent = rec.gastronomia;
    document.getElementById('card-medicina').textContent = rec.medicina;

    // Historia
    document.getElementById('card-historia').textContent = hist;
    document.getElementById('card-asentamientos').textContent = territories;

    // Galería y Mitología
    if (gallery && gallery.length > 0) {
        imagenesActuales = gallery;
        indiceImagenActual = 0;
        actualizarImagenSlider();
    }

    // Léxico Sagrado
    const lexico = LEXICO_ANCESTRAL[nac] || LEXICO_ANCESTRAL['Default'];
    document.getElementById('card-lexico').innerHTML = `"${lexico.palabra}"<br><small>${lexico.significado}</small>`;

    // Activar música de la nacionalidad y encender el toggle si está apagado
    if (!isMusicEnabled) {
        isMusicEnabled = true;
        const btn = document.getElementById('btn-music');
        if(btn) {
            btn.classList.add('active');
            setAudioButtonMode(btn, 'listening');
            initializeAudioButtons();
        }
    }
    reproducirMusicaNacionalidad(nac);
    
    // Hablar el relato tradicional automáticamente (ELIMINADO POR PETICIÓN DE USUARIO)
    // setTimeout(() => {
    //     readSection('relato');
    // }, 1000); 

    actualizarSeccionActividadesClimaticas(clima.temp, nac);

    // Efectos de Interfaz
    document.getElementById('results-sheet').classList.add('active');
    document.querySelector('.top-bar').classList.add('hidden');
    document.querySelector('.bottom-action-bar').classList.add('hidden');

    if (map) {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
    }
}

function seleccionarUbicacionAleatoria() {
    const PUNTOS = [
        { id: 1, lat: -0.18, lon: -78.46, nac: "Kichwa" }, { id: 2, lat: -2.90, lon: -79.00, nac: "Kichwa" },
        { id: 3, lat: -0.99, lon: -77.81, nac: "Kichwa" }, { id: 4, lat: 0.35, lon: -78.12, nac: "Kichwa" },
        { id: 5, lat: -1.25, lon: -78.62, nac: "Kichwa" }, { id: 6, lat: -2.18, lon: -79.88, nac: "Montubio" },
        { id: 7, lat: -1.05, lon: -80.45, nac: "Montubio" }, { id: 8, lat: -1.80, lon: -79.53, nac: "Montubio" },
        { id: 9, lat: -0.96, lon: -80.71, nac: "Montubio" }, { id: 10, lat: 0.96, lon: -79.65, nac: "Afroecuatoriano" },
        { id: 11, lat: 1.05, lon: -78.85, nac: "Afroecuatoriano" }, { id: 12, lat: 0.40, lon: -78.10, nac: "Afroecuatoriano" },
        { id: 13, lat: -0.21, lon: -79.16, nac: "Tsáchila" }, { id: 14, lat: -0.25, lon: -79.20, nac: "Tsáchila" },
        { id: 15, lat: -0.15, lon: -79.10, nac: "Tsáchila" }, { id: 16, lat: -0.62, lon: -76.88, nac: "Waorani" },
        { id: 17, lat: -0.95, lon: -76.05, nac: "Waorani" }, { id: 18, lat: -1.48, lon: -77.99, nac: "Shuar" },
        { id: 19, lat: -2.31, lon: -78.12, nac: "Shuar" }, { id: 20, lat: -3.42, lon: -78.60, nac: "Shuar" },
        { id: 21, lat: -0.74, lon: -90.31, nac: "Galapagueño" }, { id: 22, lat: -0.90, lon: -89.60, nac: "Galapagueño" },
        { id: 23, lat: -0.45, lon: -90.30, nac: "Galapagueño" }
    ];

    const nacFiltro = document.getElementById('nacionalidad').value;
    const historial = storageRepo.getPuntos();
    
    let pool = nacFiltro ? PUNTOS.filter(p => p.nac === nacFiltro) : PUNTOS;
    
    // Evitar historial reciente
    let candidatos = pool.filter(p => !historial.includes(p.id));
    if (candidatos.length === 0) candidatos = pool;

    const chosen = candidatos[Math.floor(Math.random() * candidatos.length)];
    
    historial.push(chosen.id);
    storageRepo.setPuntos(historial);

    map.flyTo([chosen.lat, chosen.lon], 12);
    seleccionarLugarPorCoordenadas(chosen.lat, chosen.lon, true); 
}

function cerrarResultados() {
    document.getElementById('results-sheet').classList.remove('active');
    document.querySelector('.top-bar').classList.remove('hidden');
    document.querySelector('.bottom-action-bar').classList.remove('hidden');

    detenerLecturaVoz();
    limpiarEfectosClimaticos();
    
    // Resetear estados internos
    speechState = 'idle';
    currentReadingType = null;
    actualizarEstadoAnimacionAudio();
    // Al volver al mapa, volver a música de inicio
    if (isMusicEnabled) {
        const nacionalidadManual = document.getElementById('nacionalidad').value;
        if(nacionalidadManual) {
             reproducirMusicaNacionalidad(nacionalidadManual);
        } else {
             reproducirMusicaNacionalidad('Default');
        }
    }

    if (map) {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
    }
}

function cambiarImagenSlider(dir) {
    if (!imagenesActuales.length) return;
    indiceImagenActual = (indiceImagenActual + dir + imagenesActuales.length) % imagenesActuales.length;
    actualizarImagenSlider();
}

function actualizarImagenSlider() {
    const img = document.getElementById('cultural-img');
    const myth = document.getElementById('res-myth-text');
    const indicator = document.querySelector('.image-indicator');
    const item = imagenesActuales[indiceImagenActual];
    if (!img || !item) return;

    img.src = item.url;
    if (myth) myth.textContent = `"${item.relato}"`;

    // Actualizar puntos indicadores
    if (indicator) {
        indicator.innerHTML = '';
        imagenesActuales.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `dot ${i === indiceImagenActual ? 'active' : ''}`;
            indicator.appendChild(dot);
        });
    }
    
    // Al cambiar la imagen, leemos el nuevo relato automáticamente de forma hablada (ELIMINADO)
    // readSection('relato');
}

async function obtenerClima(ciudad, lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.cod !== 200) throw new Error(data.message);

        return {
            temp: data.main.temp,
            humedad: data.main.humidity,
            desc: data.weather[0].description,
            condicion: (["Rain", "Thunderstorm", "Drizzle"].includes(data.weather[0].main)) ? "Lluvia" :
                (["Mist", "Smoke", "Haze", "Fog"].includes(data.weather[0].main)) ? "Niebla" :
                    (data.wind.speed > 5) ? "Viento" : "Despejado",
            icon: data.weather[0].icon,
            viento: data.wind.speed,
            isNight: data.weather[0].icon.includes('n')
        };
    } catch (e) {
        console.warn("Error al obtener clima:", e);
        throw e;
    }
}

async function obtenerHistoriaWiki(comunidad) {
    try {
        const queryMap = { "Kichwa": "Kichwa", "Afroecuatoriano": "Afroecuatoriano", "Galapagueño": "Región Insular del Ecuador" };
        const query = queryMap[comunidad] || comunidad;
        const resp = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = await resp.json();
        
        let wikiSummary = data.extract || "Sabiduría transmitida por vía oral.";
        
        // AGREGAR ALEATORIEDAD: Mezclar con un hecho local del pool
        const variantes = HISTORIA_POOL[comunidad] || [];
        if (variantes.length > 0) {
            const hechoLatorio = variantes[Math.floor(Math.random() * variantes.length)];
            return `${hechoLatorio} \n\n Más info: ${wikiSummary}`;
        }
        
        return wikiSummary;
    } catch (e) { 
        // Fallback aleatorio si falla Wikipedia
        const variantes = HISTORIA_POOL[comunidad] || [];
        if (variantes.length > 0) return variantes[Math.floor(Math.random() * variantes.length)];
        return "Explorando raíces ancestrales..."; 
    }
}

async function crawlearCarpetaImagenes(cultura) {
    const key = cultura.toLowerCase();
    const urlsValidas = [];
    const maxProbes = 15; // Probamos hasta 15 archivos secuenciales para no saturar

    // Promesas en paralelo para mayor velocidad
    const probes = [];
    for (let i = 1; i <= maxProbes; i++) {
        const url = `images/culturas/${key}/${key}${i}.png`;
        probes.push(
            fetch(url, { method: 'HEAD' })
                .then(res => res.ok ? url : null)
                .catch(() => null)
        );
    }

    const results = await Promise.all(probes);
    results.forEach(u => { if(u) urlsValidas.push(u); });

    // Si no encontró nada, intentar con nombres capitalizados (por si acaso)
    if (urlsValidas.length === 0) {
        const keyCap = cultura; 
        const probesCap = [];
        for (let i = 1; i <= 5; i++) {
            const url = `images/culturas/${keyCap.toLowerCase()}/${keyCap}${i}.png`;
            probesCap.push(fetch(url, { method: 'HEAD' }).then(res => res.ok ? url : null).catch(() => null));
        }
        const resCap = await Promise.all(probesCap);
        resCap.forEach(u => { if(u) urlsValidas.push(u); });
    }

    // Mapear a formato galería (url + relato)
    return urlsValidas.map(url => {
        // Buscar un relato preexistente si el archivo coincide con los originales
        const fileName = url.split('/').pop();
        const origData = CULTURAL_VISUALS[cultura] ? CULTURAL_VISUALS[cultura].galeria : null;
        const relatoPrevio = origData ? origData.find(img => img.url.includes(fileName)) : null;

        return {
            url: url,
            relato: relatoPrevio ? relatoPrevio.relato : `Relato ancestral de la cultura ${cultura} en este territorio sagrado.`
        };
    });
}

async function obtenerImagenCultural(comunidad) {
    const key = comunidad;
    if (!cacheGaleriasCultura[key]) {
        cacheGaleriasCultura[key] = await crawlearCarpetaImagenes(key);
    }
    
    let poolGaleria = cacheGaleriasCultura[key];
    if (poolGaleria.length === 0) {
        poolGaleria = CULTURAL_VISUALS[key] ? CULTURAL_VISUALS[key].galeria : CULTURAL_VISUALS["Kichwa"].galeria;
    }
    
    const vistosLaUltimaVez = storageRepo.getImg(key);
    
    let frescos = poolGaleria.filter(img => !vistosLaUltimaVez.includes(img.url));
    let seleccionados = [];
    
    if (frescos.length >= 4) {
        seleccionados = getRandomItems(frescos, 4);
    } else {
        seleccionados = [...frescos];
        const extras = getRandomItems(poolGaleria.filter(img => vistosLaUltimaVez.includes(img.url)), 4 - seleccionados.length);
        seleccionados = seleccionados.concat(extras);
    }
    
    seleccionados = getRandomItems(seleccionados, seleccionados.length);
    storageRepo.setImg(key, seleccionados.map(img => img.url));
    
    return seleccionados;
}

function calcularFaseLunar(date) {
    const diff = (date - new Date('2024-01-11T11:57:00')) / (1000 * 60 * 60 * 24);
    const day = diff % 29.53;
    if (day < 1.8) return { faseActual: "Luna Nueva" };
    if (day < 9.2) return { faseActual: "Luna Creciente" };
    if (day < 16.6) return { faseActual: "Luna Llena" };
    if (day < 24.0) return { faseActual: "Luna Menguante" };
    return { faseActual: "Luna Nueva" };
}

function obtenerRecomendacion(nac, fase, cond) {
    try { return REGLAS_ANCESTRALES[nac]['fases_lunares'][fase][cond]; }
    catch (e) { return { labores_tierra: "Prudencia.", rituales_danzas: "Conexión espiritual.", vestimenta: "Ropa adecuada.", gastronomia: "Alimentos del sector.", medicina: "Infusiones." }; }
}

function actualizarFondoDinamico(clima) {
    const overlay = document.getElementById('climate-overlay');
    const rainBox = document.getElementById('rain-container');
    const badge = document.getElementById('climate-badge');

    overlay.className = '';
    if (rainBox) {
        rainBox.innerHTML = '';
        rainBox.style.display = 'none';
    }

    // El funcionamiento depende del texto descriptivo (como pidió el usuario)
    const descText = (clima.desc || "").toLowerCase();
    let effectiveCond = clima.condicion;

    if (descText.includes('lluvia') || descText.includes('llovizna') || descText.includes('tormenta')) {
        effectiveCond = 'Lluvia';
    } else if (descText.includes('niebla') || descText.includes('neblina') || descText.includes('bruma') || descText.includes('humedad')) {
        effectiveCond = 'Niebla';
    } else if (descText.includes('viento') || descText.includes('ventarrón')) {
        effectiveCond = 'Viento';
    } else if (descText.includes('despejado') || descText.includes('sol')) {
        effectiveCond = 'Despejado';
    }

    // 1. Efecto Noche
    if (clima.isNight) overlay.classList.add('night-mode');

    // 2. Aplicar Efectos basados en la condición efectiva
    if (effectiveCond === 'Lluvia') {
        overlay.classList.add('rain');
        if (rainBox) {
            rainBox.style.display = 'block';
            generarLluvia(rainBox, 80);
        }
        if (badge) badge.textContent = "🌧️ Lluvia detectada";
    } else if (effectiveCond === 'Niebla') {
        if (rainBox) {
            rainBox.style.display = 'block';
            generarNiebla(rainBox);
        }
        if (badge) badge.textContent = "🌫️ Niebla / Humedad";
    } else if (effectiveCond === 'Viento') {
        if (rainBox) {
            rainBox.style.display = 'block';
            generarViento(rainBox, 25);
        }
        if (badge) badge.textContent = "💨 Vientos fuertes";
    } else if (effectiveCond === 'Despejado') {
        overlay.classList.add('sun-glow');
        if (badge) badge.textContent = "☀️ Cielo Despejado";
    } else {
        if (badge) badge.textContent = "☁️ " + (clima.desc || "Nublado");
    }

    if (badge) badge.style.display = 'block';
}

function limpiarEfectosClimaticos() {
    const overlay = document.getElementById('climate-overlay');
    const rainBox = document.getElementById('rain-container');
    const badge = document.getElementById('climate-badge');

    if (overlay) overlay.className = '';
    if (rainBox) {
        rainBox.innerHTML = '';
        rainBox.style.display = 'none';
    }
    if (badge) {
        badge.textContent = '';
        badge.style.display = 'none';
    }
}

function generarNiebla(box) {
    box.innerHTML = '';
    // Creamos varias capas de niebla para profundidad y movimiento
    for (let i = 0; i < 5; i++) {
        const fog = document.createElement('div');
        fog.className = 'fog-layer';
        fog.style.animationDelay = (i * 2) + 's';
        fog.style.background = `radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,255,255,0.2) 0%, transparent 60%)`;
        box.appendChild(fog);
    }
}

function generarViento(box, count) {
    box.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'wind-particle';
        const top = Math.random() * 100;
        const width = (80 + Math.random() * 150) + 'px';
        const dur = (0.8 + Math.random() * 1.5) + 's';
        const delay = Math.random() * 3 + 's';

        particle.style.top = top + '%';
        particle.style.width = width;
        particle.style.animationDuration = dur;
        particle.style.animationDelay = delay;
        box.appendChild(particle);
    }
}

function generarLluvia(box, count) {
    box.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        const left = Math.random() * 100;
        const dur = (0.4 + Math.random() * 0.6) + 's';
        const delay = Math.random() * 2 + 's';

        drop.style.left = left + '%';
        drop.style.height = (30 + Math.random() * 30) + 'px';
        drop.style.animationDuration = dur;
        drop.style.animationDelay = delay;
        box.appendChild(drop);
    }
}

function toggleInfo() {
    document.getElementById('info-panel').classList.toggle('hidden');
}

function toggleError() {
    document.getElementById('error-panel').classList.toggle('hidden');
}

function actualizarDescripcionCosmovision(nac, conAudio = true) {
    const container = document.getElementById('cosmovision-desc-container');
    const text = document.getElementById('cosmovision-desc');
    
    // Solo detenemos la voz anterior si realmente vamos a sonar algo nuevo
    if (conAudio) {
        detenerLecturaVoz();
    }

    if (nac && typeof REGLAS_ANCESTRALES !== 'undefined' && REGLAS_ANCESTRALES[nac]) {
        text.textContent = `"${REGLAS_ANCESTRALES[nac].descripcion}"`;
        container.classList.remove('hidden');
        
        if (conAudio && isMusicEnabled) {
            reproducirMusicaNacionalidad(nac);
        }
    } else { container.classList.add('hidden'); }
}

function toggleSaber(id) {
    const content = document.getElementById(id);
    if (!content) return;
    const wasActive = content.classList.contains('active');
    
    // Resetear todos
    document.querySelectorAll('.saber-content').forEach(el => {
        el.classList.remove('active');
        el.style.maxHeight = null;
    });
    document.querySelectorAll('.saber-btn').forEach(b => b.classList.remove('active'));

    // Activar si estaba cerrado
    if (!wasActive) {
        content.classList.add('active');
        content.style.maxHeight = "500px";
        
        // Buscar el botón que disparó el evento para darle clase active
        const btn = document.querySelector(`[onpointerdown*="toggleSaber('${id}')"]`);
        if (btn) btn.classList.add('active');
    }
}

// -------------------------------------------------------------
// VESTIMENTA DEL MUÑEQUITO SEGÚN REGIÓN (SVG DETALLADO)
// -------------------------------------------------------------
function actualizarVestimenta(provincia, markerObj) {
    let region = "sierra"; // default
    const costa = ["Guayas", "Santa Elena", "Manabí", "El Oro", "Los Ríos", "Esmeraldas"];
    const oriente = ["Napo", "Orellana", "Pastaza", "Morona Santiago", "Zamora Chinchipe", "Sucumbíos"];
    const insular = ["Galápagos"];

    if (costa.includes(provincia)) region = "costa";
    else if (oriente.includes(provincia)) region = "oriente";
    else if (insular.includes(provincia)) region = "insular";

    const svgIcon = getPegmanSVG(region);

    // Preservar el label que ya existe en el marker
    const markerElement = markerObj ? markerObj.getElement() : null;
    let ciudadLabel = "";
    if (markerElement) {
        const labelDiv = markerElement.querySelector('.marker-label');
        if (labelDiv) ciudadLabel = labelDiv.textContent;
    }

    const customPersonIcon = L.divIcon({
        className: 'person-marker custom-outfit',
        html: `<div class="person-marker-content">${svgIcon}</div><div class="marker-label">${ciudadLabel}</div>`,
        iconSize: [80, 100],
        iconAnchor: [40, 95]
    });

    markerObj.setIcon(customPersonIcon);

    // Sincronizar el icono del header con el mismo muñequito (misma región / vestimenta)
    const identityIcon = document.querySelector('.identity-tag-main .identity-icon');
    if (identityIcon) {
        identityIcon.innerHTML = svgIcon;
        identityIcon.style.width = '54px';
        identityIcon.style.height = '54px';
        identityIcon.classList.add('moving');
    }
}

function getPegmanSVG(region) {
    const baseBody = `
        <ellipse cx="50" cy="125" rx="24" ry="10" fill="rgba(0,0,0,0.35)" />
        <path d="M 32 115 L 32 50 C 32 32, 68 32, 68 50 L 68 115 Z" fill="#fcd34d" />
        <path d="M 40 80 C 46 68, 54 68, 60 80 C 56 88, 44 88, 40 80 Z" fill="#f59e0b" opacity="0.4" />
        <circle cx="50" cy="38" r="24" fill="#fcd34d" />
        <path d="M 28 35 Q 50 12 72 35" fill="#1e293b" opacity="0.45" />
    `;
    
    let faces = `
        <circle cx="42" cy="35" r="3.5" fill="#333"/>
        <circle cx="58" cy="35" r="3.5" fill="#333"/>
        <path d="M 45 44 Q 50 50 55 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `;

    let attire = "";

    if (region === 'sierra') {
        attire = `
            <!-- Poncho Andino -->
            <path d="M 32 55 L 50 95 L 68 55 Z" fill="#b91c1c"/>
            <path d="M 39 55 L 50 85 L 61 55 Z" fill="#1e3a8a"/>
            <!-- Sombrero de Paño -->
            <ellipse cx="50" cy="18" rx="30" ry="8" fill="#1e293b" />
            <path d="M 34 18 C 34 -2, 66 -2, 66 18 Z" fill="#1e293b" />
            <path d="M 35 15 C 35 5, 65 5, 65 15 Z" fill="#b91c1c" />
        `;
    } else if (region === 'costa') {
        attire = `
            <!-- Guayabera Blanca -->
            <path d="M 34 55 C 34 40, 66 40, 66 55 L 66 90 L 34 90 Z" fill="#ffffff"/>
            <line x1="45" y1="50" x2="45" y2="90" stroke="#f1f5f9" stroke-width="2"/>
            <line x1="55" y1="50" x2="55" y2="90" stroke="#f1f5f9" stroke-width="2"/>
            <!-- Sombrero Toquilla (Panamá) -->
            <ellipse cx="50" cy="15" rx="34" ry="9" fill="#fef08a"/>
            <path d="M 37 15 C 37 -5, 63 -5, 63 15 Z" fill="#fef08a"/>
            <path d="M 37 12 C 37 2, 63 2, 63 12 Z" fill="#0f172a"/>
        `;
    } else if (region === 'oriente') {
        attire = `
            <!-- Pintura Facial (Achiote) -->
            <line x1="30" y1="38" x2="40" y2="38" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="60" y1="38" x2="70" y2="38" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
            <!-- Ropa -->
            <path d="M 34 85 L 66 85 L 61 105 L 39 105 Z" fill="#78350f"/>
            <!-- Lanza de Chonta -->
            <line x1="20" y1="20" x2="20" y2="120" stroke="#451a03" stroke-width="4.5" stroke-linecap="round"/>
            <polygon points="15,30 20,2 25,30" fill="#cbd5e1"/>
            <!-- Corona de Plumas -->
            <path d="M 35 20 Q 25 -5 35 10" stroke="#ef4444" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M 45 18 Q 40 -15 50 0" stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M 55 18 Q 60 -15 50 0" stroke="#10b981" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M 65 20 Q 75 -5 65 10" stroke="#3b82f6" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M 28 15 Q 40 25 72 15" stroke="#fbbf24" stroke-width="4" fill="none" stroke-linecap="round"/>
        `;
    } else if (region === 'insular') {
        faces = `
            <!-- Gafas de Sol -->
            <rect x="34" y="28" width="14" height="10" rx="3" fill="#1e293b"/>
            <rect x="52" y="28" width="14" height="10" rx="3" fill="#1e293b"/>
            <line x1="48" y1="32" x2="52" y2="32" stroke="#1e293b" stroke-width="3"/>
            <line x1="28" y1="32" x2="34" y2="32" stroke="#1e293b" stroke-width="2"/>
            <line x1="66" y1="32" x2="72" y2="32" stroke="#1e293b" stroke-width="2"/>
            <!-- Sonrisa de turista -->
            <path d="M 45 44 Q 50 50 55 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        `;
        attire = `
            <!-- Camisa Floral -->
            <path d="M 34 55 C 34 35, 66 35, 66 55 L 66 90 L 34 90 Z" fill="#38bdf8"/>
            <path d="M 45 65 Q 50 60 55 65 Q 50 70 45 65" fill="#fde047"/>
            <path d="M 55 80 Q 60 75 65 80 Q 60 85 55 80" fill="#fef08a"/>
            <!-- Pantalones Cortos -->
            <path d="M 34 90 L 66 90 L 66 108 L 53 108 L 50 95 L 47 108 L 34 108 Z" fill="#0284c7"/>
            <!-- Cámara Fotográfica -->
            <rect x="40" y="65" width="20" height="15" rx="3" fill="#0f172a"/>
            <rect x="43" y="62" width="6" height="3" fill="#cbd5e1"/>
            <circle cx="50" cy="72.5" r="5" fill="#94a3b8"/>
            <circle cx="50" cy="72.5" r="2.5" fill="#020617"/>
            <path d="M 40 65 Q 50 45 60 65" stroke="#0f172a" stroke-width="1.5" fill="none"/>
        `;
    }

    return `
        <svg viewBox="0 0 100 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            ${baseBody}
            ${attire}
            ${faces}
        </svg>
    `;
}

// -------------------------------------------------------------
// SISTEMA DE AUDIO Y VOZ
// -------------------------------------------------------------

function toggleMusic() {
    const btn = document.getElementById('btn-music');
    if (!btn) return;

    if (isMusicEnabled && audioActual && !audioActual.paused) {
        // PAUSAR
        isMusicEnabled = false;
        audioActual.pause();
        btn.classList.add('paused');
        btn.classList.remove('active');
        setAudioButtonMode(null, 'idle');
    } else if (audioActual && isMusicEnabled === false) {
        // RESUMIR
        isMusicEnabled = true;
        audioActual.play();
        btn.classList.remove('paused');
        btn.classList.add('active');
        setAudioButtonMode(btn, 'listening');
    } else {
        // EMPEZAR NUEVO
        isMusicEnabled = true;
        btn.classList.add('active');
        btn.classList.remove('paused');
        
        let nacLimpia = 'Default';
        if (document.getElementById('results-sheet').classList.contains('active')) {
            const nac = document.getElementById('res-nacionalidad').textContent;
            nacLimpia = (nac && nac !== '--') ? nac : 'Default';
        } else {
            const nacCombo = document.getElementById('nacionalidad').value;
            nacLimpia = nacCombo || 'Default';
        }
        reproducirMusicaNacionalidad(nacLimpia);
    }

    actualizarEstadoAnimacionAudio();
}

// ----------------------------------------------------------------------------------
// NUEVA FUNCIONALIDAD: ACTIVIDADES CLIMÁTICAS (NO INVASIVA)
// ----------------------------------------------------------------------------------

const ACTIVIDADES_CLIMATICAS_DB = {
    "Sierra": {
        "10-15": "En climas fríos (entre 10°C y 15°C), las familias andinas se reúnen junto al fogón para tejer ponchos y relatar mitos antiguos.",
        "15-20": "A temperatura fresca (15°C a 20°C), es tiempo ideal para preparar el suelo y sembrar tubérculos bajo el sol de la mañana.",
        "20-25": "Con el sol andino templado (20°C a 25°C), se realizan las cosechas mayores y el zapateo ritual de gratitud a la Pachamama.",
        "25-30": "Ante un calor inusual (25°C a 30°C), se realizan baños ceremoniales en vertientes sagradas para purificar el espíritu."
    },
    "Costa": {
        "20-25": "A clima fresco (20°C a 25°C), las comunidades montubias aprovechan para la pesca artesanal y la recolección de frutos.",
        "25-30": "Con calor moderado (25°C a 30°C), se secan los granos de cacao fino de aroma al sol para capturar su esencia ancestral.",
        "30-35": "Bajo el sol intenso (30°C a 35°C), se busca el manglar para la recolección de conchas al ritmo de los arrullos del mar.",
        "35-40": "En temperaturas extremas (35°C a 40°C), la vida gira en torno a los ríos, compartiendo historias y refrescantes jugos de coco."
    },
    "Amazonía": {
        "20-25": "Cuando la selva refresca (20°C a 25°C), los maestros recolectan el uña de gato y resinas medicinales que fluyen mejor con la sombra.",
        "25-30": "A clima cálido (25°C a 30°C), es época de siembra de yuca y preparación de las chacras invocando a los espíritus protectores.",
        "30-35": "Con el calor húmedo (30°C a 35°C), se fabrican herramientas de chonta y se realizan ceremonias de visión en el corazón del bosque.",
        "35-40": "Bajo el sol ardiente (35°C a 40°C), los guerreros se pintan con achiote como escudo espiritual y físico contra el calor del día."
    },
    "Default": {
        "all": "En este territorio ecuatoriano, las comunidades conectan con los ciclos de la naturaleza para sus labores de vida y sabiduría."
    }
};

function actualizarSeccionActividadesClimaticas(temperatura, cultura) {
    const textoEl = document.getElementById('clima-actividad-texto');
    if (!textoEl) return;

    // Determinar región basada en cultura
    let region = "Default";
    const c = cultura.toLowerCase();
    if (c.includes('kichwa')) region = "Sierra";
    else if (c.includes('montubio') || c.includes('afro') || c.includes('tsáchila')) region = "Costa";
    else if (c.includes('shuar') || c.includes('waorani')) region = "Amazonía";
    else if (c.includes('galapagu')) region = "Costa"; // Aproximación climática similar

    // Encontrar el rango de temperatura
    const t = parseFloat(temperatura);
    let rango = "all";
    if (t < 15) rango = "10-15";
    else if (t < 20) rango = "15-20";
    else if (t < 25) rango = "20-25";
    else if (t < 30) rango = "25-30";
    else if (t < 35) rango = "30-35";
    else rango = "35-40";

    const db = ACTIVIDADES_CLIMATICAS_DB[region] || ACTIVIDADES_CLIMATICAS_DB["Default"];
    const mensaje = db[rango] || db["all"] || ACTIVIDADES_CLIMATICAS_DB["Default"]["all"];

    textoEl.innerHTML = `<span class="gold-bold">Actual: ${temperatura}°C</span><br>${mensaje.replace('pertenece a rango', '')}`;
}

async function reproducirMusicaNacionalidad(nac) {
    const url = MUSIC_DATABASE[nac] || MUSIC_DATABASE['Default'];
    
    // Si ya está cargada esa canción, no la reiniciamos (permitimos resume)
    if (audioActual && audioActual.src.includes(url.replace('.', ''))) return;

    try {
        if (audioActual) {
            audioActual.pause();
            audioActual.currentTime = 0;
        }

        audioActual = new Audio(url);
        audioActual.loop = true;
        audioActual.volume = musicVolume; 

        audioActual.addEventListener("error", (e) => {
            console.error("Error del audio. Ruta:", url);
            console.error("currentSrc:", audioActual.currentSrc);
            console.error("error code:", audioActual.error ? audioActual.error.code : "sin código");
            actualizarEstadoAnimacionAudio();
        });

        audioActual.addEventListener('play', actualizarEstadoAnimacionAudio);
        audioActual.addEventListener('pause', actualizarEstadoAnimacionAudio);
        audioActual.addEventListener('ended', actualizarEstadoAnimacionAudio);

        if (isMusicEnabled) {
            await audioActual.play();
            console.log("Sonando correctamente:", url);
            actualizarEstadoAnimacionAudio();
        }
    } catch (error) {
        console.error("Error al reproducir audio:", error);
        console.error("Intenta descargar el archivo a la carpeta /audio/");
    }
}


// TTS: Estado interno como ÚNICA fuente de verdad (Fix definitivo para Chrome)
// Estados posibles por sección: 'idle' | 'playing' | 'paused'
// currentReadingType: qué sección está activa (o null)
window.readSection = function(type) {
    const synth = window.speechSynthesis;

    // --- CASO: Cambio de sección ---
    // Si hay una sección activa o pausada diferente, la cancelamos por completo
    if (currentReadingType && currentReadingType !== type) {
        synth.cancel();
        sectionStates[currentReadingType] = 'idle';
        currentReadingType = null;
        // Caemos al bloque de PLAY para la nueva sección (no hay return)
    }

    // --- MÁQUINA DE ESTADOS (usando sectionStates como verdad) ---
    const estado = sectionStates[type] || 'idle';

    if (estado === 'playing') {
        // ── PLAYING → PAUSED ──
        synth.pause();
        sectionStates[type] = 'paused';
        actualizarEstadoAnimacionAudio();
        return;
    }

    if (estado === 'paused') {
        // ── PAUSED → PLAYING (resume nativo) ──
        synth.resume();
        sectionStates[type] = 'playing';
        actualizarEstadoAnimacionAudio();
        return;
    }

    // ── IDLE → PLAYING (inicio desde cero) ──
    synth.cancel(); // Limpiar cualquier rastro anterior

    let text = '';
    if (type === 'relato') {
        text = document.getElementById('res-myth-text')?.textContent || '';
    } else if (type === 'historia') {
        text = 'Historia. ' + (document.getElementById('card-historia')?.textContent || '');
    } else if (type === 'sabidurias') {
        const lexicoNode = document.getElementById('card-lexico');
        const palabraOriginal = lexicoNode ? lexicoNode.innerHTML.split('<br>')[0].replace(/"/g, '') : '';
        const significadoOriginal = lexicoNode ? lexicoNode.querySelector('small')?.textContent || '' : '';
        const lexicoText = palabraOriginal ? `Léxico Sagrado. El término es ${palabraOriginal}, que significa ${significadoOriginal}.` : '';

        text = 'Sabidurías. '
            + 'Labores de tierra: ' + (document.getElementById('card-labores')?.textContent || '') + '. '
            + 'Rituales y danzas: ' + (document.getElementById('card-rituales')?.textContent || '') + '. '
            + 'Vestimenta: ' + (document.getElementById('card-vestimenta')?.textContent || '') + '. '
            + 'Gastronomía: ' + (document.getElementById('card-gastronomia')?.textContent || '') + '. '
            + 'Medicina: ' + (document.getElementById('card-medicina')?.textContent || '') + '. '
            + lexicoText;
    } else if (type === 'clima') {
        text = 'Actividades según el clima. ' + (document.getElementById('clima-actividad-texto')?.textContent || '');
    }

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;

    currentReadingType = type;
    sectionStates[type] = 'playing';

    utterance.onstart = () => {
        sectionStates[type] = 'playing';
        actualizarEstadoAnimacionAudio();
    };
    utterance.onpause = () => {
        sectionStates[type] = 'paused';
        actualizarEstadoAnimacionAudio();
    };
    utterance.onresume = () => {
        sectionStates[type] = 'playing';
        actualizarEstadoAnimacionAudio();
    };
    utterance.onend = () => {
        // Terminó de forma natural: resetear todo
        sectionStates[type] = 'idle';
        currentReadingType = null;
        actualizarEstadoAnimacionAudio();
    };
    utterance.onerror = () => {
        sectionStates[type] = 'idle';
        currentReadingType = null;
        actualizarEstadoAnimacionAudio();
    };

    synth.speak(utterance);
    actualizarEstadoAnimacionAudio();
};

function detenerLecturaVoz() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    speechState = 'idle';
    currentReadingType = null;
    
    document.querySelectorAll('.speak-btn').forEach(b => {
        b.classList.remove('active', 'speaking', 'paused');
    });
    
    actualizarEstadoAnimacionAudio();
}