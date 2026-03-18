# Configuración de Seguridad con GitGuardian

## 🔐 Protección contra Exposición de Secretos

Este proyecto usa [GitGuardian](https://www.gitguardian.com/) para detectar y prevenir la exposición de API keys, tokens y otros secretos en el código.

## 📋 Pasos de Implementación

### 1. Instalar GitGuardian (Recomendado)

#### Opción A: GitHub App (Más Fácil - RECOMENDADO)

1. Ve a https://github.com/apps/gitguardian
2. Click en "Install"
3. Selecciona tu repositorio `AlexaProfesorUniversal`
4. Autoriza la aplicación

GitGuardian escaneará automáticamente:
- Todos los commits nuevos
- Pull requests
- Todo el historial del repositorio

**Dashboard**: https://dashboard.gitguardian.com/

#### Opción B: Pre-commit Hook Local (Windows)

**Paso 1: Verificar Python**

```powershell
# Verificar si tienes Python instalado
python --version

# Si no tienes Python, descarga de:
# https://www.python.org/downloads/
# Asegúrate de marcar "Add Python to PATH" durante instalación
```

**Paso 2: Instalar ggshield**

```powershell
# Instalar ggshield vía pip
pip install ggshield

# Verificar instalación (usa python -m en Windows)
python -m ggshield --version
```

**⚠️ Nota para Windows**: Si `ggshield` no se reconoce como comando, siempre usa `python -m ggshield` en lugar de solo `ggshield`.

**Paso 3: Autenticar con GitGuardian**

```powershell
# Esto abrirá tu navegador para login
python -m ggshield auth login

# Sigue las instrucciones en el navegador:
# 1. Inicia sesión con tu cuenta de GitHub
# 2. Autoriza GitGuardian
# 3. Copia el token que aparece
# 4. Pégalo en la terminal cuando te lo pida
```

**Paso 4: Conectar tu Repositorio**

1. Ve a https://dashboard.gitguardian.com/
2. Click en "Connect a source to monitor for secret leaks"
3. Selecciona "GitHub"
4. Autoriza GitGuardian para acceder a tu repositorio
5. Selecciona `JpinedaPu/AlexaProfesorUniversal`
6. Click "Install & Authorize"

**Paso 5: Escanear tu Repositorio Localmente**

```powershell
# Navegar a tu repositorio
cd C:\ruta\a\tu\AlexaProfesorUniversal

# Escanear todo el repositorio
python -m ggshield secret scan repo .

# Escanear solo archivos staged (antes de commit)
python -m ggshield secret scan pre-commit

# Escanear un commit específico
python -m ggshield secret scan commit <commit-hash>

# Escanear un rango de commits
python -m ggshield secret scan commit-range <desde>..<hasta>
```

**Paso 6: Instalar Pre-commit Hook (Opcional)**

```powershell
# Dentro del repositorio
python -m ggshield install -m local

# Esto creará un hook que escaneará automáticamente
# tus cambios antes de cada commit
```

Una vez instalado, cada vez que hagas `git commit`, ggshield escaneará los cambios automáticamente.

### 2. Configurar Variables de Entorno en GitHub

Para que GitHub Actions funcione sin exponer secretos:

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agrega estos secretos:

```
OPENAI_API_KEY=tu-api-key-real
GEMINI_API_KEY=tu-api-key-real
WOLFRAM_APP_ID=tu-app-id-real
AWS_ACCESS_KEY_ID=tu-access-key (para deploy)
AWS_SECRET_ACCESS_KEY=tu-secret-key (para deploy)
```

### 3. Actualizar GitHub Actions Workflow

El archivo `.github/workflows/deploy-lambda.yml` ya está configurado para usar secrets:

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  WOLFRAM_APP_ID: ${{ secrets.WOLFRAM_APP_ID }}
```

### 4. Configurar AWS Lambda Variables

Las API keys en producción deben estar en AWS Lambda, no en el código:

```bash
# Usando AWS CLI
aws lambda update-function-configuration \
  --function-name AlexaProfesorUniversal \
  --environment Variables="{
    OPENAI_API_KEY=tu-api-key,
    GEMINI_API_KEY=tu-api-key,
    WOLFRAM_APP_ID=tu-app-id,
    AWS_REGION=us-east-1
  }" \
  --region us-east-1
