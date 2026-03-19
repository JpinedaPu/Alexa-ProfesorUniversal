# 🚀 Scripts de Deploy

## Script Principal: `deploy-completo.ps1`

Script maestro que hace el deploy completo en 2 fases:

### FASE 1: Deploy Público (GitHub Actions)
- Hace commit y push de cambios en el código público
- GitHub Actions despliega automáticamente a Lambda
- Incluye: código base, handlers, services, utils, node_modules

### FASE 2: Deploy Modo Secreto (AWS CLI)
- Espera 45 segundos a que termine GitHub Actions
- Descarga el código actual de Lambda
- Agrega los 3 archivos del modo secreto
- Actualiza index.js para registrar handlers
- Despliega todo junto a Lambda

---

## Uso

### Comando Básico
```powershell
.\scripts\deploy-completo.ps1
```

### Con Mensaje de Commit Personalizado
```powershell
.\scripts\deploy-completo.ps1 -CommitMessage "feat: nueva funcionalidad"
```

### Con Función y Región Específicas
```powershell
.\scripts\deploy-completo.ps1 -FunctionName "MiFuncion" -Region "us-west-2"
```

---

## Requisitos

### 1. Git Configurado
- Repositorio con cambios para commitear
- Acceso push a GitHub

### 2. AWS CLI Instalado y Configurado
- Usuario: root (o con permisos de Lambda)
- Región: us-east-1 (por defecto)

### 3. Archivos del Modo Secreto en Local
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `lambda/services/elevenlabs.js`

---

## Flujo del Script

```
1. Detecta cambios en el código
   ↓
2. Pide confirmación al usuario
   ↓
3. git add . && git commit && git push
   ↓
4. Espera 45 segundos (GitHub Actions desplegando)
   ↓
5. Descarga código actual de Lambda
   ↓
6. Agrega archivos del modo secreto
   ↓
7. Actualiza index.js
   ↓
8. Crea ZIP completo
   ↓
9. Despliega a Lambda
   ↓
10. ✅ Listo para probar
```

---

## Ejemplo de Ejecución

```powershell
PS> .\scripts\deploy-completo.ps1

========================================
  Deploy Completo - Público + Modo Secreto
========================================

FASE 1: Deploy de código público vía GitHub Actions
========================================

Cambios detectados:
M  lambda/handlers/mathRoute.js
M  lambda/services/apl.js

¿Deseas hacer commit y push de estos cambios? (S/N): S

Agregando cambios...
Creando commit...
Pushing a GitHub...
✅ Código público subido a GitHub

Esperando 45 segundos a que GitHub Actions despliegue...
Puedes monitorear el progreso en:
https://github.com/JpinedaPu/Alexa-ProfesorUniversal/actions

Esperando... 45 segundos restantes 
✅ Tiempo de espera completado

FASE 2: Deploy de modo secreto vía AWS CLI
========================================

Archivos del modo secreto encontrados:
  - lambda/handlers/SecretRouteIntentHandler.js
  - lambda/handlers/artesLiberalesRoutes.js
  - lambda/services/elevenlabs.js

1. Descargando código actual de Lambda...
✅ URL del código obtenida
✅ Código descargado

2. Extrayendo código...
✅ Código extraído

3. Agregando archivos del modo secreto...
✅ Archivos del modo secreto agregados

4. Actualizando index.js...
✅ index.js actualizado

5. Creando nuevo ZIP...
Comprimiendo 5326 archivos...
  Progreso: 100%
✅ ZIP creado: 2.5 MB

6. Desplegando a Lambda...
========================================
  ✅ DEPLOY COMPLETO EXITOSO
========================================

Detalles:
  - Function: AlexaProfesorUniversal
  - Code Size: 2616594 bytes
  - Last Modified: 2026-03-19T15:45:00.000+0000

PROBAR:
  1. Código base: "Alexa, pregunta al profesor qué es el sol"
  2. Modo secreto: "Alexa, activa el modo secreto"
  3. Voces: "Pregunta sobre geometría"

Limpiando archivos temporales...
✅ Limpieza completada

========================================
  Deploy Completo Finalizado
========================================
```

---

## Otros Scripts Disponibles

### `configure-lambda-env.ps1`
Sincroniza variables de entorno desde `.env` local a Lambda

```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### `setup-aws-complete.ps1`
Setup inicial de infraestructura AWS (solo una vez)

```powershell
.\scripts\setup-aws-complete.ps1
```

---

## Solución de Problemas

### Error: "No se pudo obtener la URL del código"
**Causa**: AWS CLI no está configurado o no tiene permisos

**Solución**:
```powershell
aws configure
# Ingresa tus credenciales
```

### Error: "Faltan archivos del modo secreto"
**Causa**: Los archivos no existen en local

**Solución**: Verifica que existan en:
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `lambda/services/elevenlabs.js`

### Error: "Fallo el push a GitHub"
**Causa**: No tienes permisos o hay conflictos

**Solución**:
```powershell
git pull origin main
# Resuelve conflictos si hay
git push origin main
```

---

## Notas Importantes

1. **Tiempo de espera**: Los 45 segundos son para que GitHub Actions termine. Si tu deploy tarda más, aumenta el tiempo en el script.

2. **Archivos protegidos**: Los archivos del modo secreto están en `.gitignore` y NUNCA se suben a GitHub.

3. **node_modules**: Se preservan correctamente porque se descargan de Lambda (ya compilados por GitHub Actions).

4. **Confirmación**: El script pide confirmación antes de hacer commit para evitar deploys accidentales.

---

## Seguridad

✅ Archivos del modo secreto protegidos por `.gitignore`
✅ GitHub Actions excluye archivos del modo secreto del ZIP
✅ Deploy manual separado vía AWS CLI
✅ Credenciales AWS desde configuración local (no en código)

---

**Última actualización**: 2026-03-19  
**Versión del script**: 1.0.0
