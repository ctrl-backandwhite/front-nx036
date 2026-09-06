import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Provincia } from '@ds/component/provincia/selector-provincia';
import { DireccionDeEnvio, DireccionGuardada } from '../../domain/model/pedido';
import { CamposDeDireccion, DireccionEditable } from './campos-de-direccion';

/** El valor con el que se elige «escribir una dirección nueva» en el grupo de opciones. */
export const OPCION_NUEVA = 'NUEVA';

/**
 * Adónde va el pedido: las direcciones de la cuenta y, si no vale ninguna, una nueva.
 *
 * <p>MÓVIL PRIMERO: una tarjeta por fila, y dos a partir de `sm`. Cada opción es una etiqueta que envuelve
 * su botón de radio, de modo que se puede pulsar en cualquier parte de la tarjeta: en un móvil, acertar
 * solo en el círculo es exigir puntería en el paso donde más molesta.
 */
@Component({
  selector: 'nx-seccion-de-envio',
  imports: [RouterLink, FaIconComponent, CamposDeDireccion],
  template: `
    <section class="card p-5 space-y-3">
      <div class="flex items-center gap-2 text-sm font-medium">
        <fa-icon [icon]="iconoUbicacion" class="text-brand-600" /> {{ t('checkout.shipping') }}
      </div>

      @if (!resueltas()) {
        <div class="text-xs text-ink-500 py-3 flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full bg-brand-500 animate-pulse"></span>
          {{ t('common.loading') }}…
        </div>
      }

      @if (direcciones().length > 0) {
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          @for (direccion of direcciones(); track direccion.id) {
            <label
              class="card p-3 text-sm cursor-pointer transition-colors"
              [class.border-brand-500]="elegida() === direccion.id"
              [class.ring-2]="elegida() === direccion.id"
              [class.ring-brand-100]="elegida() === direccion.id"
              [class.hover:border-ink-300]="elegida() !== direccion.id"
            >
              <div class="flex items-start gap-2">
                <input
                  type="radio"
                  name="direccion-de-envio"
                  class="mt-1"
                  [checked]="elegida() === direccion.id"
                  (change)="elige.emit(direccion.id)"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium truncate">{{
                      direccion.etiqueta || direccion.nombreCompleto
                    }}</span>
                    @if (direccion.porDefecto) {
                      <span class="badge bg-brand-50 text-brand-700">{{
                        t('checkout.default')
                      }}</span>
                    }
                  </div>
                  <div class="text-xs text-ink-500 mt-1">
                    {{ direccion.nombreCompleto }} · {{ direccion.linea1
                    }}{{ direccion.linea2 ? ', ' + direccion.linea2 : '' }}
                  </div>
                  <div class="text-xs text-ink-500">
                    {{ direccion.ciudad }}{{ direccion.provincia ? ', ' + direccion.provincia : '' }}
                    {{ direccion.codigoPostal }} · {{ direccion.pais }}
                  </div>
                  @if (direccion.telefono) {
                    <div class="text-xs text-ink-500">
                      {{ t('checkout.phone') }}: {{ direccion.telefono }}
                    </div>
                  }
                </div>
              </div>
            </label>
          }
          <label
            class="card p-3 text-sm cursor-pointer flex items-center gap-2 transition-colors"
            [class.border-brand-500]="esNueva()"
            [class.ring-2]="esNueva()"
            [class.ring-brand-100]="esNueva()"
            [class.hover:border-ink-300]="!esNueva()"
          >
            <input
              type="radio"
              name="direccion-de-envio"
              [checked]="esNueva()"
              (change)="elige.emit(opcionNueva)"
            />
            <fa-icon [icon]="iconoNueva" class="text-brand-600" />
            {{ t('checkout.use_other_address') }}
          </label>
        </div>
      }

      @if (esNueva()) {
        <div class="pt-2 space-y-3">
          <nx-campos-de-direccion
            [valor]="direccionEditable()"
            [provincias]="provincias()"
            (valorChange)="escribe.emit($event)"
          />
          <label class="text-xs text-ink-600 flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="guardar()"
              (change)="cambiaGuardar($event)"
            />
            {{ t('checkout.save_address') }}
          </label>
        </div>
      }

      <div class="pt-1 text-xs text-ink-500">
        <a routerLink="/addresses" class="hover:underline inline-flex items-center gap-1">
          <fa-icon [icon]="iconoUbicacion" /> {{ t('addresses.manage_link') }}
        </a>
      </div>
    </section>
  `,
})
export class SeccionDeEnvio {
  readonly direcciones = input.required<readonly DireccionGuardada[]>();
  readonly resueltas = input.required<boolean>();
  readonly elegida = input.required<string | null>();
  readonly direccionNueva = input.required<DireccionDeEnvio>();
  readonly provincias = input<readonly Provincia[]>([]);
  readonly guardar = input.required<boolean>();

  readonly elige = output<string>();
  readonly escribe = output<DireccionDeEnvio>();
  readonly cambiaGuardado = output<boolean>();

  protected readonly t = inject(TraduccionService).t;

  /**
   * La misma dirección, pero con las claves opcionales presentes aunque vayan vacías. El formulario las
   * necesita para poder crear su campo: sin la clave no hay campo que atar. Es un valor DERIVADO, así
   * que se calcula una vez por cambio y no se copia a mano.
   */
  protected readonly direccionEditable = computed<DireccionEditable>(() => {
    const direccion = this.direccionNueva();
    // Explícito y no por propagación: una clave presente PERO a `undefined` se colaría igual y volvería
    // a dejar el campo sin valor con el que pintar.
    return {
      nombreCompleto: direccion.nombreCompleto,
      linea1: direccion.linea1,
      linea2: direccion.linea2 ?? '',
      ciudad: direccion.ciudad,
      provincia: direccion.provincia ?? '',
      codigoPostal: direccion.codigoPostal ?? '',
      pais: direccion.pais,
      telefono: direccion.telefono ?? '',
    };
  });

  protected readonly opcionNueva = OPCION_NUEVA;
  protected readonly iconoUbicacion = faLocationDot;
  protected readonly iconoNueva = faPlus;

  protected esNueva(): boolean {
    return this.elegida() === OPCION_NUEVA;
  }

  protected cambiaGuardar(evento: Event): void {
    this.cambiaGuardado.emit((evento.target as HTMLInputElement).checked);
  }
}
