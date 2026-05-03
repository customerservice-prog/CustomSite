# Upload rebuilt index.html and videos.html to The Cestui Files project via admin API.
#
# Token: pass -Token, or set env CUSTOMSITE_UPLOAD_TOKEN or CUSTOMSITE_ADMIN_JWT (Supabase JWT for an admin account).
#
#   $env:CUSTOMSITE_UPLOAD_TOKEN = 'eyJ…'
#   $env:CUSTOMSITE_BASE = 'https://customsite.online'
#   .\operations\cestui-upload-site-files.ps1 -VideosOnly                  # uploads videos.html only (default disk path under repo)
#   .\operations\cestui-upload-site-files.ps1 -UseLiveIndex                # PUT index from live URL + PUT repo videos.html
#   .\operations\cestui-upload-site-files.ps1 -Token '…' -IndexPath 'C:\path\to\index.html' -VideosPath '...\client-site-reference\cestui-files\videos.html'

param(
    [Parameter(Mandatory=$false)][string]$Token = '',
    [Parameter(Mandatory=$false)][string]$IndexPath = '',
    [Parameter(Mandatory=$false)][string]$VideosPath = '',
    [switch]$UseLiveIndex,
    [switch]$VideosOnly,
    [string]$LiveIndexUrl = 'https://cestuiquevietrust.com/index.html',
    [string]$RepoRoot = '',
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

if ($Token.Trim() -eq '') {
    $Token = ($env:CUSTOMSITE_UPLOAD_TOKEN, $env:CUSTOMSITE_ADMIN_JWT | Where-Object { $_ -and $_.Trim() -ne '' } | Select-Object -First 1)
}
if (!$Token -or $Token.Trim() -eq '') { throw 'Missing JWT: pass -Token or set CUSTOMSITE_UPLOAD_TOKEN / CUSTOMSITE_ADMIN_JWT.' }

if ($RepoRoot.Trim() -eq '') {
    $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}
if ($VideosPath.Trim() -eq '') {
    $VideosPath = Join-Path $RepoRoot 'client-site-reference\cestui-files\videos.html'
}
if (!(Test-Path -LiteralPath $VideosPath)) { throw "videos file not found: $VideosPath" }

$indexResolved = ''
$fetchedIndexToTemp = $false

if (!$VideosOnly) {
    if ($IndexPath.Trim() -ne '' -and (Test-Path -LiteralPath $IndexPath)) {
        $indexResolved = $IndexPath
    } elseif ($UseLiveIndex -or ($IndexPath.Trim() -eq '')) {
        # Default: fetch current production index unless caller passed a missing path explicitly
        if ($IndexPath.Trim() -ne '') {
            throw "index file not found: $IndexPath"
        }
        $tmp = Join-Path $env:TEMP ("cestui-index-fetch-{0}.html" -f [Guid]::NewGuid().ToString('n').Substring(0, 8))
        Write-Host "GET $LiveIndexUrl  -> $tmp"
        try {
            Invoke-WebRequest -Uri $LiveIndexUrl -UseBasicParsing -OutFile $tmp -MaximumRedirection 5 -ErrorAction Stop
        } catch {
            Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
            throw ("Could not download live index ({0}). Use -IndexPath or fix URL." -f $LiveIndexUrl)
        }
        $indexResolved = $tmp
        $fetchedIndexToTemp = $true
    } else {
        throw "Provide -IndexPath to a readable index.html, or add -UseLiveIndex to reuse production index."
    }
}

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

if (!$VideosOnly) {
    Put-File 'index.html' $indexResolved
    if ($fetchedIndexToTemp -and (Test-Path -LiteralPath $indexResolved)) {
        Remove-Item -LiteralPath $indexResolved -Force -ErrorAction SilentlyContinue
    }
}

Put-File 'videos.html' $VideosPath

Write-Host 'Done — do NOT run this script for debate/documents/about (already saved per ops note).'
