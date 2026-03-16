package com.oraculo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oraculo.model.NacionalidadRegla;
import com.oraculo.model.Recomendacion;
import com.oraculo.model.ReglasAncestrales;
import com.oraculo.model.WeatherInfo;

import java.io.File;
import java.io.IOException;
import java.util.Map;

public class OraculoService {
    private static final String JSON_PATH = "reglas_ancestrales.json";
    private final ObjectMapper objectMapper;
    private ReglasAncestrales reglas;

    public OraculoService() {
        this.objectMapper = new ObjectMapper();
        cargarReglas();
    }

    private void cargarReglas() {
        try {
            File file = new File(JSON_PATH);
            if (!file.exists()) {
                file = new File(System.getProperty("user.dir"), JSON_PATH);
            }
            this.reglas = objectMapper.readValue(file, ReglasAncestrales.class);
            System.out.println("✅ Reglas ancestrales cargadas correctamente.");
        } catch (IOException e) {
            System.err.println("❌ Error cargando reglas ancestrales: " + e.getMessage());
        }
    }

    public Recomendacion generarRecomendacion(WeatherInfo clima, String nacionalidad) {
        if (reglas == null || reglas.getReglas() == null) {
            return fallbackRecomendacion(nacionalidad);
        }

        NacionalidadRegla nacRegla = reglas.getReglas().get(nacionalidad);
        if (nacRegla == null) {
            return fallbackRecomendacion(nacionalidad);
        }

        String faseLunar = clima.getMoonPhase();
        String condicionClima = mapCondition(clima.getCondition());

        Map<String, Recomendacion> recomendacionesFase = nacRegla.getFasesLunares().get(faseLunar);
        if (recomendacionesFase != null) {
            Recomendacion rec = recomendacionesFase.get(condicionClima);
            if (rec != null) return rec;
        }

        return fallbackRecomendacion(nacionalidad);
    }

    private String mapCondition(String condition) {
        if (condition == null) return "Despejado";
        return switch (condition.toLowerCase()) {
            case "rain", "drizzle", "thunderstorm", "snow" -> "Lluvia";
            default -> "Despejado";
        };
    }

    private Recomendacion fallbackRecomendacion(String nacionalidad) {
        return new Recomendacion(
            "Observar la naturaleza y actuar con prudencia.",
            "Conexión personal con los elementos.",
            "Ropa cómoda y adecuada al clima.",
            "Alimentos de temporada.",
            "Descanso y reflexión."
        );
    }
}
