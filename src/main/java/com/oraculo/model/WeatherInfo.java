package com.oraculo.model;

public class WeatherInfo {
    private String condition;
    private double temperature;
    private String moonPhase;

    public WeatherInfo() {}

    public WeatherInfo(String condition, double temperature, String moonPhase) {
        this.condition = condition;
        this.temperature = temperature;
        this.moonPhase = moonPhase;
    }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }

    public String getMoonPhase() { return moonPhase; }
    public void setMoonPhase(String moonPhase) { this.moonPhase = moonPhase; }
}
