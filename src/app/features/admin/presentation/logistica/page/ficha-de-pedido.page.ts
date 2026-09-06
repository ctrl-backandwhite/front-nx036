import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBan,
  faCircleCheck,
  faPaperPlane,
  faRotate,
  faRotateLeft,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { LupaImagen } from '@ds/component/lupa/lupa-imagen';
import {
  AccionSobrePedido,
  FichaDePedido,
  accionesPermitidas,
  admiteSeguimiento,
  tieneFactura,
} from '../../../domain/logistica/model/pedido';
import { Seguimiento } from '../../../domain/logistica/model/seguimiento';
import {
  CambiaEstadoDePedido,
  ConsultaPedido,
} from '../../../application/logistica/use-case/gestiona-pedidos.use-case';
import {
  ConsultaSeguimiento,
  DescargaFactura,
  SincronizaSeguimiento,
} from '../../../application/logistica/use-case/sigue-el-envio.use-case';
import { DeclaracionesDelTransportista } from '../component/declaraciones-del-transportista';
import { InsigniaEstado } from '../component/insignia-estado';
import { RastroDelEnvio } from '../component/rastro-del-envio';
import { ResumenDePedido } from '../component/resumen-de-pedido';

/** El sufijo del aviso de cada acción: el diccionario los guarda en pasado. */
const SUFIJO_DE_AVISO: Readonly<Record<AccionSobrePedido, string>> = {
  forward: 'forwarded',
  ship: 'shipped',
  deliver: 'delivered',
  cancel: 'cancelled',
  refund: 'refunded',
};

/**
 * La ficha de un pedido del panel.
 *
 * <p>Los IMPORTES son los que manda el backend. El navegador no sabe con qué tasa ni con qué redondeo se
 * emitió el cobro —se convierte línea a línea al cobrar—, y volver a convertir el total aquí llegó a
 * enseñar 76,68 € donde se habían cobrado 76,66 €. Envío e impuestos quedan como «por calcular» mientras
 * no existan: un «0,00 €» de envío se lee como envío gratis, que es una promesa distinta.
 */
