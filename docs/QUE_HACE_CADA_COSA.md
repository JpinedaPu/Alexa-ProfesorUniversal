# ¿Qué hace cada cosa? - Guía Completa del Proyecto

## 🎯 VISIÓN GENERAL

**Profesor Universal IA** es un Alexa Skill educativo que combina 4 inteligencias artificiales para responder preguntas de ciencia, matemáticas e historia con voz natural y visuales.

## 🏗️ ARQUITECTURA DEL SISTEMA

```
Usuario → Alexa → AWS Lambda → [4 IAs] → Respuesta Educativa
                     ↓
            [Wolfram + Wikipedia + Gemini + Claude]
```

## 📁 ESTRUCTURA DE CARPETAS

### `.ask/lambda/` - VERSIÓN DE PRODUCCIÓN
**QUÉ ES:** Código que se ejecuta en AWS Lambda (la nube de Amazon)
**CUÁNDO SE USA:** Cuando alguien habla con Alexa en dispositivos reales
**DEPLOY:** Automático vía GitHub Actions cuando haces `git push`

### `alexa-hosted-version/` - VERSIÓN DE DESARROLLO  
**QUÉ ES:** Código para pruebas en el simulador de Amazon
**CUÁNDO SE USA:** Para desarrollo y testing antes de publicar
**DEPLOY:** Manual desde Alexa Developer Console

### `lambda/` - CÓDIGO PRINCIPAL
**QUÉ ES:** El "cerebro" del skill que procesa las preguntas
**COMPONENTES CLAVE:**
- `index.js` - Punto de entrada, recibe la pregunta de Alexa
- `handlers/` - Lógica para diferentes tipos de preguntas
- `services/` - Conexiones a las 4 IAs externas
- `utils/` - Herramientas compartidas (cache, logs, etc.)

## 🤖 LAS 4 INTELIGENCIAS ARTIFICIALES
### 1. 🧮 WOLFRAM ALPHA
**QUÉ HACE:** Resuelve matemáticas, física, química, astronomía
**CUÁNDO SE USA:** "¿Cuánto pesa la Tierra?", "Resuelve x² + 3x - 4 = 0"
**ARCHIVO:** `wolfram.js`
**RESULTADO:** Datos técnicos precisos + gráficos/imágenes

### 2. 📚 WIKIPEDIA  
**QUÉ HACE:** Información enciclopédica general
**CUÁNDO SE USA:** "¿Quién fue Einstein?", "¿Qué es la fotosíntesis?"
**ARCHIVO:** `wikipedia.js`
**RESULTADO:** Contexto histórico y definiciones

### 3. 🔍 GEMINI (Google)
**QUÉ HACE:** Información actualizada hasta febrero 2025
**CUÁNDO SE USA:** Preguntas sobre eventos recientes
**ARCHIVO:** `gemini.js` (antes `geminiWebSearch.js`)
**RESULTADO:** Datos actuales y contexto adicional

### 4. 🎓 CLAUDE (Anthropic)
**QUÉ HACE:** Sintetiza todo en una respuesta educativa perfecta
**CUÁNDO SE USA:** SIEMPRE (es el "profesor" que explica)
**ARCHIVO:** `claude.js`
**RESULTADO:** Respuesta final con voz natural + texto visual

## 🔄 FLUJO DE UNA PREGUNTA

```
1. Usuario: "¿Qué es el sol?"
2. Alexa → AWS Lambda → index.js
3. AskProfeIntentHandler.js procesa la pregunta
4. EN PARALELO:
   - Wolfram: datos técnicos del sol
   - Wikipedia: información enciclopédica  
   - Gemini: contexto adicional
5. Claude sintetiza todo en respuesta educativa
6. APL genera visuales para pantalla
7. Alexa responde con voz + imágenes
```

## 📂 ARCHIVOS PRINCIPALES EXPLICADOS

### `index.js` - EL DIRECTOR DE ORQUESTA
**QUÉ HACE:** 
- Recibe la pregunta de Alexa
- Decide qué handler usar
- Devuelve la respuesta final
**ANALOGÍA:** Como el recepcionista que dirige a los visitantes

### `handlers/AskProfeIntentHandler.js` - EL CEREBRO PRINCIPAL
**QUÉ HACE:**
- Procesa preguntas educativas generales
- Coordina las 4 IAs en paralelo
- Construye la respuesta final
**ANALOGÍA:** Como el director de una orquesta coordinando músicos

### `handlers/WolframAlphaModeIntentHandler.js` - MODO MATEMÁTICO
**QUÉ HACE:**
- Resuelve ecuaciones paso a paso
- Muestra proceso matemático detallado
**CUÁNDO:** "Resuelve paso a paso x² + 5x + 6 = 0"

### `utils/cache.js` - LA MEMORIA
**QUÉ HACE:**
- Guarda respuestas para preguntas repetidas
- Hace el skill 16% más rápido
**ANALOGÍA:** Como recordar respuestas de exámenes anteriores

### `utils/logger.js` - EL REPORTERO
**QUÉ HACE:**
- Registra todo lo que pasa (logs)
- Ayuda a encontrar problemas
**ANALOGÍA:** Como el periodista que documenta eventos

### `apl.js` - EL DISEÑADOR VISUAL
**QUÉ HACE:**
- Crea las pantallas bonitas con imágenes
- Adapta el diseño según el dispositivo
**PARA:** Echo Show, Fire TV, móviles con Alexa

## 🛠️ HERRAMIENTAS Y CONFIGURACIÓN

