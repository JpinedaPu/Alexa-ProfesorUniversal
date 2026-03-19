/**
 * @fileoverview Constantes de configuración centralizadas para el Profesor Universal IA.
 * Define límites, timeouts, configuraciones de servicios y parámetros de rendimiento
 * para mantener la consistencia y facilitar el mantenimiento.
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

module.exports = {
    // Configuración del sistema de caché multinivel
    CACHE: {
        LRU_MAX_SIZE: 100,                    // Máximo de entradas en caché LRU en memoria
        LRU_TTL_MS: 5 * 60 * 1000,           // TTL de 5 minutos para balance frescura/rendimiento
        DYNAMO_TTL_HOURS: 24,                // TTL de 24 horas en DynamoDB para persistencia
        S3_PREFIX: 'wolfram-conceptual/',     // Prefijo para organizar objetos en S3
        S3_BUCKET: 'alexa-profesor-universal-cache-us-east-1' // Bucket S3 para caché de larga duración
    },
    
    // Límites de Wolfram Alpha para optimizar respuestas
    WOLFRAM: {
        MAX_PODS_PER_TURN: 3,                // Máximo de pods por consulta para evitar sobrecarga
        MAX_IMAGES: 20,                      // Límite de imágenes para rendimiento APL
        MAX_TEXT_LENGTH: 1200,               // Límite de texto para síntesis eficiente
        SUBPOD_TEXT_LIMIT: 300,              // Límite por subpod para lectura fluida
        IMAGE_MIN_WIDTH: 100                 // Ancho mínimo para filtrar imágenes de baja calidad
    },
    
    // Configuración de Claude para síntesis educativa
    CLAUDE: {
        MODEL: 'claude-haiku-4-5',           // Modelo optimizado para respuestas rápidas
        MAX_TOKENS: 1024,                    // Límite de tokens para respuestas concisas
        TEMPERATURE: 0.3,                    // Temperatura baja para consistencia educativa
        MAX_HISTORY_MESSAGES: 4              // Contexto de conversación limitado para eficiencia
    },
    
    // Configuración de búsqueda de imágenes educativas
    IMAGES: {
        NASA_MAX_RESULTS: 15,                // Límite de imágenes NASA para temas científicos
        WIKIMEDIA_MAX_RESULTS: 5,            // Límite de imágenes Wikimedia para complemento
        MAX_TOTAL_IMAGES: 30,                // Total máximo de imágenes por consulta
        MIN_WIDTH: 200,                      // Ancho mínimo para calidad visual
        MIN_HEIGHT: 100                      // Alto mínimo para legibilidad
    },
    
    // Configuración de interfaz de usuario APL
    UI: {
        DEFAULT_ZOOM_LEVEL: 85,              // Nivel de zoom por defecto para legibilidad
        ZOOM_STEP: 15,                       // Incremento de zoom para accesibilidad
        MIN_ZOOM: 30,                        // Zoom mínimo para evitar texto ilegible
        MAX_ZOOM: 150                        // Zoom máximo para evitar desbordamiento
    },
    
    // Validación de entrada del usuario
    INPUT: {
        MAX_QUESTION_LENGTH: 500,            // Límite de caracteres para evitar timeouts
        MIN_QUESTION_LENGTH: 2,              // Mínimo para preguntas válidas
        MAX_KEYWORD_LENGTH: 100              // Límite de keyword para búsquedas eficientes
    },
    
    // Configuración de rendimiento y timeouts
    PERFORMANCE: {
        GLOBAL_DEADLINE_MS: 7700,            // Deadline global para respuesta de Lambda
        PROGRESSIVE_RESPONSE_DELAY_MS: 2000  // Delay antes de enviar Progressive Response
    }
};
