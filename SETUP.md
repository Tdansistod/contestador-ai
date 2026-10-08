# Setup local (Fase 1 — sin gastar plata)

## Requisitos

- Node.js 20+
- Docker (recomendado para Postgres) **o** Postgres 16 instalado localmente

## 1. Clonar e instalar

```bash
git clone https://github.com/Tdansistod/contestador-ai.git
cd contestador-ai
npm install
cp .env.example .env
```

## 2. Base de datos

Con Docker (recomendado):

```bash
docker compose up -d
# esperar a que el healthcheck pase (~5 s)
npm run migrate
```

Sin Docker, crear la DB a mano y ajustar `DATABASE_URL` en `.env`.

## 3. Arrancar el servidor

```bash
npm run dev
# o: npm start
```

Probar:

```bash
curl http://localhost:3000/health
# → { "status": "ok", "env": "development", "llm": "mock", ... }
```

## 4. Tests del mock LLM

```bash
npm test
```

## Qué queda para después (sigue sin costo)

- OAuth ML + cliente con refresh de token (necesita App ID de developers.mercadolibre, gratis)
- Webhook + cola + worker de preguntas
- Job de reconciliación
- Panel HTML mínimo de aprobación
- Túnel HTTPS (Cloudflare Tunnel / ngrok)

Claude real solo cuando haya presupuesto (`LLM_PROVIDER=anthropic`).
