const API_KEY = "ed837b064312b708aa0afe18c2b91aca";
let map;
let marker;
let imagenesActuales = [];
let indiceImagenActual = 0;
let isMusicEnabled = false; // Manual por defecto
let audioActual = null;

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

    // Eventos de configuración
    document.getElementById('nacionalidad').addEventListener('change', (e) => {
        actualizarDescripcionCosmovision(e.target.value);
    });

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

    // Inicializar estado visual del botón Música
    const musicBtn = document.getElementById('btn-music');
    if (isMusicEnabled) {
        musicBtn.classList.add('active');
        musicBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        musicBtn.classList.remove('active');
        musicBtn.innerHTML = '<i class="fas fa-music"></i>';
    }

    // Inicializar clima en el mapa
    inicializarMapaClimatico();

    // Inicializar Ciclo Solar
    actualizarCicloSolar();
    setInterval(actualizarCicloSolar, 60000); // Revisar cada minuto
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
    map = L.map('map-background', {
        zoomControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        minZoom: 6
    }).setView([-1.8312, -78.1834], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', (e) => seleccionarLugarPorCoordenadas(e.latlng.lat, e.latlng.lng));

    // Filtro para que el mapa se vea más "místico"
    document.querySelector('.leaflet-tile-pane').style.filter = 'grayscale(0.5) contrast(1.2) brightness(0.8)';
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
        html: `<div class="person-marker-content">${defaultSvgIcon}</div>`,
        iconSize: [60, 80],
        iconAnchor: [30, 75]
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
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
        const data = await response.json();

        if (data) {
            // Validar que el punto seleccionado esté dentro de Ecuador
            if (data.countryCode && data.countryCode !== "EC") {
                document.getElementById('selected-location').textContent = "Selección fuera de Ecuador";
                btn.disabled = true;
                if (marker) map.removeLayer(marker);
                toggleError();
                return;
            }

            const ciudad = data.city || data.locality || "Ubicación rural";
            const provincia = (data.principalSubdivision || "").replace("Provincia de ", "").trim();

            document.getElementById('selected-location').textContent = ciudad;
            btn.dataset.ciudad = ciudad;
            btn.dataset.provincia = provincia;
            marker.bindPopup(`<b>${ciudad}</b>`).openPopup();
            
            // Vestir al muñequito según la región
            actualizarVestimenta(provincia, marker);

            // Esperar al clic de "Consultar Oráculo" para mostrar el clima animado en el fondo
            

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
    const nacionalidadManual = document.getElementById('nacionalidad').value;

    // 1. Detección de cultura por provincia (Fallback)
    const mapping = MAPPING_PROVINCIAS[provincia] || { pueblo: "Kichwa", asentamientos: "Territorio Ecuatoriano" };
    const nacFinal = nacionalidadManual || normalizarNacionalidad(mapping.pueblo);

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
    return "Kichwa"; // Default
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

    // Música según nacionalidad
    if (isMusicEnabled) {
        reproducirMusicaNacionalidad(nac);
    }

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
        { lat: -0.18, lon: -78.46 }, // Quito
        { lat: -2.18, lon: -79.88 }, // Guayaquil
        { lat: -2.90, lon: -79.00 }, // Cuenca
        { lat: -0.99, lon: -77.81 }, // Tena
        { lat: 0.96, lon: -79.65 },  // Esmeraldas
        { lat: -1.05, lon: -80.45 }, // Portoviejo
        { lat: -0.96, lon: -80.71 }  // Manta
    ];
    const point = PUNTOS[Math.floor(Math.random() * PUNTOS.length)];
    map.flyTo([point.lat, point.lon], 12);
    seleccionarLugarPorCoordenadas(point.lat, point.lon, true);
}

function cerrarResultados() {
    document.getElementById('results-sheet').classList.remove('active');
    document.querySelector('.top-bar').classList.remove('hidden');
    document.querySelector('.bottom-action-bar').classList.remove('hidden');

    detenerLecturaVoz();
    limpiarEfectosClimaticos();
    
    // Al volver al mapa, volver a música de inicio
    if (isMusicEnabled) {
        reproducirMusicaNacionalidad('Default');
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
        return data.extract || "Sabiduría transmitida por vía oral.";
    } catch (e) { return "Explorando raíces ancestrales..."; }
}

