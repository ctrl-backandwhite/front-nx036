import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BorradorDePromocion } from '../../../domain/gestion/model/promociones';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';
import { VentanaModal } from './ventana-modal';

/**
 * El editor de una rebaja o de un cupón.
 *
 * <p>Sin CÓDIGO es una rebaja automática que se anuncia en la portada; con código es un cupón que hay
 * que teclear en el pago y que no se enseña en el catálogo. Por eso los topes de uso solo aparecen
 * cuando hay código: limitar los usos de una rebaja que se aplica sola no significa nada.
 *
 * <p>Las fechas se teclean en HORA LOCAL, que es lo único que entiende `datetime-local`. Devolverles la
 * zona antes de mandarlas es trabajo del caso de uso: hacerlo aquí dejaría la conversión repetida en el
 * alta y en la edición, y basta con que una de las dos se olvide para que una rebaja empiece a otra hora.
 *
 * <p>La casilla de avisar a todo el mundo solo se ofrece al CREAR. Al editar, avisar es una acción
 * aparte con su confirmación: si fuera una casilla del formulario, corregir una errata volvería a
 * escribir a toda la base de usuarios.
 *
 * <p>MOBILE FIRST: una columna en el móvil, dos a partir de `sm:`.
 */
@Component({
  selector: 'nx-promociones-editor',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="editando() ? t('admin.promo.edit') : t('admin.promo.new')"
      ancho="sm:max-w-2xl"
      (cierra)="cancela.emit()"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="form-control">
          <label for="promo-nombre" class="label-text text-xs">
            {{ t('admin.promo.col_name') }}
          </label>
          <input
            id="promo-nombre"
            class="input input-bordered input-sm"
            [value]="borrador().nombre"
            (input)="cambiaNombre($event)"
          />
        </div>

        <div class="form-control">
          <label for="promo-codigo" class="label-text text-xs">
            {{ t('admin.promo.code_hint') }}
          </label>
          <input
            id="promo-codigo"
            class="input input-bordered input-sm"
            [value]="borrador().codigo ?? ''"
            (input)="cambiaCodigo($event)"
          />
        </div>

        <div class="form-control">
          <label for="promo-descuento" class="label-text text-xs">
            {{ t('admin.promo.col_discount') }} %
          </label>
          <input
            id="promo-descuento"
            type="number"
            min="1"
            max="99"
            class="input input-bordered input-sm"
            [value]="borrador().porcentaje ?? ''"
            (input)="cambiaPorcentaje($event)"
          />
        </div>

        <div class="form-control">
          <label for="promo-ambito" class="label-text text-xs">
            {{ t('admin.promo.col_scope') }}
          </label>
          <select
            id="promo-ambito"
            class="select select-bordered select-sm"
            [value]="borrador().ambito"
            (change)="cambiaAmbito($event)"
          >
            <option value="ALL" [selected]="borrador().ambito === 'ALL'">
              {{ t('admin.promo.scope_all') }}
            </option>
            <option value="CATEGORY" [selected]="borrador().ambito === 'CATEGORY'">
              {{ t('admin.promo.scope_cat') }}
            </option>
            <option value="PRODUCT" [selected]="borrador().ambito === 'PRODUCT'">
              {{ t('admin.promo.scope_prod') }}
            </option>
          </select>
        </div>

        @if (borrador().ambito === 'CATEGORY') {
          <div class="form-control sm:col-span-2">
            <label for="promo-categorias" class="label-text text-xs">
              {{ t('admin.promo.pick_cats') }}
            </label>
            <select
              id="promo-categorias"
              multiple
              class="select select-bordered h-32 text-sm"
              (change)="cambiaCategorias($event)"
            >
              @for (categoria of categorias(); track categoria.id) {
                <option [value]="categoria.id" [selected]="estaElegida(categoria.id)">
                  {{ categoria.nombre }}
                </option>
              }
            </select>
          </div>
        }

        @if (borrador().ambito === 'PRODUCT') {
          <div class="form-control sm:col-span-2">
            <label for="promo-productos" class="label-text text-xs">
              {{ t('admin.promo.pick_prods') }}
            </label>
            <textarea
              id="promo-productos"
              class="textarea textarea-bordered h-24 font-mono text-xs"
              [value]="lineasDeProductos()"
              (input)="cambiaProductos($event)"
            ></textarea>
          </div>
        }

        <div class="form-control">
          <label for="promo-empieza" class="label-text text-xs">
            {{ t('admin.promo.starts') }}
          </label>
          <input
            id="promo-empieza"
            type="datetime-local"
            class="input input-bordered input-sm"
            [value]="borrador().empiezaEl ?? ''"
            (input)="cambiaFecha('empiezaEl', $event)"
          />
        </div>

        <div class="form-control">
          <label for="promo-termina" class="label-text text-xs">
            {{ t('admin.promo.ends') }}
          </label>
          <input
            id="promo-termina"
            type="datetime-local"
            class="input input-bordered input-sm"
            [value]="borrador().terminaEl ?? ''"
            (input)="cambiaFecha('terminaEl', $event)"
          />
        </div>

        @if (borrador().codigo) {
          <div class="form-control">
            <label for="promo-usos" class="label-text text-xs">
              {{ t('admin.promo.max_uses') }}
            </label>
            <input
              id="promo-usos"
              type="number"
              min="1"
              class="input input-bordered input-sm"
              [value]="borrador().usosMaximos ?? ''"
              (input)="cambiaTope('usosMaximos', $event)"
            />
          </div>
          <div class="form-control">
            <label for="promo-usos-persona" class="label-text text-xs">
              {{ t('admin.promo.max_per_user') }}
            </label>
            <input
              id="promo-usos-persona"
              type="number"
              min="1"
              class="input input-bordered input-sm"
              [value]="borrador().usosPorPersona ?? ''"
              (input)="cambiaTope('usosPorPersona', $event)"
            />
          </div>
        }

        <label for="promo-activa" class="label cursor-pointer justify-start gap-2">
          <input
            id="promo-activa"
            type="checkbox"
            class="checkbox checkbox-sm"
            [checked]="borrador().activa !== false"
            (change)="cambiaActiva($event)"
          />
          <span class="label-text text-sm">{{ t('admin.promo.active') }}</span>
        </label>

        @if (!editando()) {
          <label for="promo-avisa" class="label cursor-pointer justify-start gap-2">
            <input
              id="promo-avisa"
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().avisaUsuarios === true"
              (change)="cambiaAviso($event)"
            />
            <span class="label-text text-sm">{{ t('admin.promo.notify') }}</span>
          </label>
        }
      </div>

      @if (error(); as mensaje) {
        <p role="alert" class="text-sm text-rose-600">{{ mensaje }}</p>
      }

      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" (click)="cancela.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="!borrador().nombre.trim() || guardando()"
          (click)="guarda.emit(borrador())"
        >
          {{ t('common.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class PromocionesEditor {
  readonly inicial = input.required<BorradorDePromocion>();
  readonly editando = input(false);
  readonly categorias = input<readonly OpcionDeAmbito[]>([]);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);

  readonly cancela = output<void>();
  readonly guarda = output<BorradorDePromocion>();

  protected readonly t = inject(TraduccionService).t;

  /** Copia de trabajo; se rehace cuando entra otra promoción para no arrastrar lo tecleado antes. */
  protected readonly borrador = linkedSignal<BorradorDePromocion>(() => ({ ...this.inicial() }));

  /** Los identificadores de producto se pegan uno por línea; el salto de línea es el separador. */
  protected readonly lineasDeProductos = computed(() =>
    (this.borrador().productos ?? []).join('\n'),
  );

  protected estaElegida(id: string): boolean {
    return (this.borrador().categorias ?? []).includes(id);
  }

  protected cambiaNombre(evento: Event): void {
    const nombre = (evento.target as HTMLInputElement).value;
    this.borrador.update((promocion) => ({ ...promocion, nombre }));
  }

  /** El código va siempre en mayúsculas: es lo que se teclea en el pago y no distingue capitalización. */
  protected cambiaCodigo(evento: Event): void {
    const codigo = (evento.target as HTMLInputElement).value.toUpperCase();
    this.borrador.update((promocion) => ({ ...promocion, codigo }));
  }

  protected cambiaPorcentaje(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.borrador.update((promocion) => ({
      ...promocion,
      porcentaje: texto ? Number(texto) : undefined,
    }));
  }

  /** Al cambiar de alcance se olvidan las listas del anterior: si no, quedarían aplicándose a escondidas. */
  protected cambiaAmbito(evento: Event): void {
    const ambito = (evento.target as HTMLSelectElement).value;
    this.borrador.update((promocion) => ({
      ...promocion,
      ambito,
      categorias: [],
      productos: [],
    }));
  }

  protected cambiaCategorias(evento: Event): void {
    const elegidas = Array.from((evento.target as HTMLSelectElement).selectedOptions).map(
      (opcion) => opcion.value,
    );
    this.borrador.update((promocion) => ({ ...promocion, categorias: elegidas }));
  }

  protected cambiaProductos(evento: Event): void {
    const productos = (evento.target as HTMLTextAreaElement).value
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean);
    this.borrador.update((promocion) => ({ ...promocion, productos }));
  }

  protected cambiaFecha(campo: 'empiezaEl' | 'terminaEl', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.borrador.update((promocion) => ({ ...promocion, [campo]: valor }));
  }

  /** Un tope vacío NO es cero: es «sin tope», y eso se dice dejando el campo sin valor. */
  protected cambiaTope(campo: 'usosMaximos' | 'usosPorPersona', evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.borrador.update((promocion) => ({
      ...promocion,
      [campo]: texto ? Number(texto) : undefined,
    }));
  }

  protected cambiaActiva(evento: Event): void {
    const activa = (evento.target as HTMLInputElement).checked;
    this.borrador.update((promocion) => ({ ...promocion, activa }));
  }

  protected cambiaAviso(evento: Event): void {
    const avisaUsuarios = (evento.target as HTMLInputElement).checked;
    this.borrador.update((promocion) => ({ ...promocion, avisaUsuarios }));
  }
}
