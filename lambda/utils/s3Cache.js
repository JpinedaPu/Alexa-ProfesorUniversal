const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { analizarCacheabilidad, generarCacheKey } = require('./cacheabilityAnalyzer');
const { CACHE } = require('../config/constants');

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = 'alexa-profesor-universal-cache-us-east-1';
const CACHE_PREFIX = CACHE.S3_PREFIX;

/**
 * Busca respuesta de Wolfram en caché S3
 * @param {string} cacheKey - Clave de caché
 * @returns {Promise<Object|null>} Datos cacheados o null
 */
async function buscarEnCache(cacheKey) {
    try {
        const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: `${CACHE_PREFIX}${cacheKey}.json` }));
        const body = await response.Body.transformToString();
        const cached = JSON.parse(body);
        console.log(`[S3-CACHE] ✅ HIT | Key: ${cacheKey.substring(0, 30)}... | Age: ${Math.floor((Date.now() - new Date(cached.timestamp).getTime()) / 1000 / 60)}min`);
        return cached.data;
    } catch (err) {
        if (err.name === 'NoSuchKey') {
            console.log(`[S3-CACHE] ❌ MISS | Key: ${cacheKey.substring(0, 30)}...`);
        } else {
            console.error('[S3-CACHE] Error leyendo caché:', err.message);
        }
        return null;
    }
}

/**
 * Guarda respuesta de Wolfram en caché S3
 * @param {string} cacheKey - Clave de caché
 * @param {string} pregunta - Pregunta original
 * @param {Object} data - Datos a cachear
 * @returns {Promise<void>}
 */
async function guardarEnCache(cacheKey, pregunta, data) {
    try {
        const cacheData = {
            timestamp: new Date().toISOString(),
            pregunta,
            data
        };
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${CACHE_PREFIX}${cacheKey}.json`,
            Body: JSON.stringify(cacheData),
            ContentType: 'application/json'
        }));
        const imageCount = (data.imagenes && data.imagenes.length) || 0;
        console.log(`[S3-CACHE] 💾 SAVED | Key: ${cacheKey.substring(0, 30)}... | Images: ${imageCount}`);
    } catch (err) {
        console.error('[S3-CACHE] Error guardando caché:', err.message);
    }
}

module.exports = { analizarCacheabilidad, buscarEnCache, guardarEnCache, generarCacheKey };
