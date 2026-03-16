# 🌞 Oráculo Bioclimático 🌚

> **Motor de recomendaciones ancestrales** que cruza datos meteorológicos reales con calendarios lunares y saberes milenarios del Ecuador.

[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Maven](https://img.shields.io/badge/Maven-3.x-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)](https://maven.apache.org/)
[![OpenWeatherMap](https://img.shields.io/badge/API-OpenWeatherMap-orange?style=for-the-badge&logo=icloud&logoColor=white)](https://openweathermap.org/)
[![License](https://img.shields.io/badge/Licencia-Académico-blue?style=for-the-badge)]()

---

## 📋 Descripción

**Oráculo Bioclimático** es un sistema que integra tres fuentes de datos para generar recomendaciones culturales contextualizadas:

| Fuente | Descripción |
|--------|-------------|
| 🌡️ **Clima en tiempo real** | Datos meteorológicos vía API de OpenWeatherMap |
| 🌙 **Fases lunares** | Cálculo astronómico basado en el algoritmo de Conway |
| 📜 **Saberes ancestrales** | Base de reglas de 5 nacionalidades ecuatorianas codificada en JSON |

El sistema indica qué actividades estarían realizando los ancestros de una etnia determinada **hoy**, basándose en el clima y la fase lunar actual. Las recomendaciones abarcan:

- 🌱 **Labores de tierra** (siembra, cosecha, pesca)
- 🔥 **Rituales y danzas**
- 👕 **Vestimenta tradicional**
- 🍲 **Gastronomía**
- 🌿 **Medicina ancestral**

### Nacionalidades soportadas

| Nacionalidad | Región |
|---|---|
| Kichwa | Sierra |
| Shuar | Amazonía |
| Montubio | Costa |
| Afroecuatoriano | Costa Norte / Valle |
| Galapagueño | Región Insular |

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────┐
│                     USUARIO                          │
│              (Web Browser / CLI)                     │
└──────────────┬───────────────────┬───────────────────┘
               │                   │
       ┌───────▼──────┐    ┌──────▼───────┐
       │  Frontend     │    │   Main.java  │
       │  (HTML/JS)    │    │ (EntryPoint) │
       └───────┬───────┘    └──────┬───────┘
               │                   │
       ┌───────▼───────────────────▼───────┐
       │     OraculoRESTServer.java         │
       │     (Javalin API - Puerto 8080)    │
       └───────┬───────────────────┬───────┘
               │                   │
    ┌──────────▼──────┐   ┌───────▼──────────┐
    │ WeatherService   │   │ OraculoService    │
    │ (OpenWeatherMap  │   │ (Motor Jackson    │
    │  + Fase Lunar)   │   │  POJO mapping)    │
    └─────────────────┘   └────────┬──────────┘
                                   │
                          ┌────────▼──────────┐
                          │ reglas_ancestrales │
                          │     .json          │
                          └───────────────────┘
```

---

## 📁 Estructura del Proyecto

```
ORACULO2/
├── src/main/java/com/oraculo/
│   ├── Main.java                 # Punto de entrada
│   ├── api/                      # Controladores Javalin
│   ├── service/                  # Lógica (Clima y Oráculo)
│   └── model/                    # Modelos de datos (Jackson POJOs)
├── web/
│   ├── index.html                # Interfaz Web
│   ├── style.css                 # Estilos Glassmorphic
│   └── script.js                 # Lógica Cliente
├── reglas_ancestrales.json       # Base de datos JSON
└── pom.xml                       # Dependencias (Javalin, Jackson)
```

---

## 🚀 Instalación y Ejecución

### Prerrequisitos

- **Java 17** o superior ([Descargar JDK](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html))
- **Apache Maven** ([Descargar Maven](https://maven.apache.org/download.cgi))
- **API Key de OpenWeatherMap** ([Obtener gratis](https://openweathermap.org/api))

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/ORACULO2.git
   cd ORACULO2
   ```

2. **Compilar con Maven**
   ```bash
   mvn compile
   ```

3. **Ejecutar el servidor**
   ```bash
   mvn compile exec:java -Dexec.mainClass="com.oraculo.Main"
   ```
   El servidor se iniciará en `http://localhost:8080`

---

## 🔌 API REST

### Endpoint de consulta

```
GET /api/consultar?ciudad={ciudad}&nacionalidad={nacionalidad}
```

**Parámetros:**

| Parámetro | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `ciudad` | String | Ciudad del Ecuador | `Quito` |
| `nacionalidad` | String | Nacionalidad ancestral | `Kichwa` |

**Ejemplo de respuesta:**

```json
{
  "clima": {
    "temp": 18.5,
    "condicion": "Clear",
    "fase_lunar": "Luna Creciente"
  },
  "recomendacion": {
    "labores_tierra": "Preparar la tierra para siembra de maíz y quinua",
    "rituales_danzas": "Danza del Inti Raymi en agradecimiento",
    "vestimenta": "Poncho de lana y sombrero",
    "gastronomia": "Colada de machica con panela",
    "medicina": "Infusión de manzanilla y cedrón"
  }
}
```

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| Java 17 | Backend y lógica de negocio |
| HttpServer (nativo) | Servidor REST embebido |
| OpenWeatherMap API | Datos meteorológicos en tiempo real |
| HTML5 / CSS3 / JS | Frontend web |
| Jackson 2.15.2 | Procesamiento JSON |
| Javalin 5.6.1 | Framework web ligero |
| Maven | Gestión de dependencias y build |
| Git | Control de versiones |

---

## 👥 Equipo de Desarrollo — Grupo 4

| Integrante |
|---|
| Carpio Mendoza Carlos José |
| Cruz Pérez Justyn Keith |
| Mendoza Bermello Angello Agustín |
| Mendoza Moreira Andy Emanuel |
| Zambrano Yong Ángel Daniel |

**Universidad Técnica Estatal de Quevedo**  
Facultad de Ciencias de la Computación y Diseño Digital  
Asignatura: Proceso de Software  
Docente: Ing. Cordero Bazurto Jose Steven

---

## 📄 Licencia

Proyecto académico desarrollado para la asignatura de Proceso de Software — UTEQ 2026.

---

<p align="center">
  <i>Conectando saberes milenarios con tecnología contemporánea 🌎</i>
</p>
