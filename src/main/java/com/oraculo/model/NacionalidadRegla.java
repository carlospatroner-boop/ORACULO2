package com.oraculo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class NacionalidadRegla {
    private String descripcion;
    @JsonProperty("fases_lunares")
    private Map<String, Map<String, Recomendacion>> fasesLunares;

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Map<String, Map<String, Recomendacion>> getFasesLunares() { return fasesLunares; }
    public void setFasesLunares(Map<String, Map<String, Recomendacion>> fasesLunares) { this.fasesLunares = fasesLunares; }
}
