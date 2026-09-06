import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxesPacking,
  faCircleCheck,
  faCircleXmark,
  faPencil,
  faPlus,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { REGIONS } from '@shared/i18n/regions';
import {
  LimiteDeTransportista,
  PAIS_COMODIN,
  canalesDe,
  claveDe,
  formateaGramos,
  limiteEnBlanco,
  medidasLegibles,
} from '../../../domain/logistica/model/limite-transportista';
import {
  AlternaLimiteDeTransportista,
  BorraLimiteDeTransportista,
  ConsultaLimitesDeTransportista,
  GuardaLimiteDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { FormularioDeLimite } from '../component/formulario-de-limite';

/**
 * Los límites que el transportista impone a cada canal en cada destino.
 *
 * <p>El panel los MUESTRA y los EDITA; el reparto de un pedido en bultos lo calcula el backend con
 * ellos. Si el peso máximo configurado es mayor que el que el canal admite de verdad, se emite una guía
 * que el transportista rechaza en el almacén y el pedido se queda parado — por eso se editan a mano y
 * no se dan por fijos en el código.
 */
@Component({
  selector: 'nx-limites-de-transportista-page',
  imports: [FaIconComponent, FormularioDeLimite],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="flex items-center gap-2">
            <fa-icon [icon]="iconos.bultos" class="text-primary" />
            {{ t('admin.carrier_limits.title') }}
          </h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.carrier_limits.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-xs text-ink-500 flex items-center gap-2">
            {{ t('admin.carrier_limits.filter_channel') }}
            <select
              class="select select-bordered select-sm font-mono"
              [attr.aria-label]="t('admin.carrier_limits.filter_channel')"
              [value]="canal()"
              (change)="canal.set($any($event.target).value)"
            >
              <option value="">{{ t('admin.carrier_limits.all_channels') }}</option>
              @for (opcion of canales(); track opcion) {
                <option [value]="opcion">{{ opcion }}</option>
              }
            </select>
          </label>
          <button type="button" (click)="abreAlta()" class="btn btn-primary btn-sm">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.carrier_limits.add') }}
          </button>
        </div>
      </div>

      <!-- Los cuatro campos que deciden el resultado. Sin esto la tabla son números sueltos y quien
           la revisa no sabe cuál parte el pedido en dos bultos o cambia lo que se factura. -->
      <div class="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-ink-600">
        <p>
          <span class="font-medium">{{ t('admin.carrier_limits.col.country') }}:</span>
          {{ t('admin.carrier_limits.hint.country') }}
        </p>
        <p>
          <span class="font-medium">{{ t('admin.carrier_limits.col.max_weight') }}:</span>
          {{ t('admin.carrier_limits.hint.max_weight') }}
        </p>
        <p>
          <span class="font-medium">{{ t('admin.carrier_limits.col.volumetric') }}:</span>
          {{ t('admin.carrier_limits.hint.volumetric') }}
        </p>
        <p>
          <span class="font-medium">{{ t('admin.carrier_limits.col.single_parcel') }}:</span>
          {{ t('admin.carrier_limits.hint.single_parcel') }}
        </p>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_limits.col.channel') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_limits.col.country') }}</th>
                <th class="px-4 py-2 font-medium">
                  {{ t('admin.carrier_limits.col.max_weight') }}
                </th>
                <th class="px-4 py-2 font-medium">
                  {{ t('admin.carrier_limits.col.volumetric') }}
                </th>
                <th class="px-4 py-2 font-medium">
                  {{ t('admin.carrier_limits.col.min_billable') }}
                </th>
                <th class="px-4 py-2 font-medium">
                  {{ t('admin.carrier_limits.col.dimensions') }}
                </th>
                <th class="px-4 py-2 font-medium">
                  {{ t('admin.carrier_limits.col.single_parcel') }}
                </th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_limits.col.notes') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_limits.col.active') }}</th>
                <th class="px-4 py-2 font-medium w-24">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (limite of visibles(); track clave(limite)) {
                <tr>
                  <td class="px-4 py-2 font-mono text-[13px]">{{ limite.canal }}</td>
                  <td class="px-4 py-2 text-[13px]">
                    @if (limite.pais === comodin) {
                      <span class="badge badge-ghost badge-sm">
                        {{ t('admin.carrier_limits.any_country') }}
                      </span>
                    } @else {
                      <span class="font-mono">{{ limite.pais }}</span>
                      <span class="ml-1 text-ink-500">{{ nombreDePais(limite.pais) }}</span>
                    }
                  </td>
                  <td class="px-4 py-2 tabular-nums text-[13px]">
                    @if (limite.pesoMaximoGramos > 0) {
                      {{ gramos(limite.pesoMaximoGramos) }}
                    } @else {
                      <span class="text-ink-400">
                        {{ t('admin.carrier_limits.no_weight_limit') }}
                      </span>
                    }
                  </td>
                  <td class="px-4 py-2 text-[12px]">
                    <!-- Un 0 aquí no es «cero divisor»: es que el canal no factura por volumen. -->
                    @if (limite.divisorVolumetrico > 0) {
                      <span class="tabular-nums">{{ limite.divisorVolumetrico }}</span>
                    } @else {
                      <span class="text-ink-500">{{ t('admin.carrier_limits.no_volumetric') }}</span>
                    }
                  </td>
                  <td class="px-4 py-2 tabular-nums text-[13px]">
                    @if (limite.minimoFacturableGramos > 0) {
                      {{ gramos(limite.minimoFacturableGramos) }}
                    } @else {
                      <span class="text-ink-400">
                        {{ t('admin.carrier_limits.no_min_billable') }}
                      </span>
                    }
                  </td>
                  <td class="px-4 py-2 tabular-nums text-[12px]">
                    {{ medidas(limite) ?? t('admin.carrier_limits.no_dimensions') }}
                  </td>
                  <td class="px-4 py-2 text-[12px]">
                    @if (limite.bultoUnico) {
                      <span class="badge badge-warning badge-sm">
                        {{ t('admin.carrier_limits.single_parcel_yes') }}
                      </span>
                    } @else {
                      <span class="text-ink-500">
                        {{ t('admin.carrier_limits.single_parcel_no') }}
                      </span>
                    }
                  </td>
                  <td
                    class="px-4 py-2 text-[12px] text-ink-500 max-w-48 truncate"
                    [title]="limite.notas ?? ''"
                  >
                    {{ limite.notas || '—' }}
                  </td>
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      (click)="alterna(limite)"
                      class="badge cursor-pointer"
                      [class.badge-success]="limite.activo"
                      [class.badge-ghost]="!limite.activo"
                      [attr.aria-label]="
                        limite.activo
                          ? t('admin.carrier_limits.deactivate')
                          : t('admin.carrier_limits.activate')
                      "
                    >
                      <fa-icon
                        [icon]="limite.activo ? iconos.si : iconos.no"
                        class="mr-1"
                      />
                      {{
                        limite.activo
                          ? t('admin.carrier_limits.active')
                          : t('admin.carrier_limits.inactive')
                      }}
                    </button>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        type="button"
                        (click)="abreEdicion(limite)"
                        class="btn btn-ghost btn-xs btn-square"
                        [attr.aria-label]="t('actions.edit')"
                        [title]="t('actions.edit')"
                      >
                        <fa-icon [icon]="iconos.lapiz" />
                      </button>
                      <button
                        type="button"
                        (click)="borra(limite)"
                        class="btn btn-ghost btn-xs btn-square text-error"
                        [attr.aria-label]="t('actions.delete')"
                        [title]="t('actions.delete')"
                      >
                        <fa-icon [icon]="iconos.papelera" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                    {{ t('admin.carrier_limits.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (editando(); as limite) {
        <nx-formulario-de-limite
          [limite]="limite"
          [esAlta]="esAlta()"
          [guardando]="guardando()"
          (cancela)="editando.set(null)"
          (guarda)="guardaLimite($event)"
        />
      }
    </div>
  `,
})
export class LimitesDeTransportistaPage {
  protected readonly comodin = PAIS_COMODIN;
  protected readonly gramos = formateaGramos;
  protected readonly medidas = medidasLegibles;
  protected readonly clave = claveDe;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    bultos: faBoxesPacking,
    mas: faPlus,
    lapiz: faPencil,
    papelera: faTrashCan,
    si: faCircleCheck,
    no: faCircleXmark,
  };

  private readonly consulta = inject(ConsultaLimitesDeTransportista);
  private readonly guardador = inject(GuardaLimiteDeTransportista);
  private readonly alternador = inject(AlternaLimiteDeTransportista);
  private readonly borrador = inject(BorraLimiteDeTransportista);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  private readonly limites = signal<readonly LimiteDeTransportista[]>([]);
  protected readonly canal = signal('');
  protected readonly editando = signal<LimiteDeTransportista | null>(null);
  /** El par canal+país es la CLAVE: al editar se bloquean, o se crearía otra fila en vez de cambiar esta. */
  protected readonly esAlta = signal(false);
  protected readonly guardando = signal(false);

  protected readonly canales = computed(() => canalesDe(this.limites()));
  protected readonly visibles = computed(() => {
    const filtro = this.canal();
    return filtro ? this.limites().filter((l) => l.canal === filtro) : this.limites();
  });

  constructor() {
    void this.recarga();
  }

  private async recarga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.limites.set(resultado.valor);
    } else {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }

  /** El comodín se NOMBRA; nunca se enseña el asterisco a pelo, que no se entiende. */
  protected nombreDePais(codigo: string): string {
    return REGIONS.find((r) => r.countryCode === codigo)?.countryLabel ?? codigo;
  }

  protected abreAlta(): void {
    this.editando.set(limiteEnBlanco());
    this.esAlta.set(true);
  }

  protected abreEdicion(limite: LimiteDeTransportista): void {
    this.editando.set({ ...limite });
    this.esAlta.set(false);
  }

  protected async guardaLimite(limite: LimiteDeTransportista): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardador.ejecuta(limite);
      if (!resultado.ok) {
        this.avisos.error(this.mensajeDeFallo(resultado.error));
        return;
      }
      this.editando.set(null);
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(limite: LimiteDeTransportista): Promise<void> {
    const resultado = await this.alternador.ejecuta(limite);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga();
  }

  protected async borra(limite: LimiteDeTransportista): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.carrier_limits.delete_confirm')
        .replace('{ch}', limite.canal)
        .replace(
          '{co}',
          limite.pais === PAIS_COMODIN
            ? this.t('admin.carrier_limits.any_country')
            : this.nombreDePais(limite.pais),
        ),
      this.t('admin.carrier_limits.delete_title'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.borrador.ejecuta(limite);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.recarga();
  }

  private mensajeDeFallo(error: unknown): string {
    if (error === 'sin-clave') {
      return this.t('admin.carrier_limits.col.channel');
    }
    return (error as { mensaje?: string }).mensaje || this.t('common.error');
  }
}
