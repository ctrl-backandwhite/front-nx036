// OJO con los nombres de estos imports: el idioma italiano se llama `it`, y `import it from './it'`
// TAPA la función `it` de las pruebas. El error que sale entonces no menciona el import: dice
// «Type Record<string, string> has no call signatures» señalando cada `it(...)` del fichero. Por eso
// el italiano entra como `italiano`.
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import italiano from './it';
import nl from './nl';
import pt from './pt';
import zh from './zh';

/**
 * Los ocho diccionarios tienen que tener las MISMAS claves.
 *
 * <p>Esta prueba cubre un agujero que la propia norma del proyecto daba por imposible de detectar:
 * «añadir una cadena es tocar ocho ficheros; dejar siete es dejar una pantalla en español para un
 * comprador alemán, y no lo detecta ninguna prueba». Ahora sí.
 *
 * <p>Y falla hacia los dos lados a propósito. Una clave que falta deja a ese idioma enseñando el
 * identificador crudo —`t()` devuelve la propia clave cuando no hay traducción, así que en pantalla
 * aparece `admin.carrier_coverage.title`—. Una clave que SOBRA es casi siempre una errata de nombre:
 * la pantalla pide una y el diccionario trae otra, con el mismo resultado y más difícil de encontrar.
 *
 * <p>El español es la referencia porque es el idioma en el que se escribe primero.
 */
describe('los ocho diccionarios dicen lo mismo', () => {
  /** El español es la referencia porque es el idioma en el que se escribe primero. */
  const otros: Record<string, Record<string, string>> = { en, pt, fr, it: italiano, de, nl, zh };
  const todos: Record<string, Record<string, string>> = { es, ...otros };

  const clavesEs = Object.keys(es).sort();

  for (const [nombre, diccionario] of Object.entries(otros)) {
    it(`${nombre} no deja ninguna clave sin traducir`, () => {
      const faltan = clavesEs.filter((clave) => !(clave in diccionario));

      expect(faltan).toEqual([]);
    });

    it(`${nombre} no trae claves que el español no tenga`, () => {
      const sobran = Object.keys(diccionario).filter((clave) => !(clave in es));

      expect(sobran).toEqual([]);
    });
  }

  for (const [nombre, diccionario] of Object.entries(todos)) {
    it(`${nombre} no deja ningún texto en blanco`, () => {
      const vacias = Object.entries(diccionario)
        .filter(([, texto]) => texto.trim().length === 0)
        .map(([clave]) => clave);

      expect(vacias).toEqual([]);
    });
  }

  it('el diccionario de referencia no está vacío', () => {
    // Si un día el import se rompe y llega un objeto vacío, las comprobaciones de arriba pasarían
    // todas sin comprobar nada.
    expect(clavesEs.length).toBeGreaterThan(1000);
  });
});
