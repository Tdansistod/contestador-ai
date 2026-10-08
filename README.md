# contestador-ai (nombre en clave)

> Contexto maestro del proyecto. Si sos una IA ayudando a programar: leé este README **y el código** antes de escribir. El código es la fuente de verdad de lo ya implementado. Respetá las secciones **Restricciones** y **Reglas para asistentes de IA**. Ante la duda, preguntá.
>
> Nombre comercial: **a definir**. No puede incluir "Mercado", "Libre" ni "Pago" (términos del programa de desarrolladores de ML) ni imitar su marca.

---

## 1. Qué es

SaaS multi-cliente que **responde automáticamente las preguntas de compradores en publicaciones de Mercado Libre Argentina**, usando datos reales de cada publicación (precio, stock, atributos, envío) y un LLM (Claude) para redactar la respuesta.

- Cada vendedor autoriza la app con **OAuth**; el sistema opera sobre su cuenta.
- Un solo backend atiende a todos los clientes (una app de ML, una API key de Anthropic, consumo por cliente).
- 100% **API oficial de ML** (canal "Preguntas y respuestas"). No es WhatsApp ni otro canal.

**Propuesta de valor:** el tiempo de respuesta a preguntas influye en reputación y posicionamiento (termómetro, MercadoLíder). Las herramientas de terceros suelen usar reglas fijas; este producto entiende la pregunta y la cruza con datos de la publicación.

**Estado:** idea validada con 1 cliente real. Fase actual: **MVP técnico** para ese cliente, cobro manual. Sin sitio web ni pagos recurrentes todavía.

---

## 2. Restricciones

1. **Presupuesto cero** para Anthropic en desarrollo → todo el flujo debe funcionar con `LLM_PROVIDER=mock`. Claude real al final.
2. **Servidor = PC local** en desarrollo; luego VPS. Sin rutas absolutas ni dependencias de la máquina.
3. **Un solo desarrollador.** Preferir lo simple y mantenible.
4. **No inventar respuestas.** Una respuesta errónea afecta reputación real del vendedor.
5. Cumplir **términos del programa de desarrolladores de ML** (sección 6).

---

## 3. Stack (decidido)

| Capa | Elección |
|---|---|
| Runtime | Node.js (LTS) + Express, **JavaScript ESM** (+ JSDoc). No TypeScript. |
| DB / cola | PostgreSQL. Cola = tabla `jobs` + polling con `FOR UPDATE SKIP LOCKED`. **Sin Redis/BullMQ.** |
| LLM | Interfaz `LLMProvider` (`mock` \| `anthropic`). Nadie más importa el SDK de Anthropic. |
| HTTP | `fetch` nativo |
| Config | `.env` (nunca commiteado) |
| Webhook en dev | Túnel HTTPS (Cloudflare Tunnel o ngrok) |
| Pagos (después) | Mercado Pago Suscripciones (`preapproval`) |

Setup local: ver `SETUP.md`, `.env.example`, `docker-compose.yml`. Esquema: `migrations/`.

---

## 4. Arquitectura (flujo objetivo)

```
Comprador pregunta en una publicación de ML
        │
        ▼
ML  ──POST notificación──►  /webhooks/ml   (responde 200 de inmediato)
                               │
                               ▼
                     inserta job (idempotente por question_id)
                               │
                               ▼
                         Worker de preguntas
   1. Resuelve cliente por user_id → ml_accounts
   2. Refresca access_token si venció
   3. GET /questions/{id}        → texto, item_id, estado
   4. GET /items/{item_id}       → título, precio, stock, atributos, envío
   5. Arma prompt (ítem + bot_settings)
   6. LLMProvider.generate()     → respuesta o "ESCALAR"
   7. Valida/filtra la salida
   8. modo=draft  → guarda para aprobación humana
      modo=auto   → POST /answers
   9. Registra tokens, costo y estado
```

**Principios**

