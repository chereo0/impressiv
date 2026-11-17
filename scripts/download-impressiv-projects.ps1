# Downloads ImpressIV project cover images and resizes them to 1280px wide JPEGs
# for use as 3D textures and thumbnails. Usage: powershell -File scripts/download-impressiv-projects.ps1
param([string]$Out = (Join-Path $PSScriptRoot '..\public\sites\impressiv\projects'))

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Out | Out-Null
$ProgressPreference = 'SilentlyContinue'
$u = 'https://impressiv.com.sa/wp-content/uploads/'

$images = [ordered]@{
  'dawiyat-leap-2024'       = '2024/06/7TM_3024.jpg'
  'roshn-real-estate-2024'  = '2024/06/P26_5606-scaled.jpg'
  'zain-leap-2024'          = '2024/05/2N7A0808.jpg'
  'mobily-capacity-2024'    = '2024/06/0K4A2311.jpg'
  'tahakom-gitex-2023'      = '2024/06/0K4A6378.jpg'
  'saudi-post-identity'     = '2022/02/SAUDI%20POST%20IDENTITY%20LAUNCH%202021-e1644843165227.jpg'
  'stc-new-identity'        = '2022/02/STC-NEW-IDENTITY-LAUNCHING-EVENT-2021-Cover.jpg'
  'alrajhi-projection'      = '2022/02/AL-RAJHI-BUILDING-3D-PROJECTION-MAPPING-2021-Cover.jpg'
  'zain-5g-launch'          = '2020/05/Zain-5G-work-cover.jpg'
  'book-fair-2019'          = '2020/03/work-projects-book2019-impressiv-thumb.jpg.jpg'
  'national-day-89-gala'    = '2022/02/NATIONAL-DAY-89-GALA-DINNER-Cover.jpg'
  'anb-projection'          = '2022/02/ANB-BUILDING-3D-PROJECTION-MAPPING-Cover.jpg'
}

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L

foreach ($name in $images.Keys) {
  $tmp = Join-Path $env:TEMP "$name.src"
  try {
    Invoke-WebRequest -Uri ($u + $images[$name]) -OutFile $tmp -UseBasicParsing -TimeoutSec 120
    $img = [System.Drawing.Image]::FromFile($tmp)
    $w = [Math]::Min(1280, $img.Width)
    $h = [int]($img.Height * $w / $img.Width)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $w, $h)
    $dest = Join-Path $Out "$name.jpg"
    $bmp.Save($dest, $jpeg, $params)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    Remove-Item $tmp -Force
    "{0} {1}x{2} {3} KB" -f $name, $w, $h, [int]((Get-Item $dest).Length / 1KB)
  } catch {
    "$name FAILED: $($_.Exception.Message)"
  }
}
