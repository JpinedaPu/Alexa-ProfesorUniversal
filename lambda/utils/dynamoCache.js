/**
 * @module dynamoCache
 * @description Sistema de caché inteligente para Wolfram Step-by-Step usando DynamoDB.
 * Almacena la respuesta COMPLETA de Wolfram y pagina de 3 en 3 sin llamadas duplicadas.
 * @version 1.0.0
 * @author JpinedaPu
 */

// Para Alexa Hosted Skills, AWS SDK v2 está disponible por defecto
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const TABLE_NAME = 'ProfesorUniversal-StepByStep';
const TTL_HOURS = 24; // Expiración de caché en horas

/**
 * Busca una sesión de step-by-step en caché
 * @param {string} sessionId - ID de sesión de Alexa
 * @param {string} userId - ID de usuario de Alexa
 * @returns {Promise<Object|null>} Datos de la sesión o null si no existe
 */
async function buscarSessionCache(sessionId, userId) {
    try {
        const result = await dynamoDB.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { sessionId, userId }
        }));
        
        if (result.Item) {
            console.log(`[CACHE] ✅ HIT | Session: ${sessionId.substring(0, 20)}... | Page: ${result.Item.currentPage}`);
            return result.Item;
        }
        
        console.log(`[CACHE] ❌ MISS | Session: ${sessionId.substring(0, 20)}...`);
        return null;
    } catch (err) {
        console.error('[CACHE] Error buscando session:', err.message);
        return null;
    }
}

/**
 * Guarda una nueva sesión de step-by-step en caché
 * @param {Object} data - Datos de la sesión
 * @returns {Promise<void>}
 */
async function guardarSessionCache(data) {
    try {
        const ttl = Math.floor(Date.now() / 1000) + (TTL_HOURS * 3600);
        
        await dynamoDB.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: Object.assign({}, data, {
                ttl: ttl,
                apiCallsSaved: 0,
                createdAt: new Date().toISOString()
            })
        }));
        
        console.log(`[CACHE] 💾 SAVED | Session: ${data.sessionId.substring(0, 20)}... | Steps: ${data.wolframResponse.totalSteps} | TTL: ${TTL_HOURS}h`);
    } catch (err) {
        console.error('[CACHE] Error guardando session:', err.message);
    }
}

/**
 * Actualiza la página actual de una sesión
 * @param {string} sessionId - ID de sesión
 * @param {string} userId - ID de usuario
 * @param {number} newPage - Nueva página
 * @returns {Promise<void>}
 */
async function actualizarPaginaCache(sessionId, userId, newPage) {
    try {
        await dynamoDB.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { sessionId, userId },
            UpdateExpression: 'SET currentPage = :page, apiCallsSaved = apiCallsSaved + :inc',
            ExpressionAttributeValues: {
                ':page': newPage,
                ':inc': 1
            }
        }));
        
        console.log(`[CACHE] 📄 PAGE UPDATE | Session: ${sessionId.substring(0, 20)}... | New page: ${newPage} | API calls saved: +1`);
    } catch (err) {
        console.error('[CACHE] Error actualizando página:', err.message);
    }
}

module.exports = {
    buscarSessionCache,
    guardarSessionCache,
    actualizarPaginaCache
};
