# Sistema de Entrada/Saida Escolar + Diario do Professor

Projeto full-stack (Node/Express + MySQL + frontend puro) para registro de `IN/OUT` de alunos com dois modos de captura:

1. `DEVICE POST MODE`: dispositivo envia direto para `POST /api/device/events` com HMAC.
2. `LOCAL AGENT MODE`: script Node (`agent/localAgent.js`) roda no PC do leitor e faz POST na API.

## Padrao profissional aplicado

- Configuracao centralizada e validada em `server/src/config/env.js`
- Seguranca HTTP com `helmet` + compressao de resposta
- Rate limiting nas rotas de login, device events e rotas internas
- Endpoint de sessao `GET /api/auth/me` para o frontend validar role
- Health checks separados:
  - `GET /health/live` (liveness)
  - `GET /health/ready` (readiness + DB)
- Shutdown gracioso do servidor (SIGINT/SIGTERM)

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
  server.js
  mockDiaryServer.js
  .env.example
/client
  login.html
  admin.html
  teacher.html
  kiosk.html
  /css/styles.css
  /js/*.js
/agent
  localAgent.js
  README.md
```

## Requisitos

- Node.js 18+
- MySQL 8+

## Setup local

1. Instale dependencias do backend:

```bash
cd server
npm install
```

2. Configure variaveis de ambiente:

```bash
cp .env.example .env
```

3. Crie o banco e execute schema + seed:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS school_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p school_attendance < src/db/schema.sql
mysql -u root -p school_attendance < src/db/seed.sql
```

4. Rode o backend principal:

```bash
npm run dev
```

Se voce alterou `PORT` no `.env`, troque a porta nos exemplos abaixo.

5. (Opcional) Rode o mock diary server para testes de integracao:

```bash
npm run mock-diary
```

A API fica em `http://localhost:3000` e o frontend em `http://localhost:3000/login.html`.

## Credenciais seed

- Admin: `admin@escola.com` / `admin123`
- Professor: `prof@escola.com` / `teacher123`
- Device seed:
  - `device_code`: `LEITOR-PORTARIA-01`
  - `secret`: `secret-leitor-portaria-01`

## Worker de sincronizacao (diario)

- Roda automaticamente no backend a cada 1 minuto (`SYNC_INTERVAL_MS`).
- Reprocessa itens `PENDING/ERROR` com `next_retry_at <= now`.
- Backoff: `min(2^attempts, 30)` minutos.
- Endpoint de execucao manual (dev/test):
  - `POST /api/internal/diary-sync/run-once`
  - Header alternativo: `x-internal-key: INTERNAL_API_KEY`.

## Mock diary server

- `POST /api/attendance`
- `GET /api/attendance/logs`
- `POST /api/fail-mode` com `{ "mode": "none|always|random" }`

## Testes

```bash
cd server
npm test
```

## Importacao do CSV de digital

Tabela criada para esse arquivo: `importacao_digital_eventos`.

Script SQL da tabela:
- `server/src/db/importacao_digital_eventos.sql`

Importador automatico (Node):

```bash
cd server
npm run import:digital-csv
```

Para informar outro caminho de CSV:

```bash
cd server
node scripts/importDigitalCsv.js "C:\\caminho\\arquivo.csv"
```

Sincronizar alunos importados para a tabela oficial `students`:

```bash
cd server
npm run sync:students-from-import
```

Reparar schema caso a tabela `students` tenha sido renomeada/trocada por engano:

```bash
cd server
npm run repair:students-rename
```

## Exemplos de requisicoes (curl)

### 1) Login (professor/admin)

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prof@escola.com","password":"teacher123","organization_id":1}'
```

### 1.1) Ver sessao atual

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

### 2) Abrir aula (teacher)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/teacher/class-sessions \
  -H "Content-Type: application/json" \
  -d '{"turma_id":1,"hora_inicio":"07:30:00","hora_fim":"11:30:00"}'
```

### 3) Consultar presenca da sessao

```bash
curl -b cookies.txt http://localhost:3000/api/teacher/class-sessions/1/attendance
```

### 4) Enviar evento do device (com assinatura HMAC)

```bash
BODY='{"student_matricula":"2025001","event_type":"IN","event_time":"2026-02-14T11:20:00-04:00","method":"RFID"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac 'secret-leitor-portaria-01' | sed 's/^.* //')

curl -X POST http://localhost:3000/api/device/events \
  -H "Content-Type: application/json" \
  -H "x-device-code: LEITOR-PORTARIA-01" \
  -H "x-signature: $SIG" \
  -d "$BODY"
```

### 5) Local Agent mode

```bash
node ../agent/localAgent.js --student_matricula 2025001 --event_type IN --method RFID --event_time 2026-02-14T11:20:00-04:00
```
