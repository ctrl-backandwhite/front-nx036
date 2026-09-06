import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { REGIONS } from '@shared/i18n/regions';
import {
  LimiteDeTransportista,
  PAIS_COMODIN,
  formateaGramos,
  limiteGuardable,
} from '../../../domain/logistica/model/limite-transportista';

/**
 * Alta y edición de un límite del transportista.
 *
 * <p>Al EDITAR, canal y país quedan bloqueados: son la clave del registro, y cambiarlos crearía otra
 * fila distinta en vez de modificar esta.
 *
 * <p>Cada número lleva debajo qué significa su cero, porque no significa lo mismo en todos: sin límite
 * de peso, sin facturación por volumen, sin mínimo facturable.
 */
@Component({
  selector: 'nx-formulario-de-limite',
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
              maxlength="16"
              [disabled]="!esAlta()"
              [value]="borrador().canal"
              (input)="cambia('canal', $any($event.target).value.toUpperCase())"
            />
          </div>

          <div>
            <label class="text-xs text-ink-500" for="limite-pais">
              {{ t('admin.carrier_limits.col.country') }}
            </label>
            <input
              id="limite-pais"
              class="input font-mono w-full"
              placeholder="ES"
              maxlength="2"
              list="limite-paises"
              [disabled]="!esAlta() || esComodin()"
              [value]="esComodin() ? '' : borrador().pais"
              (input)="cambia('pais', $any($event.target).value.toUpperCase())"
            />
            <datalist id="limite-paises">
              @for (region of regiones; track region.countryCode) {
                <option [value]="region.countryCode">{{ region.countryLabel }}</option>
              }
            </datalist>
            <label class="flex items-center gap-2 text-[12px] text-ink-500 mt-1">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                [disabled]="!esAlta()"
                [checked]="esComodin()"
                (change)="marcaComodin($any($event.target).checked)"
              />
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
                min="0"
                step="1"
                class="input tabular-nums w-full"
                [value]="numero(campo.clave)"
                (input)="cambiaNumero(campo.clave, $any($event.target).valueAsNumber)"
              />
              <p class="text-[11px] text-ink-400 mt-1">{{ pista(campo) }}</p>
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
                  min="0"
                  step="1"
                  class="input tabular-nums w-full"
                  [value]="numero(medida.clave)"
                  (input)="cambiaNumero(medida.clave, $any($event.target).valueAsNumber)"
                />
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
              [value]="borrador().notas ?? ''"
              (input)="cambia('notas', $any($event.target).value)"
            />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().bultoUnico"
              (change)="cambiaBooleano('bultoUnico', $any($event.target).checked)"
            />
            {{ t('admin.carrier_limits.field.single_parcel') }}
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().activo"
              (change)="cambiaBooleano('activo', $any($event.target).checked)"
            />
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
            (click)="guarda.emit(borrador())"
            [disabled]="guardando() || !completo()"
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
  protected readonly t = inject(TraduccionService).t;

  /** Se copia para editar en local: la fila de la tabla no se toca hasta que el guardado sale bien. */
  protected readonly borrador = linkedSignal(() => this.limite());

  protected readonly numericos = [
    { clave: 'pesoMaximoGramos', etiqueta: 'admin.carrier_limits.field.max_weight' },
    { clave: 'divisorVolumetrico', etiqueta: 'admin.carrier_limits.field.volumetric' },
    { clave: 'minimoFacturableGramos', etiqueta: 'admin.carrier_limits.field.min_billable' },
  ] as const;

  protected readonly medidas = [
    { clave: 'largoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_length' },
    { clave: 'anchoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_width' },
    { clave: 'altoMaximoMm', etiqueta: 'admin.carrier_limits.field.max_height' },
  ] as const;

  protected readonly esComodin = computed(() => this.borrador().pais === PAIS_COMODIN);
  protected readonly completo = computed(() => limiteGuardable(this.borrador()));

  protected numero(clave: keyof LimiteDeTransportista): number {
    return Number(this.borrador()[clave] ?? 0);
  }

  protected cambia(clave: 'canal' | 'pais' | 'notas', valor: string): void {
    this.borrador.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected cambiaNumero(clave: keyof LimiteDeTransportista, valor: number): void {
    this.borrador.update((actual) => ({
      ...actual,
      [clave]: Number.isFinite(valor) ? valor : 0,
    }));
  }

  protected cambiaBooleano(clave: 'bultoUnico' | 'activo', valor: boolean): void {
    this.borrador.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected marcaComodin(marcado: boolean): void {
    this.borrador.update((actual) => ({ ...actual, pais: marcado ? PAIS_COMODIN : '' }));
  }

  /** Qué significa el valor puesto. Un cero no quiere decir lo mismo en los tres campos. */
  protected pista(campo: (typeof this.numericos)[number]): string {
    const valor = this.numero(campo.clave);
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
