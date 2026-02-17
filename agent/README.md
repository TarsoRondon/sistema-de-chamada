# Local Agent (Node)

Modo de uso rapido:

```bash
set AGENT_API_BASE_URL=http://localhost:3000
set AGENT_DEVICE_CODE=LEITOR-PORTARIA-01
set AGENT_DEVICE_SECRET=seu-segredo
node localAgent.js --student_matricula 2025001 --event_type IN --method RFID
```

Parametros:
- `--student_matricula` (obrigatorio)
- `--event_type` (`IN` ou `OUT`, obrigatorio)
- `--method` (`RFID`, `QR`, `FINGERPRINT`, opcional)
- `--event_time` (ISO8601, opcional)
- `--device_code` e `--device_secret` (opcional, substituem env)
