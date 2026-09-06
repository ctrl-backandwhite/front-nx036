import { Component } from '@angular/core';

/**
 * Los puntos que unen una etiqueta con su importe en un desglose.
 *
 * <p>Es una línea de puntos que se estira hasta llenar el hueco, no un texto con puntos escritos: así
 * los importes quedan alineados a la derecha sea cual sea el largo de la etiqueta y el idioma —el
 * neerlandés y el alemán son mucho más largos que el chino—, sin contar caracteres ni arriesgarse a
 * que una etiqueta parta la línea.
 *
 * <p>Va con `aria-hidden` porque es decoración: un lector de pantalla leyendo veinte puntos entre cada
 * concepto y su importe solo estorbaría.
 *
 * <p>La fila que lo use tiene que ser `flex items-baseline` —no `justify-between`—, porque los puntos
 * son quienes ocupan el espacio sobrante.
 */
@Component({
  selector: 'nx-guia-puntos',
  template: '',
  host: {
    'aria-hidden': 'true',
    class: 'flex-1 mx-1.5 border-b border-dotted border-base-300/80 translate-y-[-3px]',
  },
})
export class GuiaPuntos {}