@Component({
  selector: 'nx-ficha-de-pedido-page',
  imports: [
    RouterLink,
    FaIconComponent,
    LupaImagen,
    DeclaracionesDelTransportista,
    InsigniaEstado,
    RastroDelEnvio,
    ResumenDePedido,
  ],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <a routerLink="/admin/orders" class="text-brand-700 text-[12px]">
          <fa-icon [icon]="iconos.atras" /> {{ t('admin.orders.back') }}
        </a>
        @if (pedido(); as p) {
          <div class="flex items-center gap-2 flex-wrap">
            <nx-insignia-estado [estado]="p.estado" />
            @if (conFactura()) {
              <button type="button" (click)="descargaFactura()" class="btn btn-outline text-[12px]">
                {{ t('order.detail.download_invoice') }}
              </button>
            }
            @if (conSeguimiento()) {
              <button
                type="button"
                (click)="sincroniza()"
                [disabled]="sincronizando()"
                class="btn btn-outline text-[12px]"
              >
                <fa-icon [icon]="iconos.sincroniza" [class.fa-spin]="sincronizando()" />
                {{ t('tracking.sync') }}
              </button>
            }
            @for (accion of acciones(); track accion) {
              <button
                type="button"
                (click)="aplica(accion)"
                class="btn btn-outline text-[12px]"
                [class.hover:text-red-700]="accion === 'cancel'"
              >
                <fa-icon [icon]="iconos[accion]" /> {{ t('admin.orders.actions.' + accion) }}
              </button>
            }
          </div>
        }
      </div>

      @if (cargando()) {
        <div class="text-ink-500 text-sm">{{ t('common.loading') }}</div>
      } @else if (pedido(); as p) {
        @if (envio(); as rastro) {
          <nx-rastro-del-envio [envio]="rastro" />
          <nx-declaraciones-del-transportista [declaraciones]="rastro.declaraciones" />
        }

        <header>
          <div class="text-[12px] text-ink-500">{{ t('admin.orders.detail.number') }}</div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="font-mono">{{ p.numero || '—' }}</h1>
            @if (p.origen; as origen) {
              <span
                class="badge badge-sm"
                [class.badge-warning]="origen === 'INTEGRATION'"
                [class.badge-info]="origen !== 'INTEGRATION'"
              >
                {{
                  origen === 'INTEGRATION'
                    ? t('admin.orders.source.integration')
                    : t('admin.orders.source.platform')
                }}
              </span>
            }
          </div>
          <div class="text-[12px] text-ink-500 mt-1">
            {{ p.realizadoEl || '—' }}
            @if (p.emailCliente) {
              · {{ p.emailCliente }}
            }
          </div>
        </header>

        <nx-resumen-de-pedido [pedido]="p" />

        @if (p.numeroDeSeguimiento; as guia) {
          <section class="card p-4 flex items-center gap-3 text-sm">
            <fa-icon [icon]="iconos.ship" class="text-brand-600" />
            <div>
              <div class="text-[11px] uppercase tracking-wider text-ink-600">
                {{ t('admin.orders.detail.tracking') }}
              </div>
              <div class="font-mono">{{ guia }}</div>
            </div>
          </section>
        }

        <section class="card overflow-hidden">
          <div class="card-header"><span>{{ t('admin.orders.detail.items') }}</span></div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
                <tr>
                  <th class="px-4 py-2 font-medium">{{ t('admin.orders.detail.product') }}</th>
                  <th class="px-4 py-2 font-medium">{{ t('admin.orders.detail.sku') }}</th>
                  <th class="px-4 py-2 font-medium text-right">{{ t('admin.orders.detail.qty') }}</th>
                  <th class="px-4 py-2 font-medium text-right">
                    {{ t('admin.orders.detail.unit_price') }}
                  </th>
                  <th class="px-4 py-2 font-medium text-right">
                    {{ t('admin.orders.detail.line_total') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (linea of p.lineas; track linea.id) {
                  <tr class="border-t border-ink-100">
                    <td class="px-4 py-2">
                      <div class="flex items-start gap-3">
                        <nx-lupa-imagen
                          [src]="linea.imagenUrl"
                          [alt]="linea.titulo ?? ''"
                          clase="w-10 h-10 rounded object-cover border border-ink-100 shrink-0"
                          claseMarcador="w-10 h-10 rounded shrink-0"
                        />
                        <div class="min-w-0">
                          <span>{{ linea.titulo || linea.sku || '—' }}</span>
                          @if (linea.variante) {
                            <span class="block text-[11px] text-ink-500">{{ linea.variante }}</span>
                          }
                          @if (linea.origenUrl; as origen) {
                            <a
                              [href]="origen"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <fa-icon [icon]="iconos.externo" />
                              {{ t('admin.orders.detail.view_product') }}
                            </a>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-2 font-mono text-[11px] text-ink-500">
                      {{ linea.sku || '—' }}
                    </td>
                    <td class="px-4 py-2 text-right">{{ linea.cantidad }}</td>
                    <td class="px-4 py-2 text-right">{{ linea.precioUnitarioFormateado || '—' }}</td>
                    <td class="px-4 py-2 text-right font-medium">
                      {{ linea.totalLineaFormateado || '—' }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-4 py-6 text-center text-ink-500">
                      {{ t('admin.orders.detail.no_items') }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else {
        <div class="card p-6 text-ink-500">{{ t('admin.orders.detail.not_found') }}</div>
      }
    </div>
  `,
})
export class FichaDePedidoPage {
  /** Llega por la ruta gracias al enlace de entradas del enrutador. */
  readonly id = input.required<string>();

  protected readonly iconos = {
    atras: faArrowLeft,
    sincroniza: faRotate,
    externo: faArrowUpRightFromSquare,
    forward: faPaperPlane,
    ship: faTruck,
    deliver: faCircleCheck,
    refund: faRotateLeft,
    cancel: faBan,
  };

  protected readonly t = inject(TraduccionService).t;

  private readonly consulta = inject(ConsultaPedido);
  private readonly cambia = inject(CambiaEstadoDePedido);
  private readonly rastro = inject(ConsultaSeguimiento);
  private readonly sincronizador = inject(SincronizaSeguimiento);
  private readonly factura = inject(DescargaFactura);
  private readonly preferencias = inject(PreferenciasService);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly pedido = signal<FichaDePedido | null>(null);
  protected readonly envio = signal<Seguimiento | null>(null);
  protected readonly cargando = signal(true);
  protected readonly sincronizando = signal(false);

  protected readonly acciones = computed(() => {
    const actual = this.pedido();
    return actual ? accionesPermitidas(actual.estado) : [];
  });
  protected readonly conFactura = computed(() => {
    const actual = this.pedido();
    return !!actual && tieneFactura(actual.estado);
  });
  protected readonly conSeguimiento = computed(() => {
    const actual = this.pedido();
    return !!actual && admiteSeguimiento(actual.estado);
  });

  constructor() {
    // El IDIOMA está en la dependencia a propósito: el backend localiza los títulos de línea, así que
    // cambiar de idioma tiene que volver a pedir la ficha y no solo repintar las etiquetas.
    effect(() => {
      const id = this.id();
      const idioma = this.preferencias.idioma();
      void this.carga(id, idioma);
    });
  }

  private async carga(id: string, idioma: string): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.consulta.ejecuta(id, idioma);
      this.pedido.set(resultado.ok ? resultado.valor : null);
      if (!resultado.ok) {
        return;
      }
      const seguimiento = await this.rastro.ejecuta(id);
      this.envio.set(seguimiento.ok ? seguimiento.valor : null);
    } finally {
      this.cargando.set(false);
    }
  }

  protected async aplica(accion: AccionSobrePedido): Promise<void> {
    const actual = this.pedido();
    if (!actual) {
      return;
    }
    const clave =
      accion === 'cancel' ? 'admin.orders.cancel_confirm' : `admin.orders.confirm.${accion}`;
    if (!(await this.dialogo.confirma(this.t(clave)))) {
      return;
    }
    const resultado = await this.cambia.ejecuta(actual, accion);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.avisos.exito(this.t(`admin.orders.toast.${SUFIJO_DE_AVISO[accion]}`));
    void this.carga(this.id(), this.preferencias.idioma());
  }

  protected async sincroniza(): Promise<void> {
    this.sincronizando.set(true);
    try {
      const resultado = await this.sincronizador.ejecuta(this.id());
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.envio.set(resultado.valor);
      this.avisos.exito(this.t('tracking.synced'));
    } finally {
      this.sincronizando.set(false);
    }
  }

  protected async descargaFactura(): Promise<void> {
    const actual = this.pedido();
    if (!actual) {
      return;
    }
    const resultado = await this.factura.ejecuta(actual.id, actual.numero);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
    }
  }
}
