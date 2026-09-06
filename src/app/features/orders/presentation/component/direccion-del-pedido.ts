import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { nombreDePais } from '@ds/component/pais/paises';
import { DireccionDePedido } from '../../domain/model/pedido';

/** Adónde va el paquete, tal como se transmitió al transportista. */
@Component({
  selector: 'nx-direccion-del-pedido',
  template: `
    <div class="card p-5">
      <h3>{{ t('order.detail.address') }}</h3>
      @if (direccion(); as destino) {
        <div class="text-sm mt-2 space-y-0.5">
          <div class="font-medium">{{ destino.nombreCompleto }}</div>
          <div class="text-ink-600">
            {{ destino.linea1 }}@if (destino.linea2) {, {{ destino.linea2 }}}
          </div>
          <div class="text-ink-600">
            {{ destino.ciudad }}@if (destino.provincia) {, {{ destino.provincia }}}
            {{ destino.codigoPostal }}
          </div>
          <div class="text-ink-600">{{ pais(destino.pais) }}</div>
          @if (destino.telefono) {
            <div class="text-ink-500 text-xs mt-1">
              {{ t('checkout.phone') }}: {{ destino.telefono }}
            </div>
          }
        </div>
      } @else {
        <div class="text-sm text-ink-500 mt-1">—</div>
      }
    </div>
  `,
})
export class DireccionDelPedido {
  readonly direccion = input<DireccionDePedido | undefined>(undefined);

  protected readonly t = inject(TraduccionService).t;

  protected pais(codigo: string): string {
    return nombreDePais(codigo);
  }
}
