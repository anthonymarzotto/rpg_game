$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class TokenProcessor {
    private static bool IsBgColor(byte r, byte g, byte b, bool isEnamel) {
        if (r >= 230 && g >= 230 && b >= 230) {
            return true;
        }

        if (isEnamel) {
            int max = Math.Max(r, Math.Max(g, b));
            int min = Math.Min(r, Math.Min(g, b));
            int diff = max - min;
            int bri = (r + g + b) / 3;

            if (bri >= 120 && diff <= 48) {
                return true;
            }
            if (bri >= 160 && diff <= 54) {
                return true;
            }
        }

        return false;
    }

    private static void TrySeed(int x, int y, int width, int height, byte[] pixels, int stride, bool[] isBg, Queue<int> queue, bool isEnamel) {
        int pos = y * width + x;
        if (isBg[pos]) return;
        int idx = y * stride + x * 4;
        byte b = pixels[idx];
        byte g = pixels[idx + 1];
        byte r = pixels[idx + 2];
        if (IsBgColor(r, g, b, isEnamel)) {
            isBg[pos] = true;
            queue.Enqueue(pos);
        }
    }

    public static void RemoveBackground(string inputPath, string outputPath, bool isEnamel) {
        using (Bitmap src = new Bitmap(inputPath)) {
            int width = src.Width;
            int height = src.Height;
            using (Bitmap dest = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = src.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData destData = dest.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

                int byteCount = srcData.Stride * height;
                byte[] pixels = new byte[byteCount];
                byte[] outPixels = new byte[byteCount];
                Marshal.Copy(srcData.Scan0, pixels, 0, byteCount);
                Array.Copy(pixels, outPixels, byteCount);

                bool[] isBg = new bool[width * height];
                Queue<int> queue = new Queue<int>();

                for (int x = 0; x < width; x++) {
                    TrySeed(x, 0, width, height, pixels, srcData.Stride, isBg, queue, isEnamel);
                    TrySeed(x, height - 1, width, height, pixels, srcData.Stride, isBg, queue, isEnamel);
                }
                for (int y = 0; y < height; y++) {
                    TrySeed(0, y, width, height, pixels, srcData.Stride, isBg, queue, isEnamel);
                    TrySeed(width - 1, y, width, height, pixels, srcData.Stride, isBg, queue, isEnamel);
                }

                int[] dx = new int[] { 0, 0, 1, -1, 1, 1, -1, -1 };
                int[] dy = new int[] { 1, -1, 0, 0, 1, -1, 1, -1 };

                while (queue.Count > 0) {
                    int curr = queue.Dequeue();
                    int cx = curr % width;
                    int cy = curr / width;

                    int idx = cy * srcData.Stride + cx * 4;
                    outPixels[idx + 3] = 0;

                    for (int i = 0; i < 8; i++) {
                        int nx = cx + dx[i];
                        int ny = cy + dy[i];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            int nPos = ny * width + nx;
                            if (!isBg[nPos]) {
                                int nIdx = ny * srcData.Stride + nx * 4;
                                byte b = pixels[nIdx];
                                byte g = pixels[nIdx + 1];
                                byte r = pixels[nIdx + 2];
                                if (IsBgColor(r, g, b, isEnamel)) {
                                    isBg[nPos] = true;
                                    queue.Enqueue(nPos);
                                }
                            }
                        }
                    }
                }

                for (int y = 1; y < height - 1; y++) {
                    for (int x = 1; x < width - 1; x++) {
                        int pos = y * width + x;
                        if (!isBg[pos]) {
                            bool isNearBg = isBg[(y - 1) * width + x] || isBg[(y + 1) * width + x] || isBg[y * width + x - 1] || isBg[y * width + x + 1];
                            if (isNearBg) {
                                int idx = y * srcData.Stride + x * 4;
                                byte b = pixels[idx];
                                byte g = pixels[idx + 1];
                                byte r = pixels[idx + 2];
                                int max = Math.Max(r, Math.Max(g, b));
                                int min = Math.Min(r, Math.Min(g, b));
                                int diff = max - min;
                                int bri = (r + g + b) / 3;

                                if (bri > 170 && diff <= 50) {
                                    float factor = (255 - bri) / 85.0f;
                                    if (factor < 0.0f) factor = 0.0f;
                                    if (factor > 1.0f) factor = 1.0f;
                                    outPixels[idx + 3] = (byte)(255 * factor);
                                }
                            }
                        }
                    }
                }

                Marshal.Copy(outPixels, 0, destData.Scan0, byteCount);
                src.UnlockBits(srcData);
                dest.UnlockBits(destData);

                dest.Save(outputPath, ImageFormat.Png);
            }
        }
    }

    public static void SplitAndCenter(string inputPath, string outFemalePath, string outMalePath) {
        using (Bitmap src = new Bitmap(inputPath)) {
            int width = src.Width;
            int height = src.Height;
            using (Bitmap temp = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = src.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData tempData = temp.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

                int byteCount = srcData.Stride * height;
                byte[] pixels = new byte[byteCount];
                byte[] outPixels = new byte[byteCount];
                Marshal.Copy(srcData.Scan0, pixels, 0, byteCount);
                Array.Copy(pixels, outPixels, byteCount);

                bool[] isBg = new bool[width * height];
                Queue<int> queue = new Queue<int>();

                for (int x = 0; x < width; x++) {
                    TrySeed(x, 0, width, height, pixels, srcData.Stride, isBg, queue, false);
                    TrySeed(x, height - 1, width, height, pixels, srcData.Stride, isBg, queue, false);
                }
                for (int y = 0; y < height; y++) {
                    TrySeed(0, y, width, height, pixels, srcData.Stride, isBg, queue, false);
                    TrySeed(width - 1, y, width, height, pixels, srcData.Stride, isBg, queue, false);
                }

                int[] dx = new int[] { 0, 0, 1, -1, 1, 1, -1, -1 };
                int[] dy = new int[] { 1, -1, 0, 0, 1, -1, 1, -1 };

                while (queue.Count > 0) {
                    int curr = queue.Dequeue();
                    int cx = curr % width;
                    int cy = curr / width;

                    int idx = cy * srcData.Stride + cx * 4;
                    outPixels[idx + 3] = 0;

                    for (int i = 0; i < 8; i++) {
                        int nx = cx + dx[i];
                        int ny = cy + dy[i];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            int nPos = ny * width + nx;
                            if (!isBg[nPos]) {
                                int nIdx = ny * srcData.Stride + nx * 4;
                                if (IsBgColor(pixels[nIdx + 2], pixels[nIdx + 1], pixels[nIdx], false)) {
                                    isBg[nPos] = true;
                                    queue.Enqueue(nPos);
                                }
                            }
                        }
                    }
                }

                Marshal.Copy(outPixels, 0, tempData.Scan0, byteCount);
                src.UnlockBits(srcData);
                temp.UnlockBits(tempData);

                // Female bounds: X=[79, 494], Y=[99, 921]
                int fX = 75, fY = 95, fW = 425, fH = 835;
                using (Bitmap fDest = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(fDest)) {
                        g.Clear(Color.Transparent);
                        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        int destX = (1024 - fW) / 2;
                        int destY = (1024 - fH) / 2;
                        g.DrawImage(temp, new Rectangle(destX, destY, fW, fH), new Rectangle(fX, fY, fW, fH), GraphicsUnit.Pixel);
                    }
                    fDest.Save(outFemalePath, ImageFormat.Png);
                }

                // Male bounds: X=[563, 985], Y=[102, 921]
                int mX = 560, mY = 98, mW = 430, mH = 832;
                using (Bitmap mDest = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(mDest)) {
                        g.Clear(Color.Transparent);
                        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        int destX = (1024 - mW) / 2;
                        int destY = (1024 - mH) / 2;
                        g.DrawImage(temp, new Rectangle(destX, destY, mW, mH), new Rectangle(mX, mY, mW, mH), GraphicsUnit.Pixel);
                    }
                    mDest.Save(outMalePath, ImageFormat.Png);
                }
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

Write-Host "=== 1. Processing Enamel Set (Stripping Drop Shadows) ==="
$enamelFiles = Get-ChildItem -Path "c:\Repos\rpg_game\public\assets\tokens\enamel\*.jpg"
foreach ($f in $enamelFiles) {
    $out = [System.IO.Path]::ChangeExtension($f.FullName, ".png")
    Write-Host "Enamel: $($f.Name) -> $($out)"
    [TokenProcessor]::RemoveBackground($f.FullName, $out, $true)
}

Write-Host "=== 2. Splitting Dual Warrior Glass Images ==="
$dualGlassSource = "c:\Repos\rpg_game\public\assets\tokens\stained-glass\00_human_female_glass.jpg"
$outFemale = "c:\Repos\rpg_game\public\assets\tokens\stained-glass\00_human_female_glass.png"
$outMale = "c:\Repos\rpg_game\public\assets\tokens\stained-glass\00_human_male_glass.png"
Write-Host "Splitting $dualGlassSource into female ($outFemale) and male ($outMale)"
[TokenProcessor]::SplitAndCenter($dualGlassSource, $outFemale, $outMale)

Write-Host "All processing complete!"
