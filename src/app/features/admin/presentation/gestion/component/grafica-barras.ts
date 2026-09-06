import { Component, computed, input } from '@angular/core';

/** Una barra ya colocada: la geometría se calcula una vez y la plantilla solo la pinta. */
interface Barra {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
  readonly rotulo: string;
}

/** Las medidas del lienzo. Son unidades del `viewBox`, no píxeles: la gráfica se estira con su hueco. */
const ANCHO = 100;
const ALTO = 36;
const HUECO = 0.6;

/**
 * La gráfica de barras del cuadro de mando, dibujada a mano en SVG.
 *
 * <p>SIN biblioteca: son barras verticales sobre un eje de treinta días y no hace falta nada más. Meter
 * una librería de gráficas para esto añadiría cientos de kilobytes al panel y una dependencia que
 * mantener al día por dos rectángulos.
 *
 * <p>Cada barra lleva su `<title>`, que es lo que enseña el navegador al pasar por encima. Es la forma
 * accesible de dar el dato exacto: no depende de JavaScript ni de que el ratón exista.
 *
 * <p>`preserveAspectRatio="none"` deja que el SVG se deforme para llenar el ancho disponible. Es lo que
 * se quiere aquí: importa la silueta de la serie, no que las barras sean cuadradas.
 */
@Component({
  selector: 'nx-grafica-barras',
  template: `
    <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" class="w-full h-24"
         role="img" [attr.aria-label]="descripcion()">
      @for (barra of barras(); track barra.x) {
        <rect [attr.x]="barra.x" [attr.y]="barra.y" [attr.width]="barra.ancho"
              [attr.height]="barra.alto" rx="0.4" [attr.fill]="color()">
          <title>{{ barra.rotulo }}</title>
        </rect>
      }
    </svg>
  `,
})
export class GraficaBarras {
  readonly dias = input.required<readonly string[]>();
  readonly valores = input.required<readonly number[]>();
  readonly color = input('#0f66c9');
  /** Cómo se escribe cada valor en su etiqueta emergente: cifra suelta, importe, porcentaje… */
  readonly formato = input<(valor: number) => string>((valor) => String(valor));
  readonly descripcion = input('');

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;

  protected readonly barras = computed<readonly Barra[]>(() => {
    const valores = this.valores();
    const dias = this.dias();
    if (!valores.length) {
      return [];
    }
    // El máximo nunca baja de uno: con todos los valores a cero, dividir daría infinito y las barras
    // saldrían con altura no numérica, que el navegador dibuja como un borrón.
    const maximo = Math.max(1, ...valores);
    const anchoDeBarra = (ANCHO - HUECO * (valores.length - 1)) / valores.length;
    const dar = this.formato();
    return valores.map((valor, indice) => {
      const alto = (valor / maximo) * (ALTO - 2);
      return {
        x: indice * (anchoDeBarra + HUECO),
        y: ALTO - alto,
        ancho: anchoDeBarra,
        alto,
        rotulo: `${dias[indice] ?? ''}: ${dar(valor)}`,
      };
    });
  });
}
