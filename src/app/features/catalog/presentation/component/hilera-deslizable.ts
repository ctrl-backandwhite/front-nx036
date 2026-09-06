import { Component, signal, viewChild, ElementRef } from '@angular/core';

/**
 * Una hilera que se desliza en el móvil, con INDICADOR de cuánto queda.
 *
 * <p>Sin el indicador, en el móvil no había forma de saber que la fila seguía: la barra de
 * desplazamiento está oculta a propósito —es lo que le da aspecto de aplicación— y solo asomaba media
 * tarjeta al borde. Seis productos por sección y el visitante veía dos y medio, sin ninguna señal de
 * que hubiera más. Lo preguntó el propio dueño del producto mirando la portada, que es la mejor prueba
 * de que no se entendía.
 *
 * <p>Una barra y no unos puntos: aquí el desplazamiento es CONTINUO, no por páginas, así que unos
 * puntos mentirían sobre en cuál estás.
 *
 * <p>MOBILE FIRST: hilera deslizable sin prefijo; de tableta hacia arriba (`md:`) vuelve a ser la
 * rejilla de siempre. `-mx-4 px-4` saca la hilera hasta el borde de la pantalla —sin ese detalle se ve
 * una caja recortada, no un carrusel— y `snap-x` encaja las tarjetas en lugar de dejarlas a medias.
 */
@Component({
  selector: 'nx-hilera-deslizable',
  template: `
    <div
      #caja
      (scroll)="mide()"
      (window:resize)="mide()"
      class="flex snap-x snap-mandatory overflow-x-auto gap-3 -mx-4 px-4 pb-1
             md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible md:mx-0 md:px-0
             [&>*]:w-[43%] [&>*]:shrink-0 [&>*]:snap-start
             md:[&>*]:w-auto md:[&>*]:shrink"
    >
      <ng-content />
    </div>
    @if (hayMas()) {
      <div aria-hidden="true" class="mt-2 h-0.5 w-full rounded-full bg-base-200 md:hidden">
        <div
          class="h-full rounded-full bg-brand-500 transition-[width,margin] duration-150"
          style="width: 38%"
          [style.margin-left.%]="avance() * 62"
        ></div>
      </div>
    }
  `,
})
export class HileraDeslizable {
  private readonly caja = viewChild<ElementRef<HTMLElement>>('caja');

  protected readonly avance = signal(0);
  protected readonly hayMas = signal(false);

  /**
   * Se vuelve a medir al desplazar y al cambiar el ancho: el ancho cambia al girar el teléfono y
   * cuando terminan de cargar las imágenes, así que medir solo al montar dejaba el indicador mintiendo.
   */
  protected mide(): void {
    const elemento = this.caja()?.nativeElement;
    if (!elemento) {
      return;
    }
    const recorrido = elemento.scrollWidth - elemento.clientWidth;
    this.hayMas.set(recorrido > 4);
    this.avance.set(recorrido > 0 ? elemento.scrollLeft / recorrido : 0);
  }
}