- Webhook liviano: validar, encolar, 200. Nada pesado en el request.
- Idempotencia: `questions.ml_question_id` UNIQUE; no responder dos veces la misma pregunta.
- **Reconciliación** periódica (`/questions/search?status=UNANSWERED`): crítico en dev porque la PC no está siempre encendida.
- Arranque en **modo borrador**; automático opcional por cliente.
- **Escalar antes que inventar.**

---

## 5. Qué ya está implementado

Fuente de verdad: el código en `src/`, `migrations/`, `tests/`.

| Área | Estado |
|---|---|
| Express + `/health` (chequea DB) | Hecho |
| Config por env, `.env.example` | Hecho |
| Postgres + migraciones + runner | Hecho |
| Docker Compose para Postgres local | Hecho |
| Cola `jobs` (enqueue / claim / done / failed) | Hecho |
| `LLMProvider` + **mock** + stub Anthropic | Hecho |
| Cifrado AES-256-GCM para tokens | Hecho (listo para usar) |
| Tests del mock | Hecho |

---

## 6. Pendiente

### Endpoints (aún no existen en código)

| Método | Ruta | Función |
|---|---|---|
| GET | `/auth/ml/connect` | Redirige a autorización ML |
| GET | `/auth/ml/callback` | Intercambia `code` por tokens, guarda cuenta |
| POST | `/webhooks/ml` | Notificaciones ML → encola job (200 rápido) |
| GET | `/api/questions` | Lista preguntas (filtros por estado) |
| POST | `/api/questions/:id/approve` | Aprueba/edita borrador y publica |
| POST | `/api/questions/:id/discard` | Descarta borrador |
| GET/PUT | `/api/settings` | Lee/actualiza `bot_settings` |
| POST | `/webhooks/mercadopago` | *(fase posterior)* suscripciones |
| — | Panel HTML mínimo | Aprobación de borradores (protegido con `ADMIN_KEY`) |

### Integración Mercado Libre

