$ErrorActionPreference = 'Stop'
try {
    $root = Split-Path -Parent $PSCommandPath
    $index = Join-Path $root 'index.html'
    $assetsRoot = [System.IO.Path]::GetFullPath((Join-Path $root 'assets'))
    $glb = Join-Path $assetsRoot 'models/casters/farolera/chiara_idle.glb'
    if (-not (Test-Path -LiteralPath $index)) { throw "Falta index.html en $root" }
    if (-not (Test-Path -LiteralPath $glb)) { throw "Falta modelo Farolera: $glb" }
    $listener = [System.Net.HttpListener]::new()
    $port = $null
    foreach ($candidate in @(8765, 8766, 8767, 9876)) {
        $prefix = "http://localhost:$candidate/"
        $listener.Prefixes.Clear()
        $listener.Prefixes.Add($prefix)
        try { $listener.Start(); $port = $candidate; break }
        catch { Write-Host "Puerto $candidate no disponible; probando otro..." }
    }
    if ($null -eq $port) { throw "No se pudo iniciar el servidor local." }
    $url = "http://localhost:$port/"
    Write-Host "LISTO: Abre $url" -ForegroundColor Green
    Write-Host "Puedes cerrar esta ventana para detener el visor. Three.js requiere Internet." -ForegroundColor Cyan
    try { Start-Process $url } catch { Write-Host "Abre manualmente $url" }
    $assetPrefix = $assetsRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
            $file = $null
            $type = 'application/octet-stream'
            if ($requestPath -eq '/' -or $requestPath -eq '/index.html') {
                $file = $index
                $type = 'text/html; charset=utf-8'
            } elseif ($requestPath.StartsWith('/assets/', [StringComparison]::OrdinalIgnoreCase) -and
                      $requestPath -match '\.(glb|fbx|zip|json|css)$') {
                $relative = $requestPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
                $candidateFile = [IO.Path]::GetFullPath((Join-Path $root $relative))
                if ($candidateFile.StartsWith($assetPrefix, [StringComparison]::OrdinalIgnoreCase) -and
                    (Test-Path -LiteralPath $candidateFile -PathType Leaf)) {
                    $file = $candidateFile
                    $type = switch ([IO.Path]::GetExtension($file).ToLowerInvariant()) {
                        '.glb' {'model/gltf-binary'}
                        '.fbx' {'application/octet-stream'}
                        '.zip' {'application/zip'}
                        '.json' {'application/json; charset=utf-8'}
                        '.css' {'text/css; charset=utf-8'}
                        default {'application/octet-stream'}
                    }
                }
            }
            if (-not $file) {
                $context.Response.StatusCode = 404
                $context.Response.Close()
                continue
            }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $context.Response.ContentType = $type
            $context.Response.ContentLength64 = $bytes.LongLength
            $context.Response.Headers.Add('Cache-Control', 'no-store')
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.Close()
        } catch {
            Write-Host "Error sirviendo archivo: $($_.Exception.Message)" -ForegroundColor Red
            try { $context.Response.StatusCode=500; $context.Response.Close() } catch {}
        }
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener) { try { $listener.Stop(); $listener.Close() } catch {} }
}
