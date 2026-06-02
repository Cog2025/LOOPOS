# Changelog

Todos os avisos e documentações de novas versões do sistema LoopOS serão listados neste arquivo.

## [v2.0.0-refactor] - 2026-06-02

Esta versão implementa o ciclo de Auditoria de Segurança, Performance, UX e Arquitetura, mantendo 100% de retrocompatibilidade com as versões legadas do aplicativo mobile (APK / Capacitor).

### 🔒 Security
- **Migração de Senhas para Bcrypt**: Refatoração completa da criptografia de senhas no backend, abandonando MD5 para adoção do Bcrypt, acompanhada por script automático de migração dos usuários legados.
- **Validação JWT**: Implementação de middleware (`get_current_user`) no FastAPI para proteção das rotas críticas utilizando tokens JWT no lugar de cabeçalhos literais. O sistema possui fallback de segurança (`X-User-Id`) para não quebrar a navegação do APK.
- **RBAC Granular "Zero Trust"**: 
  - Criação de permissões baseadas em "Slugs" (ex: `os.criar`, `os.editar`) no banco de dados.
  - O Backend passou a validar estritamente as ações com o middleware `verificar_permissao`.
  - O Frontend foi fortificado utilizando o hook global `useCan()`, ocultando componentes sensíveis caso o operador não possua autorização.
  - Nova tela de Administração de Permissões com painel gerencial da equipe e Seeders ativados.

### ⚡ Performance
- **Resiliência do Banco (Serverless Neon.tech)**: 
  - Atualização do `SQLAlchemy` para gerenciar pools de conexão otimizados para serverless (`pool_pre_ping=True`, `pool_recycle=300`).
  - Remoção de consultas em padrão `N+1` na listagem de Usinas, trazendo os relacionamentos de Planos e Ativos em queries agregadas (Eager Loading).
- **Paginação e Over-Fetching Backend**: O endpoint principal de Ordens de Serviço (`GET /api/os`) foi paginado. Adicionado parâmetro de escape `legacy=True` para respeitar o cache local do Capacitor.
- **Cache de Infraestrutura UI**: 
  - Adoção da biblioteca TanStack React Query (`useOSList.ts`) como gerenciador principal de estados assíncronos das páginas pesadas (Board, Schedule, Calendário), sem encostar no `DataContext` que alimenta o uso offline.

### 🎨 UX/UI
- **Feedback Fluido (Skeletons)**: Troca das telas de 'loading' estáticas por `Skeleton Loaders` elegantes em Tailwind nos componentes mais pesados (`Board`, `Calendar`, `Schedule52Weeks`), garantindo melhor percepção de carregamento.
- **Dark Mode Global**: 
  - Nova infraestrutura com script em linha no `<head>` (`index.html`) bloqueando FOUC (piscos brancos indesejados ao recarregar a tela no modo escuro).
  - Controle persistido em `localStorage` com hook `useDarkMode.ts` e toggle integrado no cabeçalho central (`Header.tsx`).
- **Responsividade Avançada**: 
  - As grades mensais densas de `Calendar` e de Cronograma `Schedule52Weeks` foram adaptadas para tolerar scrolls bidimensionais.
  - A visualização anual de Cronograma agora possui formato de "Tabela" contínua, onde as colunas ("Semanas") e as linhas ("Usinas") possuem aderência nativa (`sticky`), facilitando a navegação em celulares (scroll infinito responsivo).

### 🏗️ Architecture
- **Decomposição do Modal de Execução**: O gigantesco componente legado de execução da Ordem de Serviço (`OSExecutionModal`) foi fatorado para seguir o modelo de Módulos Independentes (S.O.L.I.D.):
  - Extração do timer do checklist (`ExecutionTimer.tsx`).
  - Desmembramento da checagem interativa (`SubtaskChecklist.tsx`).
  - Isolamento do núcleo de câmera nativa Capacitor (`PhotoUploader.tsx`).
  - Preservação da lógica pai para garantir a fila sincronizada (Online/Offline Sync).
