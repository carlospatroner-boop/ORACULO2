/**
 * ORÁCULO ANCESTRAL - MAP ADAPTER SYSTEM
 * 
 * Este archivo implementa el patrón Adapter para permitir múltiples proveedores de mapas
 * (OpenStreetMap, ESRI Satellite, Google Maps, Mapbox) de forma intercambiable.
 */

class IMapAdapter {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = new Set();
        this.events = {};
    }

    init(options) { throw new Error("init() not implemented"); }
    addMarker(lat, lng, options) { throw new Error("addMarker() not implemented"); }
    removeMarker(marker) { throw new Error("removeMarker() not implemented"); }
    setCenter(lat, lng, zoom) { throw new Error("setCenter() not implemented"); }
    flyTo(lat, lng, zoom) { throw new Error("flyTo() not implemented"); }
    getCenter() { throw new Error("getCenter() not implemented"); }
    getZoom() { throw new Error("getZoom() not implemented"); }
    on(event, callback) { throw new Error("on() not implemented"); }
    destroy() { throw new Error("destroy() not implemented"); }
}

/**
 * ADAPTADOR PARA LEAFLET (Implementación Base)
 */
class LeafletAdapter extends IMapAdapter {
    init(options = {}) {
        const { center = [-1.8312, -78.1834], zoom = 6, maxBounds, minZoom = 6 } = options;
        
        this.map = L.map(this.containerId, {
            zoomControl: false,
            maxBounds: maxBounds,
            maxBoundsViscosity: 1.0,
            minZoom: minZoom
        }).setView(center, zoom);

        this.setBaseLayer();
        
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);
        return this;
    }

    setBaseLayer() {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 3,
            crossOrigin: true
        }).addTo(this.map);
    }

    addMarker(lat, lng, options = {}) {
        const marker = L.marker([lat, lng], options).addTo(this.map);
        this.markers.add(marker);
        return marker;
    }

    removeMarker(marker) {
        if (marker && this.map) {
            this.map.removeLayer(marker);
            this.markers.delete(marker);
        }
    }

    setCenter(lat, lng, zoom) {
        this.map.setView([lat, lng], zoom || this.map.getZoom());
    }

    flyTo(lat, lng, zoom) {
        this.map.flyTo([lat, lng], zoom || 12);
    }

    getCenter() {
        return this.map.getCenter();
    }

    getZoom() {
        return this.map.getZoom();
    }

    on(event, callback) {
        this.map.on(event, callback);
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.markers.clear();
        }
    }
}

/**
 * ADAPTADOR PARA LEAFLET CON ESRI SATELLITE (Híbrido)
 */
class EsriSatelliteAdapter extends LeafletAdapter {
    setBaseLayer() {
        // Capa Satélite
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            updateWhenIdle: true,
            keepBuffer: 5,
            crossOrigin: true
        });

        // Capa Híbrida (Etiquetas de calles y lugares)
        const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Labels &copy; Esri',
            opacity: 0.8,
            updateWhenIdle: true,
            keepBuffer: 3,
            crossOrigin: true
        });

        satellite.addTo(this.map);
        labels.addTo(this.map);
    }
}

/**
 * PROVEEDOR GLOBAL DE MAPAS (Manager)
 */
const MapProvider = {
    currentProviderName: 'default',
    instances: {},
    activeAdapter: null,
    
    // Configuración inicial
    config: {
        containerId: 'map-background',
        options: {}
    },

    init(name, options = {}) {
        this.config.options = options;
        return this.switchProvider(name);
    },

    switchProvider(name) {
        console.log(`Cambiando a proveedor de mapa: ${name}`);
        
        let center = [-1.8312, -78.1834];
        let zoom = 6;
        let markersData = [];

        // Guardar estado actual si existe
        if (this.activeAdapter) {
            center = this.activeAdapter.getCenter();
            zoom = this.activeAdapter.getZoom();
            
            // Nota: En una implementación real más compleja guardaríamos todos los marcadores
            // Para este caso, script.js maneja sus propios marcadores globales, así que 
            // solo necesitamos reiniciarlos después del switch.
            
            this.activeAdapter.destroy();
        }

        // Crear nuevo adaptador
        if (name === 'satellite') {
            this.activeAdapter = new EsriSatelliteAdapter(this.config.containerId);
        } else {
            this.activeAdapter = new LeafletAdapter(this.config.containerId);
        }

        this.currentProviderName = name;
        this.activeAdapter.init({ ...this.config.options, center, zoom });
        
        // Disparar evento de cambio para que script.js re-registre eventos
        const event = new CustomEvent('mapProviderChanged', { detail: { name, adapter: this.activeAdapter } });
        window.dispatchEvent(event);

        return this.activeAdapter;
    },

    toggle() {
        const next = this.currentProviderName === 'default' ? 'satellite' : 'default';
        return this.switchProvider(next);
    },

    // Unified functions for the system
    addMarker(lat, lng, options = {}) {
        return this.activeAdapter ? this.activeAdapter.addMarker(lat, lng, options) : null;
    },

    setCenter(lat, lng, zoom) {
        if (this.activeAdapter) this.activeAdapter.setCenter(lat, lng, zoom);
    },

    flyTo(lat, lng, zoom) {
        if (this.activeAdapter) this.activeAdapter.flyTo(lat, lng, zoom);
    },

    removeMarker(marker) {
        if (this.activeAdapter) this.activeAdapter.removeMarker(marker);
    },

    clearMap() {
        if (this.activeAdapter && this.activeAdapter.markers) {
            this.activeAdapter.markers.forEach(m => this.removeMarker(m));
        }
    }
};
