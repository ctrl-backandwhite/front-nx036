import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FaseDeEnvio, claveDeFase, faseConProblema } from '../../domain/model/seguimiento';

/**
 * La pastilla con la fase actual del envío. Sin fase no pinta nada: un pedido antiguo no tiene por qué
 * enseñar una pastilla vacía.
 *
 * <p>Los colores salen de las variantes de daisyUI, que cambian solas con el tema oscuro: ENTREGADO en
 * verde, incidencia o devolución en rojo o ámbar y el resto en el color de marca.
 */
@Component({
  // Nace inline por ser un elemento propio: se le da display explícito.
  host: { class: 'inline-block' },
  selector: 'nx-fase-del-envio',
  template: `
    @if (fase(); as actual) {
      <span class="badge gap-1" [class]="clase()" data-fase-del-envio [attr.data-fase]="actual">
        {{ t(clave()) }}
      </span>
    }
  `,
})
export class FaseDelEnvio {
  readonly fase = input<FaseDeEnvio | undefined>(undefined);

  protected readonly t = inject(TraduccionService).t;

  protected readonly clave = computed(() => {
    const actual = this.fase();
    return actual ? claveDeFase(actual) : '';
  });

  protected readonly clase = computed(() => {
    const actual = this.fase();
    if (actual === 'ENTREGADO') {
      return 'badge-success';
    }
    if (actual === 'INCIDENCIA') {
      return 'badge-warning';
    }
    return faseConProblema(actual) ? 'badge-error' : 'badge-primary';
  });
}
