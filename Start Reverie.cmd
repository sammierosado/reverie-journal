@echo off
rem Opens Reverie Journal in your default browser. Keep this window open while you write
rem (or install it as an app from Edge once, after which it opens without this window).
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist dist\index.html call npm run build
call npm run app
