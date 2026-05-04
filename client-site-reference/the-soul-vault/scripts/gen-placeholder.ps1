$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$w, $h = 1280, 720
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(26, 26, 38))
$t1 = New-Object System.Drawing.Font 'Georgia', 42, ([System.Drawing.FontStyle]::Bold)
$b1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 230, 238))
$t2 = New-Object System.Drawing.Font 'Courier New', 20
$b2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(212, 175, 85))
$s1 = New-Object System.Drawing.StringFormat
$s1.Alignment = 'Center'
$s1.LineAlignment = 'Center'
$rect = [System.Drawing.RectangleF]::new(0.0, [single](($h / 2) - 70), [single]$w, 140.0)
$g.DrawString('Video Archived', $t1, $b1, $rect, $s1)
$rect2 = [System.Drawing.RectangleF]::new(0.0, [single](($h / 2) + 10), [single]$w, 60.0)
$g.DrawString('THE SOUL VAULT', $t2, $b2, $rect2, $s1)
$dest = Join-Path (Split-Path $PSScriptRoot -Parent) 'deleted-video-placeholder.jpg'
$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()
$t1.Dispose()
$t2.Dispose()
$b1.Dispose()
$b2.Dispose()
Write-Output "Wrote $dest"
