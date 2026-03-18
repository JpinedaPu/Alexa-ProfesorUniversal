# Skill Package - Configuración de Alexa Skill

Este directorio contiene la configuración del manifiesto de Alexa Skill para "Profesor Universal IA".

## Archivos principales:

### `skill.json`
Manifiesto principal del skill que define:

- **Endpoint Lambda**: `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal`
- **Interfaces soportadas**: Alexa Presentation Language (APL) para pantallas
- **Viewports**: Configuración para TV, HUB, MOBILE y ROUND (Echo Spot)
- **Distribución**: España, México, Colombia, Argentina, Estados Unidos
- **Categoría**: Educación y Referencia
- **Permisos**: Acceso a código postal para ubicación geográfica

### `interactionModels/custom/es-ES.json`
Modelo de interacción en español que define:

- **Intents**: AskProfeIntent, WolframAlphaModeIntent, etc.
- **Slots**: Tipos de datos para preguntas educativas
- **Sample Utterances**: Frases de ejemplo para entrenar el NLU
- **Invocation Name**: "profesor universal"

## Configuración APL

El skill soporta múltiples tipos de pantalla:

- **TV**: 960x540 (modo televisión)
- **HUB**: Varias resoluciones para Echo Show
- **MOBILE**: Dispositivos móviles con app Alexa
- **ROUND**: Echo Spot (pantalla circular)

## Distribución geográfica

Disponible en países de habla hispana:
- 🇪🇸 España (es-ES)
- 🇲🇽 México 
- 🇨🇴 Colombia
- 🇦🇷 Argentina
- 🇺🇸 Estados Unidos (usuarios hispanohablantes)

## Testing

**Frase de prueba**: "¿Qué es el sol?"

Esta pregunta activa el flujo completo:
1. Wolfram Alpha → datos técnicos
2. Wikipedia → contexto enciclopédico  
3. Gemini → información adicional
4. Claude → síntesis educativa final