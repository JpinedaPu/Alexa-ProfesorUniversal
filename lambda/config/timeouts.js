/**
 * @fileoverview Configuración de timeouts para servicios externos del Profesor Universal IA.
 * Define límites de tiempo optimizados para cada servicio basados en análisis de rendimiento
 * y requisitos de experiencia de usuario (respuesta < 8 segundos).
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

module.exports = {
    // Timeouts para servicios de IA principales
    WOLFRAM_TIMEOUT: 5500,              // Wolfram Alpha - permite cálculos complejos
    CLAUDE_TIMEOUT: 3500,               // Claude Bedrock - síntesis educativa
    GEMINI_TIMEOUT: 5000,               // Google Gemini - datos actualizados
    OPENAI_TIMEOUT: 3000,               // OpenAI GPT - keyword extraction
    
    // Timeouts para fuentes de conocimiento
    WIKI_TIMEOUT: 1200,                 // Wikipedia - respuesta rápida esperada
    NASA_TIMEOUT: 4000,                 // NASA API - imágenes científicas
    WIKIMEDIA_TIMEOUT: 3000,            // Wikimedia Commons - imágenes complementarias
    
    // Timeouts para servicios de soporte
    LOCATION_TIMEOUT: 800,              // Alexa Location API - datos del dispositivo
    TRANSLATION_TIMEOUT: 1500,          // Servicio de traducción - títulos visuales
    
    // Timeouts para sistemas de caché
    S3_CACHE_TIMEOUT: 800,              // Amazon S3 - caché persistente
    DYNAMO_CACHE_TIMEOUT: 1000,         // DynamoDB - historial de usuario
    
    // Timeouts para procesamiento de lenguaje
    KEYWORD_EXTRACTION_TIMEOUT: 1700,   // Extracción de keyword principal
    RECONSTRUCTION_TIMEOUT: 1200,       // Reconstrucción de preguntas ambiguas
    IMAGES_EXTRA_TIMEOUT: 5500          // Búsqueda de imágenes complementarias
};