```

O usando el script incluido:

```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### 5. Verificar que No Hay Secretos Expuestos

#### Escaneo Local con ggshield

```powershell
# Navegar al repositorio
cd C:\ruta\a\tu\AlexaProfesorUniversal

# Escanear todo el repositorio
python -m ggshield secret scan repo .

# Escanear solo archivos staged
python -m ggshield secret scan pre-commit

# Escanear un commit específico
python -m ggshield secret scan commit <commit-hash>

# Escanear últimos 10 commits
python -m ggshield secret scan commit-range HEAD~10..HEAD
```

#### Escaneo Rápido con Git Grep (Sin Instalar Nada)

```powershell
# Buscar API keys de Gemini
git grep "AIzaSy" -- "*.js"

# Buscar API keys de OpenAI
git grep "sk-proj-" -- "*.js"

# Buscar API keys de Claude
git grep "sk-ant-" -- "*.js"

# Buscar cualquier patrón de API key
git grep -E "(api[_-]?key|apikey|secret[_-]?key)" -- "*.js" "*.json" "*.env*"
```

Si no devuelve resultados = **Repositorio limpio** ✅

#### Verificar en el Dashboard de GitGuardian

1. Ve a https://dashboard.gitguardian.com/
2. Selecciona tu repositorio
3. Revisa la sección "Incidents"
4. Si aparece "No incidents found" = **Todo limpio** ✅

## 🚨 Si GitGuardian Detecta un Secreto

### Paso 1: Revocar el Secreto Inmediatamente

- **OpenAI**: https://platform.openai.com/api-keys → Revoke
- **Gemini**: https://aistudio.google.com/app/apikey → Delete
- **Wolfram**: https://account.wolfram.com/auth/create → Regenerate

### Paso 2: Limpiar el Historial de Git

⚠️ **ADVERTENCIA**: Esto reescribe el historial de Git. Solo hazlo si es absolutamente necesario.

```bash
# Opción 1: Usar BFG Repo-Cleaner (Recomendado)
# Descargar de https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt

# Opción 2: Usar git-filter-repo
pip install git-filter-repo
git filter-repo --replace-text passwords.txt

# Opción 3: Crear nuevo repositorio limpio (Más Fácil)
# 1. Crear nuevo repo en GitHub
# 2. Copiar solo archivos necesarios (sin .git)
# 3. Hacer commit inicial limpio
```

### Paso 3: Forzar Push (Solo si limpiaste historial)

```bash
git push --force origin main
```

### Paso 4: Notificar a Colaboradores

Si hay otros desarrolladores, deben hacer:

```bash
git fetch origin
git reset --hard origin/main
```

## ✅ Mejores Prácticas

### 1. Nunca Commitear Secretos

❌ **MAL:**
```javascript
const apiKey = "GEMINI_API_KEY_REDACTED";
```

✅ **BIEN:**
```javascript
const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
    console.error('GEMINI_API_KEY no configurada');
    return;
}
```

### 2. Usar .env para Desarrollo Local

```bash
# .env (NUNCA commitear este archivo)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
WOLFRAM_APP_ID=...
```

```javascript
// Cargar en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
```

### 3. Verificar .gitignore

```gitignore
# Archivos de secretos
.env
.env.local
.env.*.local
*.key
*.pem
secrets.json

# Archivos de configuración con secretos
config/secrets.js
lambda/.env
```

### 4. Rotar Secretos Regularmente

- Cada 90 días como mínimo
- Inmediatamente si hay sospecha de exposición
- Después de que un colaborador deje el proyecto

### 5. Usar AWS Secrets Manager (Producción)

Para producción enterprise, considera AWS Secrets Manager:

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName) {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(data.SecretString);
}

