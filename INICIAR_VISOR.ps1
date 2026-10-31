$ErrorActionPreference = 'Stop'
try {
    $root = Split-Path -Parent $PSCommandPath
    $index = Join-Path $root 'index.html'
    $glb = Join-Path $root 'chiara_idle.glb'
    if (-not (Test-Path -LiteralPath $index)) { throw "Falta index.html en $root" }
    if (-not (Test-Path -LiteralPath $glb)) { throw "Falta chiara_idle.glb en $root" }
    $listener = [System.Net.HttpListener]::new()
    $port = $null
    foreach ($candidate in @(8765, 8766, 8767, 9876)) {
        $prefix = "http://localhost:$candidate/"
        $listener.Prefixes.Clear()
        $listener.Prefixes.Add($prefix)
        try { $listener.Start(); $port = $candidate; break }
        catch { Write-Host "Puerto $candidate no disponible; probando otro..." }
    }
    if ($null -eq $port) { throw "No se pudo iniciar el servidor en los puertos 8765, 8766, 8767 o 9876." }
    $url = "http://localhost:$port/"
    Write-Host "LISTO: Abre $url" -ForegroundColor Green
    Write-Host "Cierra esta ventana cuando termines. Necesitas Internet para Three.js." -ForegroundColor Cyan
    try { Start-Process $url } catch { Write-Host "Abre manualmente $url en tu navegador." }
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $path = $context.Request.Url.AbsolutePath
            if ($path -eq '/' -or $path -eq '/index.html') {
                $file = $index
                $type = 'text/html; charset=utf-8'
            } elseif ($path -eq '/chiara_idle.glb') {
                $file = $glb
                $type = 'model/gltf-binary'
            } else {
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
            Write-Host "Error al entregar archivo: $($_.Exception.Message)" -ForegroundColor Red
            try { $context.Response.StatusCode=500; $context.Response.Close() } catch {}
        }
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener) { try { $listener.Stop(); $listener.Close() } catch {} }
}
