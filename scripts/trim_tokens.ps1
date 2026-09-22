<#
.SYNOPSIS
    Trims transparent blank space from all token PNG images in public/assets/tokens.
.DESCRIPTION
    Scans the alpha channel of each PNG to find the bounding box of non-transparent
    pixels (alpha > 10). Crops the image tightly to the character silhouette with
    2px safety margin on top/left/right and 0px margin on bottom (flush with feet).
#>

$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class TokenTrimmer {
    public static string TrimFile(string filePath) {
        byte[] fileBytes = File.ReadAllBytes(filePath);
        using (var ms = new MemoryStream(fileBytes))
        using (var src = new Bitmap(ms)) {
            int width = src.Width;
            int height = src.Height;

            BitmapData data = src.LockBits(
                new Rectangle(0, 0, width, height),
                ImageLockMode.ReadOnly,
                PixelFormat.Format32bppArgb
            );

            int stride = data.Stride;
            byte[] pixels = new byte[stride * height];
            Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
            src.UnlockBits(data);

            int minX = width, maxX = 0, minY = height, maxY = 0;

            for (int y = 0; y < height; y++) {
                int rowOffset = y * stride;
                for (int x = 0; x < width; x++) {
                    byte a = pixels[rowOffset + x * 4 + 3];
                    if (a > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (minX > maxX || minY > maxY) {
                return string.Format("{0}: SKIPPED (empty/transparent)", Path.GetFileName(filePath));
            }

            // Margin: 2px on top, left, right (clamped), 0px on bottom so feet touch bottom edge
            int padLeft = Math.Min(2, minX);
            int padRight = Math.Min(2, width - 1 - maxX);
            int padTop = Math.Min(2, minY);
            int padBottom = 0;

            int cropX = minX - padLeft;
            int cropY = minY - padTop;
            int cropW = (maxX + padRight) - cropX + 1;
            int cropH = (maxY + padBottom) - cropY + 1;

            using (Bitmap cropped = src.Clone(new Rectangle(cropX, cropY, cropW, cropH), PixelFormat.Format32bppArgb)) {
                string tempFile = filePath + ".tmp";
                cropped.Save(tempFile, ImageFormat.Png);
                File.Delete(filePath);
                File.Move(tempFile, filePath);

                long newSize = new FileInfo(filePath).Length;
                return string.Format("{0}: {1}x{2} ({3:N0} KB) -> {4}x{5} ({6:N0} KB) [Cropped at ({7},{8})]",
                    Path.GetFileName(filePath),
                    width, height, fileBytes.Length / 1024.0,
                    cropped.Width, cropped.Height, newSize / 1024.0,
                    cropX, cropY
                );
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies "System.Drawing"

$tokenDirs = @(
    "c:\Repos\rpg_game\public\assets\tokens\stained-glass",
    "c:\Repos\rpg_game\public\assets\tokens\enamel"
)

Write-Host "=== Starting Token Trimming ===" -ForegroundColor Cyan

foreach ($dir in $tokenDirs) {
    if (-not (Test-Path $dir)) { continue }
    Write-Host "`nProcessing folder: $dir" -ForegroundColor Yellow

    $pngFiles = Get-ChildItem -Path $dir -Filter "*.png" | Where-Object { $_.Name -notlike "*.tmp" }
    foreach ($file in $pngFiles) {
        try {
            $result = [TokenTrimmer]::TrimFile($file.FullName)
            Write-Host "  $result" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR trimming $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Token Trimming Complete ===" -ForegroundColor Cyan
