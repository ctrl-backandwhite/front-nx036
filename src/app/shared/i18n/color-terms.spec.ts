import { describe, expect, it } from 'vitest';
import { translateVariantCN } from './color-terms';

describe('translateVariantCN', () => {
  it('traduce un color que está en la tabla', () => {
    expect(translateVariantCN('黑色', 'es')).toBe('Negro');
  });

  /**
   * Esta tabla del front es CORTA a propósito: es una red para colores sueltos, no el diccionario.
   * El grueso viene traducido del servidor en `valueTranslations`, y por eso un color que aquí no
   * está —«藏青色»— se devuelve tal cual en vez de inventarse nada.
   */
  it('un color que no está en esta tabla se devuelve sin tocar', () => {
    expect(translateVariantCN('藏青色', 'es')).toBe('藏青色');
  });

  /**
   * Para esto existe la coincidencia parcial: el color lleva pegada una talla o un código que no hay
   * que traducir. El resultado se lee entero en español.
   */
  it('traduce el color y conserva el sufijo que no es chino', () => {
    expect(translateVariantCN('驼色M', 'es')).toBe('Camel M');
  });

  /**
   * Lo que se rompería en producción si esta prueba fallara —y es lo que estaba roto—: la báscula
   * enseñaba «Negro 定制» y «Rojo 定制酒» a quien navega en español.
   *
   * <p>La coincidencia parcial encontraba «黑色» dentro de «定制黑色», lo traducía y pegaba el resto
   * SIN TRADUCIR como si fuera un sufijo neutro. Media etiqueta en español y media en ideogramas es
   * peor que no traducir: parece un fallo de la tienda, y además oculta que al diccionario le falta
   * esa entrada, porque la cadena ya «tiene traducción».
   */
  it('no inventa media traducción cuando lo que sobra sigue siendo chino', () => {
    // La mezcla es lo que se prohíbe: letras latinas E ideogramas en la misma etiqueta.
    const mezcla = /(?:[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\s\S]*[\u4e00-\u9fff])|(?:[\u4e00-\u9fff][\s\S]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/;

    expect(translateVariantCN('定制黑色', 'es')).not.toMatch(mezcla);
    expect(translateVariantCN('定制酒红色', 'es')).not.toMatch(mezcla);
  });

  /**
   * Y al no poder traducirlo devuelve el original, para que quien lo pinta decida: la báscula lo
   * cambia por un guion cuando el idioma no es el chino, que es decir «no lo sé» sin fingir.
   */
  it('sin traducción completa devuelve el valor tal cual vino', () => {
    expect(translateVariantCN('定制黑色', 'es')).toBe('定制黑色');
    expect(translateVariantCN('定制酒红色', 'es')).toBe('定制酒红色');
  });

  it('en chino el valor se deja intacto', () => {
    expect(translateVariantCN('定制黑色', 'zh')).toBe('定制黑色');
  });
});
