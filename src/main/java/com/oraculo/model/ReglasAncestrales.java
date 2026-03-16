package com.oraculo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class ReglasAncestrales {
    private Meta meta;
    private Map<String, NacionalidadRegla> reglas;

    public Meta getMeta() { return meta; }
    public void setMeta(Meta meta) { this.meta = meta; }

    public Map<String, NacionalidadRegla> getReglas() { return reglas; }
    public void setReglas(Map<String, NacionalidadRegla> reglas) { this.reglas = reglas; }

    public static class Meta {
        private String descripcion;
        private String version;
        @JsonProperty("fuente_cultural")
        private String fuenteCultural;

        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
        public String getFuenteCultural() { return fuenteCultural; }
        public void setFuenteCultural(String fuenteCultural) { this.fuenteCultural = fuenteCultural; }
    }
}
