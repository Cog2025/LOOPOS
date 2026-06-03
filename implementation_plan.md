# Plano de Ação: Reestruturação Monorepo (Frontend e Backend)

Este documento descreve a separação segura da estrutura atual do projeto, que possui arquivos misturados na raiz, em dois diretórios principais (`/frontend` e `/backend`). O objetivo é preparar o repositório para deploy no formato Vercel (Frontend) e Render (Backend), sem quebrar as dependências nativas (Capacitor/APK) nem a comunicação entre as partes.

## User Review Required

> [!IMPORTANT]
> Esta é uma etapa de planejamento. Nenhuma alteração foi realizada. Revise a árvore de diretórios proposta e as mudanças nas importações. Se concordar, me dê a permissão para iniciar a execução dos comandos de mover (`mv`) e as substituições de string.

## Open Questions

- A pasta `attachments/` atualmente guarda arquivos de código do backend (`app/`, `run.py`, etc.), mas também guarda estado local (`loopos_BACKUP_SQLITE.db`, `images/`). O plano moverá tudo isso para a pasta `/backend`. Onde você deseja armazenar as imagens do servidor (uploads) de forma persistente no Render? Na raiz do backend (`/backend/attachments`)?
- A inicialização do sistema (`iniciar_sistema.bat`) chamava o `run.py` na pasta `attachments/`. O script será atualizado para refletir o caminho novo (`/backend/run.py`).

## Proposed Changes

### 1. Separação de Arquitetura de Pastas

A nova árvore do projeto será:

```
/ (Raiz)
 ├── frontend/               # Código React, Vite, Capacitor
 ├── backend/                # Código Python, FastAPI, Banco SQLite
 ├── CHANGELOG.md            # Preservado na raiz
 ├── README.md               # Preservado na raiz
 ├── .gitignore              # Preservado na raiz
 ├── arquitetura_modelo.md   # Documentação (mantida na raiz)
 └── Plano de tarefas.txt    # Documentação (mantida na raiz)
```

### 2. Migração para o `/backend`

Os seguintes diretórios e arquivos serão movidos da raiz e de `attachments/` para `/backend`:

#### [NEW] /backend/app/
Move o código do FastAPI (routes, core, models) atualmente em `attachments/app/` para `backend/app/`.

#### [NEW] /backend/
Todos os scripts Python e dependências do Backend:
- `attachments/run.py` -> `backend/run.py`
- `attachments/seed_permissions.py` -> `backend/seed_permissions.py`
- `attachments/migrar_senhas.py` -> `backend/migrar_senhas.py`
- `attachments/os_api.py` (Se for código da API, será alocado corretamente nas rotas ou na raiz do backend).
- `requirements.txt` -> `backend/requirements.txt`
- `iniciar_sistema.bat` -> `backend/iniciar_sistema.bat`

#### Arquivos de Estado e Banco de Dados (Mover temporariamente para `/backend`)
- `attachments/loopos_BACKUP_SQLITE.db` -> `backend/loopos_BACKUP_SQLITE.db`
- `attachments/images/` -> `backend/images/` (ou `backend/attachments/`)
- `backup_loopos.sql` -> `backend/backups/`

**Ajustes de Importação Necessários (Backend):**
- Os imports do backend (ex: `from app.core...`) **não devem quebrar**, pois a pasta `app/` continuará sendo um módulo a partir de `/backend/`.
- O arquivo `run.py` pode precisar de ajustes caso aponte para pastas relativas.

---

### 3. Migração para o `/frontend`

A maior parte da raiz será empacotada em `/frontend`. Como a base Vite e Capacitor exigem uma estrutura plana por padrão, o Capacitor não irá quebrar, desde que *todas* as suas peças viagem juntas.

#### [NEW] /frontend/
- **Código Fonte React**: `components/`, `contexts/`, `services/`, `App.tsx`, `index.tsx`, `style.css`, `types.ts`, `constants.ts`, `env.d.ts`.
- **Assets e Build**: `assets/`, `dist/`, `index.html`.
- **Configurações Node/Vite**: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `.env.local`.
- **Capacitor e Native**: `capacitor.config.ts`, `android/`.

**Ajustes Necessários (Frontend):**
1. O arquivo `vite.config.ts` continuará definindo `@` para o seu próprio diretório (agora dentro de `frontend/`). O proxy `/api` apontando para `http://127.0.0.1:8000` continuará funcionando da mesma forma, sem quebrar as rotas do frontend.
2. A pasta do Capacitor (`android/`) continuará procurando o webDir `dist` na mesma pasta (`frontend/dist`), o que mantém a configuração atual perfeita.
3. Não haverá quebra de importações de componentes porque a estrutura relativa dentro de `/frontend/` será idêntica à antiga raiz.

## Verification Plan

### Automated / Syntax Check
1. Movimentação dos arquivos por script Bash.
2. Rodar `cd frontend && npx tsc --noEmit` para garantir que as importações de interface do React estão resolvidas.
3. Checagem das variáveis de caminho no Python (`python -m py_compile backend/run.py`).

### Manual Verification
O usuário será instruído a:
- Rodar o backend a partir da pasta `/backend` e verificar os logs.
- Rodar o frontend (`npm run dev`) a partir de `/frontend` e validar a comunicação com a API.
- Executar `npx cap sync android` na pasta `/frontend` para garantir que o projeto nativo móvel continua enxergando a build do webview.
