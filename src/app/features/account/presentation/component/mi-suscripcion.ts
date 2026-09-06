import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileInvoice, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CobrosStore } from '../../application/state/cobros.store';
import { PlanesStore } from '../../application/state/planes.store';
import {
  CancelaSuscripcion,
  CargaFacturas,
  DescargaFactura,
} from '../../application/use-case/planes.use-case';

/**
 * La sección «Mi plan»: la suscripción vigente y el historial de facturas.
 *
 * <p>Si no hay pasarela, ni suscripción, ni facturas, no se pinta nada: una sección vacía solo genera
 * preguntas.
 */
@Component({
  selector: 'nx-mi-suscripcion',
  imports: [FaIconComponent],
  template: `
    @if (cobros.activo() && planes.haySuscripcionOFacturas()) {
      <section class="card p-5">
        <h3 class="flex items-center gap-2">
          <fa-icon [icon]="iconos.recibo" class="text-brand-600" /> {{ t('profile.section.subscription') }}
        </h3>

        @if (planes.suscripcion(); as suscripcion) {
          <!-- Mobile first: los datos y el botón se apilan; en fila desde «sm». -->
          <div class="mt-3 border border-ink-100 rounded p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-[13px]">
              <span class="font-semibold">{{ nombreDelPlan() }}</span>
              <span class="badge bg-brand-50 text-brand-700 ml-2">
                {{ etiqueta('billing.sub_status.', suscripcion.estado) }}
              </span>
              <!-- La prueba no tiene periodicidad de cobro: se enseña como prueba, no como «mensual». -->
              <span class="text-ink-400 ml-2">
                ·
                {{
                  planes.enPrueba()
                    ? t('profile.subscription.trial_badge')
                    : etiqueta('billing.period.', suscripcion.periodoDeFacturacion)
                }}
              </span>
              <div class="text-ink-500 mt-0.5">{{ cuandoTermina() }}</div>
              @if (suscripcion.planPendiente) {
                <div class="text-[12px] text-warning-content bg-warning/10 border border-warning/30 rounded px-2 py-1 mt-1 inline-block">
                  {{ avisoDeBajada() }}
                </div>
              }
            </div>
            @if (!suscripcion.cancelaEl && suscripcion.estado === 'ACTIVE') {
              <button
                type="button"
                class="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-error/40 text-error text-[13px] hover:bg-error/10 disabled:opacity-50"
                [disabled]="cancelando()"
                (click)="cancela()"
              >
                {{ t('plans.cancel') }}
              </button>
            }
          </div>
        } @else {
          <p class="text-[13px] text-ink-400 mt-2">{{ t('profile.subscription.none') }}</p>
        }

        @if (planes.facturas().length > 0) {
          <div class="mt-4">
            <h4 class="text-[13px] font-medium text-ink-600 mb-2">{{ t('profile.subscription.invoices') }}</h4>
            <div class="space-y-1">
              @for (factura of planes.facturas(); track factura.numero) {
                <div class="flex items-center justify-between gap-2 text-[12px] border-b border-ink-50 py-1.5">
                  <span class="flex items-center gap-2 min-w-0">
                    <fa-icon [icon]="iconos.factura" class="text-ink-400" />
                    <span class="truncate">{{ factura.numero ?? '—' }} · {{ fecha(factura.creadaEl) }}</span>
                    <span class="badge badge-sm">{{ etiqueta('billing.invoice_status.', factura.estado) }}</span>
                  </span>
                  <span class="flex items-center gap-3 shrink-0">
                    <!--
                      El importe llega HECHO del backend y aquí solo se pinta. Nunca se recompone con el
                      total en crudo: es la unidad mínima de su divisa, y dividirlo entre cien enseña las
                      facturas en yenes o wones cien veces más baratas de lo que se cobró.
                    -->
                    <span class="font-medium">{{ factura.totalFormateado ?? '—' }}</span>
                    @if (factura.numero; as numero) {
                      <button type="button" class="link text-brand-600" (click)="descarga(numero)">PDF</button>
                    }
                  </span>
                </div>
              }
            </div>
          </div>
        }
      </section>
    }
  `,
})
export class MiSuscripcion {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly cancelaSuscripcion = inject(CancelaSuscripcion);
  private readonly descargaFactura = inject(DescargaFactura);
  private readonly cargaFacturas = inject(CargaFacturas);

  protected readonly planes = inject(PlanesStore);
  protected readonly cobros = inject(CobrosStore);
  protected readonly t = this.traduccion.t;
  protected readonly iconos = { recibo: faReceipt, factura: faFileInvoice };

  protected readonly cancelando = signal(false);

  constructor() {
    void this.cargaFacturas.ejecuta();
  }

  protected nombreDelPlan(): string {
    return this.planes.planContratado()?.nombre ?? '—';
  }

  /** La traducción de un código si existe; si no, el propio código humanizado. */
  protected etiqueta(prefijo: string, codigo: string | undefined): string {
    if (!codigo) {
      return '—';
    }
    const clave = prefijo + codigo;
    const texto = this.t(clave);
    if (texto !== clave) {
      return texto;
    }
    const humano = codigo.replace(/_/g, ' ').toLowerCase();
    return humano.charAt(0).toUpperCase() + humano.slice(1);
  }

  /** Las fechas de la pasarela llegan en segundos; las nuestras, en texto. Se aceptan las dos. */
  protected fecha(valor: number | string | undefined): string {
    if (!valor) {
      return '—';
    }
    const fecha = new Date(typeof valor === 'number' ? valor * 1000 : valor);
    return fecha.toLocaleDateString(this.traduccion.idioma());
  }

  protected cuandoTermina(): string {
    const suscripcion = this.planes.suscripcion();
    if (!suscripcion) {
      return '';
    }
    if (suscripcion.cancelaEl) {
      return `${this.t('profile.subscription.cancels_on')} ${this.fecha(suscripcion.cancelaEl)}`;
    }
    // El plan gratis es una PRUEBA de quince días que NO se renueva: vence y hay que contratar uno de
    // pago. Decir «se renueva el…» ahí sería una promesa que nadie va a cumplir.
    if (this.planes.enPrueba()) {
      const fin = this.fecha(suscripcion.finDelPeriodo);
      return `${this.t('profile.subscription.trial_ends_on')} ${fin} · ${this.t('profile.subscription.no_renew')}`;
    }
    return `${this.t('profile.subscription.renews_on')} ${this.fecha(suscripcion.finDelPeriodo)}`;
  }

  protected avisoDeBajada(): string {
    const suscripcion = this.planes.suscripcion();
    return this.t('profile.subscription.downgrade_pending')
      .replace('{plan}', this.etiqueta('plans.name.', suscripcion?.planPendiente))
      .replace('{date}', this.fecha(suscripcion?.planPendienteEl));
  }

  protected async cancela(): Promise<void> {
    if (!(await this.dialogo.confirma(this.t('plans.cancel_confirm')))) {
      return;
    }
    this.cancelando.set(true);
    try {
      const resultado = await this.cancelaSuscripcion.ejecuta();
      const mensaje = resultado.ok ? this.t('plans.canceled_ok') : resultado.error.mensaje;
      await this.dialogo.alerta(mensaje || this.t('plans.error'), undefined, resultado.ok ? 'success' : 'error');
    } finally {
      this.cancelando.set(false);
    }
  }

  protected async descarga(numero: string): Promise<void> {
    const resultado = await this.descargaFactura.ejecuta(numero);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
    }
  }
}
