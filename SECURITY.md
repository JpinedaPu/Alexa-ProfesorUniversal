# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Si descubres una vulnerabilidad de seguridad en Profesor Universal IA, por favor repórtala de manera responsable:

### ⚠️ NO abras un issue público

Las vulnerabilidades de seguridad deben reportarse de forma privada para proteger a los usuarios.

### 📧 Cómo Reportar

1. **Email:** Envía un correo a través de [GitHub Security Advisory](https://github.com/JpinedaPu/AlexaProfesorUniversal/security/advisories/new) con:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de mitigación (opcional)

2. **GitHub Security Advisory:** Usa la pestaña "Security" → "Report a vulnerability"

### 🕐 Tiempo de Respuesta

- **Confirmación inicial:** 48 horas
- **Evaluación completa:** 7 días
- **Fix y release:** 14-30 días (dependiendo de severidad)

### 🔒 Proceso de Divulgación

1. Recibes confirmación de recepción
2. Evaluamos y validamos la vulnerabilidad
3. Desarrollamos y testeamos el fix
4. Lanzamos un patch de seguridad
5. Publicamos un security advisory
6. Te damos crédito (si lo deseas)

## Mejores Prácticas de Seguridad

### Para Contribuidores

- ❌ **NUNCA** commitees API keys o secretos
- ✅ Usa variables de entorno para credenciales
- ✅ Revisa `.gitignore` antes de hacer commit
- ✅ Usa `npm audit` regularmente
- ✅ Mantén dependencias actualizadas
- ✅ Instala GitGuardian para escaneo automático de secretos

**Ver guía completa**: [Configuración de Seguridad con GitGuardian](.github/SECURITY_SETUP.md)

### Para Usuarios

- 🔐 Protege tus API keys (OpenAI, Wolfram, Gemini)
- 🔄 Rota credenciales periódicamente
- 📊 Monitorea uso de APIs para detectar anomalías
- 🚫 No compartas tu `.env` file
- ✅ Usa AWS Secrets Manager en producción

## Vulnerabilidades Conocidas

Actualmente no hay vulnerabilidades conocidas en v1.0.0.

## Dependencias de Seguridad

Este proyecto usa:
- AWS SDK v3 (actualizaciones automáticas de seguridad)
- Node.js 20.x LTS (soporte hasta abril 2026)
- Alexa SDK v2 (mantenido por Amazon)

Ejecuta `npm audit` regularmente para verificar vulnerabilidades en dependencias.

---

**Gracias por ayudar a mantener Profesor Universal IA seguro.** 🔒
