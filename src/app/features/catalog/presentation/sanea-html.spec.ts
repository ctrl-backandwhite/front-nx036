import { describe, expect, it } from 'vitest';
import { saneaHtml } from './sanea-html';

describe('saneaHtml', () => {
  it('deja pasar el marcado normal de una descripción', () => {
    expect(saneaHtml('<p>Lana <strong>merina</strong></p>')).toContain('<strong>merina</strong>');
  });

  /** La descripción la escribe un tercero al que no controlamos. */
  it('quita el guion que venga dentro', () => {
    expect(saneaHtml('<p>Hola</p><script>robar()</script>')).not.toContain('script');
  });

  it('sin descripción no hay nada que limpiar', () => {
    expect(saneaHtml(undefined)).toBe('');
  });
});
