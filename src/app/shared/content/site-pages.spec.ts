import { describe, expect, it } from 'vitest';
import { ABOUT, DocContent, pick } from './site-pages';

/** Los ocho idiomas en los que se publica la web. */
const IDIOMAS = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it', 'nl'] as const;

/**
 * Lo que «Sobre nosotros» le cuenta al mundo sobre NX036.
 *
 * <p><b>Por qué hay una prueba sobre un fichero de texto.</b> Esta es la página que un buscador indexa
 * palabra por palabra y la que lee quien quiere saber quiénes somos. Hasta el 25-sep-2026 describía
 * NX036 como un servicio de integración —«conecta tu tienda con Shopify o WooCommerce», «integraciones
 * nativas»— que NO se está ofreciendo, y lo hacía en los ocho idiomas a la vez.
 *
 * <p>Decisión del titular: mientras no se ofrezcan integraciones, no se nombran. Un texto no falla
 * nunca por sí solo —no hay error, no hay prueba en rojo, la página se pinta igual de bien—, así que
 * la única forma de que esto no vuelva a aparecer es comprobarlo.
 */
describe('Sobre nosotros', () => {
  /** Lo que no puede aparecer mientras no se ofrezca el servicio, en cualquier idioma. */
  const PROHIBIDO = /shopify|woocommerce|tiktok shop|integraci|integrate|集成|integrazion|integrier/i;

  function todoElTexto(doc: DocContent): string {
    return [doc.title, doc.intro, ...doc.sections.flatMap((s) => [s.h, ...s.p])].join(' ');
  }

  it.each(IDIOMAS)('no ofrece integraciones con tiendas en %s', (idioma) => {
    expect(todoElTexto(pick(ABOUT, idioma))).not.toMatch(PROHIBIDO);
  });

  /**
   * EL control: que no haya integraciones no puede significar que la página se haya quedado vacía o a
   * medias en algún idioma. Si se borra el texto en vez de reescribirlo, la comprobación de arriba
   * sale verde igualmente.
   */
  it.each(IDIOMAS)('describe la plataforma con contenido propio en %s', (idioma) => {
    const doc = pick(ABOUT, idioma);
    // El chino dice lo mismo en un tercio de los caracteres —la presentación completa cabe en 118—,
    // así que un mínimo único mide el idioma en vez del contenido: mide fuerte donde puede y flojo
    // donde tocaría, y la primera vez dio en rojo un texto que estaba perfectamente escrito.
    const minimo = idioma === 'zh' ? { intro: 60, parrafo: 15 } : { intro: 120, parrafo: 40 };
    expect(doc.title.length).toBeGreaterThan(1);
    expect(doc.intro.length).toBeGreaterThan(minimo.intro);
    expect(doc.sections.length).toBeGreaterThanOrEqual(5);
    expect(
      doc.sections.every((s) => s.h.length > 1 && s.p.every((p) => p.length > minimo.parrafo)),
    ).toBe(true);
  });

  /** Cada idioma tiene su propio texto: un `pick` mal resuelto dejaría a medio mundo leyendo español. */
  it('no sirve el texto español a los demás idiomas', () => {
    const espanol = todoElTexto(pick(ABOUT, 'es'));
    for (const idioma of IDIOMAS.filter((l) => l !== 'es')) {
      expect(todoElTexto(pick(ABOUT, idioma))).not.toBe(espanol);
    }
  });
});
