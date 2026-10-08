/**
 * Deterministic mock LLM for development (zero cost).
 * Produces a simple answer from item data when available, or ESCALAR.
 *
 * The user message is expected to contain a JSON-ish or structured block
 * with item fields (title, price, available_quantity, etc.). This is a
 * best-effort parser so the full pipeline can be tested end-to-end.
 */

/**
 * @param {{ system: string, user: string, maxTokens?: number }} input
 * @returns {Promise<{ text: string, tokensIn: number, tokensOut: number, costUsd: number }>}
 */
export async function mockGenerate(input) {
  const user = input.user || '';
  const system = input.system || '';

  // Rough token estimates (mock only)
  const tokensIn = Math.ceil((system.length + user.length) / 4);
  let text = '';

  // Heuristics that mirror the real escalation rules
  const escalateKeywords = [
    'reclamo',
    'garantía',
    'garantia',
    'factura',
    'facturación',
    'facturacion',
    'descuento',
    'negociar',
    'precio más bajo',
    'compatibilidad',
    'compatible con',
  ];

  const lower = user.toLowerCase();
  if (escalateKeywords.some((k) => lower.includes(k))) {
    text = 'ESCALAR';
  } else {
    // Try to extract simple fields from the user prompt
    const priceMatch = user.match(/precio[:\s]*\$?\s*([\d.,]+)/i);
    const stockMatch = user.match(/(?:stock|available_quantity|cantidad)[:\s]*(\d+)/i);
    const titleMatch = user.match(/título[:\s]*(.+?)(?:\n|$)/i) || user.match(/title[:\s]*(.+?)(?:\n|$)/i);

    const price = priceMatch ? priceMatch[1] : null;
    const stock = stockMatch ? Number(stockMatch[1]) : null;
    const title = titleMatch ? titleMatch[1].trim() : null;

    if (stock === 0) {
      text = 'ESCALAR';
    } else {
      const parts = ['Hola!'];
      if (stock != null && stock > 0) {
        parts.push('Sí, tenemos stock disponible.');
      }
      if (price) {
        parts.push(`El precio es $${price}.`);
      }
      if (title) {
        parts.push(`Se trata de: ${title}.`);
      }
      if (parts.length === 1) {
        // No structured data found → escalate rather than invent
        text = 'ESCALAR';
      } else {
        parts.push('¿En qué más te puedo ayudar?');
        text = parts.join(' ');
      }
    }
  }

  const tokensOut = Math.ceil(text.length / 4);

  return {
    text,
    tokensIn,
    tokensOut,
    costUsd: 0,
  };
}
