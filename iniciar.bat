@echo off
rem ============================================================
rem  CV sob medida - roda o projeto neste computador
rem
rem  iniciar.bat        -> abre no navegador deste computador
rem  iniciar.bat lan    -> tambem acessivel por celulares na mesma rede Wi-Fi
rem
rem  Precisa do Node.js 22 ou mais novo. Se nao tiver, este arquivo
rem  oferece instalar. Na primeira vez baixa as dependencias (1 a 2 min).
rem  Seus dados ficam salvos no navegador, nao nesta pasta.
rem ============================================================
setlocal
cd /d "%~dp0"
title CV sob medida
chcp 65001 >nul

rem  Aberto de dentro do ZIP, o Windows copia so este arquivo para uma pasta temporaria.
if not exist "package.json" (
  echo.
  echo  [ERRO] Nao achei os arquivos do projeto ao lado deste .bat.
  echo         Se voce baixou o ZIP, clique nele com o botao direito, escolha
  echo         "Extrair tudo" e rode o iniciar.bat de dentro da pasta extraida.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 goto :sem_node

rem  O Vite exige Node 20.19+ ou 22.12+.
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)" >nul 2>&1
if errorlevel 1 goto :node_antigo

rem  Instala as dependencias na primeira vez ou quando o projeto foi atualizado.
set "INSTALAR="
if not exist "node_modules\.package-lock.json" set "INSTALAR=1"
if not defined INSTALAR (
  node -e "const fs=require('fs');process.exit(fs.statSync('package-lock.json').mtimeMs>fs.statSync('node_modules/.package-lock.json').mtimeMs?1:0)" >nul 2>&1
  if errorlevel 1 set "INSTALAR=1"
)
if defined INSTALAR (
  echo.
  echo  Instalando dependencias, so na primeira vez ou depois de atualizar...
  echo.
  call npm ci --no-audit --no-fund --loglevel=error
  if errorlevel 1 goto :falha
)

set "HOST_ARG="
if /i "%~1"=="lan" set "HOST_ARG=--host"

echo.
echo  ------------------------------------------------------------
echo   CV sob medida
echo   O navegador abre sozinho. Se nao abrir, use o endereco
echo   "Local" que aparece logo abaixo.
if defined HOST_ARG (
  echo   No celular, na mesma rede Wi-Fi, use o endereco "Network".
)
echo   Para encerrar: feche esta janela ou aperte Ctrl+C.
echo  ------------------------------------------------------------
echo.

call npm run dev -- --open %HOST_ARG%
echo.
echo  Servidor encerrado.
pause
exit /b 0

:sem_node
echo.
echo  [AVISO] O Node.js nao esta instalado. Ele e necessario para rodar o projeto.
goto :instalar_node

:node_antigo
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo.
echo  [AVISO] Seu Node.js e o %NODEV%, antigo demais. O projeto precisa do 22 ou mais novo.
goto :instalar_node

:instalar_node
where winget >nul 2>&1
if errorlevel 1 goto :node_manual
echo.
choice /c SN /n /m " Instalar o Node.js LTS agora pelo winget? [S/N] "
if errorlevel 2 goto :node_manual
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto :node_manual
echo.
echo  Node.js instalado. FECHE esta janela e rode o iniciar.bat de novo
echo  ^(o Windows so reconhece o Node.js numa janela nova^).
echo.
pause
exit /b 0

:node_manual
echo.
echo  Baixe e instale a versao LTS em https://nodejs.org ^(vou abrir a pagina^).
echo  Depois feche esta janela e rode o iniciar.bat de novo.
start "" "https://nodejs.org/pt-br/download"
echo.
pause
exit /b 1

:falha
echo.
echo  [ERRO] Nao foi possivel instalar as dependencias.
echo         Verifique a conexao com a internet e rode o iniciar.bat de novo.
echo         Se continuar, apague a pasta node_modules e tente outra vez.
echo.
pause
exit /b 1
