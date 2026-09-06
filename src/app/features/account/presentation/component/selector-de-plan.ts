import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  HACE_FALTA_TARJETA,
  Plan,
  centimosDelPeriodo,
  esPlanActual,
  esPlanDeEmpresa,
  esPlanGratis,
  precioFormateado,
  pruebaAgotada,
} from '../../domain/model/plan';
import { CobrosStore } from '../../application/state/cobros.store';
import { PlanesStore } from '../../application/state/planes.store';
import { ContrataPlan } from '../../application/use-case/planes.use-case';
import { AltaDeTarjetaModal } from './alta-de-tarjeta-modal';

/**
 * Contratación de planes DENTRO del perfil.
 *
 * <p>La página pública de precios solo enseña la tarifa; aquí se contrata, cobrando con la tarjeta
 * guardada por defecto. Si la instalación no cobra, no se pinta nada.
 *
 * <p>Mobile first: una tarjeta por fila, dos desde `sm` y cuatro desde `lg`.
 */
@Component({
  selector: 'nx-selector-de-plan',
  imports: [FaIconComponent, AltaDeTarjetaModal],
  template: `
    @if (cobros.activo()) {
      <section class="card p-5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="flex items-center gap-2">
            <fa-icon [icon]="iconoPlanes" class="text-brand-600" /> {{ t('profile.section.plans') }}
          </h3>
          <div class="join">
            <button
              type="button"
              [class]="'btn btn-xs join-item ' + (planes.periodo() === 'MENSUAL' ? 'btn-primary' : 'btn-outline')"
              (click)="planes.cambiaPeriodo('MENSUAL')"
            >
              {{ t('plans.period.monthly') }}
            </button>
            <button
              type="button"
              [class]="'btn btn-xs join-item ' + (planes.periodo() === 'ANUAL' ? 'btn-primary' : 'btn-outline')"
              (click)="planes.cambiaPeriodo('ANUAL')"
            >
              {{ t('plans.period.yearly') }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (plan of planes.planes(); track plan.id) {
            <div [class]="'border rounded-md p-3 flex flex-col ' + (esElActual(plan) ? 'border-brand-500' : 'border-ink-100')">
              <div class="font-semibold text-sm">{{ nombre(plan) }}</div>
              <div class="text-xl font-bold mt-1">
                {{ precio(plan) }}
                <span class="text-[11px] opacity-60 ml-1">{{ sufijo(plan) }}</span>
              </div>
              @if (esGratis(plan)) {
                <div class="text-[11px] text-brand-600 font-medium mt-1">{{ t('plans.free_trial_note') }}</div>
              }
              <div class="mt-auto pt-3">
                @if (esDeEmpresa(plan)) {
                  <a href="/connect" class="btn btn-outline btn-sm w-full">{{ t('plans.contact_sales') }}</a>
                } @else if (esElActual(plan)) {
                  <button type="button" disabled class="btn btn-success btn-outline btn-sm w-full">
                    {{ t('plans.current') }}
                  </button>
                } @else if (pruebaGastada(plan)) {
                  <button type="button" disabled class="btn btn-outline btn-sm w-full" [title]="t('plans.trial_used')">
                    {{ t('plans.trial_used') }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-primary btn-sm w-full"
                    [disabled]="contratando()"
                    (click)="contrata(plan.codigo)"
                  >
                    {{ planes.suscripcion() ? t('plans.switch') : t('plans.choose') }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <p class="text-[11px] text-ink-400 mt-3">{{ t('profile.plans.hint') }}</p>
      </section>

      @if (planPendiente()) {
        <nx-alta-de-tarjeta-modal
          (cierra)="planPendiente.set(null)"
          (anadida)="retomaContratacion()"
        />
      }
    }
  `,
})
export class SelectorDePlan {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly contrataPlan = inject(ContrataPlan);

  protected readonly planes = inject(PlanesStore);
  protected readonly cobros = inject(CobrosStore);
  protected readonly t = this.traduccion.t;
  protected readonly iconoPlanes = faLayerGroup;

  protected readonly contratando = signal(false);
  /** El plan que se quiso contratar sin tarjeta guardada: se retoma en cuanto se añade una. */
  protected readonly planPendiente = signal<string | null>(null);

  protected esDeEmpresa = esPlanDeEmpresa;

  protected esElActual(plan: Plan): boolean {
    return esPlanActual(this.planes.suscripcion(), plan);
  }

  protected esGratis(plan: Plan): boolean {
    return esPlanGratis(plan, this.planes.periodo());
  }

  protected pruebaGastada(plan: Plan): boolean {
    return pruebaAgotada(
      plan,
      this.planes.periodo(),
      this.cobros.pruebaGratisGastada(),
      this.esElActual(plan),
    );
  }

  /** El nombre traducido si la clave existe; si no, el que da el backend. */
  protected nombre(plan: Plan): string {
    const clave = `plans.name.${plan.codigo}`;
    const texto = this.t(clave);
    return texto === clave ? plan.nombre : texto;
  }

  protected precio(plan: Plan): string {
    if (esPlanDeEmpresa(plan)) {
      return this.t('plans.custom');
    }
    if (this.esGratis(plan)) {
      return this.t('plans.free');
    }
    // El importe llega HECHO del backend: aquí no se calcula ni se formatea nada.
    return precioFormateado(plan, this.planes.periodo()) ?? '—';
  }

  protected sufijo(plan: Plan): string {
    if (centimosDelPeriodo(plan, this.planes.periodo()) <= 0) {
      return '';
    }
    return this.planes.periodo() === 'MENSUAL' ? this.t('plans.per_month') : this.t('plans.per_year');
  }

  protected async contrata(codigo: string): Promise<void> {
    if (this.contratando()) {
      return;
    }
    this.contratando.set(true);
    try {
      const resultado = await this.contrataPlan.ejecuta(codigo, this.planes.periodo());
      if (resultado.ok) {
        const clave =
          resultado.valor === 'bajada-programada' ? 'plans.downgrade_scheduled' : 'plans.subscribed_ok';
        await this.dialogo.alerta(this.t(clave), undefined, 'success');
        return;
      }
      await this.pintaElFallo(codigo, resultado.error.codigo, resultado.error.mensaje);
    } finally {
      this.contratando.set(false);
    }
  }

  /**
   * SOLO cuando el backend pide tarjeta se ofrece añadirla.
   *
   * <p>El resto de fallos —prueba ya gastada, falta el país— se enseñan tal cual: pasar al plan gratis
   * no debe pedirle la tarjeta a nadie, y ofrecerla ahí ahuyenta justo a quien venía a probar.
   */
  private async pintaElFallo(
    codigoDePlan: string,
    codigo: string | undefined,
    mensaje: string,
  ): Promise<void> {
    if (codigo === HACE_FALTA_TARJETA) {
      const acepta = await this.dialogo.confirma(mensaje || this.t('plans.need_card'));
      if (acepta) {
        this.planPendiente.set(codigoDePlan);
      }
      return;
    }
    await this.dialogo.alerta(mensaje || this.t('plans.error'), undefined, 'error');
  }

  protected retomaContratacion(): void {
    const codigo = this.planPendiente();
    this.planPendiente.set(null);
    if (codigo) {
      void this.contrata(codigo);
    }
  }
}
