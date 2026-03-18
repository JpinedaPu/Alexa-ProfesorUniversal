# 🚀 Referencia Rápida - Profesor Universal IA

## ⚡ COMANDOS ESENCIALES

```powershell
# 🚀 DEPLOY (más usado)
.\scripts\deploy.ps1 "feat: nueva funcionalidad"

# 🧪 TESTING
.\scripts\test-all.ps1

# 🔧 CONFIGURAR VARIABLES
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"

# 📊 VER LOGS
aws logs tail /aws/lambda/AlexaProfesorUniversal --follow
```

## 🗂️ ARCHIVOS CLAVE (Los que más tocas)

| Archivo | Qué hace | Cuándo editarlo |
|---------|----------|-----------------|
| `lambda/handlers/AskProfeIntentHandler.js` | 🧠 Lógica principal | Cambiar flujo de preguntas |
| `lambda/services/claude.js` | 🎓 Síntesis educativa | Mejorar respuestas |
| `lambda/services/wolfram.js` | 🧮 Datos técnicos | Optimizar consultas matemáticas |
| `lambda/services/apl.js` | 🎨 Pantallas visuales | Cambiar diseño |
| `skill-package/skill.json` | 🆔 Configuración Alexa | Cambiar países, permisos |
| `lambda/package.json` | 📦 Dependencias | Agregar librerías |

## 🤖 LAS 4 IAs - CHEAT SHEET

| IA | Archivo | Para qué | Timeout | Ejemplo |
|----|---------|----------|---------|---------|
| 🧮 **Wolfram** | `wolfram.js` | Matemáticas, física, datos técnicos | 5.5s | "¿Cuánto pesa la Tierra?" |
| 📚 **Wikipedia** | `wikipedia.js` | Información enciclopédica | 1.2s | "¿Quién fue Einstein?" |
| 🔍 **Gemini** | `gemini.js` | Info actualizada (feb 2025) | 5s | "¿Qué pasó en enero 2025?" |
| 🎓 **Claude** | `claude.js` | Síntesis final educativa | 3s | Combina todo en respuesta perfecta |

## 🔄 FLUJO TÍPICO DE DESARROLLO

```
1. 💡 Idea nueva
2. ✏️ Editar código en lambda/
3. 🚀 Deploy con .\scripts\deploy.ps1
5. 🚀 .\scripts\deploy.ps1 "descripción"
6. 📊 Verificar en CloudWatch
```

## 🐛 DEBUGGING RÁPIDO

### Ver qué pasó con una pregunta:
```powershell
# Buscar logs de los últimos 10 minutos
aws logs filter-log-events --log-group-name /aws/lambda/AlexaProfesorUniversal --start-time $(date -d "10 minutes ago" +%s)000
```

### Patrones de logs importantes:
```
[WOLFRAM] ✅ OK | T+1200ms | 3 imgs    ← Wolfram funcionó
[CLAUDE] ❌ ERR_TIMEOUT | T+3000ms    ← Claude se tardó mucho
[TOTAL] 7800ms                        ← Respuesta completa
```

### Errores comunes:
- `ERR_TIMEOUT` → API muy lenta, revisar internet
- `ERR_PARSE` → JSON malformado, revisar Claude
- `NO_PODS` → Wolfram no entendió la pregunta
- `EMPTY_RESPONSE` → API no devolvió nada

## 📱 TESTING EN DISPOSITIVOS

### Alexa Developer Console:
1. Ir a https://developer.amazon.com/alexa/console/ask
2. Abrir "Profesor Universal IA"
3. Test → Simulator
4. Escribir: "pregunta profesor universal qué es el sol"

### Dispositivo físico:
- "Alexa, abre profesor universal"
- "¿Qué es la fotosíntesis?"
- "Resuelve x al cuadrado más 3x menos 4 igual a 0"

## 🔧 CONFIGURACIÓN RÁPIDA

### Variables de entorno necesarias:
```bash
CLAUDE_API_KEY=sk-ant-api03-...
WOLFRAM_APP_ID=6U3PEET6LV
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...  # Backup
```

### Servicios AWS necesarios:
- ✅ Lambda (AlexaProfesorUniversal)
- ✅ DynamoDB (ProfesorUniversal-StepByStep, ProfesorUniversal-UserHistory)
- ✅ S3 (alexa-profesor-universal-cache)
- ✅ Bedrock (Claude access)
- ✅ CloudWatch (logs y métricas)

## 📊 MÉTRICAS IMPORTANTES

### Objetivos de rendimiento:
- ⏱️ **Latencia:** <7.8 segundos (límite Alexa: 8s)
- ✅ **Success rate:** >95%
- 💾 **Cache hit:** ~16%
- 🧮 **Wolfram success:** >90%

### Cómo verificar:
```powershell
# Ejecutar suite completa
.\scripts\test-all.ps1

# Ver métricas en tiempo real
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration --dimensions Name=FunctionName,Value=AlexaProfesorUniversal --start-time 2024-01-01T00:00:00Z --end-time 2024-01-01T23:59:59Z --period 3600 --statistics Average
```

## 🎨 PERSONALIZACIÓN VISUAL

### Cambiar colores APL:
```javascript
// En lambda/services/apl.js
const COLORS = {
    dark: {
        background: "#1a1a1a",
        text: "#ffffff",
        accent: "#FF6600"  // Naranja Wolfram
    },
    light: {
        background: "#ffffff", 
        text: "#000000",
        accent: "#E53935"  // Rojo Wolfram
    }
}
```

### Agregar nuevo logo:
1. Subir imagen a S3: `alexa-profesor-universal-cache/logos/`
2. Agregar URL en `apl.js`
3. Deploy

## 🚨 EMERGENCIAS

### Skill no responde:
1. Verificar Lambda en AWS Console
2. Ver logs en CloudWatch
3. Verificar variables de entorno
4. Rollback: `git revert HEAD` + deploy

### APIs externas caídas:
- Wolfram caído → Skill funciona con Wikipedia + Gemini
- Claude caído → Fallback a respuesta básica
- Todo caído → Mensaje de error amigable

### Límites excedidos:
- Claude: 429 rate limit → Mensaje "muchas preguntas"
- Wolfram: Cuota agotada → Solo Wikipedia + Gemini
- Lambda: Memory/timeout → Optimizar código

## 📚 RECURSOS ÚTILES

### Documentación oficial:
- [Alexa Skills Kit](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Wolfram Alpha API](https://products.wolframalpha.com/api/)
- [Claude API](https://docs.anthropic.com/claude/reference/)

### Herramientas:
- [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)
- [AWS CLI](https://aws.amazon.com/cli/)
- [Postman](https://www.postman.com/) para testing APIs

## 🎯 CASOS DE USO FRECUENTES

### Agregar nueva pregunta tipo:
1. Identificar patrón en `interactionModels/custom/es-ES.json`
2. Agregar sample utterances
3. Modificar handler correspondiente
4. Crear test
5. Deploy

### Optimizar respuesta lenta:
1. Identificar bottleneck en logs
2. Reducir timeout de API lenta
3. Agregar cache si es repetitiva
4. Paralelizar si es posible

### Cambiar personalidad del profesor:
1. Editar system prompt en `claude.js`
2. Ajustar temperatura (0.3 = más consistente, 0.7 = más creativo)
3. Testing con preguntas variadas
4. Deploy gradual

---

**💡 TIP:** Siempre ejecuta `.\scripts\test-all.ps1` antes de hacer deploy para evitar romper producción.