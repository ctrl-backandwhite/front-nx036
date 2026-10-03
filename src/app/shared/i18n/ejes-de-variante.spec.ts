import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAVES_DE_EJE, claveDeEje } from './ejes-de-variante';

/**
 * El rótulo de un eje de variante se traduce, o no se enseña en el idioma de nadie.
 *
 * <p>QUÉ SE ROMPIÓ, dos veces y sin error de ningún tipo:
 *
 * <ul>
 * <li>La cabecera de la báscula de pesos componía la clave con `attr.` + el nombre en minúsculas.
 *     Acierta con «Color» —existe `attr.color`— y falla con «Talla», cuya clave es `attr.size`:
 *     la columna salía en español fijo en los ocho idiomas.
 * <li>Y antes de eso enseñaba «尺码» y «颜色» en crudo, porque las CLAVES de `options_json` seguían
 *     en chino aunque el eje ya tuviera nombre canónico.
 * </ul>
 *
 * <p>De ahí que esta prueba mire las dos puntas: que el mapa cubra el vocabulario que la base
 * escribe de verdad, y que cada clave exista en los OCHO diccionarios — si falta una, `t(key)`
 * devuelve la clave cruda y el comprador lee «attr.size».
 */
describe('Los ejes de variante se traducen', () => {
  /** Lo que `limpia_mezcla_idiomas.py` y `EjeDeVariante` escriben en la base. */
  const CANONICOS = ['Color', 'Talla', 'Tamaño', 'Medidas', 'Estampado', 'Longitud (cm)',
    'Altura recomendada', 'Talla de calcetín infantil'];
  const IDIOMAS = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it', 'nl'];

  it('cubre todos los términos canónicos que escribe la base', () => {
    for (const termino of CANONICOS) {
      expect(claveDeEje(termino), `el mapa no conoce «${termino}»`).toBeDefined();
    }
  });

  /** «Talla» y «Tamaño» comparten clave: es el caso que el atajo `attr.${nombre}` no podía acertar. */
  it('resuelve los sinónimos a la misma clave', () => {
    expect(claveDeEje('Talla')).toBe('attr.size');
    expect(claveDeEje('Tamaño')).toBe('attr.size');
  });

  it('no distingue mayúsculas ni espacios de alrededor', () => {
    expect(claveDeEje('  COLOR  ')).toBe('attr.color');
  });

  /** EL control: lo desconocido se enseña tal cual, no como una clave cruda. */
  it('no inventa clave para un eje que no conoce', () => {
    expect(claveDeEje('Material del forro')).toBeUndefined();
    expect(claveDeEje('')).toBeUndefined();
    expect(claveDeEje(null)).toBeUndefined();
  });

  it('cada clave del mapa existe en los ocho diccionarios', () => {
    const dir = join(__dirname, 'dictionary');
    const diccionarios = Object.fromEntries(
      IDIOMAS.map((i) => [i, readFileSync(join(dir, `${i}.ts`), 'utf8')]),
    );
    for (const clave of new Set(Object.values(CLAVES_DE_EJE))) {
      for (const idioma of IDIOMAS) {
        expect(diccionarios[idioma].includes(`'${clave}':`), `falta ${clave} en ${idioma}.ts`)
          .toBe(true);
      }
    }
  });
});
