import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mockGenerate } from '../src/llm/mock.js';

describe('mock LLM', () => {
  it('returns a stock/price answer when data is present', async () => {
    const result = await mockGenerate({
      system: 'Sos un asistente de ventas.',
      user: 'Pregunta: tienen stock?\nTítulo: Auriculares Bluetooth\nPrecio: $15000\nStock: 5',
    });
    assert.equal(result.costUsd, 0);
    assert.ok(result.tokensIn > 0);
    assert.ok(result.tokensOut > 0);
    assert.match(result.text, /stock/i);
    assert.match(result.text, /15000/);
    assert.notEqual(result.text, 'ESCALAR');
  });

  it('escalates on zero stock', async () => {
    const result = await mockGenerate({
      system: '',
      user: 'Título: Algo\nPrecio: 100\navailable_quantity: 0',
    });
    assert.equal(result.text, 'ESCALAR');
  });

  it('escalates on sensitive topics', async () => {
    const result = await mockGenerate({
      system: '',
      user: 'Quiero hacer un reclamo por garantía y pedir factura A',
    });
    assert.equal(result.text, 'ESCALAR');
  });

  it('escalates when no structured item data is found', async () => {
    const result = await mockGenerate({
      system: '',
      user: 'Hola, cómo estás?',
    });
    assert.equal(result.text, 'ESCALAR');
  });
});
