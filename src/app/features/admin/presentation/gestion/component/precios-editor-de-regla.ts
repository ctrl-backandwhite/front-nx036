import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import {
  FormField, form, maxLength, min, pattern, required, validate,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AmbitosDisponibles } from '../../../application/gestion/use-case/precios.use-case';
import {
  AMBITOS,
  AmbitoDeRegla,
  BorradorDeRegla,
  ReglaDePrecio,
  TipoDeMargen,
  reglasSolapadas,
} from '../../../domain/gestion/model/precios';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';
import { VentanaModal } from './ventana-modal';

/** El país de la regla son DOS letras (ISO-3166 alfa-2); vacío significa «cualquier país». */
const PAIS_ISO = /^[A-Za-z]{2}$/;

/**
 * La regla mientras se edita.
 *
 * <p>Los extremos del tramo son `number | null` y no opcionales: el formulario necesita distinguir
 * «vacío» de «cero», y `null` es lo que escribe un campo numérico vacío. Al salir se traducen a
 * `undefined`, que es como el dominio dice «sin límite por ese lado».
 */
interface BorradorEditable {
  ambito: AmbitoDeRegla;
  pais: string;
  tipo: TipoDeMargen;
  valor: number | null;
  idAmbito: string;
  costeMinimoUsd: number | null;
  costeMaximoUsd: number | null;
  descripcion: string;
  activa: boolean;
}

/**
 * El editor de una regla de MARGEN.
 *
 * <p>Aquí no se calcula ningún precio: el precio de venta lo compone siempre el backend con el margen,
 * el envío, el arancel y el IVA. Esta ventana solo edita la regla con la que lo hará.
 *
 * <p>LO QUE AHORA IMPIDE GUARDAR, declarado en el esquema del formulario y no repartido por la
 * plantilla:
 * <ul>
 *   <li>Un margen VACÍO o NEGATIVO. Antes el campo vacío se convertía en cero calladamente y una regla
 *       al 0 % vende al coste; en negativo, por debajo. Es el fallo que más dinero cuesta de esta
 *       pantalla.
 *   <li>Un tramo AL REVÉS —coste máximo por debajo del mínimo— que no casaría con ningún producto y
 *       dejaba la regla muerta sin que nadie lo notara.
 *   <li>Un ámbito distinto de GLOBAL SIN entidad elegida: una regla de categoría sin categoría no se
 *       aplica a nada.
 *   <li>Un país que no sean las dos letras de ISO-3166.
 * </ul>
 *
 * <p>AVISO DE SOLAPE. Dos reglas activas del mismo ámbito con tramos de coste que se pisan dejan sin
 * determinar cuál gana: el mismo producto puede salir a dos precios distintos según el orden en que se
 * evalúen. Es el fallo más caro de esta pantalla, así que se avisa MIENTRAS se edita y no después de
 * guardar. No bloquea: hay casos legítimos, y quien administra decide. Por eso sigue siendo un aviso y
 * no una regla del esquema.
 *
 * <p>El ámbito concreto se elige por NOMBRE en un desplegable y no tecleando un identificador: escribir
 * un UUID a mano es la forma más fácil de aplicar un margen a la categoría equivocada. La variante es la
 * excepción —son demasiadas para un desplegable— y ahí se mantiene el identificador como opción avanzada.
 *
 * <p>MOBILE FIRST: los campos van en una columna en el móvil y se reparten en dos a partir de `sm:`.
 */
