package com.oraculo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oraculo.model.WeatherInfo;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class WeatherService {
    private static final String API_KEY = "ed837b064312b708aa0afe18c2b91aca";
    private static final String BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public WeatherService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    public WeatherInfo getWeatherAndMoonPhase(String city) {
        try {
            WeatherInfo weatherInfo = fetchWeatherData(city);
            weatherInfo.setMoonPhase(calculateMoonPhase(LocalDate.now()));
            return weatherInfo;
        } catch (Exception e) {
            System.err.println("Error obteniendo clima para " + city + ": " + e.getMessage());
            return new WeatherInfo("Error", 0.0, "Desconocida");
        }
    }

    private WeatherInfo fetchWeatherData(String city) throws Exception {
        String encodedCity = URLEncoder.encode(city, StandardCharsets.UTF_8);
        String url = String.format("%s?q=%s,EC&appid=%s&units=metric&lang=es", BASE_URL, encodedCity, API_KEY);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            // Fallback sin ,EC
            url = String.format("%s?q=%s&appid=%s&units=metric&lang=es", BASE_URL, encodedCity, API_KEY);
            request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() != 200) {
                throw new Exception("Status code: " + response.statusCode());
            }
        }

        JsonNode root = objectMapper.readTree(response.body());
        String condition = root.path("weather").get(0).path("main").asText();
        double temp = root.path("main").path("temp").asDouble();

        return new WeatherInfo(condition, temp, "");
    }

    private String calculateMoonPhase(LocalDate date) {
        LocalDate knownNewMoon = LocalDate.of(2024, 1, 11);
        long daysSinceNewMoon = ChronoUnit.DAYS.between(knownNewMoon, date);
        double lunarCycle = 29.53;
        double currentCycleDay = daysSinceNewMoon % lunarCycle;
        if (currentCycleDay < 0) currentCycleDay += lunarCycle;

        if (currentCycleDay < 1.8) return "Luna Nueva";
        if (currentCycleDay < 9.2) return "Luna Creciente";
        if (currentCycleDay < 16.6) return "Luna Llena";
        if (currentCycleDay < 24.0) return "Luna Menguante";
        return "Luna Nueva";
    }
}
