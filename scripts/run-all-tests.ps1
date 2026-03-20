# run-all-tests.ps1
# Ejecuta todos los test events contra Lambda y registra logs detallados
# Uso: .\scripts\run-all-tests.ps1
# Uso parcial: .\scripts\run-all-tests.ps1 -Filter "math"

param(
    [string]$FunctionName = "AlexaProfesorUniversal",
    [string]$Region = "us-east-1",
    [string]$Filter = "",         # Filtrar por nombre de test (ej: "math", "ambig", "btn")
    [int]$LogWaitSeconds = 8,     # Segundos a esperar antes de buscar logs en CloudWatch
    [switch]$SkipLogs             # Saltar consulta de CloudWatch (solo ver respuesta Lambda)
)

$ErrorActionPreference = "Continue"
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = '1'

$TESTS_DIR = "$PSScriptRoot\..\test-events"
$LOG_DIR   = "$PSScriptRoot\..\test-events\results"
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$REPORT_FILE = "$LOG_DIR\report-$TIMESTAMP.txt"

# ── Colores ──────────────────────────────────────────────────────────────────
function Write-Header($msg)  { Write-Host "`n$('='*70)" -ForegroundColor Cyan;   Write-Host "  $msg" -ForegroundColor Cyan;   Write-Host $('='*70) -ForegroundColor Cyan }
function Write-OK($msg)      { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-FAIL($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-INFO($msg)    { Write-Host "  [INFO] $msg" -ForegroundColor Yellow }
function Write-LOG($msg)     { Write-Host "  [LOG]  $msg" -ForegroundColor Gray }
function Write-TIMING($msg)  { Write-Host "  [TIME] $msg" -ForegroundColor Magenta }

function Log($msg) {
    Add-Content -Path $REPORT_FILE -Value $msg -Encoding UTF8
}

# ── Obtener todos los test events ────────────────────────────────────────────
$allTests = Get-ChildItem -Path $TESTS_DIR -Filter "*.json" |
    Where-Object { $_.Name -notmatch "^(insights|out-|response-)" } |
    Where-Object { $Filter -eq "" -or $_.Name -match $Filter } |
    Sort-Object Name

Write-Header "PROFESOR UNIVERSAL IA - TEST SUITE  [$TIMESTAMP]"
Write-INFO "Funcion Lambda : $FunctionName ($Region)"
Write-INFO "Tests a ejecutar: $($allTests.Count)"
Write-INFO "Reporte en     : $REPORT_FILE"
Log "=== TEST SUITE $TIMESTAMP ==="
Log "Funcion: $FunctionName | Region: $Region | Tests: $($allTests.Count)"
Log ""

$totalOK = 0; $totalFail = 0; $globalStart = Get-Date

foreach ($testFile in $allTests) {
    $testName = $testFile.BaseName
    Write-Header "TEST: $testName"
    Log "`n--- TEST: $testName ---"

    # ── Leer payload ─────────────────────────────────────────────────────────
    $payloadPath = $testFile.FullName
    $payloadJson = Get-Content $payloadPath -Raw -Encoding UTF8
    $payload = $payloadJson | ConvertFrom-Json

    # Extraer info clave del payload para el log
    $reqType    = $payload.request.type
    $intentName = if ($reqType -eq "IntentRequest") { $payload.request.intent.name } else { $reqType }
    $slotValue  = if ($reqType -eq "IntentRequest") { $payload.request.intent.slots.question.value } else { ($payload.request.arguments -join ", ") }
    $sessionNew = $payload.session.new
    $hasAttribs = ($payload.session.attributes.PSObject.Properties.Count -gt 0)

    Write-INFO "Intent/Tipo  : $intentName"
    Write-INFO "Slot/Args    : $slotValue"
    Write-INFO "Sesion nueva : $sessionNew | Atributos previos: $hasAttribs"
    Log "Intent: $intentName | Slot: $slotValue | SesionNueva: $sessionNew | Atributos: $hasAttribs"

    if ($hasAttribs) {
        $attribKeys = ($payload.session.attributes.PSObject.Properties.Name) -join ", "
        Write-INFO "Atributos    : $attribKeys"
        Log "Atributos en sesion: $attribKeys"
    }

    # ── Invocar Lambda ───────────────────────────────────────────────────────
    $outFile = "$LOG_DIR\out-$testName.json"
    $invokeStart = Get-Date

    Write-INFO "Invocando Lambda..."
    Log "Invocando Lambda a las $(Get-Date -Format 'HH:mm:ss')..."

    try {
        aws lambda invoke `
            --function-name $FunctionName `
            --region $Region `
            --payload "fileb://$payloadPath" `
            --cli-binary-format raw-in-base64-out `
            --log-type Tail `
            --query "LogResult" `
            --output text `
            $outFile 2>&1 | Out-Null

        $invokeEnd  = Get-Date
        $invokeMs   = [int]($invokeEnd - $invokeStart).TotalMilliseconds
        Write-TIMING "Lambda respondio en $invokeMs ms (round-trip CLI)"
        Log "Round-trip CLI: ${invokeMs}ms"
    } catch {
        Write-FAIL "Error invocando Lambda: $_"
        Log "ERROR invocando Lambda: $_"
        $totalFail++
        continue
    }

    # ── Leer respuesta ───────────────────────────────────────────────────────
    if (-not (Test-Path $outFile)) {
        Write-FAIL "No se genero archivo de salida"
        Log "ERROR: Sin archivo de salida"
        $totalFail++
        continue
    }

    $responseRaw = Get-Content $outFile -Raw -Encoding UTF8
    try {
        $response = $responseRaw | ConvertFrom-Json
        $speech   = $response.response.outputSpeech.ssml -replace "<[^>]+>", "" -replace "\s+", " "
        $hasAPL   = $null -ne ($response.response.directives | Where-Object { $_.type -match "APL" })
        $reprompt = $response.response.reprompt.outputSpeech.ssml -replace "<[^>]+>", "" -replace "\s+", " "
        $shouldEnd = $response.response.shouldEndSession

        Write-OK   "Speech       : $($speech.Substring(0, [Math]::Min(120, $speech.Length)))..."
        Write-INFO "Reprompt     : $reprompt"
        Write-INFO "APL enviado  : $hasAPL | ShouldEndSession: $shouldEnd"
        Log "Speech: $speech"
        Log "Reprompt: $reprompt | APL: $hasAPL | ShouldEnd: $shouldEnd"

        # Atributos de sesion devueltos
        if ($response.sessionAttributes) {
            $outAttribKeys = ($response.sessionAttributes.PSObject.Properties.Name) -join ", "
            Write-INFO "Atrib. salida: $outAttribKeys"
            Log "Atributos salida: $outAttribKeys"

            # Detectar pendingAmbiguity en respuesta
            if ($response.sessionAttributes.pendingAmbiguity) {
                $pa = $response.sessionAttributes.pendingAmbiguity
                Write-INFO "pendingAmbiguity detectado:"
                Write-INFO "  InterpA: $($pa.interpretaciones[0])"
                Write-INFO "  InterpB: $($pa.interpretaciones[1])"
                Write-INFO "  CorrA  : $($pa.preguntaCorregidaA)"
                Write-INFO "  CorrB  : $($pa.preguntaCorregidaB)"
                Log "pendingAmbiguity: InterpA=$($pa.interpretaciones[0]) | InterpB=$($pa.interpretaciones[1])"
                Log "  CorrA: $($pa.preguntaCorregidaA) | CorrB: $($pa.preguntaCorregidaB)"
            }
        }

        $totalOK++
        Log "RESULTADO: OK"
    } catch {
        Write-FAIL "Error parseando respuesta: $_"
        Write-LOG  "Raw: $($responseRaw.Substring(0, [Math]::Min(300, $responseRaw.Length)))"
        Log "ERROR parseando: $_ | Raw: $responseRaw"
        $totalFail++
        continue
    }

    # ── CloudWatch Logs ──────────────────────────────────────────────────────
    if (-not $SkipLogs) {
        Write-INFO "Esperando ${LogWaitSeconds}s para logs CloudWatch..."
        Start-Sleep -Seconds $LogWaitSeconds

        $queryStart = [long]([DateTimeOffset]::UtcNow.AddSeconds(-30).ToUnixTimeMilliseconds())
        $queryEnd   = [long]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())

        $cwQuery = 'fields @timestamp, @message | filter @logStream like /$LATEST/ | filter @message like /IN-ASK|ROUTE|KEYWORD|WOLFRAM|CLAUDE|AMBIGUITY|SCIENCE|MATH|GPT-KW|WIKI|IMG-EXTRA|CACHE|TOTAL|ERROR|TIMEOUT|PROGRESSIVE/ | sort @timestamp asc | limit 60'

        try {
            $queryId = aws logs start-query `
                --log-group-name "/aws/lambda/$FunctionName" `
                --start-time $queryStart `
                --end-time $queryEnd `
                --query-string $cwQuery `
                --region $Region `
                --output text --query "queryId" 2>&1

            if ($queryId -match "^[a-f0-9-]{36}$") {
                Start-Sleep -Seconds 3
                $cwResult = aws logs get-query-results `
                    --query-id $queryId `
                    --region $Region `
                    --output json 2>&1 | ConvertFrom-Json

                Write-INFO "--- CloudWatch Logs ---"
                Log "--- CloudWatch Logs ---"

                foreach ($resultRow in $cwResult.results) {
                    $ts  = ($resultRow | Where-Object { $_.field -eq "@timestamp" }).value
                    $msg = ($resultRow | Where-Object { $_.field -eq "@message" }).value
                    if ($msg) {
                        # Extraer tiempo T+ si existe
                        $tMatch = [regex]::Match($msg, "T\+(\d+)ms")
                        $tStr   = if ($tMatch.Success) { " [T+$($tMatch.Groups[1].Value)ms]" } else { "" }

                        # Colorear por tipo de log
                        if ($msg -match "TIMEOUT|ERROR|FAIL") {
                            Write-FAIL "$ts$tStr $msg"
                        } elseif ($msg -match "ROUTE|KEYWORD|AMBIGUITY") {
                            Write-INFO "$ts$tStr $msg"
                        } elseif ($msg -match "TOTAL|OK\s*\|") {
                            Write-OK   "$ts$tStr $msg"
                        } else {
                            Write-LOG  "$ts$tStr $msg"
                        }
                        Log "$ts$tStr | $msg"
                    }
                }

                # Extraer tiempo total del log TOTAL
                $totalLog = $cwResult.results | ForEach-Object {
                    $m = ($_ | Where-Object { $_.field -eq "@message" }).value
                    if ($m -match "\[TOTAL\]\s*(\d+)ms") { $matches[1] }
                } | Select-Object -First 1

                if ($totalLog) {
                    Write-TIMING "Tiempo total Lambda: ${totalLog}ms"
                    Log "Tiempo total Lambda: ${totalLog}ms"
                }
            } else {
                Write-INFO "CloudWatch query no disponible (queryId: $queryId)"
            }
        } catch {
            Write-INFO "CloudWatch no disponible: $_"
        }
    }

    Write-INFO "Resultado guardado en: $outFile"
    Log "Output: $outFile"
}

# ── Resumen final ─────────────────────────────────────────────────────────────
$totalMs = [int]((Get-Date) - $globalStart).TotalMilliseconds
Write-Header "RESUMEN FINAL"
Write-OK   "Tests OK  : $totalOK"
if ($totalFail -gt 0) { Write-FAIL "Tests FAIL: $totalFail" } else { Write-INFO "Tests FAIL: 0" }
Write-TIMING "Tiempo total suite: ${totalMs}ms"
Write-INFO "Reporte completo: $REPORT_FILE"

Log ""
Log "=== RESUMEN: OK=$totalOK FAIL=$totalFail TOTAL_MS=$totalMs ==="
