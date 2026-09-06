import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Pedido, tieneFactura } from '../../domain/model/pedido';
import { Seguimiento } from '../../domain/model/seguimiento';
import { ConsultaPedido } from '../../application/use-case/consulta-pedido.use-case';
import { SiguePedido } from '../../application/use-case/sigue-pedido.use-case';
import { DescargaFactura } from '../../application/use-case/descarga-factura.use-case';
import { DireccionDelPedido } from '../component/direccion-del-pedido';
import { LineaDeTiempoDeSeguimiento } from '../component/linea-de-tiempo-de-seguimiento';
import { PasosDelPedido } from '../component/pasos-del-pedido';
import { ProductosDelPedido } from '../component/productos-del-pedido';
import { ResumenDePago } from '../component/resumen-de-pago';
import { CancelacionDePedido } from '../service/cancelacion-de-pedido';

/** Cada cuánto se vuelve a preguntar por el envío. Lo mismo que hacía el front anterior. */
const REFRESCO_DEL_SEGUIMIENTO_MS = 30_000;

/**
 * La ficha de un pedido.
 *
 * <p>El seguimiento se refresca solo cada medio minuto: es lo único de esta pantalla que cambia mientras
 * se mira, porque el transportista publica sus avisos por su cuenta. El temporizador se apaga al salir;
 * si no, una pestaña olvidada seguiría preguntando por un pedido que ya nadie mira.
 */
@Component({
  selector: 'nx-pedido',
  imports: [
    RouterLink,
    FaIconComponent,
    PasosDelPedido,
    LineaDeTiempoDeSeguimiento,
    DireccionDelPedido,
    ResumenDePago,
    ProductosDelPedido,
  ],
  template: `
    @if (cargando()) {
      <p class="text-sm text-ink-500">{{ t('order.detail.loading') }}</p>
    } @else if (pedido(); as datos) {
      <div class="max-w-4xl mx-auto space-y-5">
        @if (reciencreado()) {
          <div class="card p-4 bg-emerald-50 border-emerald-200 text-emerald-800">
            <div class="flex items-start gap-3">
              <fa-icon [icon]="iconoOk" class="text-2xl mt-0.5 shrink-0" />
              <div class="text-sm">
                <div class="font-medium">{{ t('order.detail.placed_ok') }}</div>
                <div class="text-emerald-700">
                  {{
                    pagadoFuera()
                      ? t('order.detail.placed_desc_paid')
                      : t('order.detail.placed_desc')
                  }}
                </div>
              </div>
            </div>
          </div>
        }

        <header class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div class="text-xs text-ink-500">{{ t('orders.col.order') }}</div>
            <h1 class="font-mono">{{ datos.numero }}</h1>
            @if (datos.realizadoEl; as fecha) {
              <div class="text-xs text-ink-500">
                {{ t('order.detail.placed_on') }} {{ fechaYHora(fecha) }}
              </div>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            @if (conFactura()) {
              <button type="button" (click)="descarga()" class="btn btn-outline text-sm">
                {{ t('order.detail.download_invoice') }}
              </button>
            }
            <!--
              El cliente puede cancelar (y recuperar su dinero) SOLO mientras el pedido está pagado y aún
              no se ha enviado al proveedor. Lo decide el servidor: el estado PAGADO no basta, porque el
              género puede estar ya comprado en 1688 aunque el pedido siga sin avanzar.
            -->
            @if (datos.cancelable) {
              <button
                type="button"
                (click)="pideCancelar()"
                class="btn btn-outline text-sm hover:border-red-300 hover:text-red-700"
              >
                {{ t('order.detail.cancel') }}
              </button>
            }
            <a routerLink="/orders" class="btn btn-outline text-sm">← {{ t('order.detail.back') }}</a>
          </div>
        </header>

        <section class="card p-5">
          <h3 class="mb-4">{{ t('order.detail.shipping_status') }}</h3>
          <nx-pasos-del-pedido [pedido]="datos" />
          @if (datos.numeroDeSeguimiento) {
            <div class="mt-4 text-sm border-t border-ink-100 pt-3">
              {{ t('order.detail.tracking') }}:
              <span class="font-mono">{{ datos.numeroDeSeguimiento }}</span>
              @if (datos.transportista) {
                <span> · {{ datos.transportista }}</span>
              }
            </div>
          }
        </section>

        <nx-linea-de-tiempo-de-seguimiento [seguimiento]="seguimiento()" />

        <section class="grid gap-4 md:grid-cols-2">
          <nx-direccion-del-pedido [direccion]="datos.direccionDeEnvio" />
          <nx-resumen-de-pago [pedido]="datos" />
        </section>

        <nx-productos-del-pedido [lineas]="datos.lineas" />
      </div>
    } @else {
      <p class="text-sm">{{ t('order.detail.not_found') }}</p>
    }
  `,
})
export class PedidoPage {
  /** Llega de la dirección gracias a `withComponentInputBinding()`. */
  readonly id = input.required<string>();
  /** `?placed=1` lo pone el pago recién terminado. */
  readonly placed = input('');
  /**
   * `?paid=1` lo añaden SOLO los pagos externos (tarjeta, PayPal, USDT); el pago con la cartera llega
   * sin él. Así el mensaje es coherente: solo se menciona la cartera si se pagó con ella.
   */
  readonly paid = input('');

