import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faHeadset, faTicket } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { Ticket, estaResuelto } from '../../domain/model/ticket';
import { AtiendeTickets } from '../../application/use-case/atiende-tickets.use-case';
import { HiloDeSoporte } from '../component/hilo-de-soporte';
import { colorDeClase, colorDeEstado, colorDePrioridad } from '../component/colores-del-ticket';

/** Los estados por los que se puede filtrar. Los nombra el backend y se enseñan tal cual. */
const ESTADOS = ['OPEN', 'RESOLVED', 'CLOSED'] as const;

/**
 * La bandeja de soporte: los tickets de todo el mundo, filtro por estado, el hilo y la resolución.
 *
 * <p>MOBILE FIRST: una tarjeta por ticket a lo ancho y el filtro debajo del título; a partir de `sm` se
 * colocan en la misma línea.
 */
@Component({
  selector: 'nx-tickets-de-soporte',
  imports: [FaIconComponent, HiloDeSoporte],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold flex items-center gap-2">
            <fa-icon [icon]="iconos.soporte" class="text-primary" /> {{ t('admin.support.title') }}
          </h1>
          <p class="text-sm opacity-70 mt-1">{{ t('admin.support.subtitle') }}</p>
        </div>
        <div>
          <label class="sr-only" for="tickets-estado">{{ t('filters.status') }}</label>
          <select id="tickets-estado" class="select select-bordered select-sm text-[13px]"
                  [value]="estado()" (change)="filtra($event)">
            <option value="">{{ t('admin.support.all') }}</option>
            @for (opcion of estados; track opcion) {
              <option [value]="opcion">{{ opcion }}</option>
            }
          </select>
        </div>
      </header>

      @if (cargando()) {
        <div class="space-y-2">
          @for (fila of [1, 2, 3, 4]; track fila) {
            <div class="skeleton h-16 w-full rounded-box"></div>
          }
        </div>
      } @else if (tickets().length === 0) {
        <div class="card p-10 text-center opacity-60 border border-base-200">
          <fa-icon [icon]="iconos.ticket" class="text-3xl opacity-40 mb-2" />
          <p>{{ t('admin.support.empty') }}</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (ticket of tickets(); track ticket.id) {
            <div class="card p-4 border border-base-200 cursor-pointer transition-shadow hover:shadow-lg"
                 role="button" tabindex="0"
                 (click)="selecciona(ticket)" (keydown.enter)="selecciona(ticket)">
              <div class="flex items-baseline justify-between gap-2">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="badge" [class]="colorClase(ticket)">{{ ticket.clase }}</span>
                  <span class="badge" [class]="colorEstado(ticket)">{{ ticket.estado }}</span>
                  <span class="badge" [class]="colorPrioridad(ticket)">{{ ticket.prioridad }}</span>
                </div>
                <span class="text-[11px] opacity-50 whitespace-nowrap">{{ cuando(ticket.creadoEl) }}</span>
              </div>
              <div class="text-[14px] font-medium mt-2">{{ ticket.asunto }}</div>
              @if (ticket.cuerpo) {
                <p class="text-[13px] opacity-80 mt-1 line-clamp-2">{{ ticket.cuerpo }}</p>
              }
            </div>
          }
        </div>
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

            <nx-hilo-de-soporte [idTicket]="ticket.id" [comoSoporte]="true" />

            @if (!resuelto(ticket)) {
              <div class="mt-3 pt-3 border-t border-base-200 flex items-center gap-2">
                <label class="sr-only" for="ticket-resolucion">{{ t('admin.support.resolution') }}</label>
                <input id="ticket-resolucion" class="input input-bordered input-sm flex-1"
                       [placeholder]="t('admin.support.resolution')"
                       [value]="resolucion()" (input)="resolucion.set(valorDe($event))" />
                <button type="button" class="btn btn-outline btn-sm"
                        [disabled]="resolviendo()" (click)="resuelve(ticket)">
                  <fa-icon [icon]="iconos.resolver" /> {{ t('admin.support.resolve') }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TicketsDeSoportePage {
  private readonly atiende = inject(AtiendeTickets);
  private readonly avisos = inject(AvisosStore);

  protected readonly t = inject(TraduccionService).t;
  protected readonly estados = ESTADOS;

  protected readonly tickets = signal<readonly Ticket[]>([]);
  protected readonly cargando = signal(true);
  protected readonly estado = signal('');
  protected readonly abierto = signal<Ticket | null>(null);
  protected readonly resolucion = signal('');
  protected readonly resolviendo = signal(false);

  protected readonly iconos = { soporte: faHeadset, ticket: faTicket, resolver: faCircleCheck };

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

  protected resuelto(ticket: Ticket): boolean {
    return estaResuelto(ticket);
  }

  protected cuando(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected selecciona(ticket: Ticket): void {
    this.abierto.set(ticket);
    // Se precarga lo que ya hubiera escrito: corregir una resolución no debería obligar a reescribirla.
    this.resolucion.set(ticket.resolucion ?? '');
  }

  protected filtra(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value);
    void this.recarga();
  }

  /**
   * Da el ticket por resuelto. Si el backend rechaza se CUENTA: sin eso, el diálogo se quedaba abierto y
   * quieto, quien atiende lo cerraba dando el caso por atendido y el cliente seguía esperando.
   */
  protected async resuelve(ticket: Ticket): Promise<void> {
    this.resolviendo.set(true);
    try {
      const resultado = await this.atiende.resuelve(ticket.id, this.resolucion());
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.abierto.set(null);
      this.resolucion.set('');
      await this.recarga();
    } finally {
      this.resolviendo.set(false);
    }
  }

  private async recarga(): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.atiende.consulta(this.estado());
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
