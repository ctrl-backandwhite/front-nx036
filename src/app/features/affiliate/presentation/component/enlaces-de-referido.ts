import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMoneyBillTransfer, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  METODOS_DE_COBRO,
  MetodoDeCobro,
  PanelDeAfiliado,
  PerfilDeCobro,
  metodoDisponible,
} from '../../domain/model/afiliado';
import { FilaDeCodigo } from './fila-de-codigo';

/**
 * Los enlaces de referido y, debajo, la solicitud de cobro.
 *
 * <p>Van juntos porque es la misma pregunta contada de dos maneras: cuánto he traído y cuándo lo cobro.
 * El botón de solicitar se apaga hasta llegar al mínimo, y el rótulo lo explica en vez de dejar un botón
 * muerto sin motivo.
 */
@Component({
  selector: 'nx-enlaces-de-referido',
  imports: [FaIconComponent, FilaDeCodigo],
  template: `
    <section class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-medium text-sm">{{ t('affiliate.codes.title') }}</h2>
        <button
          type="button"
          (click)="creaCodigo.emit()"
          [disabled]="creando()"
          class="btn btn-outline btn-xs text-[12px]"
        >
          <fa-icon [icon]="iconos.mas" /> {{ t('affiliate.codes.add') }}
        </button>
      </div>
      <div class="space-y-2">
        @for (codigo of panel().codigos; track codigo.id) {
          <nx-fila-de-codigo [codigo]="codigo" [origen]="origen()" />
        }
      </div>
      <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
        <p class="text-[12px] text-ink-500">
          {{ t('affiliate.pending') }}:
          <strong class="text-amber-600">{{ panel().estadisticas.pendienteFormateado }}</strong>
          · {{ t('affiliate.kpi.approved') }}:
          <strong class="text-emerald-600">{{ panel().estadisticas.aprobadoFormateado }}</strong>
        </p>
        @if (panel().cobroSolicitado) {
          <span class="badge badge-info badge-sm">{{ t('affiliate.payout.pending') }}</span>
        } @else {
          <div class="flex items-center gap-2">
            <select
              [value]="metodoElegido()"
              (change)="eligeMetodo($event)"
              [disabled]="!perfil()"
              class="select select-xs text-[12px]"
              [title]="t('affiliate.payout.method_label')"
              [attr.aria-label]="t('affiliate.payout.method_label')"
            >
              @for (metodo of metodos; track metodo) {
                <option [value]="metodo" [disabled]="!disponible(metodo)">
                  {{ t('affiliate.payout.method.' + metodo) }}
                </option>
              }
            </select>
            <button
              type="button"
              (click)="solicita.emit(metodoElegido())"
              [disabled]="!panel().puedePedirCobro || solicitando() || !perfil()"
              class="btn btn-outline btn-xs text-[12px] disabled:opacity-40"
              [title]="pistaDeMinimo()"
            >
              <fa-icon [icon]="iconos.dinero" /> {{ t('affiliate.payout.request') }}
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class EnlacesDeReferido {
  readonly panel = input.required<PanelDeAfiliado>();
  readonly perfil = input<PerfilDeCobro | null>(null);
  readonly origen = input('');
  readonly creando = input(false);
  readonly solicitando = input(false);
  /**
   * El método elegido a mano. Mientras nadie toque el selector manda el preferido del perfil, para que
   * quien ya dijo cómo quiere cobrar no tenga que repetirlo.
   */
  readonly metodo = input<MetodoDeCobro | null>(null);
  readonly cambiaMetodo = output<MetodoDeCobro>();
  readonly creaCodigo = output<void>();
  readonly solicita = output<MetodoDeCobro>();

  protected readonly metodos = METODOS_DE_COBRO;
  protected readonly iconos = { mas: faPlus, dinero: faMoneyBillTransfer };
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly metodoElegido = computed<MetodoDeCobro>(
    () => this.metodo() ?? this.perfil()?.metodoPreferido ?? 'WALLET',
  );

  protected disponible(metodo: MetodoDeCobro): boolean {
    return metodoDisponible(metodo, this.perfil());
  }

  /** Cuando no se llega al mínimo, el rótulo dice cuánto falta en vez de dejar un botón mudo. */
  protected pistaDeMinimo(): string {
    return this.panel().puedePedirCobro
      ? ''
      : this.traduccion.tCon('affiliate.payout.min_hint', {
          n: this.panel().minimoDeCobroFormateado,
        });
  }

  protected eligeMetodo(evento: Event): void {
    this.cambiaMetodo.emit((evento.target as HTMLSelectElement).value as MetodoDeCobro);
  }
}
