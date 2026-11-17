# Downloads every Work project cover listed in src/components/sites/impressiv/work/projects.ts
# and saves 960px-wide JPEGs to public/sites/impressiv/work/<file>.jpg.
# Usage: powershell -File scripts/download-impressiv-work.ps1
$root = Join-Path $PSScriptRoot '..'
$src = Get-Content (Join-Path $root 'src\components\sites\impressiv\work\projects.ts') -Raw
$out = Join-Path $root 'public\sites\impressiv\work'
New-Item -ItemType Directory -Force $out | Out-Null
Add-Type -AssemblyName System.Drawing
$ProgressPreference = 'SilentlyContinue'
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 80L

# p("slug", "title", "category", "year", "source"[, "file"])
$rx = [regex]'p\("([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"([^"]+)"(?:,\s*"([^"]+)")?\)'
$ok = 0
foreach ($m in $rx.Matches($src)) {
  $slug = $m.Groups[1].Value
  $file = if ($m.Groups[3].Success) { $m.Groups[3].Value } else { $slug }
  $dest = Join-Path $out "$file.jpg"
  if (Test-Path $dest) { $ok++; continue }
  $tmp = Join-Path $env:TEMP "iv-$file.src"
  try {
    Invoke-WebRequest -Uri ('https://impressiv.com.sa/wp-content/uploads/' + $m.Groups[2].Value) -OutFile $tmp -UseBasicParsing -TimeoutSec 120
    $img = [System.Drawing.Image]::FromFile($tmp)
    $w = [Math]::Min(960, $img.Width)
    $h = [int]($img.Height * $w / $img.Width)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($dest, $jpeg, $params)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose(); Remove-Item $tmp -Force
    $ok++
  } catch { "$file FAILED: $($_.Exception.Message)" }
}
"done: $ok images in $out"
