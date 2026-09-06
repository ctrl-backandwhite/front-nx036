import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTicket } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { NuevoTicket, Ticket } from '../../domain/model/ticket';
import { MisTickets } from '../../application/use-case/mis-tickets.use-case';
import { HiloDeSoporte } from '../component/hilo-de-soporte';
import { DialogoDeTicket } from '../component/dialogo-de-ticket';
import { colorDeClase, colorDeEstado, colorDePrioridad } from '../component/colores-del-ticket';

/**
 * Mis tickets: los que he abierto y uno nuevo.
 *
 * <p>MOBILE FIRST: una tarjeta por ticket a lo ancho; los diálogos ocupan la pantalla con margen y se
 * quedan en ancho fijo a partir de `sm`.
 */
@Component({
  selector: 'nx-mis-tickets',
  imports: [FaIconComponent, HiloDeSoporte, DialogoDeTicket],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('support.title') }}</h1>
          <p class="text-sm opacity-70 mt-1">{{ t('support.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="abriendo.set(true)">
          <fa-icon [icon]="iconos.nuevo" /> {{ t('support.new') }}
        </button>
      </header>

      @if (cargando()) {
        <div class="space-y-2">
          @for (fila of [1, 2, 3]; track fila) {
            <div class="card p-4 space-y-2 border border-base-200">
              <div class="flex gap-2"><div class="skeleton h-5 w-16"></div><div class="skeleton h-5 w-16"></div></div>
              <div class="skeleton h-4 w-2/3 mt-1"></div>
              <div class="skeleton h-3 w-full"></div>
            </div>
          }
        </div>
      } @else if (tickets().length === 0) {
        <div class="card p-10 text-center opacity-60 border border-base-200">
          <fa-icon [icon]="iconos.ticket" class="text-3xl opacity-40 mb-2" />
          <p>{{ t('support.empty') }}</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (ticket of tickets(); track ticket.id) {
            <div class="card p-4 border border-base-200 transition-shadow hover:shadow-lg cursor-pointer"
                 role="button" tabindex="0"
                 (click)="abierto.set(ticket)" (keydown.enter)="abierto.set(ticket)">
              <div class="flex items-baseline justify-between gap-2">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="badge" [class]="colorClase(ticket)">{{ t('support.kind.' + ticket.clase) }}</span>
                  <span class="badge" [class]="colorEstado(ticket)">{{ ticket.estado }}</span>
                  <span class="badge" [class]="colorPrioridad(ticket)">{{ ticket.prioridad }}</span>
                </div>
                <span class="text-[11px] opacity-50 whitespace-nowrap">{{ cuando(ticket.creadoEl) }}</span>
              </div>
              <div class="text-[14px] font-medium mt-2">{{ ticket.asunto }}</div>
              @if (ticket.cuerpo) {
                <p class="text-[13px] opacity-80 mt-1 line-clamp-3">{{ ticket.cuerpo }}</p>
              }
              @if (ticket.resolucion) {
                <p class="text-[12px] text-success mt-2">→ {{ ticket.resolucion }}</p>
              }
            </div>
          }
        </div>
      }

      @if (abriendo()) {
        <nx-dialogo-de-ticket #formulario (cierra)="abriendo.set(false)" (abre)="crea($event)" />
      }

      @if (abierto(); as ticket) {
        <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
             role="dialog" aria-modal="true" [attr.aria-label]="ticket.asunto">
          <div class="absolute inset-0" (click)="abierto.set(null)"
               (keydown.escape)="abierto.set(null)" tabindex="-1"></div>
          <div class="card bg-base-100 relative w-full max-w-lg p-5 border border-base-200 shadow-xl">
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 class="text-[15px] font-semibold">{{ ticket.asunto }}</h3>
                <span class="badge badge-sm mt-1" [class]="colorEstado(ticket)">{{ ticket.estado }}</span>
              </div>
              <button type="button" class="btn btn-ghost btn-xs"
                      [attr.aria-label]="t('common.close')" (click)="abierto.set(null)">✕</button>
            </div>
            <nx-hilo-de-soporte [idTicket]="ticket.id" />
          </div>
        </div>
      }
    </div>
  `,
})
export class MisTicketsPage {
  private readonly misTickets = inject(MisTickets);
  private readonly avisos = inject(AvisosStore);

  protected readonly t = inject(TraduccionService).t;

  protected readonly tickets = signal<readonly Ticket[]>([]);
  protected readonly cargando = signal(true);
  protected readonly abriendo = signal(false);
  protected readonly abierto = signal<Ticket | null>(null);

  protected readonly iconos = { nuevo: faPlus, ticket: faTicket };

  constructor() {
    void this.recarga();
  }

  protected colorEstado(ticket: Ticket): string {
    return colorDeEstado(ticket.estado);
  }

  protected colorPrioridad(ticket: Ticket): string {
    return colorDePrioridad(ticket.prioridad);
  }

  protected colorClase(ticket: Ticket): string {
    return colorDeClase(ticket.clase);
  }

  protected cuando(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  /**
   * Abre el ticket. Si el backend lo rechaza se CUENTA y el formulario se queda abierto con lo escrito:
   * sin eso, el rechazo dejaba el formulario abierto, sin ticket y sin una palabra, justo en la
   * pantalla a la que se llega cuando algo ya ha ido mal.
   */
  protected async crea(nuevo: NuevoTicket): Promise<void> {
    const resultado = await this.misTickets.abre(nuevo);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.abriendo.set(false);
    await this.recarga();
  }

  private async recarga(): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.misTickets.consulta();
      if (resultado.ok) {
        this.tickets.set(resultado.valor);
        return;
      }
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    } finally {
      this.cargando.set(false);
    }
  }
}