### `package.json` - LA LISTA DE COMPRAS
**QUÉ HACE:** Define qué librerías necesita el proyecto
**CONTIENE:** 
- ask-sdk-core (para hablar con Alexa)
- @aws-sdk/* (para usar servicios de Amazon)

### `scripts/deploy.ps1` - EL BOTÓN MÁGICO
**QUÉ HACE:** 
```powershell
.\scripts\deploy.ps1 "mensaje del cambio"
```
- Sube código a GitHub
- GitHub Actions lo despliega automáticamente a AWS
**ANALOGÍA:** Como publicar un libro con un solo clic

### `scripts/test-all.ps1` - EL EXAMINADOR
**QUÉ HACE:** Ejecuta 20 pruebas diferentes
- Pregunta sobre fotosíntesis
- Resuelve ecuaciones
- Prueba comandos de voz
**RESULTADO:** Reporte de qué funciona y qué no

## 🗂️ ARCHIVOS DE CONFIGURACIÓN

### `skill.json` - EL CARNET DE IDENTIDAD
**QUÉ DEFINE:**
- Nombre: "Profesor Universal IA"
- Países: España, México, Colombia, Argentina, USA
- Permisos: Acceso a ubicación del usuario
- Pantallas: TV, Echo Show, móviles

### `ask-resources.json` - EL MAPA DE RUTAS
**QUÉ HACE:** Le dice a Alexa dónde está cada cosa
- Código → `lambda/`
- Configuración → `skill-package/`
- Diferentes perfiles (root, user, default)

### `interactionModels/custom/es-ES.json` - EL DICCIONARIO
**QUÉ CONTIENE:**
- Frases que entiende: "¿qué es...", "resuelve...", "explica..."
- Tipos de datos: preguntas, ecuaciones, comandos
- Nombre de invocación: "profesor universal"

## 📊 MONITOREO Y LOGS

### CloudWatch (AWS)
**QUÉ MONITOREA:**
- Cuántas preguntas por día
- Qué tan rápido responde
- Si hay errores

### GitHub Actions
**QUÉ HACE:**
- Deploy automático cuando cambias código
- Ejecuta tests antes de publicar
- Notifica si algo se rompe

## 🎨 INTERFAZ VISUAL (APL)

### Para Echo Show / Fire TV
- Imágenes de Wolfram Alpha
- Logos de las 4 IAs
- Modo oscuro/claro
- Zoom de imágenes
- Botones interactivos

### Para móviles
- Diseño adaptativo
- Texto legible
- Imágenes optimizadas

## 🔐 SEGURIDAD Y VARIABLES

### Variables de Entorno (Secretas)
- `CLAUDE_API_KEY` - Para hablar con Claude
- `WOLFRAM_APP_ID` - Para usar Wolfram Alpha  
- `GEMINI_API_KEY` - Para usar Gemini
- `OPENAI_API_KEY` - Para GPT (backup)

### Dónde se guardan:
- **AWS Lambda:** Variables de entorno encriptadas
- **Alexa Hosted:** Hardcoded en código (repo privado)

## 🚀 DESPLIEGUE Y PRODUCCIÓN

### Versión Activa: AWS Lambda
- **Función:** `AlexaProfesorUniversal`
- **Región:** us-east-1 (Virginia del Norte)
- **Memoria:** 1024 MB
- **Timeout:** 15 segundos
- **Deploy:** Automático vía GitHub Actions

### Cache y Persistencia
- **S3:** Respuestas completas (TTL 7 días)
- **DynamoDB:** Historial usuario + step-by-step
- **Memoria:** Cache LRU para respuestas rápidas

## 🎯 CASOS DE USO TÍPICOS

### Pregunta Científica: "¿Qué es el sol?"
1. Wolfram → "Estrella de tipo G, masa 1.989×10³⁰ kg..."
2. Wikipedia → "El Sol es la estrella del sistema solar..."
3. Gemini → "Información actualizada sobre investigación solar..."
4. Claude → "El Sol es nuestra estrella más cercana. Con una masa de casi 2 millones de billones de billones de kilogramos..."

### Ecuación Matemática: "x² + 3x - 4 = 0"
1. Wolfram → Gráfico + soluciones: x = 1, x = -4
2. Claude → "Esta ecuación cuadrática tiene dos soluciones..."
3. APL → Muestra el gráfico de la parábola

### Pregunta Histórica: "¿Quién fue Einstein?"
1. Wikipedia → Biografía completa
2. Gemini → Contexto adicional
3. Claude → "Albert Einstein fue un físico alemán..."
4. APL → Foto + datos clave

## 🔧 MANTENIMIENTO

### Logs importantes:
- `[WOLFRAM] OK | T+1200ms | 3 imgs` - Wolfram respondió en 1.2s
- `[CLAUDE] OK | T+800ms | Síntesis generada` - Claude sintetizó
- `[TOTAL] 2500ms` - Respuesta completa en 2.5s

### Métricas clave:
- **Latencia objetivo:** <7.8 segundos (límite de Alexa: 8s)
- **Cache hit rate:** ~16% de preguntas repetidas
- **Success rate:** >95% de respuestas exitosas

## 🎓 PARA DESARROLLADORES

### Agregar nueva funcionalidad:
1. Crear handler en `handlers/`
2. ✏️ Editar código en lambda/
3. 🚀 Deploy con `.\scripts\deploy.ps1`

### Debugging:
1. Ver logs en CloudWatch
2. Ejecutar tests locales
3. Usar `.\scripts\test-all.ps1`

### Estructura recomendada:
- **1 handler** = 1 tipo de pregunta
- **1 service** = 1 API externa
- **1 util** = 1 herramienta compartida

---

**RESUMEN:** Es un sistema educativo inteligente que combina lo mejor de 4 IAs para crear el profesor virtual más completo del mundo, optimizado para funcionar en tiempo real a través de Alexa.