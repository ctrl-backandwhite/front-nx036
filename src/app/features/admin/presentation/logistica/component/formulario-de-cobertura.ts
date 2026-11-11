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
  pattern,
  required,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { REGIONS } from '@shared/i18n/regions';
import { CoberturaDeTransportista } from '../../../domain/logistica/model/cobertura-transportista';
import { TEXTO_CON_CONTENIDO, claveDeError } from '../form/reglas-de-formulario';

/** Lo que se teclea. Los importes se editan en céntimos, que es como se guardan. */
interface BorradorDeCobertura {
  carrier: string;
  pais: string;
  nombre: string;
  zona: string;
  baseCents: number | null;
  porKgCents: number | null;
  diasMin: number | null;
  diasMax: number | null;
  habilitado: boolean;
}

/** Un ISO-2 son dos letras exactas. Es la regla que aplica el backend, puesta también aquí. */
const ISO_DOS_LETRAS = /^[A-Za-z]{2}$/;

/** Ningún envío de este negocio tarda más de un trimestre: por encima, es un dedo de más. */
const PLAZO_MAXIMO_RAZONABLE_DIAS = 120;

/** Cien dólares de porte base es ya un error de unidad: los importes van en CÉNTIMOS. */
const IMPORTE_MAXIMO_RAZONABLE_CENTS = 10_000;

/**
 * Alta y edición de la cobertura de un destino.
 *
 * <p>Al EDITAR, transportista y país quedan bloqueados: son la clave del registro, y cambiarlos crearía
 * otra fila en vez de modificar esta.
 *
 * <p>El transportista es un DESPLEGABLE y no texto libre, y esa es la decisión que importa: un nombre
 * mal escrito se guardaría igual, la pantalla lo enseñaría y el destino seguiría sin servirse, porque
 * nadie consulta nunca ese nombre. No da ningún error.
 */
