# Sistema de Chamada Escolar

Projeto full-stack para entrada/saida de alunos com integracao ao diario do professor.

- Backend: Node.js + Express + MySQL (`school_attendance`)
- Frontend: HTML/CSS/JS puro
- Captura de eventos:
  - `DEVICE POST MODE` (`POST /api/device/events` com HMAC)
  - `LOCAL AGENT MODE` (`agent/localAgent.js`)

## UI Profissional (client)

- Layout padronizado: topbar + container + footer em paginas logadas
- Tema institucional (teal + cinza + branco), fonte Inter, componentes reutilizaveis
- Footer unificado com status da API (`/health/ready`)
- Favicon e logo centralizados em `client/assets`

### Troca de identidade visual

- Logo: `client/assets/logo.svg`
- Favicon: `client/assets/favicon.ico`
- Icone mobile: `client/assets/icon-192.png`

## Estrutura

```text
/server
  /src
    /routes
    /controllers
    /services
    /middlewares
    /utils
    /db
  /scripts
  server.js
  mockDiaryServer.js
  .env.example
/client
  /assets
  /css
  /js
    /core
    /components
    /pages
/agent
```

## Setup local

1. Backend:

```bash
cd server
npm install
cp .env.example .env
```

2. Banco:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS school_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p school_attendance < src/db/schema.sql
mysql -u root -p school_attendance < src/db/seed.sql
```

3. Rodar API:

```bash
npm run dev
```

4. (Opcional) mock do diario:

```bash
npm run mock-diary
```

5. Frontend:

- Abra `http://localhost:PORT/login.html`

## Credenciais seed

- Admin: `admin@escola.com` / `admin123`
- Professor: `prof@escola.com` / `teacher123`
- Device seed: `LEITOR-PORTARIA-01` / `secret-leitor-portaria-01`

## Scripts uteis (server)

- `npm run dev`: API com nodemon
- `npm run start`: API sem nodemon
- `npm run mock-diary`: mock diary server
- `npm run test`: testes Jest
- `npm run import:digital-csv`: importa CSV de digital para tabela staging
- `npm run sync:students-from-import`: sincroniza staging para `students`
- `npm run repair:students-rename`: repara schema caso `students` tenha sido renomeada incorretamente

## Importacao CSV (estavel)

Fluxo recomendado:

```bash
cd server
npm run import:digital-csv
npm run sync:students-from-import
```

Ou informando caminho customizado:

```bash
node scripts/importDigitalCsv.js "C:\\caminho\\arquivo.csv"
```

Melhorias implementadas no importador:

- Detecta separador automaticamente (`;` ou `,`)
- Aceita arquivos CRLF e LF
- Normaliza `credential_code` removendo espacos
- Ignora linhas incompletas e retorna preview de erros
- Salva sempre `raw_line` e `row_hash` para rastreabilidade

Tambem existe endpoint admin para upload:

- `POST /api/admin/import/digital-csv` (`multipart/form-data`, campo `file`)

## Troubleshooting

1. Erro `No database selected` no Workbench:
- Selecione o schema `school_attendance` ou execute `USE school_attendance;` antes dos `INSERT`.

2. Porta MySQL diferente:
- Ajuste `DB_PORT` no `.env` (ex.: `3308`).

3. `secure-file-priv` / `local_infile` bloqueado:
- Use o importador Node (`npm run import:digital-csv`) em vez de `LOAD DATA INFILE`.

4. CSV nao importa corretamente:
- Verifique se o arquivo esta em UTF-8 e se usa `;` ou `,` como separador.

5. `EADDRINUSE` ao subir API:
- Ja existe processo usando a porta. Mude `PORT` no `.env` ou encerre o processo atual.

## Robustez implementada no backend

- Validacao com Zod nas rotas principais:
  - `POST /api/auth/login`
  - `POST /api/device/events`
  - `POST /api/teacher/class-sessions`
  - `GET /api/teacher/class-sessions/:id/attendance`
  - `POST /api/teacher/attendance/manual`
- Erro padronizado com `requestId`:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload invalido"
  },
  "requestId": "..."
}
```

- Logs estruturados com `requestId`, `userId`, `role`, `deviceCode`, `statusCode` e `durationMs`
- Rate limit em `device/events` por IP + `device_code`
- Idempotencia forte para eventos (`organization + device + matricula + event_type + timestamp`)
- Persistencia em UTC (pool MySQL com `timezone=Z`)

## Checklist de producao

1. Definir `JWT_SECRET` forte e unico.
2. Ativar `COOKIE_SECURE=true` em HTTPS.
3. Configurar `CORS_ALLOWED_ORIGINS` explicitamente.
4. Rotacionar `DIARY_TOKEN` e `INTERNAL_API_KEY`.
5. Ativar monitoramento dos logs estruturados.
6. Validar politicas de backup do MySQL (schema + dados).
7. Revisar limites de rate-limit conforme carga real.
