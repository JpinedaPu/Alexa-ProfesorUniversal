/**
 * @module userHistory
 * @description Sistema de historial de preguntas del usuario en DynamoDB.
 * Guarda las últimas 5 preguntas por usuario para comando "repite mi última pregunta".
 * @version 1.0.0
 * @author JpinedaPu
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'ProfesorUniversal-UserHistory';
const MAX_HISTORY = 5; // Últimas 5 preguntas
const TTL_DAYS = 90; // Expirar usuarios inactivos tras 90 días

/**
 * Guarda una pregunta en el historial del usuario
 * @param {string} userId - ID de usuario de Alexa
 * @param {string} pregunta - Pregunta realizada
 * @param {string} keyword - Keyword extraída
 * @returns {Promise<void>}
 */
async function guardarPregunta(userId, pregunta, keyword) {
    try {
        // Filtrar comandos de control que no son preguntas educativas
        const comandosControl = /^(finaliza|para|detente|cancela|ayuda|stop|cancel|help|modo oscuro|modo claro|susurra|voz normal|acerca|aleja)$/i;
        if (comandosControl.test(pregunta.trim())) {
            console.log(`[HISTORY] ⏭️ Comando de control ignorado: "${pregunta}"`);
            return;
        }
        
        // Obtener historial actual
        const result = await dynamoDB.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        }));
        
        let historial = result.Item?.historial || [];
        
        // Agregar nueva pregunta al inicio
        historial.unshift({
            pregunta,
            keyword,
            timestamp: new Date().toISOString()
        });
        
        // Mantener solo las últimas MAX_HISTORY preguntas
        if (historial.length > MAX_HISTORY) {
            historial = historial.slice(0, MAX_HISTORY);
        }
        
        // Guardar historial actualizado
        const ttl = Math.floor(Date.now() / 1000) + (TTL_DAYS * 24 * 3600);
        await dynamoDB.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                userId,
                historial,
                lastUpdated: new Date().toISOString(),
                ttl
            }
        }));
        
        console.log(`[HISTORY] 💾 Pregunta guardada | User: ${userId.substring(0, 20)}... | Total: ${historial.length}`);
    } catch (err) {
        console.error('[HISTORY] Error guardando pregunta:', err.message);
    }
}

/**
 * Obtiene el historial de preguntas del usuario
 * @param {string} userId - ID de usuario de Alexa
 * @returns {Promise<Array>} Array de preguntas
 */
async function obtenerHistorial(userId) {
    try {
        const result = await dynamoDB.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        }));
        
        const historial = result.Item?.historial || [];
        console.log(`[HISTORY] 📖 Historial recuperado | User: ${userId.substring(0, 20)}... | Preguntas: ${historial.length}`);
        return historial;
    } catch (err) {
        console.error('[HISTORY] Error obteniendo historial:', err.message);
        return [];
    }
}

/**
 * Obtiene la última pregunta del usuario
 * @param {string} userId - ID de usuario de Alexa
 * @returns {Promise<Object|null>} Última pregunta o null
 */
async function obtenerUltimaPregunta(userId) {
    try {
        const historial = await obtenerHistorial(userId);
        if (historial.length > 0) {
            console.log(`[HISTORY] ⏮️ Última pregunta: "${historial[0].pregunta}"`);
            return historial[0];
        }
        return null;
    } catch (err) {
        console.error('[HISTORY] Error obteniendo última pregunta:', err.message);
        return null;
    }
}

module.exports = {
    guardarPregunta,
    obtenerHistorial,
    obtenerUltimaPregunta
};
