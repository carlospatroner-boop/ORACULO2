package com.oraculo.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Recomendacion {
    @JsonProperty("labores_tierra")
    private String laboresTierra;
    @JsonProperty("rituales_danzas")
    private String ritualesDanzas;
    private String vestimenta;
    private String gastronomia;
    private String medicina;

    public Recomendacion() {}

    public Recomendacion(String laboresTierra, String ritualesDanzas, String vestimenta, String gastronomia, String medicina) {
        this.laboresTierra = laboresTierra;
        this.ritualesDanzas = ritualesDanzas;
        this.vestimenta = vestimenta;
        this.gastronomia = gastronomia;
        this.medicina = medicina;
    }

    public String getLaboresTierra() { return laboresTierra; }
    public void setLaboresTierra(String laboresTierra) { this.laboresTierra = laboresTierra; }

    public String getRitualesDanzas() { return ritualesDanzas; }
    public void setRitualesDanzas(String ritualesDanzas) { this.ritualesDanzas = ritualesDanzas; }

    public String getVestimenta() { return vestimenta; }
    public void setVestimenta(String vestimenta) { this.vestimenta = vestimenta; }

    public String getGastronomia() { return gastronomia; }
    public void setGastronomia(String gastronomia) { this.gastronomia = gastronomia; }

    public String getMedicina() { return medicina; }
    public void setMedicina(String medicina) { this.medicina = medicina; }
}
