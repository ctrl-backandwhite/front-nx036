import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faMapLocationDot,
  faPen,
  faPercent,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { REGIONS } from '@shared/i18n/regions';
import {
  DatosDeImpuesto,
  ImpuestoDePais,
  datosDeImpuesto,
  impuestoEnBlanco,
  impuestoGuardable,
} from '../../../domain/logistica/model/impuesto';
import {
  AlternaImpuestoDePais,
  BorraImpuestoDePais,
  ConsultaImpuestos,
  GuardaImpuestoDePais,
} from '../../../application/logistica/use-case/gestiona-impuestos.use-case';
import { RegionesFiscales } from '../component/regiones-fiscales';

/**
 * Los impuestos indirectos por destino.
 *
 * <p>El panel los CONFIGURA; quien los aplica al cobro es el backend. Por eso un rechazo del servidor no
 * puede perderse: si apagar el IVA de un país fallara en silencio, el checkout seguiría cobrando lo
 * contrario de lo configurado y no se descubriría hasta la liquidación.
 *
 * <p>La lista de países es la misma que la del selector de moneda e idioma, para que cualquier destino
 * que se pueda elegir al navegar tenga su impuesto configurable.
 */
@Component({
  selector: 'nx-impuestos-page',
  imports: [FaIconComponent, RegionesFiscales],
  template: `
    <div class="max-w-4xl mx-auto space-y-5">
      <header>
        <h1 class="flex items-center gap-2">
          <fa-icon [icon]="iconos.porcentaje" class="text-primary" />
          {{ t('admin.taxes.title') }}
        </h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('admin.taxes.subtitle') }}</p>
      </header>

      <div class="card p-4">
        <h2 class="mb-3">
          {{ editando() ? t('admin.taxes.edit') : t('admin.taxes.add') }}
        </h2>
        <!-- Móvil primero: una columna, y cuatro a partir de la anchura pequeña. -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label for="impuesto-pais" class="text-xs text-ink-500 block mb-1">
              {{ t('admin.taxes.country') }}
            </label>
            <select
              id="impuesto-pais"
              class="select select-bordered select-sm w-full"
              [disabled]="editando()"
              [value]="borrador().pais"
              (change)="cambia('pais', $any($event.target).value)"
            >
              <option value="">{{ t('admin.taxes.country') }}…</option>
              @for (region of regiones; track region.countryCode) {
                <option [value]="region.countryCode">
                  {{ region.flag }} {{ region.countryLabel }} ({{ region.currency }})
                </option>
              }
            </select>
          </div>
          <div>
            <label for="impuesto-etiqueta" class="text-xs text-ink-500 block mb-1">
              {{ t('admin.taxes.label') }}
            </label>
            <input
              id="impuesto-etiqueta"
              class="input input-bordered input-sm w-full"
              placeholder="IVA"
              [value]="borrador().etiqueta"
              (input)="cambia('etiqueta', $any($event.target).value)"
            />
          </div>
          <div>
            <label for="impuesto-tasa" class="text-xs text-ink-500 block mb-1">
              {{ t('admin.taxes.rate') }} (%)
            </label>
            <input
              id="impuesto-tasa"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered input-sm w-full"
              placeholder="21"
              [value]="borrador().porcentaje"
              (input)="cambiaPorcentaje($any($event.target).valueAsNumber)"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-xs text-ink-500 flex-1">
              <input
                type="checkbox"
                class="toggle toggle-sm toggle-success"
                [checked]="borrador().activo"
                (change)="marcaActivo($any($event.target).checked)"
              />
              {{ t('admin.taxes.active') }}
            </label>
            <button
              type="button"
              (click)="guarda()"
              [disabled]="!completo() || guardando()"
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
      </div>

      <div class="card overflow-x-auto">
        <table class="table table-zebra text-sm">
          <thead>
            <tr>
              <th>{{ t('admin.taxes.country') }}</th>
              <th>{{ t('admin.taxes.label') }}</th>
              <th class="text-right">{{ t('admin.taxes.rate') }}</th>
              <th>{{ t('admin.taxes.active') }}</th>
              <th class="w-40"></th>
            </tr>
          </thead>
          <tbody>
            @for (fila of impuestos(); track fila.pais) {
              <tr [class.bg-primary]="paisAbierto() === fila.pais">
                <td class="font-medium">
                  {{ bandera(fila.pais) }} <span class="font-mono">{{ fila.pais }}</span>
                  <span class="text-ink-500 font-normal">{{ nombreDePais(fila.pais) }}</span>
                </td>
                <td class="text-ink-600">{{ fila.etiqueta || '—' }}</td>
                <td class="text-right tabular-nums">{{ fila.porcentaje }}%</td>
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
                      (click)="abreRegiones(fila.pais)"
                      class="btn btn-ghost btn-xs"
                      [title]="t('admin.taxes.manage_regions')"
                    >
                      <fa-icon [icon]="iconos.mapa" /> {{ t('admin.taxes.manage_regions') }}
                    </button>
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
                  {{ t('admin.taxes.empty') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (paisAbierto(); as pais) {
        <nx-regiones-fiscales
          [pais]="pais"
          [nombreDelPais]="nombreDePais(pais)"
          (cierra)="paisAbierto.set(null)"
        />
      }
    </div>
  `,
})
export class ImpuestosPage {
  protected readonly regiones = REGIONS;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    porcentaje: faPercent,
    mas: faPlus,
    lapiz: faPen,
    papelera: faTrash,
    mapa: faMapLocationDot,
    si: faCircleCheck,
    no: faCircleXmark,
  };

  private readonly consulta = inject(ConsultaImpuestos);
  private readonly guardador = inject(GuardaImpuestoDePais);
  private readonly alternador = inject(AlternaImpuestoDePais);
  private readonly eliminador = inject(BorraImpuestoDePais);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly impuestos = signal<readonly ImpuestoDePais[]>([]);
  protected readonly borrador = signal<DatosDeImpuesto>(impuestoEnBlanco());
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly paisAbierto = signal<string | null>(null);

  protected readonly completo = computed(() => impuestoGuardable(this.borrador()));

  constructor() {
    void this.recarga();
  }

  private async recarga(): Promise<void> {
    const resultado = await this.consulta.paises();
    if (resultado.ok) {
      this.impuestos.set(resultado.valor);
    } else {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }

  /**
   * El backend cubre más destinos que la lista curada del selector: para esos no hay nombre que pintar.
   * Devolver el código repetiría «SA SA» en la fila y haría pasar el código por nombre.
   */
  protected nombreDePais(codigo: string): string {
    return REGIONS.find((r) => r.countryCode === codigo)?.countryLabel ?? '';
  }

  protected bandera(codigo: string): string {
    return REGIONS.find((r) => r.countryCode === codigo)?.flag ?? '';
  }

  protected cambia(clave: 'pais' | 'etiqueta', valor: string): void {
    this.borrador.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected cambiaPorcentaje(valor: number): void {
    this.borrador.update((actual) => ({
      ...actual,
      porcentaje: Number.isFinite(valor) ? valor : 0,
    }));
  }

  protected marcaActivo(activo: boolean): void {
    this.borrador.update((actual) => ({ ...actual, activo }));
  }

  protected edita(fila: ImpuestoDePais): void {
    this.borrador.set(datosDeImpuesto(fila));
    this.editando.set(true);
  }

  protected cancela(): void {
    this.borrador.set(impuestoEnBlanco());
    this.editando.set(false);
  }

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardador.ejecuta(this.borrador());
      if (!resultado.ok) {
        this.avisos.error(this.mensajeDeFallo(resultado.error));
        return;
      }
      this.cancela();
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(fila: ImpuestoDePais): Promise<void> {
    const resultado = await this.alternador.ejecuta(fila);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga();
  }

  protected async borra(fila: ImpuestoDePais): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.taxes.delete_confirm').replace('{c}', fila.pais),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.eliminador.ejecuta(fila.pais);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    if (this.paisAbierto() === fila.pais) {
      this.paisAbierto.set(null);
    }
    await this.recarga();
  }

  protected abreRegiones(pais: string): void {
    this.paisAbierto.set(pais);
  }

  private mensajeDeFallo(error: unknown): string {
    if (error === 'sin-clave') {
      return this.t('admin.taxes.country');
    }
    return (error as { mensaje?: string }).mensaje || this.t('common.error');
  }
}
