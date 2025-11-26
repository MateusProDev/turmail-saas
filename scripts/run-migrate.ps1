<#
.SYNOPSIS
    Script helper para executar a migracao de chaves de tenants.

.DESCRIPTION
    Carrega as credenciais do Service Account, define as variaveis de ambiente
    necessarias e executa o script Node `scripts/migrateEncryptTenantKeys.js` em
    modo dry-run e (opcionalmente) aplica as mudanças com --confirm.

.USAGE
  # Exemplo interativo (vai pedir caminhos/valores se faltar)
  pwsh ./scripts/run-migrate.ps1

  # Fornecendo argumentos e confirmando automaticamente
  pwsh ./scripts/run-migrate.ps1 -ServiceAccountPath 'C:\Users\mateo\Downloads\serviceAccount.json' -EncryptionKey 'TWmb...NQ=' -AutoConfirm

NOTAS DE SEGURANCA
    - Nao comite o JSON do Service Account nem exponha chaves em repositorios.
    - Este script define variaveis apenas na sessao atual do PowerShell.
#>

param(
    [string]$ServiceAccountPath = "",
    [string]$EncryptionKey = "",
    [switch]$AutoConfirm
)

function Read-EnvFromDotEnv([string]$filePath, [string]$key) {
    if (-not (Test-Path $filePath)) { return $null }
    $lines = Get-Content -Raw $filePath -ErrorAction SilentlyContinue
    if (-not $lines) { return $null }
    foreach ($line in $lines -split "\r?\n") {
        if ($line -match "^$key=(.*)$") { return $Matches[1].Trim() }
    }
    return $null
}

Write-Host "=== Run tenant keys migration helper ==="

# Service account JSON handling
if (-not $ServiceAccountPath) {
    $ServiceAccountPath = Read-Host "Caminho para serviceAccount.json (ou Enter para fornecer JSON via FIREBASE_SERVICE_ACCOUNT_JSON)"
}

if ($ServiceAccountPath) {
    if (-not (Test-Path $ServiceAccountPath)) {
        Write-Error "Arquivo nao encontrado: $ServiceAccountPath"
        exit 2
    }
    try {
        # Carrega o JSON inteiro e exporta para FIREBASE_SERVICE_ACCOUNT_JSON (mais seguro que depender do caminho)
        $saJson = Get-Content -Raw $ServiceAccountPath -ErrorAction Stop
        $env:FIREBASE_SERVICE_ACCOUNT_JSON = $saJson
        Write-Host "Service account JSON carregado na sessao (env FIREBASE_SERVICE_ACCOUNT_JSON definido)."
    } catch {
        Write-Error "Falha ao ler o JSON: $_"
        exit 2
    }
} else {
    Write-Host "Nenhum caminho de service account informado. O script tentara usar variaveis de ambiente ja presentes."
}

# TENANT_ENCRYPTION_KEY handling
if (-not $EncryptionKey) {
    # Tenta ler de .env.local primeiro
    $fromDotLocal = Read-EnvFromDotEnv -filePath ".env.local" -key "TENANT_ENCRYPTION_KEY"
    if ($fromDotLocal) {
        $EncryptionKey = $fromDotLocal
        Write-Host "TENANT_ENCRYPTION_KEY carregado de .env.local"
    } else {
        $fromDot = Read-EnvFromDotEnv -filePath ".env" -key "TENANT_ENCRYPTION_KEY"
        if ($fromDot) {
            $EncryptionKey = $fromDot
            Write-Host "TENANT_ENCRYPTION_KEY carregado de .env"
        }
    }
}

if (-not $EncryptionKey) {
    $inp = Read-Host "TENANT_ENCRYPTION_KEY nao encontrada - cole o valor aqui (ou Enter para abortar)"
    if (-not $inp) { Write-Error "TENANT_ENCRYPTION_KEY e necessaria. Abortando."; exit 2 }
    $EncryptionKey = $inp
}

# Define na sessão sem imprimir o valor
$env:TENANT_ENCRYPTION_KEY = $EncryptionKey
Write-Host "TENANT_ENCRYPTION_KEY definido na sessao (nao exibindo valor)."

# Execução do dry-run
Write-Host "Executando dry-run... (node ./scripts/migrateEncryptTenantKeys.js --dry-run)"
try {
    & node ./scripts/migrateEncryptTenantKeys.js --dry-run
    $dryCode = $LASTEXITCODE
} catch {
    Write-Error "Erro ao executar dry-run: $_"
    exit 2
}

if ($dryCode -ne 0) {
    Write-Warning "Dry-run finalizou com codigo $dryCode. Reveja a saida acima antes de prosseguir."
    if (-not $AutoConfirm) {
        $choice = Read-Host "Deseja prosseguir com --confirm mesmo assim? (y/N)"
        if ($choice -notin @('y','Y')) { Write-Host "Abortando conforme resposta do usuario."; exit 0 }
    }
} else {
    Write-Host "Dry-run finalizou com sucesso (codigo 0)."
    if (-not $AutoConfirm) {
        $choice = Read-Host "Aplicar mudancas com --confirm? (y/N)"
        if ($choice -notin @('y','Y')) { Write-Host "Abortando conforme resposta do usuario."; exit 0 }
    }
}

Write-Host "Executando migracao com --confirm..."
try {
    & node ./scripts/migrateEncryptTenantKeys.js --confirm
    $confCode = $LASTEXITCODE
} catch {
    Write-Error "Erro ao executar migracao: $_"
    exit 2
}

if ($confCode -eq 0) {
    Write-Host "Migracao concluida com sucesso. Verifique o Console do Firestore para confirmar os documentos atualizados."
} else {
    Write-Warning "Migracao finalizou com codigo $confCode. Reveja a saida acima para detalhes." 
}

Write-Host "Fim. Remova service account JSON do disco quando nao for mais necessario." 
