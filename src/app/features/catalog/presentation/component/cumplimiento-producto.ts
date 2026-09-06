import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldHalved, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CumplimientoDeProducto } from '../../domain/model/producto';

/**
 * Advertencias de seguridad (art. 19.d del Reglamento (UE) 2023/988).
 *
 * <p>Van las PRIMERAS y destacadas: la norma pide que la advertencia se muestre en la OFERTA, y una
 * advertencia al final de la página, después de las reseñas, no cumple ese propósito.
 */
@Component({
  selector: 'nx-advertencias-seguridad',
  imports: [FaIconComponent],
  template: `
    @if (advertencias().length > 0) {
      <section id="tab-safety" class="alert alert-warning items-start gap-3 shadow-sm" role="note">
        <fa-icon [icon]="iconoAviso" class="mt-0.5 text-lg shrink-0" />
        <div class="min-w-0">
          <h2 class="font-semibold text-sm">{{ t('compliance.safety.title') }}</h2>
          <ul class="mt-1 space-y-1.5 text-sm leading-relaxed list-disc ps-4">
            @for (advertencia of advertencias(); track advertencia) {
              <li>{{ advertencia }}</li>
            }
          </ul>
        </div>
      </section>
    }
  `,
})
export class AdvertenciasSeguridad {
  readonly cumplimiento = input<CumplimientoDeProducto | undefined>(undefined);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAviso = faTriangleExclamation;
  protected readonly advertencias = computed(() => this.cumplimiento()?.advertencias ?? []);
}

/**
 * Fabricante y operador económico de la Unión (art. 19.a y 19.b).
 *
 * <p>Información legal de consulta: va al pie, donde no compite con la decisión de compra pero sigue
 * estando en la oferta. Cuando falta el fabricante NO se inventa ni se disimula: se dice que no está
 * disponible. Un dato de cumplimiento fingido es peor que uno ausente, porque el ausente se ve y se
 * corrige.
 */
@Component({
  selector: 'nx-identidad-cumplimiento',
  imports: [FaIconComponent],
  template: `
    @if (hayAlgoQuePublicar()) {
      <section id="tab-compliance" class="card card-border bg-base-100">
        <div class="card-body gap-4">
          <h2 class="card-title text-base">
            <fa-icon [icon]="iconoEscudo" class="text-primary" />
            {{ t('compliance.section.title') }}
          </h2>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wide opacity-70">
                {{ t('compliance.manufacturer.title') }}
              </h3>
              @if (cumplimiento()?.fabricante; as fabricante) {
                <address class="not-italic text-sm mt-1 leading-relaxed">
                  <div class="font-medium">{{ fabricante }}</div>
                  @if (cumplimiento()?.direccionDelFabricante) {
                    <div>{{ cumplimiento()!.direccionDelFabricante }}</div>
                  }
                  @if (cumplimiento()?.emailDelFabricante; as correo) {
                    <a class="link link-hover break-all" [href]="'mailto:' + correo">{{ correo }}</a>
                  }
                </address>
              } @else {
                <p class="text-sm mt-1 opacity-70">{{ t('compliance.manufacturer.missing') }}</p>
              }
            </div>

            @if (cumplimiento()?.operadorEuropeo; as operador) {
              <div>
                <h3 class="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {{ t('compliance.responsible.title') }}
                </h3>
                <address class="not-italic text-sm mt-1 leading-relaxed">
                  <div class="font-medium">
                    {{ operador.nombre }}
                    @if (operador.papel) {
                      <span class="font-normal opacity-70"> · {{ operador.papel }}</span>
                    }
                  </div>
                  <div>{{ direccionDelOperador() }}</div>
                  <a class="link link-hover break-all" [href]="'mailto:' + operador.email">
                    {{ operador.email }}
                  </a>
                </address>
              </div>
            }
          </div>

          <p class="text-[11px] opacity-60 leading-relaxed border-t border-base-200 pt-3">
            {{ t('compliance.legal_note') }}
          </p>
        </div>
      </section>
    }
  `,
})
export class IdentidadCumplimiento {
  readonly cumplimiento = input<CumplimientoDeProducto | undefined>(undefined);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoEscudo = faShieldHalved;

  protected readonly hayAlgoQuePublicar = computed(
    () => !!this.cumplimiento()?.fabricante || !!this.cumplimiento()?.operadorEuropeo,
  );

  protected readonly direccionDelOperador = computed(() => {
    const operador = this.cumplimiento()?.operadorEuropeo;
    if (!operador) {
      return '';
    }
    const postal = operador.codigoPostal ? `, ${operador.codigoPostal}` : '';
    return `${operador.direccion}${postal} ${operador.ciudad} (${operador.pais})`;
  });
}
