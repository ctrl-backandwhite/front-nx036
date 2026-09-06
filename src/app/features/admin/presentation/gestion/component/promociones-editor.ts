import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, max, min, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BorradorDePromocion } from '../../../domain/gestion/model/promociones';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';
import { VentanaModal } from './ventana-modal';

/** El descuento se mueve entre el 1 % y el 99 %: ni regalar el producto ni no descontar nada. */
const DESCUENTO_MINIMO = 1;
const DESCUENTO_MAXIMO = 99;

/**
 * La promoción mientras se edita.
 *
 * <p>Los identificadores de producto viven aquí como TEXTO de varias líneas, que es como se pegan; la
 * lista partida se deriva al salir. Antes se partían en cada pulsación y se volvían a juntar para
 * pintar: dos conversiones por letra tecleada, y el orden lo decidía el ir y venir.
 */
interface BorradorEditable {
  nombre: string;
  codigo: string;
  porcentaje: number | null;
  ambito: string;
  categorias: readonly string[];
  productos: string;
  empiezaEl: string;
  terminaEl: string;
  usosMaximos: number | null;
  usosPorPersona: number | null;
  activa: boolean;
  avisaUsuarios: boolean;
}

/**
 * El editor de una rebaja o de un cupón.
 *
 * <p>Sin CÓDIGO es una rebaja automática que se anuncia en la portada; con código es un cupón que hay
 * que teclear en el pago y que no se enseña en el catálogo. Por eso los topes de uso solo aparecen
 * cuando hay código: limitar los usos de una rebaja que se aplica sola no significa nada.
 *
 * <p>REGLA DEL NEGOCIO que esta pantalla no toca: entre varias promociones aplicables gana la que MÁS
 * descuenta, y nunca se suman. Eso lo resuelve el backend al calcular el precio; aquí solo se
 * administran las reglas.
 *
 * <p>Lo que el ESQUEMA impide ahora y antes no comprobaba nadie: un descuento fuera del 1–99 % —los
 * atributos `min` y `max` estaban en la plantilla y no los miraba nadie, así que un 0 % se guardaba y no
 * descontaba nada—, un tope de usos por debajo de uno, y una promoción que TERMINA ANTES DE EMPEZAR, que
 * se guardaba tan campante y no descontaba nunca.
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
  imports: [VentanaModal, FormField],
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
            [formField]="formulario.nombre"
          />
          @if (formulario.nombre().touched() && formulario.nombre().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.nombre().errors()[0].message }}
            </p>
          }
        </div>

        <div class="form-control">
          <label for="promo-codigo" class="label-text text-xs">
            {{ t('admin.promo.code_hint') }}
          </label>
          <input
            id="promo-codigo"
            class="input input-bordered input-sm"
            [formField]="formulario.codigo"
          />
        </div>

        <div class="form-control">
          <label for="promo-descuento" class="label-text text-xs">
            {{ t('admin.promo.col_discount') }} %
          </label>
          <input
            id="promo-descuento"
            type="number"
            class="input input-bordered input-sm"
            [formField]="formulario.porcentaje"
          />
          @if (formulario.porcentaje().touched() && formulario.porcentaje().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.porcentaje().errors()[0].message }}
            </p>
          }
        </div>

        <div class="form-control">
          <label for="promo-ambito" class="label-text text-xs">
            {{ t('admin.promo.col_scope') }}
          </label>
          <select
            id="promo-ambito"
            class="select select-bordered select-sm"
            [formField]="formulario.ambito"
          >
            <option value="ALL" [selected]="modelo().ambito === 'ALL'">
              {{ t('admin.promo.scope_all') }}
            </option>
            <option value="CATEGORY" [selected]="modelo().ambito === 'CATEGORY'">
              {{ t('admin.promo.scope_cat') }}
            </option>
            <option value="PRODUCT" [selected]="modelo().ambito === 'PRODUCT'">
              {{ t('admin.promo.scope_prod') }}
            </option>
          </select>
        </div>

        @if (modelo().ambito === 'CATEGORY') {
          <div class="form-control sm:col-span-2">
            <label for="promo-categorias" class="label-text text-xs">
              {{ t('admin.promo.pick_cats') }}
            </label>
            <!--
              El único campo que no lleva la directiva del formulario: Signal Forms no sabe leer un
              desplegable MÚLTIPLE —lee un solo valor del elemento— así que la lectura del DOM se
              hace a mano. El dato sigue viviendo DENTRO del formulario: se escribe en su campo y se
              le marca como tocado y sucio, de modo que la validez y el estado del botón siguen
              saliendo de un único sitio.
            -->
            <select
              id="promo-categorias"
              multiple
              class="select select-bordered h-32 text-sm"
              (change)="eligeCategorias($event)"
            >
              @for (categoria of categorias(); track categoria.id) {
                <option [value]="categoria.id" [selected]="estaElegida(categoria.id)">
                  {{ categoria.nombre }}
                </option>
              }
            </select>
          </div>
        }

        @if (modelo().ambito === 'PRODUCT') {
          <div class="form-control sm:col-span-2">
            <label for="promo-productos" class="label-text text-xs">
              {{ t('admin.promo.pick_prods') }}
            </label>
            <textarea
              id="promo-productos"
              class="textarea textarea-bordered h-24 font-mono text-xs"
              [formField]="formulario.productos"
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
            [formField]="formulario.empiezaEl"
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
            [formField]="formulario.terminaEl"
          />
          @if (formulario.terminaEl().touched() && formulario.terminaEl().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.terminaEl().errors()[0].message }}
            </p>
          }
        </div>

        @if (modelo().codigo) {
          <div class="form-control">
            <label for="promo-usos" class="label-text text-xs">
              {{ t('admin.promo.max_uses') }}
            </label>
            <input
              id="promo-usos"
              type="number"
              class="input input-bordered input-sm"
              [formField]="formulario.usosMaximos"
            />
            @if (formulario.usosMaximos().touched() && formulario.usosMaximos().errors().length) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.usosMaximos().errors()[0].message }}
              </p>
            }
          </div>
          <div class="form-control">
            <label for="promo-usos-persona" class="label-text text-xs">
              {{ t('admin.promo.max_per_user') }}
            </label>
            <input
              id="promo-usos-persona"
              type="number"
              class="input input-bordered input-sm"
              [formField]="formulario.usosPorPersona"
            />
            @if (
              formulario.usosPorPersona().touched() && formulario.usosPorPersona().errors().length
            ) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.usosPorPersona().errors()[0].message }}
              </p>
            }
          </div>
        }

        <label for="promo-activa" class="label cursor-pointer justify-start gap-2">
          <input
            id="promo-activa"
            type="checkbox"
            class="checkbox checkbox-sm"
            [formField]="formulario.activa"
          />
          <span class="label-text text-sm">{{ t('admin.promo.active') }}</span>
        </label>

        @if (!editando()) {
          <label for="promo-avisa" class="label cursor-pointer justify-start gap-2">
            <input
              id="promo-avisa"
              type="checkbox"
              class="checkbox checkbox-sm"
              [formField]="formulario.avisaUsuarios"
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
          [disabled]="guardando() || formulario().invalid()"
          (click)="guarda.emit(promocionEditada())"
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
  protected readonly modelo = linkedSignal<BorradorEditable>(() => ({
    nombre: this.inicial().nombre,
    codigo: this.inicial().codigo ?? '',
    porcentaje: this.inicial().porcentaje ?? null,
    ambito: this.inicial().ambito,
    categorias: this.inicial().categorias ?? [],
    // Los identificadores se pegan uno por línea; el salto de línea es el separador.
    productos: (this.inicial().productos ?? []).join('\n'),
    empiezaEl: this.inicial().empiezaEl ?? '',
    terminaEl: this.inicial().terminaEl ?? '',
    usosMaximos: this.inicial().usosMaximos ?? null,
    usosPorPersona: this.inicial().usosPorPersona ?? null,
    activa: this.inicial().activa !== false,
    avisaUsuarios: this.inicial().avisaUsuarios === true,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: () => this.t('dialog.field.required') });

    // Sin porcentaje no hay rebaja, y fuera del 1–99 % no descuenta o regala el producto. Se exige
    // SALVO que la promoción descuente un importe fijo: esas se administran por otra vía y aquí ni
    // siquiera se enseña su campo, así que bloquearlas dejaría sin poder editar su nombre o su vigencia.
    required(ruta.porcentaje, {
      when: () => !this.inicial().importeCentimos,
      message: () => this.t('dialog.field.required'),
    });
    min(ruta.porcentaje, DESCUENTO_MINIMO, { message: () => this.t('dialog.field.number') });
    max(ruta.porcentaje, DESCUENTO_MAXIMO, { message: () => this.t('dialog.field.number') });

    // Un tope de cero usos apaga el cupón el día que se crea. Vacío sí vale: es «sin tope».
    min(ruta.usosMaximos, 1, { message: () => this.t('dialog.field.number') });
    min(ruta.usosPorPersona, 1, { message: () => this.t('dialog.field.number') });

    // Validación CRUZADA: una promoción que termina antes de empezar no descuenta nunca, y se
    // guardaba sin una sola queja.
    validate(ruta.terminaEl, ({ value, valueOf }) => {
      const termina = value();
      const empieza = valueOf(ruta.empiezaEl);
      return termina === '' || empieza === '' || termina >= empieza
        ? null
        : { kind: 'vigencia', message: this.t('dialog.field.range') };
    });
  });

  /** Los identificadores ya partidos: una sola conversión, y al salir, no en cada pulsación. */
  protected readonly productosElegidos = computed(() =>
    this.modelo()
      .productos.split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean),
  );

  /**
   * La promoción tal y como sale de la ventana.
   *
   * <p>Al cambiar de alcance se olvidan las listas del anterior: si no, quedarían aplicándose a
   * escondidas. El código va en MAYÚSCULAS porque es lo que se teclea en el pago y no distingue
   * capitalización.
   */
  protected readonly promocionEditada = computed<BorradorDePromocion>(() => {
    const borrador = this.modelo();
    return {
      ...this.inicial(),
      nombre: borrador.nombre,
      codigo: borrador.codigo.toUpperCase(),
      porcentaje: borrador.porcentaje ?? undefined,
      ambito: borrador.ambito,
      categorias: borrador.ambito === 'CATEGORY' ? borrador.categorias : [],
      productos: borrador.ambito === 'PRODUCT' ? this.productosElegidos() : [],
      empiezaEl: borrador.empiezaEl,
      terminaEl: borrador.terminaEl,
      usosMaximos: borrador.usosMaximos ?? undefined,
      usosPorPersona: borrador.usosPorPersona ?? undefined,
      activa: borrador.activa,
      avisaUsuarios: borrador.avisaUsuarios,
    };
  });

  protected estaElegida(id: string): boolean {
    return this.modelo().categorias.includes(id);
  }

  /**
   * Las categorías marcadas en el desplegable múltiple.
   *
   * <p>Se escribe DENTRO del campo del formulario —no en un signal aparte— y se le marca como tocado y
   * sucio a mano, que es lo que la directiva haría sola si supiera leer un `select multiple`.
   */
  protected eligeCategorias(evento: Event): void {
    const elegidas = Array.from((evento.target as HTMLSelectElement).selectedOptions).map(
      (opcion) => opcion.value,
    );
    const campo = this.formulario.categorias();
    campo.value.set(elegidas);
    campo.markAsTouched();
    campo.markAsDirty();
  }
}
