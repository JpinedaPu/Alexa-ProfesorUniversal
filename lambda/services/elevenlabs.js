/**
 * elevenlabs.js
 * Genera audio premium con ElevenLabs para las 7 Artes Liberales
 * Trivium: Gramática, Retórica, Lógica
 * Quadrivium: Aritmética, Geometría, Música, Astronomía
 */

const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET = 'alexa-profesor-universal-cache-us-east-1';

// Voces especializadas por arte liberal + Maestro Masón
// Solo voces gratuitas disponibles en ElevenLabs Free Tier
const VOCES_ARTES = {
  // Trivium (Artes del Lenguaje)
  gramatica: 'ErXwobaYiN019PkySvjV',  // Antoni - analítico, preciso (fallback de Rachel)
  retorica: 'pNInz6obpgDQGcFmaJgB',   // Adam - narrativo, persuasivo ✅
  logica: 'ErXwobaYiN019PkySvjV',     // Antoni - analítico, preciso ✅
  
  // Quadrivium (Artes Matemáticas)
  aritmetica: 'VR6AewLTigWG4xSOukaG', // Arnold - metódico, estructurado ✅
  geometria: 'EXAVITQu4vr4xnSDxMaL',  // Bella - visual, descriptiva ✅
  musica: 'EXAVITQu4vr4xnSDxMaL',     // Bella - armoniosa (fallback de Elli)
  astronomia: 'pNInz6obpgDQGcFmaJgB', // Adam - contemplativo (fallback de Josh)
  
  // Maestro Masón (Síntesis de todas las artes)
  maestro: 'onwK4e9ZLuTAKqWW03F9'     // Daniel - sabio, equilibrado ✅
};

/**
 * Genera audio con ElevenLabs y lo sube a S3
 * @param {string} texto - Texto a sintetizar
 * @param {string} arte - Arte liberal (gramatica|retorica|logica|aritmetica|geometria|musica|astronomia)
 * @returns {Promise<string>} URL pública del audio en S3
 */
async function generarAudioPremium(texto, arte = 'gramatica') {
  const voiceId = VOCES_ARTES[arte] || VOCES_ARTES.gramatica;
  const startTime = Date.now();

  try {
    // Llamada a ElevenLabs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: texto,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 10000 // 10s máximo para generación de audio
      }
    );

    console.log(`[ELEVENLABS] Audio generado en ${Date.now() - startTime}ms`);

    // Subir a S3 (sin ACL - el bucket usa políticas de bucket)
    const key = `audio/premium/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.mp3`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(response.data),
      ContentType: 'audio/mpeg',
      CacheControl: 'max-age=86400' // 24h
    }));

    const url = `https://${BUCKET}.s3.amazonaws.com/${key}`;
    console.log(`[ELEVENLABS] Audio subido: ${url}`);
    return url;

  } catch (error) {
    console.error('[ELEVENLABS] Error:', error.message);
    throw new Error('No se pudo generar audio premium');
  }
}

module.exports = { generarAudioPremium };
