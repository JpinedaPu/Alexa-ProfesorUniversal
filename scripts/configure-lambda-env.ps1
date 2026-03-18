# ============================================================================
# Script PowerShell para configurar variables de entorno en AWS Lambda
# ============================================================================
# Uso: .\configure-lambda-env.ps1 -FunctionName "nombre-funcion-lambda"
# Ejemplo: .\configure-lambda-env.ps1 -FunctionName "alexa-profesor-universal-skill"

param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# Función para escribir con colores
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Yellow "============================================"
Write-ColorOutput Yellow "Configurador de Variables de Entorno Lambda"
Write-ColorOutput Yellow "============================================"

# Verificar que existe el archivo .env
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) "lambda\.env"
if (-not (Test-Path $envFile)) {
    Write-ColorOutput Red "Error: Archivo .env no encontrado en $envFile"
    Write-ColorOutput Yellow "Crea un archivo .env con tus API keys"
    exit 1
}

Write-ColorOutput Green "✓ Archivo .env encontrado"

# Cargar variables desde .env
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Verificar variables críticas
$requiredVars = @("OPENAI_API_KEY", "WOLFRAM_APP_ID", "GEMINI_API_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-ColorOutput Red "Error: Faltan las siguientes variables en .env:"
    $missingVars | ForEach-Object { Write-ColorOutput Red "  - $_" }
    exit 1
}

Write-ColorOutput Green "✓ Todas las variables requeridas están presentes"
Write-ColorOutput Yellow "`nConfigurando variables en Lambda: $FunctionName"
Write-ColorOutput Yellow "Región: $Region"

# Construir JSON de variables de entorno
$envJson = @{
    Variables = @{
        OPENAI_API_KEY = $envVars["OPENAI_API_KEY"]
        WOLFRAM_APP_ID = $envVars["WOLFRAM_APP_ID"]
        GEMINI_API_KEY = $envVars["GEMINI_API_KEY"]
        NODE_ENV = "production"
    }
} | ConvertTo-Json -Compress

# Actualizar configuración de Lambda
try {
    Write-ColorOutput Yellow "`nEjecutando AWS CLI..."
    
    aws lambda update-function-configuration `
        --function-name $FunctionName `
        --environment $envJson `
        --region $Region
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "`n✓ Variables de entorno configuradas exitosamente en Lambda"
        Write-ColorOutput Yellow "✓ Las variables están encriptadas automáticamente por AWS"
        Write-ColorOutput Green "`n¡Listo! Ahora puedes desplegar tu skill con 'ask deploy'"
    } else {
        Write-ColorOutput Red "`n✗ Error al configurar variables de entorno"
        Write-ColorOutput Yellow "Verifica que:"
        Write-ColorOutput Yellow "  1. AWS CLI está instalado y configurado"
        Write-ColorOutput Yellow "  2. Tienes permisos para modificar la función Lambda"
        Write-ColorOutput Yellow "  3. El nombre de la función es correcto"
        exit 1
    }
} catch {
    Write-ColorOutput Red "`n✗ Error: $_"
    exit 1
}
