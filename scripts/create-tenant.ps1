# scripts/create-tenant.ps1
# Prompt simples para enviar um POST a /api/tenant/create-tenant com um ID token.
# Uso: abra PowerShell na raiz do projeto e rode:
#   .\scripts\create-tenant.ps1
#
try {
  # Allow token from env var, script arg, or interactive paste
  $token = $env:TENANT_TOKEN
  if (-not $token -and $args.Count -gt 0) { $token = $args[0] }
  if (-not $token) { $token = Read-Host -Prompt 'Cole aqui o ID token (somente o JWT, sem o prefixo Bearer)'}

  # Normalize token: trim whitespace, remove surrounding quotes, trailing colons/semicolons, and optional 'Bearer ' prefix
  if ($token) {
    $token = $token.Trim()
    $token = $token.Trim("'", '"')
    while ($token.EndsWith(':') -or $token.EndsWith(';')) { $token = $token.Substring(0,$token.Length-1).TrimEnd() }
    if ($token.StartsWith('Bearer ', [System.StringComparison]::OrdinalIgnoreCase)) { $token = $token.Substring(7).Trim() }
  }

  if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Error 'Token vazio — operação cancelada.'
    exit 1
  }

  $url = 'http://localhost:3001/api/tenant/create-tenant'
  $bodyObj = @{ name = 'Minha Empresa' }
  $body = $bodyObj | ConvertTo-Json -Depth 5

  Write-Host "Enviando POST para $url ..." -ForegroundColor Cyan
  $headers = @{ Authorization = "Bearer $token" }

  $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop

  Write-Host "Resposta HTTP OK:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Host "Erro ao enviar requisição:" -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    try {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $text = $sr.ReadToEnd(); $sr.Close()
      Write-Host $text
    } catch {
      Write-Host $_.Exception.Message
    }
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}