@Component({
  selector: 'nx-formulario-de-cobertura',
  imports: [FormField],
  template: `
    <div
      class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="
        esAlta() ? t('admin.carrier_coverage.add') : t('admin.carrier_coverage.edit')
      "
    >
      <div class="card p-6 w-full max-w-2xl space-y-3 my-8">
        <h2 class="text-lg font-medium">
          {{ esAlta() ? t('admin.carrier_coverage.add') : t('admin.carrier_coverage.edit') }}
        </h2>

        <!-- Móvil primero: una columna, y dos a partir de la anchura pequeña. -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label class="text-xs text-ink-500" for="cobertura-transportista">
              {{ t('admin.carrier_coverage.col.carrier') }}
            </label>
            <select
              id="cobertura-transportista"
              class="select select-bordered w-full font-mono"
              [formField]="formulario.carrier"
            >
              <option value="">{{ t('admin.carrier_coverage.pick_carrier') }}</option>
              @for (nombre of transportistas(); track nombre) {
                <option [value]="nombre">{{ nombre }}</option>
              }
            </select>
            @if (
              formulario.carrier().touched() && errorDe(formulario.carrier().errors());
              as clave
            ) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>

          <div>
            <label class="text-xs text-ink-500" for="cobertura-pais">
              {{ t('admin.carrier_coverage.col.country') }}
            </label>
            <input
              id="cobertura-pais"
              class="input font-mono w-full"
              placeholder="KE"
              list="cobertura-paises"
              [formField]="formulario.pais"
              (input)="pasaAMayusculas(formulario.pais, $event)"
            />
            <datalist id="cobertura-paises">
              @for (region of regiones; track region.countryCode) {
                <option [value]="region.countryCode">{{ region.countryLabel }}</option>
              }
            </datalist>
            @if (formulario.pais().touched() && errorDe(formulario.pais().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
            <p class="text-[11px] text-ink-400 mt-1">
              {{ t('admin.carrier_coverage.hint.country') }}
            </p>
          </div>

          <div>
            <label class="text-xs text-ink-500" for="cobertura-nombre">
              {{ t('admin.carrier_coverage.col.name') }}
            </label>
            <input id="cobertura-nombre" class="input w-full" [formField]="formulario.nombre" />
            @if (formulario.nombre().touched() && errorDe(formulario.nombre().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>

          <div>
            <label class="text-xs text-ink-500" for="cobertura-zona">
              {{ t('admin.carrier_coverage.col.zone') }}
            </label>
            <input
              id="cobertura-zona"
              class="input font-mono w-full"
              [formField]="formulario.zona"
            />
            @if (formulario.zona().touched() && errorDe(formulario.zona().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>

          @for (campo of numericos; track campo.clave) {
            <div>
              <label class="text-xs text-ink-500" [attr.for]="'cobertura-' + campo.clave">
                {{ t(campo.etiqueta) }}
              </label>
              <input
                [id]="'cobertura-' + campo.clave"
                type="number"
                class="input tabular-nums w-full"
                [formField]="formulario[campo.clave]"
              />
              @if (
                formulario[campo.clave]().touched() &&
                  errorDe(formulario[campo.clave]().errors());
                as clave
              ) {
                <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
              }
              <p class="text-[11px] text-ink-400 mt-1">{{ t(campo.pista) }}</p>
            </div>
          }
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.habilitado" />
          {{ t('admin.carrier_coverage.col.enabled') }}
        </label>
        <p class="text-[11px] text-ink-400">{{ t('admin.carrier_coverage.hint.enabled') }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" (click)="cancela.emit()" class="btn btn-ghost btn-sm">
            {{ t('actions.cancel') }}
          </button>
          <button
            type="button"
            (click)="guarda.emit(loEditado())"
            class="btn btn-primary btn-sm"
            [disabled]="formulario().invalid() || guardando()"
          >
            {{ t('actions.save') }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { class: 'block', '(document:keydown.escape)': 'cancela.emit()' },
})
export class FormularioDeCobertura {
  readonly cobertura = input.required<CoberturaDeTransportista>();
  readonly transportistas = input<readonly string[]>([]);
  readonly esAlta = input(false);
  readonly guardando = input(false);

  readonly cancela = output<void>();
  readonly guarda = output<CoberturaDeTransportista>();

  protected readonly regiones = REGIONS;
  protected readonly errorDe = claveDeError;
  protected readonly t = inject(TraduccionService).t;

  /** Se copia para editar en local: la fila de la tabla no se toca hasta que el guardado sale bien. */
  protected readonly modelo = linkedSignal<BorradorDeCobertura>(() => {
    const cobertura = this.cobertura();
    return {
      carrier: cobertura.carrier,
      pais: cobertura.pais,
      nombre: cobertura.nombre,
      zona: cobertura.zona,
      baseCents: cobertura.baseCents,
      porKgCents: cobertura.porKgCents,
      diasMin: cobertura.diasMin,
      diasMax: cobertura.diasMax,
      habilitado: cobertura.habilitado,
    };
  });

  /**
   * Las reglas, declaradas de una vez.
   *
   * <p>El país se valida con el patrón de dos letras y no solo como «no vacío»: es la misma regla que
   * aplica el backend, y dejar que el intento llegue hasta allí convierte un error evidente en un 422
   * que el administrador tiene que interpretar.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    apply(ruta.carrier, TEXTO_CON_CONTENIDO);
    disabled(ruta.carrier, { when: () => !this.esAlta() });

    apply(ruta.pais, TEXTO_CON_CONTENIDO);
    maxLength(ruta.pais, 2);
    pattern(ruta.pais, ISO_DOS_LETRAS);
    disabled(ruta.pais, { when: () => !this.esAlta() });

    apply(ruta.nombre, TEXTO_CON_CONTENIDO);
    maxLength(ruta.nombre, 80);

    apply(ruta.zona, TEXTO_CON_CONTENIDO);
    maxLength(ruta.zona, 30);

    for (const importe of [ruta.baseCents, ruta.porKgCents]) {
      required(importe);
      min(importe, 0);
      max(importe, IMPORTE_MAXIMO_RAZONABLE_CENTS);
    }

    for (const plazo of [ruta.diasMin, ruta.diasMax]) {
      required(plazo);
      min(plazo, 0);
      max(plazo, PLAZO_MAXIMO_RAZONABLE_DIAS);
    }
  });

  protected readonly numericos = [
    {
      clave: 'baseCents',
      etiqueta: 'admin.carrier_coverage.field.base',
      pista: 'admin.carrier_coverage.hint.fallback_rate',
    },
    {
      clave: 'porKgCents',
      etiqueta: 'admin.carrier_coverage.field.per_kg',
      pista: 'admin.carrier_coverage.hint.fallback_rate',
    },
    {
      clave: 'diasMin',
      etiqueta: 'admin.carrier_coverage.field.eta_min',
      pista: 'admin.carrier_coverage.hint.eta',
    },
    {
      clave: 'diasMax',
      etiqueta: 'admin.carrier_coverage.field.eta_max',
      pista: 'admin.carrier_coverage.hint.eta',
    },
  ] as const;

  /** Lo tecleado, ya en la forma del dominio. Un numérico vacío se guarda como cero, no como nulo. */
  protected readonly loEditado = computed<CoberturaDeTransportista>(() => {
    const borrador = this.modelo();
    return {
      carrier: borrador.carrier,
      pais: borrador.pais,
      nombre: borrador.nombre,
      zona: borrador.zona,
      baseCents: borrador.baseCents ?? 0,
      porKgCents: borrador.porKgCents ?? 0,
      diasMin: borrador.diasMin ?? 0,
      diasMax: borrador.diasMax ?? 0,
      habilitado: borrador.habilitado,
    };
  });

  /**
   * El destino se guarda en MAYÚSCULAS: es un código, y es y ES no pueden ser dos filas.
   *
   * <p>Se escribe a la vez en el elemento y en el modelo. El campo también escucha input por su
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
}
