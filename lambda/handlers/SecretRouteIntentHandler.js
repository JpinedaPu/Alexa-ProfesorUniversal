/**
 * SecretRouteIntentHandler.js
 * Ruta de las 7 Artes Liberales (Trivium + Quadrivium)
 * 
 * Activación: "Alexa, pregunta a profesor universal [PALABRA_SECRETA]"
 * Palabra secreta: "Boaz" (columna del Templo de Salomón)
 * 
 * TRIVIUM (Artes del Lenguaje):
 *   1. Gramática - Estructura del lenguaje
 *   2. Retórica - Arte de la persuasión
 *   3. Lógica - Razonamiento y argumentación
 * 
 * QUADRIVIUM (Artes Matemáticas):
 *   4. Aritmética - Ciencia de los números
 *   5. Geometría - Ciencia del espacio
 *   6. Música - Ciencia de la armonía
 *   7. Astronomía - Ciencia de los astros
 */

const { generarAudioPremium } = require('../services/elevenlabs');
const { invocarClaude } = require('../services/claude');
const { consultarWolfram } = require('../services/wolfram');
const {
  rutaGramatica,
  rutaRetorica,
  rutaLogica,
  rutaAritmetica,
  rutaGeometria,
  rutaMusica,
  rutaAstronomia
} = require('./artesLiberalesRoutes');

// Clasificador de preguntas por arte liberal
function clasificarArteLiberal(pregunta) {
  const p = pregunta.toLowerCase();
  
  // TRIVIUM
  if (/\b(gram[aá]tica|sintaxis|morfolog[ií]a|etimolog[ií]a|conjugaci[oó]n|declinaci[oó]n|lenguaje|idioma|palabra)\b/.test(p)) {
    return 'gramatica';
  }
  if (/\b(ret[oó]rica|persuasi[oó]n|discurso|oratoria|argumento|debate|elocuencia|figura ret[oó]rica)\b/.test(p)) {
    return 'retorica';
  }
  if (/\b(l[oó]gica|silogismo|falacia|razonamiento|deducci[oó]n|inducci[oó]n|premisa|conclusi[oó]n|paradoja)\b/.test(p)) {
    return 'logica';
  }
  
  // QUADRIVIUM
  if (/\b(aritm[eé]tica|n[uú]mero|suma|resta|multiplicaci[oó]n|divisi[oó]n|primo|factorial|secuencia)\b/.test(p)) {
    return 'aritmetica';
  }
  if (/\b(geometr[ií]a|tri[aá]ngulo|c[ií]rculo|pol[ií]gono|[aá]ngulo|teorema|euclides|[aá]rea|volumen)\b/.test(p)) {
    return 'geometria';
  }
  if (/\b(m[uú]sica|armon[ií]a|escala|acorde|intervalo|nota|tono|frecuencia|pitagoras)\b/.test(p)) {
    return 'musica';
  }
  if (/\b(astronom[ií]a|estrella|planeta|galaxia|constelaci[oó]n|[oó]rbita|eclipse|cosmos|universo)\b/.test(p)) {
    return 'astronomia';
  }
  
  // Default: Gramática (primera arte del Trivium)
  return 'gramatica';
}

// Prompts especializados por arte liberal
const PROMPTS_ARTES = {
  gramatica: `Eres un maestro de Gramática del Trivium clásico. Explica con precisión académica la estructura, 
etimología y reglas del lenguaje. Usa ejemplos del latín, griego y español. Responde en máximo 150 palabras.`,
  
  retorica: `Eres un maestro de Retórica del Trivium clásico. Explica el arte de la persuasión, las figuras retóricas 
y la construcción de argumentos convincentes. Cita a Aristóteles, Cicerón o Quintiliano cuando sea relevante. Máximo 150 palabras.`,
  
  logica: `Eres un maestro de Lógica del Trivium clásico. Explica el razonamiento deductivo, inductivo y las leyes 
del pensamiento correcto. Usa silogismos y detecta falacias. Cita a Aristóteles cuando sea relevante. Máximo 150 palabras.`,
  
  aritmetica: `Eres un maestro de Aritmética del Quadrivium clásico. Explica la ciencia de los números, sus propiedades 
y relaciones. Conecta con la filosofía pitagórica de los números como esencia del universo. Máximo 150 palabras.`,
  
  geometria: `Eres un maestro de Geometría del Quadrivium clásico. Explica las formas, proporciones y el espacio según 
Euclides. Conecta con la geometría sagrada y la proporción áurea. Máximo 150 palabras.`,
  
  musica: `Eres un maestro de Música del Quadrivium clásico. Explica la armonía, las proporciones matemáticas de los 
intervalos y la música de las esferas pitagórica. Máximo 150 palabras.`,
  
  astronomia: `Eres un maestro de Astronomía del Quadrivium clásico. Explica los movimientos celestes, las esferas 
y la relación entre el microcosmos y macrocosmos. Usa conocimiento antiguo y moderno. Máximo 150 palabras.`
};

const SecretRouteIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SecretRouteIntent';
  },

  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const pregunta = slots.secretQuestion?.value || '';

    console.log(`[7-ARTES] Pregunta: ${pregunta}`);

    try {
      // 1. Clasificar en qué arte liberal cae la pregunta
      const arte = clasificarArteLiberal(pregunta);
      console.log(`[7-ARTES] Arte clasificada: ${arte.toUpperCase()}`);

      // 2. Ejecutar ruta especializada según el arte
      const rutasMap = {
        gramatica: rutaGramatica,
        retorica: rutaRetorica,
        logica: rutaLogica,
        aritmetica: rutaAritmetica,
        geometria: rutaGeometria,
        musica: rutaMusica,
        astronomia: rutaAstronomia
      };

      const resultado = await rutasMap[arte](pregunta);

      // 3. Guardar en sesión
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      sessionAttributes.lastArteLiberal = arte;
      sessionAttributes.lastSecretQuestion = pregunta;
      sessionAttributes.lastArteResultado = resultado;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      // 4. Respuesta con audio premium y metadata
      const intro = `${resultado.simbolo} ${resultado.arte} del ${resultado.categoria}. `;
      
      return handlerInput.responseBuilder
        .speak(`${intro}<audio src="${resultado.audio}"/>`)
        .reprompt('¿Deseas explorar otra de las siete artes liberales?')
        .withShouldEndSession(false)
        .getResponse();

    } catch (error) {
      console.error('[7-ARTES] Error:', error);
      return handlerInput.responseBuilder
        .speak('El templo del conocimiento está temporalmente cerrado. Intenta nuevamente.')
        .withShouldEndSession(true)
        .getResponse();
    }
  }
};

/**
 * Handler para continuar explorando las 7 artes
 * Permite al usuario pedir "explícame más sobre [arte]"
 */
const ExplorarArteIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ExplorarArteIntent';
  },

  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const arteSlot = slots.arte?.value?.toLowerCase() || '';
    
    // Mapear nombres en español a claves internas
    const arteMap = {
      'gramática': 'gramatica',
      'gramatica': 'gramatica',
      'retórica': 'retorica',
      'retorica': 'retorica',
      'lógica': 'logica',
      'logica': 'logica',
      'aritmética': 'aritmetica',
      'aritmetica': 'aritmetica',
      'geometría': 'geometria',
      'geometria': 'geometria',
      'música': 'musica',
      'musica': 'musica',
      'astronomía': 'astronomia',
      'astronomia': 'astronomia'
    };

    const arte = arteMap[arteSlot];
    if (!arte) {
      return handlerInput.responseBuilder
        .speak('No reconozco esa arte liberal. Las siete artes son: Gramática, Retórica, Lógica, Aritmética, Geometría, Música y Astronomía.')
        .reprompt('¿Sobre cuál arte deseas aprender?')
        .getResponse();
    }

    const pregunta = `Explícame los fundamentos de ${arteSlot}`;
    console.log(`[EXPLORAR-ARTE] ${arte.toUpperCase()}`);

    try {
      const rutasMap = {
        gramatica: rutaGramatica,
        retorica: rutaRetorica,
        logica: rutaLogica,
        aritmetica: rutaAritmetica,
        geometria: rutaGeometria,
        musica: rutaMusica,
        astronomia: rutaAstronomia
      };

      const resultado = await rutasMap[arte](pregunta);

      return handlerInput.responseBuilder
        .speak(`${resultado.simbolo} ${resultado.arte}. <audio src="${resultado.audio}"/>`)
        .reprompt('¿Deseas explorar otra arte liberal?')
        .withShouldEndSession(false)
        .getResponse();

    } catch (error) {
      console.error('[EXPLORAR-ARTE] Error:', error);
      return handlerInput.responseBuilder
        .speak('No pude acceder a ese conocimiento en este momento.')
        .withShouldEndSession(true)
        .getResponse();
    }
  }
};

module.exports = { SecretRouteIntentHandler, ExplorarArteIntentHandler };
