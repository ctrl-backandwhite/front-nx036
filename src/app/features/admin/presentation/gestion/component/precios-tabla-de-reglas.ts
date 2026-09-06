import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPencil, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Seleccion } from '../../../application/gestion/state/seleccion';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  ReglaDePrecio,
  huellaDeRegla,
  huellasDuplicadas,
  tieneTramo,
} from '../../../domain/gestion/model/precios';

/**
 * La tabla de reglas de margen.
 *
 * <p>Aquí no se calcula ningún precio: se PINTA la regla con la que el backend lo calculará. El importe
 * fijo y los extremos del tramo pasan por `ImportesStore` para leerse en la divisa activa; el dato
 * canónico sigue siendo el dólar.
 *
 * <p>Se marcan las reglas DUPLICADAS —misma huella, hacen lo mismo y sobra una—: son, junto con los
 * tramos solapados, el origen de los precios no deterministas.
 *
 * <p>MOBILE FIRST: la tabla vive dentro de un contenedor con desplazamiento horizontal, que es lo que
 * permite leerla en una pantalla estrecha sin encoger la letra ni romper la página.
 */
@Component({
  selector: 'nx-precios-tabla-de-reglas',
  imports: [FaIconComponent],
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
            <tr>
              <th class="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  [checked]="todasMarcadas()"
                  (change)="seleccion().alternaTodos(identificadores())"
                  [attr.aria-label]="t('admin.categories.select_all')"
                />
              </th>
              <th class="px-4 py-2 font-medium">{{ t('admin.pricing.col.scope') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.pricing.col.type') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.pricing.col.value') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.pricing.col.range') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.pricing.col.active') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.pricing.col.description') }}</th>
              <th class="px-4 py-2 font-medium w-24">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (regla of reglas(); track regla.id) {
              @let duplicada = esDuplicada(regla);
              <tr [class]="clasesDeFila(regla, duplicada)">
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="seleccion().tiene(regla.id)"
                    (change)="seleccion().alterna(regla.id)"
                    [attr.aria-label]="
                      regla.descripcion || t('admin.pricing.scope.' + regla.ambito)
                    "
                  />
                </td>
                <td class="px-4 py-2 font-medium text-[13px]">
                  {{ t('admin.pricing.scope.' + regla.ambito) }}
                  <!-- El nombre concreto del ámbito, para poder rastrear a qué afecta la regla. -->
                  @if (regla.ambito !== 'GLOBAL') {
                    @if (regla.nombreDelAmbito) {
                      <span class="ml-1 font-normal opacity-70">· {{ regla.nombreDelAmbito }}</span>
                    } @else if (regla.idAmbito) {
                      <span class="ml-1 font-normal opacity-40 italic">
                        · {{ t('admin.pricing.scope_unknown') }}
                      </span>
                    }
                  }
                  @if (regla.pais) {
                    <span class="ml-1 badge badge-info badge-sm">{{ regla.pais }}</span>
                  }
                  @if (duplicada) {
                    <span class="ml-1 badge badge-warning badge-sm">
                      {{ t('admin.pricing.duplicate') }}
                    </span>
                  }
                </td>
                <td class="px-4 py-2 text-[12px]">{{ t('admin.pricing.type.' + regla.tipo) }}</td>
                <td class="px-4 py-2 text-right font-medium">{{ margen(regla) }}</td>
                <td class="px-4 py-2 text-[12px] opacity-70">
                  @if (conTramo(regla)) {
                    {{ tramo(regla) }}
                  } @else {
                    <span class="opacity-50">{{ t('admin.pricing.any_range') }}</span>
                  }
                </td>
                <td class="px-4 py-2">
                  <!-- Encender o apagar cambia los precios al instante; no se pregunta porque el mismo
                       gesto lo deshace. -->
                  <button
                    type="button"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    [class.bg-success]="regla.activa"
                    [class.bg-ink-300]="!regla.activa"
                    [disabled]="alternando()"
                    [title]="
                      regla.activa ? t('admin.pricing.deactivate') : t('admin.pricing.activate')
                    "
                    [attr.aria-label]="
                      regla.activa ? t('admin.pricing.deactivate') : t('admin.pricing.activate')
                    "
                    (click)="alterna.emit(regla)"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      [class]="regla.activa ? 'translate-x-4' : 'translate-x-0.5'"
                    ></span>
                  </button>
                </td>
                <td class="px-4 py-2 opacity-70 text-[12px]">{{ regla.descripcion }}</td>
                <td class="px-4 py-2 flex gap-1">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square"
                    [attr.aria-label]="t('actions.edit')"
                    (click)="edita.emit(regla)"
                  >
                    <fa-icon [icon]="iconoLapiz" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error"
                    [attr.aria-label]="t('actions.delete')"
                    (click)="borra.emit(regla)"
                  >
                    <fa-icon [icon]="iconoPapelera" />
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                  {{ t('filters.no_results') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class PreciosTablaDeReglas {
  readonly reglas = input<readonly ReglaDePrecio[]>([]);
  /** La selección la posee la pantalla: la tabla solo la lee y la marca. */
  readonly seleccion = input.required<Seleccion>();
  readonly alternando = input(false);

  readonly edita = output<ReglaDePrecio>();
  readonly borra = output<ReglaDePrecio>();
  readonly alterna = output<ReglaDePrecio>();

  protected readonly t = inject(TraduccionService).t;
  private readonly importes = inject(ImportesStore);

  protected readonly iconoLapiz = faPencil;
  protected readonly iconoPapelera = faTrashCan;

  private readonly duplicadas = computed(() => huellasDuplicadas(this.reglas()));
  protected readonly identificadores = computed(() => this.reglas().map((r) => r.id));
  protected readonly todasMarcadas = computed(() =>
    this.seleccion().todosMarcados(this.identificadores()),
  );

  protected esDuplicada(regla: ReglaDePrecio): boolean {
    return this.duplicadas().has(huellaDeRegla(regla));
  }

  protected conTramo(regla: ReglaDePrecio): boolean {
    return tieneTramo(regla);
  }

  /** Un porcentaje se escribe con su símbolo; un importe fijo, en la divisa activa y con su signo. */
  protected margen(regla: ReglaDePrecio): string {
    return regla.tipo === 'PERCENTAGE'
      ? `${regla.valor}%`
      : `+${this.importes.escribe(regla.valor)}`;
  }

  /** El tramo de coste al que se aplica la regla; un extremo sin valor es «sin límite por ese lado». */
  protected tramo(regla: ReglaDePrecio): string {
    const desde =
      regla.costeMinimoUsd != null
        ? this.importes.escribe(regla.costeMinimoUsd)
        : this.t('admin.pricing.any');
    const hasta =
      regla.costeMaximoUsd != null
        ? this.importes.escribe(regla.costeMaximoUsd)
        : this.t('admin.pricing.unbounded');
    return `${desde} → ${hasta}`;
  }

  /**
   * Las clases de la fila en UNA cadena: un nombre con barra (`bg-warning/10`) no es algo que Angular
   * sepa leer dentro de un `[class.x]`.
   */
  protected clasesDeFila(regla: ReglaDePrecio, duplicada: boolean): string {
    const marcada = this.seleccion().tiene(regla.id) ? 'bg-brand-50/40' : '';
    return `${duplicada ? 'bg-warning/10' : ''} ${marcada}`.trim();
  }
}
