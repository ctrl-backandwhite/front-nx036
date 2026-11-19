import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation, faTruck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  FichaDePedido,
  MotivoDelCanal,
  hayBultoPorOtroCanal,
  problemaDeCanal,
} from '../../../domain/logistica/model/pedido';

/** La clave de traducción de cada clase de línea. La desconocida se dice: en el panel no se esconde. */
const CLAVE_DE_LINEA: Readonly<Record<string, string>> = {
  ropa: 'checkout.shipping_line.ropa',
  general: 'checkout.shipping_line.general',
  'con-bateria': 'checkout.shipping_line.con_bateria',
  desconocida: 'admin.orders.channel.line.unknown',
};

/** Con guion bajo, porque las claves del diccionario no llevan guion medio. */
function claveDeMotivo(motivo: MotivoDelCanal): string {
  return `admin.orders.channel.reason.${motivo.replaceAll('-', '_')}`;
}

/**
 * Cómo sale un pedido: transportista, canal, clase de línea y bultos con el canal realmente emitido.
 *
 * <p>La sección se pinta SIEMPRE. Antes desaparecía justo cuando faltaba el dato —un pedido sin
 * transportista ni guía—, que es cuando más hace falta verla: ya no hay transportista por defecto, así
 * que un pedido sin canal no emite guía y nadie se enteraba de por qué.
 *
 * <p>Solo PINTA: qué es un problema lo decide el dominio, y el motivo y su detalle los escribe el
 * servidor. El código del canal sí se enseña aquí, a diferencia del escaparate: quien opera lo necesita
 * para buscarlo en el panel del transportista.
 */
@Component({
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
  selector: 'nx-canal-del-pedido',
  imports: [FaIconComponent],
  template: `
    <section class="card p-4 space-y-3 text-sm" data-testid="canal-del-pedido">
      <header class="flex items-center gap-2">
        <fa-icon [icon]="iconos.camion" class="text-brand-600" />
        <span class="font-medium">{{ t('admin.orders.channel.title') }}</span>
      </header>

      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-ink-600">
            {{ t('admin.orders.detail.carrier') }}
          </dt>
          <dd data-testid="canal-transportista">{{ pedido().nombreDelTransportista || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-ink-600">
            {{ t('admin.orders.channel.channel') }}
          </dt>
          <dd data-testid="canal-canal">
            <span class="font-mono">{{ pedido().canalDeEnvio || '—' }}</span>
            @if (pedido().nombreDelCanal; as nombre) {
              <span class="block text-[12px] text-ink-500">{{ nombre }}</span>
            }
          </dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-ink-600">
            {{ t('admin.orders.channel.line_type') }}
          </dt>
          <dd data-testid="canal-linea">{{ linea() }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-ink-600">
            {{ t('admin.orders.detail.tracking') }}
          </dt>
          <dd class="font-mono" data-testid="canal-guia">{{ pedido().numeroDeSeguimiento || '—' }}</dd>
        </div>
      </dl>

      @if (motivo(); as motivo) {
        <div
          role="alert"
          class="rounded-box border border-error/30 bg-error/10 p-3 text-[12px] text-error space-y-1"
          data-testid="canal-problema"
        >
          <div class="font-semibold">
            <fa-icon [icon]="iconos.aviso" /> {{ t('admin.orders.channel.problem_title') }}
          </div>
          <div>{{ t(claveDeMotivo(motivo)) }}</div>
          @if (pedido().detalleDelCanal; as detalle) {
            <div class="font-mono break-words" data-testid="canal-detalle">{{ detalle }}</div>
          }
        </div>
      }

      @if (pedido().bultos.length > 0) {
        <div class="space-y-2">
          <div class="text-[11px] uppercase tracking-wider text-ink-600">
            {{ t('admin.orders.channel.parcels') }}
          </div>
          @if (otroCanal()) {
            <div role="alert" class="text-[12px] text-error" data-testid="canal-bulto-distinto">
              {{ t('admin.orders.channel.mismatch') }}
            </div>
          }
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm" data-testid="canal-bultos">
              <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ t('admin.orders.channel.col.number') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('admin.orders.detail.carrier') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('admin.orders.channel.col.issued') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('admin.orders.detail.tracking') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('admin.dashboard.col.status') }}</th>
                  <th class="px-3 py-2 font-medium text-right">{{ t('admin.orders.channel.col.weight') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('admin.orders.channel.col.matches') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (bulto of pedido().bultos; track bulto.numero) {
                  <tr class="border-t border-ink-100">
                    <td class="px-3 py-2">{{ bulto.numero }}</td>
                    <td class="px-3 py-2">{{ bulto.transportista || '—' }}</td>
                    <td class="px-3 py-2 font-mono">{{ bulto.canalEmitido || '—' }}</td>
                    <td class="px-3 py-2 font-mono text-[11px]">
                      {{ bulto.numeroDeSeguimiento || bulto.numeroDeGuia || '—' }}
                    </td>
                    <td class="px-3 py-2">{{ bulto.estado || '—' }}</td>
                    <td class="px-3 py-2 text-right">
                      {{ bulto.pesoEnGramos ? bulto.pesoEnGramos + ' g' : '—' }}
                    </td>
                    <td class="px-3 py-2" data-testid="canal-coincide">
                      @if (bulto.coincideConElCanal === true) {
                        <span class="badge badge-sm badge-success">{{ t('admin.orders.channel.matches_yes') }}</span>
                      } @else if (bulto.coincideConElCanal === false) {
                        <span class="badge badge-sm badge-error">{{ t('admin.orders.channel.matches_no') }}</span>
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `,
})
export class CanalDelPedido {
  readonly pedido = input.required<FichaDePedido>();

  protected readonly iconos = { camion: faTruck, aviso: faTriangleExclamation };
  protected readonly t = inject(TraduccionService).t;
  protected readonly claveDeMotivo = claveDeMotivo;

  protected readonly motivo = computed(() => problemaDeCanal(this.pedido()));
  protected readonly otroCanal = computed(() => hayBultoPorOtroCanal(this.pedido()));

  protected readonly linea = computed(() => {
    const tipo = this.pedido().tipoDeLinea;
    return tipo ? this.t(CLAVE_DE_LINEA[tipo]) : '—';
  });
}
