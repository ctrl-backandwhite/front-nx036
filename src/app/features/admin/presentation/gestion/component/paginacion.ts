import { Component, computed, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El paginador de los listados del panel.
 *
 * <p>Vive en esta área y no en el sistema de diseño porque es el patrón concreto del panel —primera,
 * anterior, siguiente, última, con el «página N de M» a la izquierda—. Cuando las otras dos áreas del
 * panel necesiten el mismo, se sube a `@ds` de una vez y con acuerdo, no copiándolo.
 *
 * <p>Las dos flechas llevan NOMBRE ACCESIBLE propio: ««» y «»» no significan nada leídos en voz alta, y
 * sin etiqueta un lector de pantalla anuncia «botón» a secas. Ojo: la etiqueta SUSTITUYE al texto del
 * botón como nombre accesible, así que buscarlo por el símbolo deja de funcionar.
 *
 * <p>MOBILE FIRST: los cuatro botones caben en una fila estrecha porque son cortos; el rótulo se pliega
 * por encima cuando no cabe al lado.
 */
@Component({
  selector: 'nx-paginacion',
  template: `
    <div class="flex flex-wrap items-center justify-end gap-3 text-[12px]">
      <span class="opacity-70">
        {{ t('pagination.page') }} <strong>{{ pagina() + 1 }}</strong>
        {{ t('pagination.of') }} {{ ultima() }}
      </span>
      <div class="join">
        <button type="button" class="btn btn-sm join-item" [disabled]="enLaPrimera()"
                [attr.aria-label]="t('pagination.page') + ' 1'" (click)="ve(0)">«</button>
        <button type="button" class="btn btn-sm join-item" [disabled]="enLaPrimera()"
                (click)="ve(pagina() - 1)">{{ t('pagination.previous') }}</button>
        <button type="button" class="btn btn-sm join-item" [disabled]="enLaUltima()"
                (click)="ve(pagina() + 1)">{{ t('pagination.next') }}</button>
        <button type="button" class="btn btn-sm join-item" [disabled]="enLaUltima()"
                [attr.aria-label]="t('pagination.page') + ' ' + ultima()"
                (click)="ve(ultima() - 1)">»</button>
      </div>
    </div>
  `,
})
export class Paginacion {
  readonly pagina = input.required<number>();
  readonly paginas = input.required<number>();
  readonly cambia = output<number>();

  protected readonly t = inject(TraduccionService).t;

  /** Nunca menos de una: un listado vacío sigue siendo «página 1 de 1», no «1 de 0». */
  protected readonly ultima = computed(() => Math.max(1, this.paginas()));
  protected readonly enLaPrimera = computed(() => this.pagina() <= 0);
  protected readonly enLaUltima = computed(() => this.pagina() >= this.ultima() - 1);

  /** Se recorta al rango válido aquí y no en cada pantalla: pedir la página -1 no puede llegar a la red. */
  protected ve(destino: number): void {
    this.cambia.emit(Math.min(this.ultima() - 1, Math.max(0, destino)));
  }
}
