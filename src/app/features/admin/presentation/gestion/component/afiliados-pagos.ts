import { Component, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { PagoPendiente, destinoDelPago, exigeReferencia } from '../../../domain/gestion/model/afiliados';
import { ApruebaElPago, RechazaElPago } from '../../../application/gestion/use-case/afiliados.use-case';

/**
 * Las solicitudes de pago que esperan una decisión.
 *
 * <p>Va en su propio componente porque es lo único de la pantalla que mueve DINERO: aprobar aquí
 * dispara una transferencia real. Tenerlo aparte deja el listado de afiliados como lo que es —una
 * consulta— y hace que estas dos acciones se prueben solas.
 *
 * <p>El importe se enseña tal y como lo manda el backend (`importeFormateado`). No se vuelve a formatear
 * ni se convierte a la divisa activa: es la cifra exacta que se va a transferir, y verla en otra moneda
 * al lado del IBAN es la forma más rápida de aprobar una cantidad que no era.
 */
@Component({
  selector: 'nx-afiliados-pagos',
  template: `
    @if (pagos().length) {
      <div class="card p-4 border-l-4 border-amber-400">
        <h2 class="font-medium text-sm mb-2">
          {{ t('admin.affiliates.payouts_pending') }} ({{ pagos().length }})
        </h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="text-[11px] text-ink-500">
              <tr>
                <th class="px-2">{{ t('admin.affiliate.payout.col.affiliate') }}</th>
                <th class="px-2 text-right">{{ t('admin.affiliate.payout.col.amount') }}</th>
                <th class="px-2">{{ t('admin.affiliate.payout.col.method') }}</th>
                <th class="px-2">{{ t('admin.affiliate.payout.col.destination') }}</th>
                <th class="px-2"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (pago of pagos(); track pago.id) {
                <tr class="text-[13px] align-top">
                  <td class="px-2 py-2">
                    <div class="font-medium">{{ pago.nombre ?? '—' }}</div>
                    <div class="text-[11px] text-ink-500">
                      {{ pago.comisiones }} {{ t('admin.affiliates.commissions') }}
                    </div>
                  </td>
                  <td class="px-2 py-2 text-right font-medium whitespace-nowrap">
                    {{ pago.importeFormateado }}
                  </td>
                  <td class="px-2 py-2">{{ metodo(pago) }}</td>
                  <td class="px-2 py-2 text-[12px] text-ink-500">{{ destino(pago) }}</td>
                  <td class="px-2 py-2 text-right whitespace-nowrap">
                    <button type="button" class="btn btn-success btn-xs text-[12px]"
                            [disabled]="trabajando()" (click)="aprueba(pago)">
                      {{ t('admin.affiliate.payout.approve') }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-xs text-error text-[12px]"
                            [disabled]="trabajando()" (click)="rechaza(pago)">
                      {{ t('admin.affiliate.payout.reject') }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class AfiliadosPagos {
  readonly pagos = input.required<readonly PagoPendiente[]>();
  /** Algo cambió de verdad en el servidor: quien monta esto tiene que releer. */
  readonly cambia = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly apruebaElPago = inject(ApruebaElPago);
  private readonly rechazaElPago = inject(RechazaElPago);

  protected readonly trabajando = signal(false);

  protected metodo(pago: PagoPendiente): string {
    return this.t(`admin.affiliate.payout.method.${pago.metodo}`);
  }

  /** La cartera no tiene destino que teclear: es una línea traducida, no un número de cuenta. */
  protected destino(pago: PagoPendiente): string {
    return pago.metodo === 'WALLET'
      ? this.t('admin.affiliate.payout.destination.wallet')
      : destinoDelPago(pago);
  }

  /**
   * Aprobar un pago por BANCO o PAYPAL EXIGE referencia.
   *
   * <p>La regla vive en el caso de uso —es del negocio—, pero la pantalla tiene que pedirla y decir por
   * qué se rechaza: si solo la comprobara el caso de uso, al administrador le saldría un «petición
   * inválida» sin explicar qué faltaba.
   */
  protected async aprueba(pago: PagoPendiente): Promise<void> {
    const obligatoria = exigeReferencia(pago.metodo);
    const referencia = await this.dialogo.pregunta({
      titulo: this.t('admin.affiliate.payout.approve'),
      mensaje: this.t('admin.affiliate.payout.reference.label') + (obligatoria ? ' *' : ''),
      marcador: this.t('admin.affiliate.payout.reference.placeholder'),
      etiquetaConfirmar: this.t('admin.affiliate.payout.approve'),
    });
    // Cancelar no es lo mismo que dejarlo en blanco: si se arrepiente, no se avisa de nada.
    if (referencia === null) {
      return;
    }
    if (obligatoria && !referencia.trim()) {
      this.avisos.error(this.t('admin.affiliate.payout.reference_required'));
      return;
    }
    this.trabajando.set(true);
    const resultado = await this.apruebaElPago.ejecuta(pago, referencia);
    this.trabajando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.t('admin.affiliate.payout.approve_success'));
    this.cambia.emit();
  }

  /** Rechazar SIEMPRE lleva motivo: es lo que se le acaba contando al afiliado. */
  protected async rechaza(pago: PagoPendiente): Promise<void> {
    const motivo = await this.dialogo.pregunta({
      titulo: this.t('admin.affiliate.payout.reject'),
      mensaje: this.t('admin.affiliate.payout.reason.label'),
      marcador: this.t('admin.affiliate.payout.reason.placeholder'),
      etiquetaConfirmar: this.t('admin.affiliate.payout.reject'),
    });
    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.avisos.error(this.t('admin.affiliate.payout.reason_required'));
      return;
    }
    this.trabajando.set(true);
    const resultado = await this.rechazaElPago.ejecuta(pago.id, motivo);
    this.trabajando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.t('admin.affiliate.payout.reject_success'));
    this.cambia.emit();
  }
}