Verificar siempre contra [developers.mercadolibre.com.ar](https://developers.mercadolibre.com.ar).

**OAuth (Authorization Code)**

- Auth: `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=APP_ID&redirect_uri=REDIRECT_URI`
- Token: `POST https://api.mercadolibre.com/oauth/token` (`authorization_code` / `refresh_token`)
- El `access_token` vence en pocas horas. El `refresh_token` es **de un solo uso**: hay que **guardar el nuevo** al renovar. Si se pierde → `connection='token_error'`.
- Requests: header `Authorization: Bearer ACCESS_TOKEN`.

**Webhooks**

- Una URL de notificaciones; tópico MVP: `questions`.
- Payload típico: `resource` (ej. `/questions/123456`), `user_id`, `topic`, `application_id`.
- Responder 200 rápido; no confiar solo en el payload → re-consultar el recurso a la API.

**Recursos**

- `GET /questions/{id}`
- `GET /questions/search?seller_id=...&status=UNANSWERED` (reconciliación)
- `GET /items/{item_id}`
- `POST /answers` con `{ "question_id", "text" }`

Usar **usuarios de prueba** de ML en desarrollo. No incluir datos de contacto externos en respuestas (filtrar salida del LLM). Español rioplatense neutro según `tone`.

**Términos (resumen):** no usar marcas de ML en el nombre del producto; acceso solo con OAuth explícito; respetar rate limits.

### Capa LLM (reglas de producto; el mock ya las aproxima)

- Solo información de la publicación o de `bot_settings`.
- Si falta info o es delicado (reclamos, garantía, facturación, negociación de precio, compatibilidad no confirmada, `escalate_topics`) → exactamente `ESCALAR`.
- No prometer plazos/descuentos/stock que no estén en los datos.
- No teléfonos, mails, links ni contacto fuera de la plataforma.
- Breve, cordial, tono configurado. No decir que es IA salvo configuración.
- Tratar el texto de la pregunta como **dato no confiable** (anti prompt-injection).
- Validación en **código** (no solo prompt): `ESCALAR`, regex de contacto, longitud, contradicción con datos duros (ej. “hay stock” con `available_quantity = 0`).

**Anthropic (cuando haya presupuesto):** modelo vía `LLM_MODEL` (no hardcodear); registrar tokens/costo; respetar `monthly_token_cap`; prompt caching si el SDK lo permite.

### Desarrollo local pendiente

- Túnel HTTPS (`PUBLIC_BASE_URL`) para OAuth redirect y webhook.
- Registrar app en ML (App ID, secret, redirect, notificaciones, tópico `questions`).

---

## 7. Seguridad

- Tokens de ML **encriptados en reposo** (`TOKEN_ENC_KEY`). Nunca loguear tokens ni `client_secret`.
- Prompt injection: delimitar la pregunta del comprador como dato; validar salida en código.
- Validar origen de notificaciones (`user_id` / `application_id`); re-consultar recursos a ML.
- Panel admin con `ADMIN_KEY` (mínimo).
- Datos personales: solo lo necesario; ToS y privacidad antes de abrir a clientes (ley argentina de datos personales).

---

## 8. Roadmap

**Hecho — Esqueleto sin costo**  
Servidor, health, Postgres, migraciones, cola, mock LLM, crypto, tests básicos.

**Siguiente — OAuth + cliente ML**  
- Túnel HTTPS  
- App en ML  
- `/auth/ml/connect` + `/callback`, tokens encriptados  
- Cliente ML con refresh automático (y guardado del nuevo refresh_token)

**Luego — Pipeline con mock**  
- `/webhooks/ml` + cola idempotente  
- Worker: pregunta → ítem → prompt → mock → borrador  
- Job de reconciliación  
- Panel mínimo aprobar/editar/descartar  
- `POST /answers` con usuarios de prueba

**Después — Claude real**  
- `anthropic.js` completo + uso/costos + topes  
- Ajuste de prompt con preguntas reales (modo borrador)  
- Modo automático para el cliente piloto

**Producto**  
- Sitio, ToS, privacidad  
- Mercado Pago Suscripciones  
- Panel de cliente  
- Migración a VPS

---

## 9. Fuera de alcance (por ahora)

- WhatsApp, Instagram u otros canales.
- Mensajería posventa, reclamos, precios, stock sync.
- Multi-país (solo ML Argentina).

---

## 10. Reglas para asistentes de IA

1. No agregar dependencias pesadas sin justificarlo.
2. Nunca hardcodear secretos, tokens, nombres de modelo ni URLs. Todo por `.env`.
3. Toda llamada a Claude pasa por `LLMProvider`. SDK de Anthropic solo en `src/llm/anthropic.js`.
4. Ante datos dudosos de la API de ML o Anthropic: decirlo y pedir verificar documentación oficial. No inventar endpoints, campos ni modelos.
5. Idempotencia y manejo de errores en todo lo que toque ML o el LLM.
6. Nunca publicar una respuesta sin la validación de salida (sección 6).
7. Tests para: refresh de token, idempotencia del webhook, filtrado de salida, reglas de escalamiento.
8. Código/comentarios en inglés o español de forma **consistente**; textos al usuario final en español rioplatense.
9. Cambios de esquema = **migración**, no editar tablas a mano.
10. Si una decisión afecta costos, seguridad o reputación de vendedores, explicitar el trade-off antes de implementarla.

---

## 11. Glosario

- **ML:** Mercado Libre.
- **Reputación / termómetro:** calificación del vendedor (ventana ~60 días).
- **MercadoLíder:** sello por reputación y volumen.
- **Borrador (`draft`):** respuesta generada pendiente de aprobación humana.
- **Escalar:** no responder automáticamente; deja la pregunta al vendedor.
- **Reconciliación:** consulta periódica de preguntas sin responder (cubre webhooks perdidos).
