import { Component, computed, input } from '@angular/core';

const ANCHO = 80;
const ALTO = 22;
const MARGEN = 2;

/**
 * La línea diminuta que acompaña a un indicador.
 *
 * <p>Igual que la gráfica de barras, sin biblioteca: es una polilínea y su relleno. El color sale de la
 * variable del tema (`--color-primary`, `--color-success`…), no de un valor escrito aquí, para que
 * cambie con el tema claro y el oscuro sin tocar nada.
 *
 * <p>Va marcada como decorativa (`aria-hidden`): el dato ya está escrito al lado en cifras, y anunciar
 * dos veces lo mismo estorba a quien usa lector de pantalla.
 */
@Component({
  selector: 'nx-minigrafica',
  template: `
    <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="inline-block h-5 w-20 align-middle"
         aria-hidden="true">
      <polyline fill="none" [attr.stroke]="trazo()" stroke-width="1.6" stroke-linecap="round"
                stroke-linejoin="round" [attr.points]="puntos()" />
      <polyline [attr.fill]="trazo()" fill-opacity="0.12" stroke="none" [attr.points]="area()" />
    </svg>
  `,
})
export class Minigrafica {
  readonly datos = input.required<readonly number[]>();
  /** El tono del tema con el que se pinta. */
  readonly tono = input('primary');

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected readonly trazo = computed(() => `var(--color-${this.tono()})`);

  protected readonly puntos = computed(() => {
    const datos = this.datos();
    if (!datos.length) {
      return '';
    }
    const minimo = Math.min(...datos);
    // El recorrido nunca es cero: una serie plana dividiría por cero y la línea desaparecería.
    const recorrido = Math.max(1, Math.max(...datos) - minimo);
    const pasos = Math.max(1, datos.length - 1);
    return datos
      .map((valor, indice) => {
        const x = MARGEN + (indice * (ANCHO - 2 * MARGEN)) / pasos;
        const y = ALTO - MARGEN - ((valor - minimo) / recorrido) * (ALTO - 2 * MARGEN);
        return `${x},${y}`;
      })
      .join(' ');
  });

  /** La misma línea cerrada por abajo, que es lo que da la sombra bajo la curva. */
  protected readonly area = computed(() => {
    const linea = this.puntos();
    return linea ? `${MARGEN},${ALTO - MARGEN} ${linea} ${ANCHO - MARGEN},${ALTO - MARGEN}` : '';
  });
}
