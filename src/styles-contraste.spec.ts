import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El texto tiene que LEERSE, en tema claro y en tema oscuro.
 *
 * <p>QUÉ SE ROMPE. No se rompe nada visible: la página carga, no hay error de consola y el texto
 * está ahí. Simplemente no se lee, y solo se descubre mirándolo con la pantalla adecuada. Por eso
 * había tres sitios distintos con el mismo fallo y ninguno saltó nunca.
 *
 * <p>Medido contra preproducción el 27-sep-2026, con la relación de contraste real de cada texto
 * contra su fondo:
 *
 * <ul>
 * <li><b>opacity-60</b> sobre el fondo claro daba 4,25–4,34:1. Hacen falta 4,5. Estaba en 83 sitios.
 * <li><b>opacity-50</b> daba 3,21:1 —la fecha de los avisos—. Estaba en 22.
 * <li><b>btn-outline btn-warning</b> daba 2,32:1: «Comprar en origen (1688)» del panel de origen.
 * <li><b>btn-ghost text-error</b> daba 1,03:1 en claro y 1,2:1 en oscuro: ilegible en los dos.
 * </ul>
 *
 * <p>Esta prueba no mide la página —eso hace falta un navegador— sino las dos cosas que se pueden
 * comprobar sin él y que son las que fallaron: que la PALETA tenga contraste suficiente, y que no
 * vuelva a aparecer en la hoja de estilos el patrón que dejaba el texto sin color propio.
 */
describe('Contraste de la paleta y de la hoja de estilos', () => {
  const estilos = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

  /** Relación de contraste WCAG entre dos colores en notación `#rrggbb`. */
  function contraste(a: string, b: string): number {
    const luminancia = (hex: string): number => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lineal = c.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
    };
    const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (alta + 0.05) / (baja + 0.05);
  }

  /**
   * Lee un token de color del bloque del tema que se pida.
   *
   * <p>Los temas son bloques `@plugin "daisyui/theme"` con su `name:` dentro, y los tokens también
   * aparecen SUELTOS en reglas más abajo. Coger «el primero» y «el último» de todo el fichero, como
   * se escribió esto a la primera, leía colores de otro sitio y daba 6,07 donde el navegador medía
   * 4,34 — o sea, la prueba pasaba con una paleta que no era la real.
   */
  const NOMBRE_DEL_TEMA = { claro: 'nx036-pastel', oscuro: 'nx036-pastel-dark' } as const;

  function bloqueDelTema(tema: 'claro' | 'oscuro'): string {
    const nombre = NOMBRE_DEL_TEMA[tema];
    const bloques = [...estilos.matchAll(/@plugin "daisyui\/theme"\s*\{([\s\S]*?)\n\}/g)];
    const mio = bloques.find((b) => new RegExp(`name:\\s*"${nombre}"`).test(b[1]));
    expect(mio, `no encuentro el bloque del tema ${nombre}`).toBeTruthy();
    return mio![1];
  }

  function token(nombre: string, tema: 'claro' | 'oscuro'): string {
    const m = bloqueDelTema(tema).match(new RegExp(`--color-${nombre}:\\s*(#[0-9a-fA-F]{6})`));
    expect(m, `el tema ${NOMBRE_DEL_TEMA[tema]} tiene que declarar --color-${nombre}`).toBeTruthy();
    return m![1];
  }

  describe.each(['claro', 'oscuro'] as const)('tema %s', (tema) => {
    it('el texto normal se lee sobre los tres fondos', () => {
      const texto = token('base-content', tema);
      for (const fondo of ['base-100', 'base-200', 'base-300']) {
        expect(contraste(texto, token(fondo, tema)), `base-content sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    /**
     * El texto ATENUADO es el que falló en producción. Se escribe con la opacidad bajada, así que su
     * color efectivo es la mezcla con el fondo: al 70 % pasa, al 60 % y al 50 % no.
     */
    it.each([0.7, 0.6, 0.5])('la opacidad %s se mide contra el mínimo legible', (opacidad) => {
      const texto = token('base-content', tema);
      const fondo = token('base-100', tema);
      const mezcla = [1, 3, 5]
        .map((i) => {
          const f = parseInt(texto.slice(i, i + 2), 16);
          const b = parseInt(fondo.slice(i, i + 2), 16);
          return Math.round(f * opacidad + b * (1 - opacidad));
        })
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      const ratio = contraste('#' + mezcla, fondo);
      if (opacidad >= 0.7) {
        // 0,7 es el mínimo que se usa en textos atenuados y tiene que valer en LOS DOS temas.
        expect(ratio, `opacidad ${opacidad} tiene que llegar a 4,5`).toBeGreaterThanOrEqual(4.5);
      } else if (tema === 'claro') {
        // Por qué existe la norma de «0,7 como mínimo»: en el tema CLARO, 0,6 da 4,34 y 0,5 da 3,21.
        // Se afirma que NO llegan para que, si alguien aclara la tinta y pasaran a valer, esta prueba
        // avise de que la norma sobra en vez de arrastrarla para siempre sin motivo.
        //
        // En OSCURO las mismas opacidades sí cumplen —0,6 da 6,06—, porque la tinta clara sobre fondo
        // marino conserva mucho más contraste al mezclarse. La restricción es del tema claro.
        expect(ratio, `en claro, la opacidad ${opacidad} NO debería llegar a 4,5`).toBeLessThan(4.5);
      } else {
        expect(ratio, `en oscuro la opacidad ${opacidad} sí cumple`).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  /**
   * Y LA REGLA QUE LO CAUSABA: pintar un botón SIN relleno con el token `-content`, que es el color
   * para escribir ENCIMA del color sólido. Sobre el fondo de la página queda crema sobre blanco.
   */
  it('ningún botón sin relleno se pinta con un token -content', () => {
    // Se recorren BLOQUES de verdad —selector y sus llaves— y no una ventana de líneas: con la
    // ventana, la regla genérica de `.btn-outline` se llevaba por delante la declaración de la
    // siguiente y la prueba señalaba una línea inocente.
    for (const [, crudo, cuerpo] of estilos.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = crudo.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!/\.btn-ghost|\.btn-outline|\.text-destructive/.test(selector)) continue;
      // `base-content` NO cuenta: ese es justamente el token correcto, el color del texto normal.
      // Los que rompen son los `*-content` de ESTADO —error, warning, primary—, pensados para
      // escribir ENCIMA del color sólido y que sobre el fondo de la página quedan invisibles.
      const usaContentDeEstado = /color:\s*var\(--color-(?!base)[a-z]+-content\)/.test(cuerpo);
      expect(usaContentDeEstado, `${selector.slice(0, 70)} se pinta con un -content de estado`).toBe(
        false,
      );
    }
  });

  /** Los cuatro estados con contorno llevan su color derivado de `base-content`, no el crudo. */
  it.each(['error', 'warning', 'success', 'info'])(
    'btn-outline btn-%s deriva su texto de base-content',
    (estado) => {
      // `[^}]*` y no `[^)]*`: `color-mix()` lleva paréntesis anidados —`var(--color-error)`— y
      // cortando en el primer cierre nunca se llegaba a leer el `base-content` que se busca.
      const regla = new RegExp(
        `\\.btn-outline\\.btn-${estado}\\s*\\{[^}]*color:\\s*color-mix\\([^}]*--color-base-content`,
      );
      expect(regla.test(estilos), `falta la regla de .btn-outline.btn-${estado}`).toBe(true);
    },
  );
});
