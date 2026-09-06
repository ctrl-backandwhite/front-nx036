import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Cartera, MovimientoDeCartera } from '../../domain/model/cartera';
import { ComisionesPendientes } from '../../domain/model/comisiones-pendientes';
import { ConsultaCartera } from '../../application/use-case/consulta-cartera.use-case';
import { ConsultaComisionesPendientes } from '../../application/use-case/consulta-comisiones-pendientes.use-case';
import { ComisionesPendientesPanel } from '../component/comisiones-pendientes';
import { MovimientosDeCartera } from '../component/movimientos-de-cartera';

/** Cada cuánto avanza la cuenta atrás de las comisiones. Un minuto basta: se mide en horas y días. */
const LATIDO_MS = 60_000;

/**
 * La cartera: cuánto hay, qué se ha movido y qué está por llegar.
 *
 * <p>El saldo NO se siembra: una cuenta nueva empieza a cero y solo sube recargando o por un reembolso.
 * Aquí no hay ningún camino que añada dinero sin pasar por una pasarela.
 */
@Component({
  selector: 'nx-cartera',
  imports: [RouterLink, FaIconComponent, ComisionesPendientesPanel, MovimientosDeCartera],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <h1>{{ t('wallet.title') }}</h1>

      <div class="card p-6 sm:p-8 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div class="text-xs uppercase tracking-wider text-brand-100 opacity-80">
          {{ t('wallet.balance') }}
        </div>
        <div class="mt-2 text-4xl sm:text-5xl font-medium">
          {{ cartera()?.saldoFormateado ?? '—' }}
          <span class="ml-2 text-base font-light text-brand-100">
            {{ cartera()?.divisaMostrada }}
          </span>
        </div>
        <div class="mt-1 text-sm text-brand-100/80">
          {{ t('wallet.usd_canonical') }}:
          <strong class="font-mono">{{ cartera()?.saldoCanonicoFormateado || '—' }}</strong>
          @if (cartera()?.retenidoFormateado; as retenido) {
            <span class="ml-3">· {{ t('wallet.hold') }}: {{ retenido }}</span>
          }
        </div>
        <div class="mt-6 flex gap-2 flex-wrap">
          <a
            routerLink="/wallet/recharge"
            class="btn btn-primary bg-white text-brand-700 hover:bg-brand-50"
          >
            <fa-icon [icon]="iconoMas" /> {{ t('wallet.recharge') }}
          </a>
          <a
            routerLink="/orders"
            class="btn btn-outline border-brand-200/40 text-white hover:bg-white/10"
          >
            {{ t('wallet.view_orders') }}
          </a>
        </div>
      </div>

      <nx-comisiones-pendientes [comisiones]="comisiones()" [ahora]="ahora()" />

      <nx-movimientos-de-cartera [movimientos]="movimientos()" />
    </div>
  `,
})
export class CarteraPage {
  private readonly consulta = inject(ConsultaCartera);
  private readonly comisionesPendientes = inject(ConsultaComisionesPendientes);
  private readonly destruccion = inject(DestroyRef);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoMas = faPlus;

  protected readonly cartera = signal<Cartera | null>(null);
  protected readonly movimientos = signal<readonly MovimientoDeCartera[]>([]);
  protected readonly comisiones = signal<ComisionesPendientes | null>(null);

  /** El reloj de la cuenta atrás. Se mueve solo para que los días y las horas avancen sin recargar. */
  protected readonly ahora = signal(Date.now());

  constructor() {
    void this.carga();
    const latido = setInterval(() => this.ahora.set(Date.now()), LATIDO_MS);
    this.destruccion.onDestroy(() => clearInterval(latido));
  }

  private async carga(): Promise<void> {
    const [saldo, movimientos, comisiones] = await Promise.all([
      this.consulta.ejecuta(),
      this.consulta.ultimosMovimientos(),
      this.comisionesPendientes.ejecuta(),
    ]);
    if (saldo.ok) {
      this.cartera.set(saldo.valor);
    }
    if (movimientos.ok) {
      this.movimientos.set(movimientos.valor.movimientos);
    }
    // Las comisiones son decorado: quien no es afiliado recibe un rechazo del servidor, y eso no puede
    // impedir que se vea el saldo. Por eso el fallo se traga aquí y la sección sencillamente no aparece.
    this.comisiones.set(comisiones.ok ? comisiones.valor : null);
  }
}
