# Profesor Universal IA (Alexa Skill)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange)](https://aws.amazon.com/lambda/)
[![Alexa Skill](https://img.shields.io/badge/Alexa-Skill-00CAFF)](https://developer.amazon.com/alexa)

Skill educativa en `es-ES` con arquitectura de respuesta híbrida y multi-modelo:

- `Wolfram Alpha`: Datos técnicos, matemáticos y pods visuales
- `Wikipedia`: Respaldo enciclopédico y biográfico
- `Claude 4.5 Haiku`: Síntesis de voz carismática vía Amazon Bedrock (us-east-1)
- `Gemini 3.1 Flash Lite`: Contexto especializado y búsqueda web
- `GPT-4.1 Mini`: Extracción de keywords y fast path matemático
- `NASA Images API`: Imágenes científicas y espaciales de dominio público
- `Wikimedia Commons`: Imágenes educativas libres de derechos
- `ElevenLabs`: Voces premium para el Modo Secreto (7 Artes Liberales)

## 🌟 Características Destacadas

- 🤖 **8 fuentes de conocimiento** trabajando en conjunto (5 IAs + NASA + Wikimedia + ElevenLabs)
- ⚡ **Respuestas <7.8s** optimizadas para Alexa
- 🎨 **APL visual** con modo oscuro/claro dinámico
- 🖼️ **Imágenes educativas** de Wolfram Alpha, NASA y Wikimedia Commons
- 📊 **Caché inteligente** S3 + DynamoDB
- 🔄 **CI/CD automático** GitHub Actions → AWS Lambda
- 🔢 **Fast path matemático** (~1ms) para derivadas, integrales y límites
- 🎭 **Modo Secreto** — Las 7 Artes Liberales con voces premium ElevenLabs

## Estructura del Proyecto

```
.
├── lambda/                   # Código Lambda AWS (PRODUCCIÓN)
│   ├── handlers/             # Lógica de intents Alexa
│   ├── services/             # Integraciones IA (Claude, GPT, Wolfram, etc.)
│   ├── utils/                # Herramientas (cache, logger, timeouts)
│   └── config/               # Configuración (constantes, timeouts)
├── docs/                     # Documentación consolidada
│   └── logos/                # Logos oficiales para APL
├── scripts/
│   ├── configure-lambda-env.ps1  # Sync .env → Lambda
│   ├── bedrock-policy.json       # Política IAM Bedrock
│   └── s3-logos-policy.json      # Política IAM S3 logos
├── skill-package/            # Manifiesto y modelos Alexa
└── .github/workflows/        # CI/CD automático GitHub Actions
```

## 🚀 Despliegue

```bash
git add .
git commit -m "feat: descripción del cambio"
git push private main
```

GitHub Actions desplegará automáticamente a AWS Lambda (~60s).

## 🧪 Tests

Usar la **Alexa Developer Console** → pestaña **Test** para probar la skill en tiempo real.

> El Modo Secreto (audio ElevenLabs) solo funciona en dispositivos físicos — el simulador no reproduce `<audio>` SSML.

## 🔧 Configuración Local

Las API keys deben configurarse en AWS Lambda. **NUNCA** deben estar en el código.

```
OPENAI_API_KEY       — GPT-4.1 Mini (keywords + fast path matemático)
WOLFRAM_APP_ID       — Wolfram Alpha Full Results API
GEMINI_API_KEY       — Gemini 3.1 Flash Lite
CLAUDE_API_KEY       — Fallback si Bedrock da AccessDenied
ELEVENLABS_API_KEY   — Solo Modo Secreto (7 Artes Liberales)
```

Para sincronizar tu archivo `.env` local con AWS Lambda:
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

**Documentación completa:**
- 📖 [Documentación Principal](./docs/DOCUMENTACION_PROYECTO.md)
- 🔧 [Qué Hace Cada Cosa](./docs/QUE_HACE_CADA_COSA.md)
- 📊 [Diagramas de Arquitectura](./docs/DIAGRAMA_ARQUITECTURA.md)
- ⚡ [Referencia Rápida](./docs/REFERENCIA_RAPIDA.md)
- 🎭 [Modo Secreto — Tutorial](./docs/MODO_SECRETO.md)
- 🔬 [Flujo Step-by-Step](./docs/FLUJO-STEP-BY-STEP.md)

## 📊 Infraestructura AWS

### Lambda
- **Función:** AlexaProfesorUniversal
- **Región:** us-east-1 (N. Virginia)
- **Runtime:** Node.js 22.x
- **Timeout:** 15s (Alexa corta a 8s — deadline interno 7.8s)
- **Memory:** 1024 MB
- **Deploy:** Automático vía GitHub Actions (repo privado)

### DynamoDB (us-east-1)
- **ProfesorUniversal-StepByStep:** Caché matemático paso a paso (TTL 24h)
- **ProfesorUniversal-UserHistory:** Historial de preguntas (últimas 5 por usuario, TTL 90 días)

### S3 (us-east-1)
- **alexa-profesor-universal-cache-us-east-1:**
  - `/cache/` — Caché de preguntas conceptuales
  - `/logos/` — Logos públicos para APL
  - `/audio/premium/` — Audio ElevenLabs del Modo Secreto

## ⚡ Características Principales

- ✅ **Arquitectura híbrida multi-fuente**: Claude + GPT + Wolfram + Gemini + Wikipedia + NASA + Wikimedia
- ✅ **Ruta matemática especializada**: fast path ~1ms + Wolfram + Claude en paralelo
- ✅ **Ruta científica**: Wolfram + Wikipedia + NASA/Wikimedia + Claude
- ✅ **Caché inteligente S3** (más rápido en preguntas repetidas)
- ✅ **Caché DynamoDB step-by-step** (paginación sin re-llamar Wolfram)
- ✅ **Historial de usuario** (comando "repite mi última pregunta")
- ✅ **APL visual premium** con logos oficiales y modo oscuro/claro
- ✅ **Imágenes educativas** de Wolfram Alpha, NASA Images API y Wikimedia Commons
- ✅ **Zoom dinámico** de imágenes y visualización step-by-step
- ✅ **Modo susurro** SSML para ambientes silenciosos
- ✅ **Modo Secreto** — 7 Artes Liberales con voces premium ElevenLabs
- ✅ **Deploy automático** GitHub Actions → AWS Lambda

## 🎭 Modo Secreto

Di **"la palabra es Boaz"** para activar las 7 Artes Liberales con voces premium.

Ver tutorial completo: [docs/MODO_SECRETO.md](./docs/MODO_SECRETO.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

Ver también: [Código de Conducta](CODE_OF_CONDUCT.md) | [Política de Seguridad](SECURITY.md)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Amazon Alexa](https://developer.amazon.com/alexa) - Plataforma de voz
- [Wolfram Alpha](https://www.wolframalpha.com/) - Motor de conocimiento computacional
- [OpenAI](https://openai.com/) - GPT-4.1 Mini
- [Google Gemini](https://deepmind.google/technologies/gemini/) - Gemini 3.1 Flash Lite
- [Anthropic Claude](https://www.anthropic.com/) - Claude 4.5 Haiku vía AWS Bedrock
- [Wikipedia](https://www.wikipedia.org/) - Conocimiento enciclopédico
- [NASA Images API](https://images.nasa.gov/) - Imágenes científicas de dominio público
- [Wikimedia Commons](https://commons.wikimedia.org/) - Imágenes educativas libres
- [ElevenLabs](https://elevenlabs.io/) - Síntesis de voz premium

## 📞 Contacto

- **GitHub Issues:** [Reportar bugs o sugerir features](https://github.com/JpinedaPu/AlexaProfesorUniversal/issues)
- **Discussions:** [Preguntas y discusiones](https://github.com/JpinedaPu/AlexaProfesorUniversal/discussions)

---
**Proyecto:** Profesor Universal IA v7.7.x
**Estado:** ✅ PRODUCCIÓN READY
**Última actualización:** Marzo 2026
