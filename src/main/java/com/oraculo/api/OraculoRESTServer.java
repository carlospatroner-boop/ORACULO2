package com.oraculo.api;

import io.javalin.Javalin;
import com.oraculo.service.OraculoService;
import com.oraculo.service.WeatherService;
import com.oraculo.model.WeatherInfo;
import com.oraculo.model.Recomendacion;

import java.util.Map;

public class OraculoRESTServer {
    private static final int PORT = 8080;

    public static void main(String[] args) {
        WeatherService weatherService = new WeatherService();
        OraculoService oraculoService = new OraculoService();

        Javalin app = Javalin.create(config -> {
            config.plugins.enableCors(cors -> {
                cors.add(it -> it.anyHost());
            });
        }).start(PORT);

        // Endpoint: /api/consultar?ciudad=Quito&nacionalidad=Kichwa
        app.get("/api/consultar", ctx -> {
            String ciudad = ctx.queryParamAsClass("ciudad", String.class).getOrDefault("Quito");
            String nacionalidad = ctx.queryParamAsClass("nacionalidad", String.class).getOrDefault("Kichwa");

            System.out.println("📥 Consulta: " + ciudad + " | " + nacionalidad);

            WeatherInfo clima = weatherService.getWeatherAndMoonPhase(ciudad);
            Recomendacion rec = oraculoService.generarRecomendacion(clima, nacionalidad);

            ctx.json(Map.of(
                "clima", clima,
                "recomendacion", rec
            ));
        });

        System.out.println("🚀 Servidor Oráculo Ancestral (v2) iniciado en http://localhost:" + PORT);
    }
}
