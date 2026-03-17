const API_KEY = "ed837b064312b708aa0afe18c2b91aca"; 
let map;
let marker;
let imagenesActuales = [];
let indiceImagenActual = 0;

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
    document.getElementById('btn-close-sheet').addEventListener('click', cerrarResultados);
    document.getElementById('btn-back-map').addEventListener('click', cerrarResultados);

    // Inicializar clima en el mapa
    inicializarMapaClimatico();
});

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
    marker = L.marker([lat, lon]).addTo(map);
    
    document.getElementById('selected-location').textContent = "Detectando...";
    btn.disabled = false;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
        const data = await response.json();

        if (data && data.address) {
            const ciudad = data.address.city || data.address.town || data.address.village || data.address.county || "Ubicación rural";
            const provincia = (data.address.state || data.address.province || "").replace("Provincia de ", "").trim();
            
            document.getElementById('selected-location').textContent = ciudad;
            btn.dataset.ciudad = ciudad;
            btn.dataset.provincia = provincia;
            marker.bindPopup(`<b>${ciudad}</b>`).openPopup();

            // Activar clima en el fondo inmediatamente
            obtenerClima(ciudad, lat, lon).then(clima => actualizarFondoDinamico(clima));

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

        // Consultas paralelas para contenido extra (Wiki e Imágenes)
        const [history, images] = await Promise.all([
            obtenerHistoriaWiki(nacFinal),
            obtenerImagenCultural(nacFinal)
        ]);

        // Adaptar nombres de campos (El backend usa snake_case en JSON por Jackson)
        const recAdaptada = {
            labores_tierra: recomendacion.labores_tierra,
            rituales_danzas: recomendacion.rituales_danzas,
            vestimenta: recomendacion.vestimenta,
            gastronomia: recomendacion.gastronomia,
            medicina: recomendacion.medicina
        };

        const climaAdaptado = {
            temp: clima.temperature,
            humedad: clima.humidity || "--", // El backend actual no devuelve humedad aún, podríamos agregarlo
            desc: clima.condition,
            condicion: mapConditionToUI(clima.condition),
            icon: mapConditionToIcon(clima.condition, false), // Ajustar según necesidad
            isNight: false // Ajustar si el backend provee esta info
        };

        const lunaInfo = { faseActual: clima.moonPhase };

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

function generarNiebla(box) {
    box.innerHTML = '';
    // Creamos varias capas de niebla para profundidad y movimiento
    for (let i = 0; i < 5; i++) {
        const fog = document.createElement('div');
        fog.className = 'fog-layer';
        fog.style.animationDelay = (i * 2) + 's';
        fog.style.background = `radial-gradient(circle at ${Math.random()*100}% ${Math.random()*100}%, rgba(255,255,255,0.2) 0%, transparent 60%)`;
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