$root = Get-Location
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
  $_.FullName -notmatch '\\.git' -and $_.FullName -notmatch 'node_modules'
}

foreach ($file in $files) {
  try {
    $text = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
    $newText = $text -replace 'https://preploom\.com\.ng', 'https://www.preploom.com.ng'
    $newText = $newText -replace 'http://preploom\.com\.ng', 'http://www.preploom.com.ng'
    $newText = $newText -replace '(?<!@)preploom\.com\.ng(?![A-Za-z0-9._%+-])', 'www.preploom.com.ng'
    $newText = $newText -replace '(?<!@)preploom\.ng(?![A-Za-z0-9._%+-])', 'preploom.com.ng'
    if ($newText -ne $text) {
      Set-Content -Path $file.FullName -Value $newText -Encoding utf8
    }
  }
  catch {}
}
