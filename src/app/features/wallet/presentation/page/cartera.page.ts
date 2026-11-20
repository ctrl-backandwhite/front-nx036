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

      <!--
        Sin la clase card a propósito: su regla de styles.css fija el fondo en base-100 y gana a
        bg-primary, con lo que el texto primary-content quedaba invisible (visto en PRE el 20-nov).
      -->
      <div class="rounded-box p-6 sm:p-8 bg-primary text-primary-content">
        <div class="text-xs uppercase tracking-wider text-primary-content/80">
          {{ t('wallet.balance') }}
        </div>
        <div class="mt-2 text-4xl sm:text-5xl font-medium">
          {{ cartera()?.saldoFormateado ?? '—' }}
          <span class="ml-2 text-base font-light text-primary-content/80">
            {{ cartera()?.divisaMostrada }}
          </span>
        </div>
        <div class="mt-1 text-sm text-primary-content/80">
          {{ t('wallet.usd_canonical') }}:
          <strong class="font-mono">{{ cartera()?.saldoCanonicoFormateado || '—' }}</strong>
          @if (cartera()?.retenidoFormateado; as retenido) {
            <span class="ml-3">· {{ t('wallet.hold') }}: {{ retenido }}</span>
          }
        </div>
        <!--
          Superficie del TEMA y no blanco fijo. El texto era text-brand-700, que en el tema oscuro se
          remapea a un azul claro: sobre el blanco del botón se quedaba en 3.18:1.
        -->
        <div class="mt-6 flex gap-2 flex-wrap">
          <a
            routerLink="/wallet/recharge"
            class="btn btn-primary bg-base-100 text-primary hover:bg-base-200"
          >
            <fa-icon [icon]="iconoMas" /> {{ t('wallet.recharge') }}
          </a>
          <a
            routerLink="/orders"
            class="btn btn-outline border-primary-content/40 text-primary-content! hover:bg-primary-content/10"
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