async function obtenerImagenCultural(comunidad) {
    const key = comunidad; // Ya viene normalizado
    return CULTURAL_VISUALS[key] ? CULTURAL_VISUALS[key].galeria : CULTURAL_VISUALS["Kichwa"].galeria;
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
    rainBox.innerHTML = '';
    rainBox.style.display = 'none';

    // 1. Efecto Noche
    if (clima.isNight) overlay.classList.add('night-mode');

    // 2. Efectos Específicos
    if (clima.condicion === 'Lluvia') {
        overlay.classList.add('rain');
        rainBox.style.display = 'block';
        generarLluvia(rainBox, 80); // Más gotas para realismo
        if (badge) badge.textContent = "🌧️ Lluvia detectada";
    } else if (clima.condicion === 'Niebla') {
        rainBox.style.display = 'block';
        generarNiebla(rainBox);
        if (badge) badge.textContent = "🌫️ Niebla / Neblina";
    } else if (clima.condicion === 'Viento' || (clima.viento > 5)) {
        rainBox.style.display = 'block';
        generarViento(rainBox, 25); // Más partículas
        if (badge) badge.textContent = "💨 Vientos fuertes";
    } else if (clima.icon.includes('01')) {
        overlay.classList.add('sun-glow');
        if (badge) badge.textContent = "☀️ Cielo Despejado";
    } else {
        if (badge) badge.textContent = "☁️ " + clima.desc;
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

function actualizarDescripcionCosmovision(nac) {
    const container = document.getElementById('cosmovision-desc-container');
    const text = document.getElementById('cosmovision-desc');
    if (nac && REGLAS_ANCESTRALES[nac]) {
        text.textContent = `"${REGLAS_ANCESTRALES[nac].descripcion}"`;
        container.classList.remove('hidden');
    } else { container.classList.add('hidden'); }
}

function toggleSaber(id) {
    const content = document.getElementById(id);
    const wasActive = content.classList.contains('active');
    document.querySelectorAll('.saber-content').forEach(el => {
        el.classList.remove('active');
        el.style.maxHeight = null;
    });
    if (!wasActive) {
        content.classList.add('active');
        content.style.maxHeight = "200px";
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

    const customPersonIcon = L.divIcon({
        className: 'person-marker custom-outfit',
        html: `<div class="person-marker-content">${svgIcon}</div>`,
        iconSize: [60, 80],
        iconAnchor: [30, 75]
    });

    markerObj.setIcon(customPersonIcon);
}

function getPegmanSVG(region) {
    const baseBody = `
        <ellipse cx="50" cy="120" rx="20" ry="8" fill="rgba(0,0,0,0.3)" />
        <path d="M 35 115 L 35 55 C 35 35, 65 35, 65 55 L 65 115 Z" fill="#fcd34d"/>
        <circle cx="50" cy="35" r="22" fill="#fcd34d"/>
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
    isMusicEnabled = !isMusicEnabled;
    
    if (isMusicEnabled) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        const nac = document.getElementById('res-nacionalidad').textContent;
        const nacLimpia = (nac && nac !== '--') ? nac : 'Default';
        reproducirMusicaNacionalidad(nacLimpia);
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-music"></i>';
        if (audioActual) audioActual.pause();
    }
}

async function reproducirMusicaNacionalidad(nac) {
    const url = MUSIC_DATABASE[nac] || MUSIC_DATABASE['Default'];
    
    // Si ya está sonando esa canción, no la reiniciamos
    if (audioActual && audioActual.src.includes(url.replace('.', '')) && !audioActual.paused) return;

    try {
        if (audioActual) {
            audioActual.pause();
            audioActual.currentTime = 0;
        }

        audioActual = new Audio(url);
        audioActual.loop = true;
        audioActual.volume = 0.5;

        audioActual.addEventListener("error", (e) => {
            console.error("Error del audio. Ruta:", url);
            console.error("currentSrc:", audioActual.currentSrc);
            console.error("error code:", audioActual.error ? audioActual.error.code : "sin código");
        });

        if (isMusicEnabled) {
            await audioActual.play();
            console.log("Sonando correctamente:", url);
        }
    } catch (error) {
        console.error("Error al reproducir audio:", error);
        console.error("Intenta descargar el archivo a la carpeta /audio/");
    }
}

// Lectura de Voz (Text-to-Speech)
window.readSection = function(type) {
    detenerLecturaVoz();
    
    let text = "";
    if (type === 'sabidurias') {
        text = `Sabidurías de la cultura ${document.getElementById('res-nacionalidad').textContent}. `;
        text += "Labores de tierra: " + document.getElementById('card-labores').textContent + ". ";
        text += "Rituales y danzas: " + document.getElementById('card-rituales').textContent + ". ";
        text += "Vestimenta: " + document.getElementById('card-vestimenta').textContent + ". ";
        text += "Gastronomía: " + document.getElementById('card-gastronomia').textContent + ". ";
        text += "Medicina: " + document.getElementById('card-medicina').textContent + ". ";
    } else if (type === 'relato') {
        text = document.getElementById('res-myth-text').textContent;
    } else if (type === 'historia') {
        text = "Historia del pueblo. " + document.getElementById('card-historia').textContent;
    }

    if (!text || text.includes('...')) return;

    if (!('speechSynthesis' in window)) {
        alert("Lo siento, tu navegador no soporta lectura de voz.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Feedback visual
    const btn = event ? event.currentTarget : null;
    if (btn && btn.classList) btn.classList.add('active');
    
    utterance.onend = () => {
        if (btn && btn.classList) btn.classList.remove('active');
    };

    window.speechSynthesis.speak(utterance);
};

function detenerLecturaVoz() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    document.querySelectorAll('.speak-btn').forEach(b => b.classList.remove('active'));
}