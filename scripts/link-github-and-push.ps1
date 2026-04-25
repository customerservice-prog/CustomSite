# Push main to GitHub. Default repo: customerservice-prog/CustomSite
# Usage:
#   .\scripts\link-github-and-push.ps1
#   .\scripts\link-github-and-push.ps1 -RepoUrl "https://github.com/OTHER/REPO.git"
#   .\scripts\link-github-and-push.ps1 -Force
param(
  [string] $RepoUrl = "https://github.com/customerservice-prog/CustomSite.git",
  [switch] $Force
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path (Split-Path $PSScriptRoot))
if (-not (Test-Path .git)) { throw "No .git in project root. Open the CustomSite folder as the workspace root." }
$has = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  if ($has -ne $RepoUrl) {
    Write-Host "Setting origin to: $RepoUrl (was: $has)"
    git remote set-url origin $RepoUrl
  } else {
    Write-Host "Origin already: $has"
  }
} else {
  git remote add origin $RepoUrl
  Write-Host "Added origin: $RepoUrl"
}
if ($Force) {
  Write-Host "Pushing with --force. Ctrl+C within 3s to cancel..."
  Start-Sleep -Seconds 3
  git push -u origin main --force
} else {
  git push -u origin main
}
Write-Host "Done. Check Railway if this repo is connected for deploy."
