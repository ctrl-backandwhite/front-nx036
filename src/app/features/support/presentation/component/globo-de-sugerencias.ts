import { Component, computed, inject, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCartPlus, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { HuecoDelPaquete, SugerenciaParaLaCesta } from '../../domain/model/cesta';
import { esPorEnvio } from '../../domain/model/asistente';

/**
 * El globo con lo que conviene añadir a la cesta.
 *
 * <p>Se dice EXACTAMENTE por qué merece la pena cada uno. Anunciar «sin arancel extra» cuando la razón
 * es el envío sería prometer un ahorro que la aduana no da, y quien está a punto de pagar comprueba la
 * cifra.
 *
 * <p>MOBILE FIRST y con el alto ACOTADO: la lista se desplaza por dentro. Sin eso, en un móvil el panel
 * llegaba a medir 647 píxeles sobre una pantalla de 844 y, con el asistente colocado hacia arriba,
 * tapaba la barra de herramientas del catálogo: el selector de cuadrícula quedaba inalcanzable porque
 * el toque aterrizaba en el panel. Se vio probándolo a 390 píxeles de ancho, no en las pruebas.
 */
@Component({
  selector: 'nx-globo-de-sugerencias',
  imports: [RouterLink, FaIconComponent, NgOptimizedImage],
  template: `
    <div role="status"
         class="flex max-h-[60vh] w-[17rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden
                rounded-xl border border-base-300 sm:max-h-[70vh] sm:w-80 bg-base-100 p-3 shadow-xl">
      <div class="flex items-start justify-between gap-2">
        <p class="text-[13px] font-semibold">{{ t(claveTitulo()) }}</p>
        <button type="button" class="opacity-60 hover:opacity-100"
                [attr.aria-label]="t('avatar.close_tip')" (click)="cierra.emit()">
          <fa-icon [icon]="iconos.cerrar" class="text-[12px]" />
        </button>
      </div>
      <p class="mt-1 text-[12px] opacity-70">{{ t(claveCuerpo()) }}</p>

      <!--
        El sitio que queda en el paquete. Es el dato que hoy no da nadie y el que cambia la decisión:
        hasta ese peso, añadir no cuesta aduana nueva; un gramo más, sí.
      -->
      @if (hueco(); as libre) {
        <p class="mt-1 rounded-lg bg-base-200 px-2 py-1 text-[11px] opacity-80">
          {{ t('avatar.parcel_room_pre') }} <strong>{{ libre.gramos }} g</strong>
          {{ t('avatar.parcel_room_post') }}{{ libre.otroBulto ? ' ' + libre.otroBulto + '.' : '.' }}
        </p>
      }

      <ul class="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        @for (sugerencia of sugerencias(); track sugerencia.slug) {
          <li class="flex items-center gap-1 rounded-lg border border-base-300 p-2 hover:bg-base-200">
            <a [routerLink]="['/catalog', sugerencia.slug]"
               (click)="abreLaFicha($event, sugerencia.slug)"
               class="flex min-w-0 flex-1 items-center gap-2">
              @if (sugerencia.imagen; as imagen) {
                <!-- Miniaturas dentro de un globo que se abre a petición: medidas fijas y sin prisa. -->
                <img [ngSrc]="imagen" alt="" width="40" height="40"
                     class="h-10 w-10 shrink-0 rounded object-cover" />
              }
              <span class="min-w-0 flex-1">
                <span class="line-clamp-2 block text-[12px]">{{ sugerencia.titulo }}</span>
                <span class="text-[11px] text-success">{{ porQue(sugerencia) }}</span>
              </span>
            </a>
            <button type="button" class="btn btn-ghost btn-sm shrink-0 text-primary sm:btn-xs"
                    [attr.aria-label]="t('avatar.add_to_cart')" [title]="t('avatar.add_to_cart')"
                    [disabled]="anadiendo() === sugerencia.slug"
                    (click)="anade.emit(sugerencia)">
              <fa-icon [icon]="anadiendo() === sugerencia.slug ? iconos.esperando : iconos.anadir"
                       [class.animate-spin]="anadiendo() === sugerencia.slug" />
            </button>
          </li>
        }
      </ul>

      <!--
        Al catálogo, filtrado por TODAS las partidas arancelarias de la cesta. El valor «carrito» es un
        centinela que el servidor resuelve contra cada línea de declaración que se lleve: con tres
        productos de tres partidas, filtrar por una sola dejaría fuera dos tercios de lo que tampoco
        costaría nada.
      -->
      @if (!porEnvio()) {
        <a [routerLink]="['/catalog']" [queryParams]="{ grupo: 'carrito' }"
           class="mt-2 block text-center text-[12px] font-medium text-primary hover:underline">
          {{ t('avatar.see_all_duty') }}
        </a>
      }
    </div>
  `,
})
export class GloboDeSugerencias {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  readonly sugerencias = input.required<readonly SugerenciaParaLaCesta[]>();
  readonly hueco = input<HuecoDelPaquete | null>(null);
  /** El que se está añadiendo ahora mismo, para apagar su botón sin apagar los demás. */
  readonly anadiendo = input<string | null>(null);

  readonly cierra = output<void>();
  readonly anade = output<SugerenciaParaLaCesta>();
  readonly abreFichaRapida = output<string>();

  /** Si el ahorro es de envío y no de aduana, el globo entero cambia de discurso. */
  protected readonly porEnvio = computed(() => esPorEnvio(this.sugerencias()));

  protected readonly claveTitulo = computed(() =>
    this.porEnvio() ? 'avatar.suggest_title_shipping' : 'avatar.suggest_title',
  );
  protected readonly claveCuerpo = computed(() =>
    this.porEnvio() ? 'avatar.suggest_body_shipping' : 'avatar.suggest_body',
  );

  protected readonly iconos = { cerrar: faXmark, anadir: faCartPlus, esperando: faSpinner };

  protected abreLaFicha(evento: Event, slug: string): void {
    evento.preventDefault();
    this.abreFichaRapida.emit(slug);
  }

  /** El motivo, escrito con los importes que YA vienen formateados del servidor. */
  protected porQue(sugerencia: SugerenciaParaLaCesta): string {
    if (sugerencia.motivo === 'SHIPPING') {
      const suelto = sugerencia.envioSuelto
        ? ` · ${this.t('avatar.instead_of')} ${sugerencia.envioSuelto}`
        : '';
      return `+${sugerencia.envioExtra ?? '?'} ${this.t('avatar.shipping')}${suelto}`;
    }
    const envio = sugerencia.envioExtra
      ? ` · +${sugerencia.envioExtra} ${this.t('avatar.shipping')}`
      : '';
    return `${this.t('avatar.no_duty')}${envio}`;
  }
}
