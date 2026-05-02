# Register cestiquevietrust.com (and optionally www) on the CustomSite Railway service via the platform API.
# Prerequisites:
#   - RAILWAY_API_TOKEN is set on the Railway service (server reads it if you omit -Token below).
#   - projects.railway_service_id_production = your Node/Express service UUID (Railway → service → Settings → Service ID).
#   - projects.custom_domain = cestiquevietrust.com (see operations/cestui-files-go-live.sql or admin PATCH).
#
# Usage:
#   $env:CUSTOMSITE_BASE = 'https://customsite.online'
#   .\operations\railway-attach-cestui-domain.ps1 -AdminBearerToken 'YOUR_JWT'
#
# Optional: pass -RailwayToken if the server does not have RAILWAY_API_TOKEN in env.

param(
  [Parameter(Mandatory = $true)][string]$AdminBearerToken,
  [string]$ProjectId = '55546683-c4f1-419c-a2d4-b35378679537',
  [string]$Domain = 'cestiquevietrust.com',
  [string]$BaseUrl = '',
  [string]$RailwayToken = ''
)

if ($BaseUrl.Trim() -ne '') {
  $b = $BaseUrl.TrimEnd('/')
} elseif ($env:CUSTOMSITE_BASE -and $env:CUSTOMSITE_BASE.Trim() -ne '') {
  $b = $env:CUSTOMSITE_BASE.TrimEnd('/')
} else {
  $b = 'https://customsite.online'
}

$uri = "$b/api/admin/projects/$ProjectId/railway/attach-custom-domain"
$body = @{
  domain     = $Domain
  includeWww = $true
}
if ($RailwayToken.Trim() -ne '') {
  $body.token = $RailwayToken.Trim()
}

$json = $body | ConvertTo-Json -Compress
Write-Host "POST $uri"
Write-Host $json

try {
  $r = Invoke-RestMethod -Uri $uri -Method Post -Headers @{
    Authorization = "Bearer $AdminBearerToken"
    'Content-Type' = 'application/json'
  } -Body $json -ErrorAction Stop
  $r | ConvertTo-Json -Depth 12
} catch {
  Write-Error $_
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  }
  exit 1
}

Write-Host ''
Write-Host 'Next: add DNS records at your registrar using Railway response (CNAME / TXT / A).'
