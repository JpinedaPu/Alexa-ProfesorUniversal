/**
 * @fileoverview Sistema de caché LRU (Least Recently Used) para optimizar respuestas educativas.
 * Implementa caché en memoria con TTL y límite de tamaño para evitar memory leaks.
 * Mantiene automáticamente el rendimiento eliminando entradas menos usadas.
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

// utils/cache.js
// LRU Cache con límite de tamaño para evitar memory leaks

/**
 * Implementación de LRU (Least Recently Used) Cache
 * Mantiene automáticamente el tamaño del cache dentro del límite
 * eliminando las entradas menos recientemente usadas.
 * 
 * @class LRUCache
 */
class LRUCache {
    /**
     * @param {number} maxSize - Número máximo de entradas en el cache
     */
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    /**
     * Obtiene un valor del cache y lo marca como recientemente usado
     * @param {string} key - Clave del cache
     * @returns {*} Valor almacenado o undefined si no existe
     */
    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        // Mover al final (más reciente)
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    
    /**
     * Almacena un valor en el cache
     * Si el cache está lleno, elimina la entrada más antigua
     * @param {string} key - Clave del cache
     * @param {*} value - Valor a almacenar
     */
    set(key, value) {
        if (this.cache.has(key)) {
            // Si ya existe, eliminarlo para re-insertarlo al final
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Si está lleno, eliminar el más antiguo (primero)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log(`[CACHE] Límite alcanzado, eliminando entrada antigua: ${firstKey.substring(0, 30)}...`);
        }
        this.cache.set(key, value);
    }
    
    /**
     * Elimina una entrada del cache
     * @param {string} key - Clave a eliminar
     * @returns {boolean} true si se eliminó, false si no existía
     */
    delete(key) {
        return this.cache.delete(key);
    }
    
    /**
     * Limpia todo el cache
     */
    clear() {
        this.cache.clear();
        console.log('[CACHE] Cache limpiado completamente');
    }
    
    /**
     * Obtiene el tamaño actual del cache
     * @returns {number} Número de entradas en el cache
     */
    size() {
        return this.cache.size;
    }
    
    /**
     * Verifica si una clave existe en el cache
     * @param {string} key - Clave a verificar
     * @returns {boolean} true si existe
     */
    has(key) {
        return this.cache.has(key);
    }
}

// Instancia global del cache con límite de 100 entradas para optimizar memoria
const CACHE = new LRUCache(100);
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos - balance entre frescura y rendimiento

/**
 * Obtiene un valor del cache verificando su TTL.
 * Elimina automáticamente entradas expiradas para mantener el cache limpio.
 * 
 * @param {string} cacheKey - Clave del cache
 * @returns {*} Valor almacenado o null si no existe o expiró
 */
function getFromCache(cacheKey) {
    const entry = CACHE.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        console.log(`[CACHE] HIT: ${cacheKey.substring(0, 30)}... (${CACHE.size()}/${CACHE.maxSize} entradas)`);
        return entry;
    }
    if (entry) {
        // Entrada expirada, eliminarla para liberar memoria
        CACHE.delete(cacheKey);
        console.log(`[CACHE] EXPIRED: ${cacheKey.substring(0, 30)}...`);
    } else {
        console.log(`[CACHE] MISS: ${cacheKey.substring(0, 30)}...`);
    }
    return null;
}

/**
 * Almacena un valor en el cache con timestamp para TTL.
 * El LRU automáticamente elimina entradas antiguas si se alcanza el límite.
 * 
 * @param {string} cacheKey - Clave del cache
 * @param {*} value - Valor a almacenar
 */
function setCache(cacheKey, value) {
    CACHE.set(cacheKey, { ...value, timestamp: Date.now() });
    console.log(`[CACHE] SET: ${cacheKey.substring(0, 30)}... (${CACHE.size()}/${CACHE.maxSize} entradas)`);
}

/**
 * Función legacy para compatibilidad
 * El LRU Cache ya maneja automáticamente el límite de tamaño
 * @param {number} maxEntries - Límite máximo (ignorado, usa el del constructor)
 */
function cleanOldestCache(maxEntries = 100) {
    // Ya no es necesario, LRU Cache lo maneja automáticamente
    console.log(`[CACHE] Tamaño actual: ${CACHE.size()}/${CACHE.maxSize} entradas`);
}

module.exports = { getFromCache, setCache, cleanOldestCache, CACHE_TTL };