@Component({
  selector: 'nx-precios-editor-de-regla',
  imports: [VentanaModal, FormField],
  template: `
    <nx-ventana-modal
      [titulo]="inicial().id ? t('common.edit') : t('admin.pricing.add')"
      ancho="sm:max-w-lg"
      (cierra)="cancela.emit()"
    >
      <div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <label for="regla-ambito" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.scope') }}
          </label>
          <select id="regla-ambito" class="input" [formField]="formulario.ambito">
            <!--
              Cada opción dice explícitamente si está elegida, además del valor del desplegable: las
              opciones las crea un bucle y el navegador no puede seleccionar una que todavía no existe
              en el momento en que se le asigna el valor.
            -->
            @for (ambito of ambitosPosibles; track ambito) {
              <option [value]="ambito" [selected]="ambito === modelo().ambito">
                {{ t('admin.pricing.scope.' + ambito) }}
              </option>
            }
          </select>
        </div>

        <!--
          El país de la regla es aquel al que se aplica el margen, y el backend lo casa con el país de
          REGISTRO de quien compra, nunca con el de envío del pedido. Vacío significa «cualquiera».
        -->
        <div>
          <label for="regla-pais" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.country') }}
          </label>
          <input id="regla-pais" class="input" placeholder="—" [formField]="formulario.pais" />
          @if (formulario.pais().touched() && formulario.pais().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.pais().errors()[0].message }}
            </p>
          }
        </div>

        <div>
          <label for="regla-tipo" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.type') }}
          </label>
          <select id="regla-tipo" class="input" [formField]="formulario.tipo">
            <option value="PERCENTAGE" [selected]="modelo().tipo === 'PERCENTAGE'">
              {{ t('admin.pricing.type.PERCENTAGE') }}
            </option>
            <option value="FIXED" [selected]="modelo().tipo === 'FIXED'">
              {{ t('admin.pricing.type.FIXED') }}
            </option>
          </select>
        </div>

        <div>
          <label for="regla-valor" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.value') }}
          </label>
          <input id="regla-valor" type="number" step="0.01" class="input"
                 [formField]="formulario.valor" />
          @if (formulario.valor().touched() && formulario.valor().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.valor().errors()[0].message }}
            </p>
          }
        </div>

        @if (modelo().ambito !== 'GLOBAL') {
          <div>
            <label for="regla-entidad" class="text-xs text-ink-500">
              {{ t('admin.pricing.scope.' + modelo().ambito) }}
            </label>
            @if (modelo().ambito === 'VARIANT') {
              <input
                id="regla-entidad"
                class="input font-mono text-xs"
                [placeholder]="t('admin.pricing.scope.VARIANT')"
                [formField]="formulario.idAmbito"
              />
            } @else {
              <select id="regla-entidad" class="input" [formField]="formulario.idAmbito">
                <option value="" [selected]="!modelo().idAmbito">—</option>
                @for (opcion of opcionesDelAmbito(); track opcion.id) {
                  <option [value]="opcion.id" [selected]="opcion.id === modelo().idAmbito">
                    {{ opcion.nombre }}
                  </option>
                }
              </select>
            }
            @if (formulario.idAmbito().touched() && formulario.idAmbito().errors().length) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.idAmbito().errors()[0].message }}
              </p>
            }
          </div>
        }

        <div>
          <label for="regla-coste-min" class="text-xs text-ink-500">
            {{ t('admin.pricing.min_cost_usd') }}
          </label>
          <input id="regla-coste-min" type="number" step="0.01" class="input"
                 [formField]="formulario.costeMinimoUsd" />
          @if (formulario.costeMinimoUsd().touched() && formulario.costeMinimoUsd().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.costeMinimoUsd().errors()[0].message }}
            </p>
          }
        </div>

        <div>
          <label for="regla-coste-max" class="text-xs text-ink-500">
            {{ t('admin.pricing.max_cost_usd') }}
          </label>
          <input id="regla-coste-max" type="number" step="0.01" class="input"
                 [formField]="formulario.costeMaximoUsd" />
          @if (formulario.costeMaximoUsd().touched() && formulario.costeMaximoUsd().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.costeMaximoUsd().errors()[0].message }}
            </p>
          }
        </div>

        <div class="sm:col-span-2 text-[11px] text-ink-500">{{ t('admin.pricing.cost_hint') }}</div>

        @if (solapadas().length > 0) {
          <div
            role="alert"
            class="sm:col-span-2 text-[12px] rounded-box bg-warning/15 border border-warning/40 p-2"
          >
            <span class="font-medium">
              {{ tCon('admin.pricing.overlap_warning', { n: solapadas().length }) }}
            </span>
            <span class="opacity-70"> {{ t('admin.pricing.overlap_hint') }}</span>
          </div>
        }

        <div class="sm:col-span-2">
          <label for="regla-descripcion" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.description') }}
          </label>
          <input id="regla-descripcion" class="input" [formField]="formulario.descripcion" />
        </div>

        <div class="sm:col-span-2">
          <label for="regla-activa" class="text-sm flex items-center gap-2">
            <input id="regla-activa" type="checkbox" [formField]="formulario.activa" />
            {{ t('admin.users.active') }}
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3">
        <button type="button" class="btn btn-outline" (click)="cancela.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="guardando() || formulario().invalid()"
          (click)="guarda.emit(reglaEditada())"
        >
          {{ guardando() ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class PreciosEditorDeRegla {
  readonly inicial = input.required<BorradorDeRegla>();
  /** Todas las reglas vivas: hacen falta para poder avisar del solape mientras se edita. */
  readonly reglas = input<readonly ReglaDePrecio[]>([]);
  readonly ambitos = input.required<AmbitosDisponibles>();
  readonly guardando = input(false);

  readonly cancela = output<void>();
  readonly guarda = output<BorradorDeRegla>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected readonly ambitosPosibles = AMBITOS;

  /** Copia de trabajo; se rehace cuando entra otra regla, para no arrastrar lo tecleado en la anterior. */
  protected readonly modelo = linkedSignal<BorradorEditable>(() => ({
    ambito: this.inicial().ambito ?? 'GLOBAL',
    pais: this.inicial().pais ?? '',
    tipo: this.inicial().tipo ?? 'PERCENTAGE',
    valor: this.inicial().valor ?? 0,
    idAmbito: this.inicial().idAmbito ?? '',
    costeMinimoUsd: this.inicial().costeMinimoUsd ?? null,
    costeMaximoUsd: this.inicial().costeMaximoUsd ?? null,
    descripcion: this.inicial().descripcion ?? '',
    activa: this.inicial().activa !== false,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    // Sin margen no hay regla, y un margen negativo vende por debajo del coste.
    required(ruta.valor, { message: () => this.t('dialog.field.required') });
    min(ruta.valor, 0, { message: () => this.t('dialog.field.min') });

    // Vacío es «cualquier país»; con algo escrito, las dos letras de ISO-3166 y nada más. El largo lo
    // proyecta la directiva al campo, que es lo que antes hacía el atributo `maxlength` a mano.
    maxLength(ruta.pais, 2, { message: () => this.t('login.error.bad_data') });
    pattern(ruta.pais, PAIS_ISO, { message: () => this.t('login.error.bad_data') });

    // Un tramo sin extremo es «sin límite por ese lado»; con extremo, nunca negativo.
    min(ruta.costeMinimoUsd, 0, { message: () => this.t('dialog.field.min') });
    min(ruta.costeMaximoUsd, 0, { message: () => this.t('dialog.field.min') });

    // Validación CRUZADA: un tramo al revés no casa con ningún producto y deja la regla muerta.
    validate(ruta.costeMaximoUsd, ({ value, valueOf }) => {
      const maximo = value();
      const minimo = valueOf(ruta.costeMinimoUsd);
      return maximo === null || minimo === null || maximo >= minimo
        ? null
        : { kind: 'tramo', message: this.t('dialog.field.number') };
    });

    // Una regla de categoría sin categoría —o de producto sin producto— no se aplica a nada. Y el
    // identificador tiene que ser DEL ámbito elegido: al cambiar de ámbito el anterior queda huérfano,
    // y guardarlo aplicaría el margen a otra cosa. La variante es la excepción: se teclea a mano.
    validate(ruta.idAmbito, ({ value, valueOf }) => {
      const ambito = valueOf(ruta.ambito);
      if (ambito === 'GLOBAL') {
        return null;
      }
      const elegido = value().trim();
      const suyo =
        elegido !== '' &&
        (ambito === 'VARIANT' || this.opcionesDelAmbito().some((o) => o.id === elegido));
      return suyo ? null : { kind: 'idAmbito', message: this.t('dialog.field.required') };
    });
  });

  /** El aviso mira el borrador VIVO: por eso el solape se ve mientras se teclea, no al guardar. */
  protected readonly solapadas = computed(() => reglasSolapadas(this.reglaEditada(), this.reglas()));

  protected readonly opcionesDelAmbito = computed<readonly OpcionDeAmbito[]>(() => {
    const disponibles = this.ambitos();
    switch (this.modelo().ambito) {
      case 'CATEGORY':
        return disponibles.categorias;
      case 'SUPPLIER':
        return disponibles.proveedores;
      case 'PRODUCT':
        return disponibles.productos;
      case 'PRODUCT_GROUP':
        return disponibles.grupos;
      default:
        return [];
    }
  });

  /**
   * El identificador que de verdad corresponde al ámbito elegido.
   *
   * <p>Cambiar de ámbito deja huérfano el anterior. Antes se borraba al vuelo desde el manejador del
   * desplegable; aquí se DERIVA, que además cubre el caso de que la lista de opciones llegue después.
   */
  private readonly idDelAmbito = computed<string | undefined>(() => {
    const borrador = this.modelo();
    if (borrador.ambito === 'GLOBAL') {
      return undefined;
    }
    const elegido = borrador.idAmbito.trim();
    if (borrador.ambito === 'VARIANT') {
      return elegido || undefined;
    }
    return this.opcionesDelAmbito().some((o) => o.id === elegido) ? elegido : undefined;
  });

  /**
   * La regla tal y como sale de la ventana.
   *
   * <p>Lo vacío vuelve a ser `undefined` —«cualquier país», «sin límite de coste»— y no cadena vacía ni
   * cero: son cosas distintas para el dominio y confundirlas cambia a qué productos alcanza la regla.
   */
  protected readonly reglaEditada = computed<BorradorDeRegla>(() => {
    const borrador = this.modelo();
    return {
      ...this.inicial(),
      ambito: borrador.ambito,
      pais: borrador.pais.trim().toUpperCase() || undefined,
      tipo: borrador.tipo,
      valor: borrador.valor ?? 0,
      idAmbito: this.idDelAmbito(),
      costeMinimoUsd: borrador.costeMinimoUsd ?? undefined,
      costeMaximoUsd: borrador.costeMaximoUsd ?? undefined,
      descripcion: borrador.descripcion,
      activa: borrador.activa,
    };
  });
}
