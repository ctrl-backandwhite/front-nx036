import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import {
  FieldTree,
  FormField,
  apply,
  disabled,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { REGIONS } from '@shared/i18n/regions';
import {
  LimiteDeTransportista,
  PAIS_COMODIN,
  formateaGramos,
} from '../../../domain/logistica/model/limite-transportista';
import { TEXTO_CON_CONTENIDO, claveDeError } from '../form/reglas-de-formulario';

/**
 * Lo que se teclea. El comodín va aparte del destino a propósito.
 *
 * <p>En el modelo del dominio «cualquier país» se guarda como `*` dentro del propio campo `pais`, pero
 * en pantalla son dos controles: una casilla y un cuadro de texto que se queda vacío cuando la casilla
 * está marcada. Separarlos aquí evita que el campo tenga que enseñar una cosa y valer otra.
 */
interface BorradorDeLimite {
  canal: string;
  pais: string;
  comodin: boolean;
  pesoMaximoGramos: number | null;
  divisorVolumetrico: number | null;
  minimoFacturableGramos: number | null;
  largoMaximoMm: number | null;
  anchoMaximoMm: number | null;
  altoMaximoMm: number | null;
  bultoUnico: boolean;
  notas: string;
  activo: boolean;
}

/** Los tres números que deciden lo que se factura, y las tres medidas del bulto. */
type CampoNumerico =
  | 'pesoMaximoGramos'
  | 'divisorVolumetrico'
  | 'minimoFacturableGramos'
  | 'largoMaximoMm'
  | 'anchoMaximoMm'
  | 'altoMaximoMm';

/**
 * Un peso máximo por bulto por encima de lo que admite el canal emite una guía que el transportista
 * rechaza en el almacén: 100 kg es siempre un dedo de más, no una configuración.
 */
const PESO_MAXIMO_RAZONABLE_G = 100_000;

/** Ningún canal reparte bultos de más de dos metros: por encima, es un cero de más. */
const MEDIDA_MAXIMA_RAZONABLE_MM = 2_000;

/**
 * Alta y edición de un límite del transportista.
 *
 * <p>Al EDITAR, canal y país quedan bloqueados: son la clave del registro, y cambiarlos crearía otra
 * fila distinta en vez de modificar esta. El bloqueo se declara en el esquema con `disabled`, así que
 * un campo bloqueado tampoco cuenta para la validez del formulario.
 *
 * <p>Cada número lleva debajo qué significa su cero, porque no significa lo mismo en todos: sin límite
 * de peso, sin facturación por volumen, sin mínimo facturable.
 */
@Component({
  selector: 'nx-formulario-de-limite',
  imports: [FormField],
  template: `
    <div
      class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="esAlta() ? t('admin.carrier_limits.add') : t('admin.carrier_limits.edit')"
    >
      <div class="card p-6 w-full max-w-2xl space-y-3 my-8">
        <h2 class="text-lg font-medium">
          {{ esAlta() ? t('admin.carrier_limits.add') : t('admin.carrier_limits.edit') }}
        </h2>

        <!-- Móvil primero: una columna, y dos a partir de la anchura pequeña. -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label class="text-xs text-ink-500" for="limite-canal">
              {{ t('admin.carrier_limits.col.channel') }}
            </label>
            <input
              id="limite-canal"
              class="input font-mono w-full"
              placeholder="FZZXR"
              [formField]="formulario.canal"
              (input)="pasaAMayusculas(formulario.canal, $event)"
            />
            @if (formulario.canal().touched() && errorDe(formulario.canal().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>

          <div>
            <label class="text-xs text-ink-500" for="limite-pais">
              {{ t('admin.carrier_limits.col.country') }}
            </label>
            <input
              id="limite-pais"
              class="input font-mono w-full"
              placeholder="ES"
              list="limite-paises"
              [formField]="formulario.pais"
              (input)="pasaAMayusculas(formulario.pais, $event)"
            />
            <datalist id="limite-paises">
              @for (region of regiones; track region.countryCode) {
                <option [value]="region.countryCode">{{ region.countryLabel }}</option>
              }
            </datalist>
            @if (formulario.pais().touched() && errorDe(formulario.pais().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
            <label class="flex items-center gap-2 text-[12px] text-ink-500 mt-1">
              <input type="checkbox" class="checkbox checkbox-xs" [formField]="formulario.comodin" />
              {{ t('admin.carrier_limits.any_country') }}
            </label>
            <p class="text-[11px] text-ink-400 mt-1">{{ t('admin.carrier_limits.hint.country') }}</p>
          </div>

          @for (campo of numericos; track campo.clave) {
            <div>
              <label class="text-xs text-ink-500" [attr.for]="'limite-' + campo.clave">
                {{ t(campo.etiqueta) }}
              </label>
              <input
                [id]="'limite-' + campo.clave"
                type="number"
                step="1"
                class="input tabular-nums w-full"
                [formField]="formulario[campo.clave]"
              />
              @if (errorDe(formulario[campo.clave]().errors()); as clave) {
                <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
              } @else {
                <p class="text-[11px] text-ink-400 mt-1">{{ pista(campo) }}</p>
              }
            </div>
          }

          <div class="grid grid-cols-3 gap-2 sm:col-span-2">
            @for (medida of medidas; track medida.clave) {
              <div>
                <label class="text-xs text-ink-500" [attr.for]="'limite-' + medida.clave">
                  {{ t(medida.etiqueta) }}
                </label>
                <input
                  [id]="'limite-' + medida.clave"
                  type="number"
                  step="1"
                  class="input tabular-nums w-full"
                  [formField]="formulario[medida.clave]"
                />
                @if (errorDe(formulario[medida.clave]().errors()); as clave) {
                  <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
                }
              </div>
            }
          </div>

          <div class="sm:col-span-2">
            <label class="text-xs text-ink-500" for="limite-notas">
              {{ t('admin.carrier_limits.col.notes') }}
            </label>
            <input
              id="limite-notas"
              class="input w-full"
              [placeholder]="t('admin.carrier_limits.notes_ph')"
              [formField]="formulario.notas"
            />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [formField]="formulario.bultoUnico"
            />
            {{ t('admin.carrier_limits.field.single_parcel') }}
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.activo" />
            {{ t('admin.carrier_limits.active') }}
          </label>

          <p class="sm:col-span-2 text-[11px] text-ink-400">
            {{ t('admin.carrier_limits.hint.single_parcel') }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-3">
          <button type="button" (click)="cancela.emit()" class="btn btn-outline">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            (click)="guarda.emit(loEditado())"
            [disabled]="guardando() || formulario().invalid()"
            class="btn btn-primary"
          >
            {{ guardando() ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cancela.emit()' },
})
export class FormularioDeLimite {
  readonly limite = input.required<LimiteDeTransportista>();
  readonly esAlta = input(false);
  readonly guardando = input(false);

  readonly cancela = output<void>();
  readonly guarda = output<LimiteDeTransportista>();

  protected readonly regiones = REGIONS;
  protected readonly errorDe = claveDeError;
  protected readonly t = inject(TraduccionService).t;

  /** Se copia para editar en local: la fila de la tabla no se toca hasta que el guardado sale bien. */
  protected readonly modelo = linkedSignal<BorradorDeLimite>(() => {
    const limite = this.limite();
    const comodin = limite.pais === PAIS_COMODIN;
    return {
      canal: limite.canal,
      pais: comodin ? '' : limite.pais,
      comodin,
      pesoMaximoGramos: limite.pesoMaximoGramos,
      divisorVolumetrico: limite.divisorVolumetrico,
      minimoFacturableGramos: limite.minimoFacturableGramos,
      largoMaximoMm: limite.largoMaximoMm,
      anchoMaximoMm: limite.anchoMaximoMm,
      altoMaximoMm: limite.altoMaximoMm,
      bultoUnico: limite.bultoUnico,
      notas: limite.notas ?? '',
      activo: limite.activo,
    };
  });

  /**
   * Las reglas del canal, declaradas de una vez.
   *
   * <p>Aquí no se protege un formulario, se protege un envío: los topes de arriba son la diferencia
   * entre un bulto que sale y uno que el transportista devuelve en el almacén. Los campos bloqueados
   * —canal y destino al editar, destino con el comodín marcado— NO cuentan para la validez, que es
   * justo lo que hace falta: un destino vacío pero bloqueado por el comodín no puede impedir guardar.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    apply(ruta.canal, TEXTO_CON_CONTENIDO);
    maxLength(ruta.canal, 16);
    disabled(ruta.canal, { when: () => !this.esAlta() });

    apply(ruta.pais, TEXTO_CON_CONTENIDO);
    maxLength(ruta.pais, 2);
    disabled(ruta.pais, { when: ({ valueOf }) => !this.esAlta() || valueOf(ruta.comodin) });

    // Un peso o una medida NEGATIVOS no existen, y el cero significa «sin límite»: ninguno de los dos
    // se puede dejar pasar como si diera igual, porque de aquí sale lo que se factura.
    required(ruta.pesoMaximoGramos);
    min(ruta.pesoMaximoGramos, 0);
    max(ruta.pesoMaximoGramos, PESO_MAXIMO_RAZONABLE_G);

    required(ruta.divisorVolumetrico);
    min(ruta.divisorVolumetrico, 0);

    required(ruta.minimoFacturableGramos);
    min(ruta.minimoFacturableGramos, 0);
    max(ruta.minimoFacturableGramos, PESO_MAXIMO_RAZONABLE_G);

    for (const medida of [ruta.largoMaximoMm, ruta.anchoMaximoMm, ruta.altoMaximoMm]) {
      required(medida);
      min(medida, 0);
      max(medida, MEDIDA_MAXIMA_RAZONABLE_MM);
    }

    maxLength(ruta.notas, 500);
  });

  protected readonly numericos = [
    { clave: 'pesoMaximoGramos', etiqueta: 'admin.carrier_limits.field.max_weight' },
    { clave: 'divisorVolumetrico', etiqueta: 'admin.carrier_limits.field.volumetric' },
    { clave: 'minimoFacturableGramos', etiqueta: 'admin.carrier_limits.field.min_billable' },
  ] as const satisfies readonly { clave: CampoNumerico; etiqueta: string }[];

  protected readonly medidas = [
    { clave: 'largoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_length' },
    { clave: 'anchoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_width' },
    { clave: 'altoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_height' },
  ] as const satisfies readonly { clave: CampoNumerico; etiqueta: string }[];

  /** Lo tecleado, ya en la forma del dominio: el comodín vuelve a ser el asterisco del campo `pais`. */
  protected readonly loEditado = computed<LimiteDeTransportista>(() => {
    const borrador = this.modelo();
    return {
      canal: borrador.canal,
      pais: borrador.comodin ? PAIS_COMODIN : borrador.pais,
      pesoMaximoGramos: borrador.pesoMaximoGramos ?? 0,
      divisorVolumetrico: borrador.divisorVolumetrico ?? 0,
      minimoFacturableGramos: borrador.minimoFacturableGramos ?? 0,
      largoMaximoMm: borrador.largoMaximoMm ?? 0,
      anchoMaximoMm: borrador.anchoMaximoMm ?? 0,
      altoMaximoMm: borrador.altoMaximoMm ?? 0,
      bultoUnico: borrador.bultoUnico,
      notas: borrador.notas,
      activo: borrador.activo,
    };
  });

  /**
   * Canal y destino se guardan en MAYÚSCULAS: son códigos, y `es` y `ES` no pueden ser dos filas.
   *
   * <p>Se escribe a la vez en el elemento y en el modelo. El campo también escucha `input` por su
   * cuenta, y sin tocar los dos el orden en que corren los dos oyentes decidiría si la conversión se
   * queda o se pierde.
   */
  protected pasaAMayusculas(campo: FieldTree<string>, evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    const enMayusculas = elemento.value.toUpperCase();
    if (elemento.value !== enMayusculas) {
      elemento.value = enMayusculas;
    }
    if (campo().value() !== enMayusculas) {
      campo().value.set(enMayusculas);
    }
  }

  /** Qué significa el valor puesto. Un cero no quiere decir lo mismo en los tres campos. */
  protected pista(campo: (typeof this.numericos)[number]): string {
    const valor = this.modelo()[campo.clave] ?? 0;
    if (campo.clave === 'pesoMaximoGramos') {
      return valor > 0
        ? `${formateaGramos(valor)} · ${this.t('admin.carrier_limits.hint.max_weight')}`
        : this.t('admin.carrier_limits.hint.zero_no_limit');
    }
    if (campo.clave === 'divisorVolumetrico') {
      return valor > 0
        ? this.t('admin.carrier_limits.hint.volumetric')
        : this.t('admin.carrier_limits.no_volumetric');
    }
    return valor > 0
      ? `${formateaGramos(valor)} · ${this.t('admin.carrier_limits.hint.min_billable')}`
      : this.t('admin.carrier_limits.no_min_billable');
  }
}
