@echo off
:: Muda a página de código para UTF-8 para aceitar acentos no caminho
chcp 65001 >nul

echo --- INICIANDO SERVIDOR LOOP.OS ---

:: Usa o diretório onde o script bat está localizado
cd /d "%~dp0"

echo Diretório atual: %CD%
echo Iniciando o Uvicorn na porta 8000...

:: Chama o uvicorn apontando para app.main
call uvicorn app.main:app --host 0.0.0.0 --port 8000

echo.
echo O servidor parou ou ocorreu um erro.
pause