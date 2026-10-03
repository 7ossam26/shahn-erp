# Dot-source to select the already downloaded, isolated runtime in this terminal only.
$p01Workspace = Split-Path -Parent $PSScriptRoot
$p01Node = Join-Path $p01Workspace '.tools/runtime/node-v24.21.0-win-x64'
$p01Npm = Join-Path $p01Workspace '.tools/npm/node_modules/.bin'
if (!(Test-Path (Join-Path $p01Node 'node.exe')) -or !(Test-Path (Join-Path $p01Npm 'npm.cmd'))) {
    throw 'Local pinned runtime is absent. Install Node 24.21.0 and npm 12.2.0 using the official instructions in docs/verification/P01/README.md.'
}
$env:PATH = $p01Npm + ';' + $p01Node + ';' + $env:PATH
node --version
npm --version
