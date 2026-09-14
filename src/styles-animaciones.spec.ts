import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Las animaciones de entrada no pueden dejar un `transform` puesto para siempre.
 *
 * <p>QUÉ SE ROMPE EN PRODUCCIÓN. Un elemento con `transform` distinto de `none` se convierte en el
 * bloque contenedor de sus descendientes `position: fixed`. Con `animation-fill-mode: both`, el
 * último fotograma —`translateY(0)`, que parece inofensivo— SE QUEDA aplicado cuando la animación
 * termina, así que la sección animada sigue siendo ese bloque contenedor el resto de la visita. Un
 * visor a pantalla completa declarado `fixed inset-0` deja entonces de medir la ventana y pasa a
 * medir la sección: el fondo negro solo cubre ese trozo y la foto ampliada se sale por abajo.
 *
 * <p>Ya había pasado dos veces —de ahí los comentarios de `.animate-section-fade` y `.page-fade`, que
 * usan `backwards` por este mismo motivo— y volvió a pasar en la ficha de producto, cuya sección
 * llevaba `animate-fade-up`. Esta prueba existe para que no haya una tercera: el fallo no da error de
 * consola, solo una imagen desbordada que hay que ver para descubrir.
 */
describe('Animaciones de entrada de styles.css', () => {
  // Desde la raíz del proyecto: en la prueba empaquetada `import.meta.url` no es una ruta de disco.
  const estilos = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

  /** Los fotogramas que mueven, escalan o desplazan: los que dejan rastro si se fijan. */
  const CON_TRANSFORM = ['nx-fade-up', 'nx-scale-in', 'nx-slide-right'];

  function declaracionesCon(keyframe: string): string[] {
    return estilos
      .split('\n')
      .filter((linea) => linea.includes(`animation:`) && linea.includes(keyframe))
      .map((linea) => linea.trim());
  }

  it.each(CON_TRANSFORM)('ninguna regla fija el último fotograma de %s', (keyframe) => {
    const declaraciones = declaracionesCon(keyframe);

    expect(declaraciones.length).toBeGreaterThan(0);
    for (const declaracion of declaraciones) {
      // `both` = backwards + forwards; el que estorba es `forwards`, que retiene el transform final.
      expect(declaracion).not.toMatch(/\bboth\b/);
      expect(declaracion).not.toMatch(/\bforwards\b/);
    }
  });

  /** El fundido puro no mueve nada, así que puede retener su último fotograma sin consecuencias. */
  it('el fundido sin desplazamiento sí puede fijarse', () => {
    expect(declaracionesCon('nx-fade-in').some((d) => /\bboth\b/.test(d))).toBe(true);
  });
});
