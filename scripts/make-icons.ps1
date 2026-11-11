Add-Type -AssemblyName System.Drawing

function New-StrongKidsIcon {
  param([int]$Size, [string]$Path)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $radius = [float]($Size * 0.235)
  $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $rounded = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $rounded.AddArc(0, 0, $d, $d, 180, 90)
  $rounded.AddArc($Size - $d, 0, $d, $d, 270, 90)
  $rounded.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
  $rounded.AddArc(0, $Size - $d, $d, $d, 90, 90)
  $rounded.CloseFigure()

  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 255, 122, 89),
    [System.Drawing.Color]::FromArgb(255, 255, 178, 92),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $g.FillPath($bgBrush, $rounded)

  $sunBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 201, 74))
  $g.FillEllipse($sunBrush, [float]($Size * 0.735), [float]($Size * 0.19), [float]($Size * 0.10), [float]($Size * 0.10))

  $cx = [float]($Size / 2)
  $cy = [float]($Size * 0.485)
  $outer = [float]($Size * 0.295)
  $inner = [float]($Size * 0.128)
  $points = New-Object 'System.Drawing.PointF[]' 10
  for ($i = 0; $i -lt 10; $i++) {
    $angle = -[math]::PI / 2 + $i * [math]::PI / 5
    $r = if ($i % 2 -eq 0) { $outer } else { $inner }
    $points[$i] = New-Object System.Drawing.PointF([float]($cx + [math]::Cos($angle) * $r), [float]($cy + [math]::Sin($angle) * $r))
  }
  $starBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 248, 238))
  $g.FillPolygon($starBrush, $points)

  $tealBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 47, 184, 166))
  $g.FillEllipse($tealBrush, [float]($Size * 0.29), [float]($Size * 0.76), [float]($Size * 0.06), [float]($Size * 0.06))

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $bgBrush.Dispose()
  $sunBrush.Dispose()
  $starBrush.Dispose()
  $tealBrush.Dispose()
  $rounded.Dispose()
}

New-StrongKidsIcon -Size 192 -Path "public/icons/icon-192.png"
New-StrongKidsIcon -Size 512 -Path "public/icons/icon-512.png"
New-StrongKidsIcon -Size 180 -Path "public/icons/apple-touch-icon.png"
Write-Output "icons written"
