import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormField, apply, disabled, form, maxLength, validate } from '@angular/forms/signals';
import {
  faCircleCheck,
  faCircleXmark,
  faMapLocationDot,
  faPen,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  DatosDeRegion,
  RegionFiscal,
  datosDeRegion,
  regionEnBlanco,
} from '../../../domain/logistica/model/impuesto';
import {
  AlternaRegionFiscal,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaRegionFiscal,
} from '../../../application/logistica/use-case/gestiona-impuestos.use-case';
import {
  TEXTO_CON_CONTENIDO,
  claveDeError,
  tasaFueraDeRango,
} from '../form/reglas-de-formulario';

/**
 * Las regiones (estado o provincia) de un país, con su tasa propia.
 *
 * <p>La tasa VACÍA significa «usa la nacional», que no es lo mismo que cero —eso sería exenta—. Por eso
 * se guarda como texto mientras se edita: un número no sabe distinguir el vacío del cero.
 *
 * <p>Solo se configura donde el impuesto varía por región (EE. UU., Canadá, Brasil). En el resto, la
 * tabla se queda vacía y no pasa nada.
 */
@Component({
  selector: 'nx-regiones-fiscales',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="card p-4 border-2 border-primary">
      <div class="flex items-center justify-between mb-3">
        <h2 class="flex items-center gap-2">
          <fa-icon [icon]="iconos.mapa" class="text-primary" />
          {{ t('admin.taxes.regions') }} · <span class="font-mono">{{ pais() }}</span>
          <span class="text-ink-500 font-normal">{{ nombreDelPais() }}</span>
        </h2>
        <button type="button" (click)="cierra.emit()" class="btn btn-ghost btn-xs">
          {{ t('common.close') }}
        </button>
      </div>
      <p class="text-xs text-ink-500 mb-3">{{ t('admin.taxes.region_hint') }}</p>

      <!-- Móvil primero: una columna, y cuatro a partir de la anchura pequeña. -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mb-4">
        <div>
          <label for="region-codigo" class="text-xs text-ink-500 block mb-1">
            {{ t('admin.taxes.region_code') }}
          </label>
          <input
            id="region-codigo"
            class="input input-bordered input-sm w-full font-mono"
            placeholder="CA"
            [formField]="formulario.codigo"
          />
          @if (formulario.codigo().touched() && errorDe(formulario.codigo().errors()); as clave) {
            <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
          }
        </div>
        <div>
          <label for="region-nombre" class="text-xs text-ink-500 block mb-1">
            {{ t('admin.taxes.region_name') }}
          </label>
          <input
            id="region-nombre"
            class="input input-bordered input-sm w-full"
            placeholder="California"
            [formField]="formulario.nombre"
          />
          @if (formulario.nombre().touched() && errorDe(formulario.nombre().errors()); as clave) {
            <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
          }
        </div>
        <div>
          <label for="region-tasa" class="text-xs text-ink-500 block mb-1">
            {{ t('admin.taxes.region_rate') }}
          </label>
          <!-- El valor viaja como TEXTO aunque el campo sea numérico: el vacío significa «usa la tasa
               nacional» y un número no sabe distinguirlo del cero, que sería «exenta» —otra
               configuración, y válida—. El mínimo ya no se escribe aquí: lo pone el esquema. -->
          <input
            id="region-tasa"
            type="number"
            step="0.01"
            class="input input-bordered input-sm w-full"
            [placeholder]="t('admin.taxes.region_national')"
            [formField]="formulario.porcentaje"
          />
          @if (errorDe(formulario.porcentaje().errors()); as clave) {
            <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
          }
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-xs text-ink-500 flex-1">
            <input
              type="checkbox"
              class="toggle toggle-sm toggle-success"
              [formField]="formulario.activo"
            />
            {{ t('admin.taxes.active') }}
          </label>
          <button
            type="button"
            (click)="guarda()"
            [disabled]="formulario().invalid() || guardando()"
            class="btn btn-primary btn-sm"
          >
            <fa-icon [icon]="iconos.mas" /> {{ t('common.save') }}
          </button>
          @if (editando()) {
            <button type="button" (click)="cancela()" class="btn btn-ghost btn-sm">
              {{ t('common.cancel') }}
            </button>
          }
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm text-sm">
          <thead>
            <tr>
              <th>{{ t('admin.taxes.region_code') }}</th>
              <th>{{ t('admin.taxes.region_name') }}</th>
              <th class="text-right">{{ t('admin.taxes.region_rate') }}</th>
              <th>{{ t('admin.taxes.active') }}</th>
              <th class="w-20"></th>
            </tr>
          </thead>
          <tbody>
            @for (fila of regiones(); track fila.codigo) {
              <tr>
                <td class="font-mono">{{ fila.codigo }}</td>
                <td class="text-ink-700">{{ fila.nombre }}</td>
                <td class="text-right tabular-nums">
                  @if (fila.porcentaje !== null) {
                    {{ fila.porcentaje }}%
                  } @else {
                    <span class="text-ink-400">{{ t('admin.taxes.region_national') }}</span>
                  }
                </td>
                <td>
                  <button
                    type="button"
                    (click)="alterna(fila)"
                    class="badge cursor-pointer"
                    [class.badge-success]="fila.activo"
                    [class.badge-ghost]="!fila.activo"
                  >
                    <fa-icon [icon]="fila.activo ? iconos.si : iconos.no" class="mr-1" />
                    {{ fila.activo ? t('admin.taxes.active') : t('admin.taxes.inactive') }}
                  </button>
                </td>
                <td>
                  <div class="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      (click)="edita(fila)"
                      class="btn btn-ghost btn-xs btn-square"
                      [title]="t('common.edit')"
                      [attr.aria-label]="t('common.edit')"
                    >
                      <fa-icon [icon]="iconos.lapiz" />
                    </button>
                    <button
                      type="button"
                      (click)="borra(fila)"
                      class="btn btn-ghost btn-xs btn-square text-error"
                      [title]="t('common.delete')"
                      [attr.aria-label]="t('common.delete')"
                    >
                      <fa-icon [icon]="iconos.papelera" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="text-center text-ink-400 py-6">
                  {{ t('admin.taxes.no_regions') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class RegionesFiscales {
  readonly pais = input.required<string>();
  readonly nombreDelPais = input('');

  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    mapa: faMapLocationDot,
    mas: faPlus,
    lapiz: faPen,
    papelera: faTrash,
    si: faCircleCheck,
    no: faCircleXmark,
  };

  private readonly consulta = inject(ConsultaImpuestos);
  private readonly guardador = inject(GuardaRegionFiscal);
  private readonly alternador = inject(AlternaRegionFiscal);
  private readonly eliminador = inject(BorraRegionFiscal);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly errorDe = claveDeError;

  protected readonly regiones = signal<readonly RegionFiscal[]>([]);
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly modelo = signal<DatosDeRegion>(regionEnBlanco());

  /**
   * El código es la CLAVE de la región y el nombre es lo que se lee en la tabla: sin los dos no se
   * puede guardar. La tasa se comprueba a mano porque su vacío es un valor —«usa la nacional»— y solo
   * se rechaza lo que no es un número o se sale del rango en el que un impuesto tiene sentido.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    apply(ruta.codigo, TEXTO_CON_CONTENIDO);
    maxLength(ruta.codigo, 8);
    disabled(ruta.codigo, { when: () => this.editando() });
    apply(ruta.nombre, TEXTO_CON_CONTENIDO);
    maxLength(ruta.nombre, 120);
    validate(ruta.porcentaje, ({ value }) => tasaFueraDeRango(value()));
  });

  constructor() {
    // Al cambiar de país se vuelve a pedir y se limpia el formulario: dejar escrito lo del país
    // anterior invita a guardarlo en el nuevo sin darse cuenta.
    //
    // El vaciado va en `untracked` a propósito: toca el formulario, y si esa lectura entrara en las
    // dependencias del efecto, escribir en cualquier campo lo volvería a disparar y el formulario se
    // borraría solo mientras se teclea.
    effect(() => {
      const pais = this.pais();
      untracked(() => this.cancela());
      void this.recarga(pais);
    });
  }

  private async recarga(pais: string): Promise<void> {
    const resultado = await this.consulta.regiones(pais);
    if (resultado.ok) {
      this.regiones.set(resultado.valor);
    } else {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }

  protected edita(fila: RegionFiscal): void {
    // `reset` además LIMPIA el «tocado»: sin eso, la fila que se acaba de abrir para editar aparecería
    // ya con los avisos en rojo de lo que se estuvo tecleando antes.
    this.formulario().reset(datosDeRegion(fila));
    this.editando.set(true);
  }

  protected cancela(): void {
    this.formulario().reset(regionEnBlanco());
    this.editando.set(false);
  }

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardador.ejecuta(this.pais(), this.modelo());
      if (!resultado.ok) {
        this.avisos.error(
          resultado.error === 'sin-clave'
            ? this.t('admin.taxes.region_code')
            : (resultado.error as { mensaje?: string }).mensaje || this.t('common.error'),
        );
        return;
      }
      this.cancela();
      await this.recarga(this.pais());
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(fila: RegionFiscal): Promise<void> {
    const resultado = await this.alternador.ejecuta(fila);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga(this.pais());
  }

  protected async borra(fila: RegionFiscal): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.taxes.region_delete_confirm').replace(
        '{r}',
        `${fila.nombre} (${fila.codigo})`,
      ),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.eliminador.ejecuta(this.pais(), fila.codigo);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga(this.pais());
  }
}
