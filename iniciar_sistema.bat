@echo off
:: Muda a página de código para UTF-8 para aceitar acentos no caminho
chcp 65001 >nul

echo --- INICIANDO SERVIDOR LOOP.OS ---

:: ✅ CORREÇÃO: Entramos na pasta 'attachments' (um nível antes de 'app')
:: O /d garante que funcione mesmo se o script estiver em outro disco (C:, D:, etc)
:: Entra na pasta correta onde está o main.py
cd /d "C:\Users\leona\Nextcloud\06. OPERAÇÃO\03. Tempo Real\LoopOS\LOOPOS\attachments"

echo Diretório atual: %CD%
echo Iniciando o Uvicorn na porta 80...

:: Agora o comando funciona pois ele enxerga a pasta 'app' a partir daqui
call uvicorn app.main:app --host 0.0.0.0 --port 80

echo.
echo O servidor parou ou ocorreu um erro.
pause