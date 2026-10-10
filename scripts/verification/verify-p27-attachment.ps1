$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskAttachment = Resolve-Path 'docs/integration/tawsel-baseline/fff79bcb90aaba5676bbc0cd64d78d9ce93845b2/original-publisher.zip'
$taskArchive = [System.IO.Compression.ZipFile]::OpenRead($taskAttachment)
function Read-ArchiveBytes($entry) {
  if ($null -eq $entry) { throw 'PUBLISHER_ARCHIVE_ENTRY_MISSING' }
  $stream = $entry.Open()
  $buffer = [System.IO.MemoryStream]::new()
  try { $stream.CopyTo($buffer); return ,$buffer.ToArray() }
  finally { $stream.Dispose(); $buffer.Dispose() }
}
function Get-ByteHash([byte[]]$bytes) { return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant() }
try {
  $manifestBytes = Read-ArchiveBytes ($taskArchive.GetEntry('docs/erp/release-manifest.json'))
  if ((Get-ByteHash $manifestBytes) -ne '50cdbcdc420dc5ef2d3b7ba8415eb4d65c8705f8a3ce1bde3eb5ce59861ffe31') { throw 'PUBLISHER_ARCHIVE_MANIFEST_MISMATCH' }
  $manifest = [Text.Encoding]::UTF8.GetString($manifestBytes) | ConvertFrom-Json
  foreach ($entry in $manifest.artifacts) {
    $bytes = Read-ArchiveBytes ($taskArchive.GetEntry($entry.path))
    if ($bytes.Length -ne $entry.bytes -or (Get-ByteHash $bytes) -ne $entry.sha256) { throw "PUBLISHER_ARCHIVE_BYTE_MISMATCH: $($entry.path)" }
  }
  $evidence = @{ classification='Exact original archive artifact bytes; no text/newline normalization'; candidateCommit=$manifest.release.baseCommit; artifacts=$manifest.artifacts.Count; manifestBytes=$manifestBytes.Length; manifestSha256=(Get-ByteHash $manifestBytes); status='passed' }
  $evidence | ConvertTo-Json | Set-Content -Encoding utf8 'docs/verification/P27/original-archive-verification.json'
  $evidence | ConvertTo-Json
} finally { $taskArchive.Dispose() }
