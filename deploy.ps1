$ftpBase = 'ftp://semarain2.beget.tech'
$user = 'semarain2_sovmest'
$pass = '0XMIdGx4*IfO'
$cred = New-Object System.Net.NetworkCredential($user, $pass)

# Create directories
foreach ($dir in @('/public_html/css', '/public_html/js', '/public_html/data', '/public_html/data/users', '/public_html/keys')) {
    try {
        $req = [System.Net.FtpWebRequest]::Create($ftpBase + $dir)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "Created: $dir"
    } catch {
        Write-Host "Dir exists: $dir"
    }
}

# Upload files
$files = @{
    'E:\AG\Sovmestimost\index.html' = '/public_html/index.html'
    'E:\AG\Sovmestimost\css\style.css' = '/public_html/css/style.css'
    'E:\AG\Sovmestimost\js\data.js' = '/public_html/js/data.js'
    'E:\AG\Sovmestimost\js\engine.js' = '/public_html/js/engine.js'
    'E:\AG\Sovmestimost\js\ui.js' = '/public_html/js/ui.js'
    'E:\AG\Sovmestimost\js\app.js' = '/public_html/js/app.js'
    'E:\AG\Sovmestimost\auth.php' = '/public_html/auth.php'
    'E:\AG\Sovmestimost\api.php' = '/public_html/api.php'
    'E:\AG\Sovmestimost\finik.php' = '/public_html/finik.php'
    'E:\AG\Sovmestimost\keys\private.pem' = '/public_html/keys/private.pem'
    'E:\AG\Sovmestimost\admin.html' = '/public_html/admin.html'
    'E:\AG\Sovmestimost\.htaccess' = '/public_html/.htaccess'
    'E:\AG\Sovmestimost\manifest.json' = '/public_html/manifest.json'
    'E:\AG\Sovmestimost\sw.js' = '/public_html/sw.js'
    'E:\AG\Sovmestimost\icon-192.png' = '/public_html/icon-192.png'
    'E:\AG\Sovmestimost\icon-512.png' = '/public_html/icon-512.png'
}

foreach ($local in $files.Keys) {
    $remote = $files[$local]
    try {
        $req = [System.Net.FtpWebRequest]::Create($ftpBase + $remote)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.Credentials = $cred
        $req.UseBinary = $true
        $req.UsePassive = $true
        $content = [System.IO.File]::ReadAllBytes($local)
        $req.ContentLength = $content.Length
        $stream = $req.GetRequestStream()
        $stream.Write($content, 0, $content.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        $size = $content.Length
        Write-Host "OK: $local -> $remote ($size bytes)"
        $resp.Close()
    } catch {
        Write-Host "FAIL: $local"
        Write-Host $_.Exception.Message
    }
}
Write-Host "Deploy complete!"