  private readonly consulta = inject(ConsultaPedido);
  private readonly sigue = inject(SiguePedido);
  private readonly descargaFactura = inject(DescargaFactura);
  private readonly cancelacion = inject(CancelacionDePedido);
  private readonly dialogo = inject(DialogoStore);
  private readonly destruccion = inject(DestroyRef);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoOk = faCircleCheck;

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly seguimiento = signal<Seguimiento | null>(null);
  protected readonly cargando = signal(true);

  protected readonly reciencreado = computed(() => this.placed() === '1');
  protected readonly pagadoFuera = computed(() => this.paid() === '1');
  protected readonly conFactura = computed(() => {
    const datos = this.pedido();
    return !!datos && tieneFactura(datos.estado);
  });

  private temporizador: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Al cambiar de pedido —o de idioma, que cambia los títulos— se vuelve a leer todo.
    effect(() => {
      const id = this.id();
      void this.carga(id);
    });

    this.temporizador = setInterval(() => {
      void this.cargaSeguimiento(this.id());
    }, REFRESCO_DEL_SEGUIMIENTO_MS);
    this.destruccion.onDestroy(() => clearInterval(this.temporizador));
  }

  private async carga(id: string): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.consulta.ejecuta(id);
      this.pedido.set(resultado.ok ? resultado.valor : null);
    } finally {
      this.cargando.set(false);
    }
    await this.cargaSeguimiento(id);
  }

  private async cargaSeguimiento(id: string): Promise<void> {
    const resultado = await this.sigue.ejecuta(id);
    // Si el seguimiento falla se deja lo último que se sabía: borrarlo haría desaparecer la sección
    // entera cada vez que el transportista tiene un mal minuto.
    if (resultado.ok) {
      this.seguimiento.set(resultado.valor);
    }
  }

  protected async pideCancelar(): Promise<void> {
    const datos = this.pedido();
    if (datos && (await this.cancelacion.pide(datos.id, datos.metodoDePago))) {
      await this.carga(datos.id);
    }
  }

  /**
   * Baja la factura y se la entrega al navegador.
   *
   * <p>El archivo llega ya descargado desde el adaptador —el endpoint pide credencial y un enlace normal
   * no la lleva—, así que aquí solo queda crear el enlace efímero y soltarlo. Se libera la dirección al
   * terminar: sin eso, cada descarga deja el PDF entero retenido en memoria.
   */
  protected async descarga(): Promise<void> {
    const datos = this.pedido();
    if (!datos) {
      return;
    }
    const resultado = await this.descargaFactura.ejecuta(datos.id, datos.numero);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
      return;
    }
    const direccion = URL.createObjectURL(resultado.valor.contenido);
    const enlace = document.createElement('a');
    enlace.href = direccion;
    enlace.download = resultado.valor.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(direccion);
  }

  protected fechaYHora(valor: string): string {
    return new Date(valor).toLocaleString();
  }
}
