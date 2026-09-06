import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { TokenStore } from '@core/auth/token-store';
import {
  Plan,
  centimosDelPeriodo,
  esPlanActual,
  esPlanDeEmpresa,
  esPlanDestacado,
  esPlanGratis,
  precioFormateado,
} from '../../domain/model/plan';
import { PlanesStore } from '../../application/state/planes.store';
import { CargaPlanes } from '../../application/use-case/planes.use-case';

/**
 * La página pública de precios.
 *
 * <p>Cualquiera ve la tarifa, con o sin sesión. Aquí NO se contrata: el botón lleva a entrar o, si ya se
 * entró, al perfil, que es donde vive la contratación. Es deliberado: contratar cobra con la tarjeta
 * guardada, y eso solo tiene sentido donde se administra la cuenta.
 *
 * <p>Mobile first: una tarjeta por fila, dos desde `sm` y cuatro desde `md`.
 */
@Component({
  selector: 'nx-planes',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div>
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold">{{ t('plans.title') }}</h1>
        <p class="opacity-70 mt-2">{{ t('plans.subtitle') }}</p>
        <div class="join mt-4">
          <button
            type="button"
            [class]="'btn btn-sm join-item ' + (planes.periodo() === 'MENSUAL' ? 'btn-primary' : 'btn-outline')"
            (click)="planes.cambiaPeriodo('MENSUAL')"
          >
            {{ t('plans.period.monthly') }}
          </button>
          <button
            type="button"
            [class]="'btn btn-sm join-item ' + (planes.periodo() === 'ANUAL' ? 'btn-primary' : 'btn-outline')"
            (click)="planes.cambiaPeriodo('ANUAL')"
          >
            {{ t('plans.period.yearly') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        @for (plan of planes.planes(); track plan.id) {
          <div [class]="claseDeTarjeta(plan)">
            @if (destacado(plan)) {
              <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                <span class="badge badge-primary">{{ t('plans.popular') }}</span>
              </div>
            }
            <div class="card-body">
              <h3 class="card-title">{{ texto('plans.name.' + plan.codigo, plan.nombre) }}</h3>
              <p class="text-sm opacity-70 min-h-[2.5rem]">
                {{ texto('plans.description.' + plan.codigo, plan.descripcion) }}
              </p>
              <div class="mt-2 text-3xl font-bold">
                {{ precio(plan) }}
                <span class="text-sm opacity-60 ml-1">{{ sufijo(plan) }}</span>
              </div>
              @if (esGratis(plan)) {
                <p class="text-[12px] text-primary/80 font-medium mt-1">{{ t('plans.free_trial_note') }}</p>
              }

              <ul class="text-sm space-y-1.5 mt-5">
                @for (limite of limites(plan); track limite.clave) {
                  <li class="flex items-start gap-2">
                    <fa-icon [icon]="iconoIncluido" class="text-success mt-1" />
                    <span><strong>{{ limite.cuantos }}</strong> {{ limite.etiqueta }}</span>
                  </li>
                }
              </ul>

              <div class="card-actions mt-4">
                @if (esDeEmpresa(plan)) {
                  <a routerLink="/connect" [class]="claseDeBoton(plan)">{{ t('plans.contact_sales') }}</a>
                } @else if (esElActual(plan)) {
                  <button type="button" disabled class="btn w-full btn-success btn-outline">
                    {{ t('plans.current') }}
                  </button>
                } @else if (conSesion) {
                  <a routerLink="/profile" [class]="claseDeBoton(plan)">{{ t('plans.go_contract') }}</a>
                } @else {
                  <a routerLink="/login" [class]="claseDeBoton(plan)">{{ t('plans.login_to_subscribe') }}</a>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PlanesPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly carga = inject(CargaPlanes);

  protected readonly planes = inject(PlanesStore);
  protected readonly t = this.traduccion.t;
  protected readonly iconoIncluido = faCheck;

  /**
   * Si hay sesión, para decidir a dónde lleva el botón.
   *
   * <p>Se mira la credencial guardada y no el titular de la cuenta: aquí basta con saber si hay sesión, y
   * preguntar quién es obligaría a una llamada más en una página que la mayoría abre sin haber entrado.
   */
  protected readonly conSesion = !!inject(TokenStore).acceso();

  protected esDeEmpresa = esPlanDeEmpresa;
  protected destacado = esPlanDestacado;

  constructor() {
    void this.carga.ejecuta(this.conSesion);
  }

  protected esElActual(plan: Plan): boolean {
    return esPlanActual(this.planes.suscripcion(), plan);
  }

  protected esGratis(plan: Plan): boolean {
    return esPlanGratis(plan, this.planes.periodo());
  }

  protected precio(plan: Plan): string {
    if (esPlanDeEmpresa(plan)) {
      return this.t('plans.custom');
    }
    if (this.esGratis(plan)) {
      return this.t('plans.free');
    }
    // El importe llega HECHO del backend, ya convertido a la divisa de quien mira: aquí solo se pinta.
    return precioFormateado(plan, this.planes.periodo()) ?? '—';
  }

  protected sufijo(plan: Plan): string {
    if (centimosDelPeriodo(plan, this.planes.periodo()) <= 0) {
      return '';
    }
    return this.planes.periodo() === 'MENSUAL' ? this.t('plans.per_month') : this.t('plans.per_year');
  }

  /** Los límites del plan, con su rótulo traducido; si falta la clave, se humaniza el nombre técnico. */
  protected limites(plan: Plan): readonly { clave: string; cuantos: string; etiqueta: string }[] {
    return Object.entries(plan.limites).map(([clave, cuantos]) => ({
      clave,
      cuantos: cuantos.toLocaleString(this.traduccion.idioma()),
      etiqueta: this.texto(`plans.feature.${clave}`, clave.replace(/_/g, ' ')),
    }));
  }

  /** La traducción si existe; si falta la clave, el texto de respaldo que da el backend. */
  protected texto(clave: string, respaldo?: string | null): string {
    const traducido = this.t(clave);
    return traducido === clave ? (respaldo ?? '') : traducido;
  }

  protected claseDeTarjeta(plan: Plan): string {
    const borde = esPlanDestacado(plan) ? 'border-2 border-primary shadow-lg' : 'card-border';
    return `card bg-base-100 ${borde} relative`;
  }

  protected claseDeBoton(plan: Plan): string {
    return `btn w-full ${esPlanDestacado(plan) ? 'btn-primary' : 'btn-outline'}`;
  }
}
