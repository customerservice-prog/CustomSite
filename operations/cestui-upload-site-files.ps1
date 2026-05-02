# Upload rebuilt index.html and videos.html to The Cestui Files project via admin API.
# Usage (PowerShell): run when API is reachable and you have your bearer token.
#
#   $env:CUSTOMSITE_BASE = 'https://customsite.online'
#   .\operations\cestui-upload-site-files.ps1 -Token 'YOUR_ACCESS_TOKEN' -IndexPath 'C:\path\to\index.html' -VideosPath 'C:\path\to\videos.html'

param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$IndexPath,
    [Parameter(Mandatory=$true)][string]$VideosPath,
    [string]$ProjectId = '55546683-c4f1-419c-a2d4-b35378679537',
    [string]$BaseUrl = ''
)

if ($BaseUrl.Trim() -ne '') {
    $b = $BaseUrl.TrimEnd('/')
} elseif ($env:CUSTOMSITE_BASE -and $env:CUSTOMSITE_BASE.Trim() -ne '') {
    $b = $env:CUSTOMSITE_BASE.TrimEnd('/')
} else {
    $b = 'https://customsite.online'
}

if (!(Test-Path -LiteralPath $IndexPath)) { throw "index file not found: $IndexPath" }
if (!(Test-Path -LiteralPath $VideosPath)) { throw "videos file not found: $VideosPath" }

$h = @{ 'Authorization' = "Bearer $Token"; 'Content-Type' = 'application/json' }

function Put-File($pathRel, [string]$diskPath) {
    $uri = "$b/api/admin/projects/$ProjectId/site/file"
    $content = Get-Content -LiteralPath $diskPath -Raw -Encoding utf8
    $bodyObj = @{ path = $pathRel; content = $content }
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 30 -Compress
    Write-Host "PUT $uri  path=$pathRel  chars=$($content.Length)"
    try {
        $r = Invoke-RestMethod -Uri $uri -Method Put -Headers $h -Body $bodyJson -ErrorAction Stop
        Write-Host "OK: $($r | ConvertTo-Json -Compress)"
    } catch {
        Write-Error $_
        if ($_.Exception.Response) {
            Write-Host ([string]$_.Exception.Response.StatusCode.value__)
        }
        throw
    }
}

Put-File 'index.html' $IndexPath
Put-File 'videos.html' $VideosPath

Write-Host 'Done — do NOT run this script for debate/documents/about (already saved per ops note).'