// Uso
const secrets = await getSecret('AlexaProfesorUniversal/prod');
const apiKey = secrets.GEMINI_API_KEY;
```

## 📊 Uso del Dashboard de GitGuardian

### Acceder al Dashboard

1. Ve a https://dashboard.gitguardian.com/
2. Inicia sesión con tu cuenta de GitHub
3. Verás todos tus repositorios monitoreados

### Funcionalidades Principales

#### 1. Internal Monitoring
- **Incidents**: Secretos detectados en tu código
- **Honeytokens**: Tokens trampa para detectar fugas
- **Analytics**: Estadísticas de escaneos y detecciones

#### 2. Ver Incidents (Secretos Detectados)

Si GitGuardian encuentra secretos:
- 📧 Recibirás un email de alerta
- 🔔 Aparecerá en el dashboard con detalles:
  - Tipo de secreto (API key, token, etc.)
  - Archivo y línea donde se encontró
  - Commit que lo introdujo
  - Severidad (Critical, High, Medium, Low)

#### 3. Resolver un Incident

Para cada secreto detectado puedes:
- **Mark as resolved**: Si ya lo corregiste
- **Ignore**: Si es un falso positivo
- **Share**: Compartir con tu equipo
- **View in GitHub**: Ver el commit directamente

#### 4. Configurar Alertas

Settings → Notifications:
- Email notifications (activado por defecto)
- Slack integration
- Webhook personalizado
- Discord integration

### Comandos Útiles del Dashboard

```powershell
# Ver estado de escaneo
python -m ggshield status

# Ver configuración actual
python -m ggshield config list

# Ignorar un secreto específico (agregar a .gitguardian.yaml)
python -m ggshield ignore <secret-hash>
```

### Archivo de Configuración (.gitguardian.yaml)

Puedes crear un archivo `.gitguardian.yaml` en la raíz del proyecto para personalizar el escaneo:

```yaml
# .gitguardian.yaml
version: 2

# Excluir archivos o carpetas del escaneo
paths-ignore:
  - "**/*.md"           # Ignorar archivos markdown
  - "**/test-events/**" # Ignorar eventos de prueba
  - "docs/archive/**"   # Ignorar documentación archivada

# Excluir patrones específicos
matches-ignore:
  - name: "Placeholder API Keys"
    match: "AIzaSy\\.\\.\\..*"  # Ignorar placeholders en docs
  - name: "Example Keys"
    match: "sk-proj-\\.\\.\\..*"

# Configurar severidad mínima
minimum-severity: high
```

---

**Última actualización**: Marzo 2026  
**Estado**: ✅ Repositorio limpio - Sin secretos expuestos


## 🔗 Recursos

- [GitGuardian Dashboard](https://dashboard.gitguardian.com/)
- [Documentación GitGuardian](https://docs.gitguardian.com/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [ggshield CLI Reference](https://docs.gitguardian.com/ggshield-docs/reference/ggshield)

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs de GitGuardian en el dashboard
2. Consulta la [documentación oficial](https://docs.gitguardian.com/)
3. Verifica el estado del servicio: https://status.gitguardian.com/
4. Abre un issue en el repositorio

## 🎓 Comandos de Referencia Rápida (Windows)

```powershell
# Escaneo básico del repositorio completo
python -m ggshield secret scan repo .

# Escaneo antes de commit (solo archivos staged)
python -m ggshield secret scan pre-commit

# Escanear un commit específico
python -m ggshield secret scan commit abc123

# Escanear rango de commits
python -m ggshield secret scan commit-range HEAD~10..HEAD

# Instalar hook automático para pre-commit
python -m ggshield install -m local

# Desinstalar hook
python -m ggshield install --mode local --uninstall

# Ver configuración actual
python -m ggshield config list

# Ver estado de autenticación
python -m ggshield status

# Ayuda general
python -m ggshield --help

# Ayuda de escaneo
python -m ggshield secret scan --help
```

## 📊 Monitoreo Continuo

Una vez configurado, GitGuardian te notificará automáticamente por email cuando detecte:
- ✅ Nuevos secretos en commits
- ✅ Secretos en pull requests
- ✅ Secretos en issues o comentarios
- ✅ Cambios en el estado de incidents

**Dashboard**: Revisa https://dashboard.gitguardian.com/ regularmente para ver el estado de seguridad de tu repositorio.
