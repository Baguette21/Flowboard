$ErrorActionPreference = "Stop"

$sdk = Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk"
$ccacheDir = Join-Path $env:USERPROFILE "AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"

if (-not (Test-Path -LiteralPath $sdk)) {
  throw "Android SDK not found at $sdk"
}

$env:LOCALAPPDATA = Join-Path $env:USERPROFILE "AppData\Local"
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = (Join-Path $sdk "platform-tools") + ";" + (Join-Path $sdk "emulator") + ";" + $ccacheDir + ";" + $env:Path

pnpm exec react-native run-android --no-packager
