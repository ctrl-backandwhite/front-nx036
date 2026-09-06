import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faHeadset, faTicket } from '@fortawesome/free-solid-svg-icons';
import { FormField, form } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ESTADOS_DE_TICKET, Ticket, admiteResolucion } from '../../../domain/gestion/model/soporte';
import {
  ConsultaTickets, ResuelveElTicket,
} from '../../../application/gestion/use-case/soporte.use-case';
import { VentanaModal } from '../component/ventana-modal';
import { HiloDeSoporte } from '../component/hilo-de-soporte';

/**
 * El color de cada estado, en un solo sitio.
 *
 * <p>Repartido por la pantalla, el mismo estado acababa en un color en la lista y en otro en la ficha, y
 * quien atiende dejaba de fiarse del color.
 */
const COLORES: Readonly<Record<string, string>> = {
  OPEN: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-ink-100 text-ink-600',
};

/** Cuántas siluetas se pintan mientras llega la lista. Las justas para ocupar el hueco sin engañar. */
const SILUETAS = [0, 1, 2, 3];

/**
 * La bandeja de soporte del panel: lista de casos, filtro por estado, conversación y cierre.
 *
 * <p>Cerrar un caso EXIGE texto de resolución —se le enseña a quien abrió el ticket, y cerrar sin
 * explicación lo deja sin saber qué pasó con su reclamación—, y un ticket ya resuelto no vuelve a
 * ofrecer el formulario de cierre.
 *
 * <p>Un rechazo del backend se ENSEÑA. Sin ello, la ventana se quedaba abierta y quieta: quien atendía
 * la cerraba dando el caso por resuelto y el cliente seguía esperando con el ticket abierto.
 *
 * <p>RENDIMIENTO: la bandeja va bajo la cabecera y se difiere con `on viewport`.
 *
 * <p>MOBILE FIRST: la cabecera envuelve y el filtro cae debajo del título en pantalla estrecha; las
 * tarjetas son de una columna en cualquier anchura, que es como se lee una bandeja.
 */
@Component({
  selector: 'nx-soporte-admin',
  imports: [FaIconComponent, VentanaModal, HiloDeSoporte, FormField],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="flex items-center gap-2">
            <fa-icon [icon]="iconos.soporte" class="text-brand-600" /> {{ t('admin.support.title') }}
          </h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.support.subtitle') }}</p>
        </div>
        <select class="input h-9 text-[13px]" [value]="estado()" (change)="filtra($event)"
                [attr.aria-label]="t('filters.status')">
          <option value="">{{ t('admin.support.all') }}</option>
          @for (candidato of estados; track candidato) {
            <option [value]="candidato">{{ candidato }}</option>
          }
        </select>
      </header>

      @if (cargando()) {
        <div class="space-y-2">
          @for (silueta of siluetas; track silueta) {
            <div class="skeleton h-16 w-full rounded-box"></div>
          }
        </div>
      } @else if (tickets().length === 0) {
        <div class="card p-10 text-center text-ink-500">
          <fa-icon [icon]="iconos.ticket" class="text-3xl text-ink-300 mb-2" />
          <p>{{ t('admin.support.empty') }}</p>
        </div>
      } @else {
        <!-- RENDIMIENTO: la bandeja va bajo la cabecera; se difiere y se reserva el hueco. La
             conversación no: se abre en una ventana y para entonces ya hace falta entera. -->
        @defer (on viewport) {
        <div class="space-y-2">
          @for (ticket of tickets(); track ticket.id) {
            <button type="button" (click)="abre(ticket)"
                    class="card p-4 cursor-pointer transition-shadow hover:shadow-pastel-lg w-full text-left">
              <div class="flex items-baseline justify-between gap-2">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="badge"
                        [class]="ticket.clase === 'DISPUTE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-brand-50 text-brand-700'">{{ ticket.clase }}</span>
                  <span class="badge" [class]="color(ticket.estado)">{{ ticket.estado }}</span>
                  <span class="badge bg-ink-100 text-ink-600">{{ ticket.prioridad }}</span>
                </div>
                <span class="text-[11px] text-ink-400 whitespace-nowrap">{{ fecha(ticket) }}</span>
              </div>
              <div class="text-[14px] font-medium mt-2">{{ ticket.asunto }}</div>
              @if (ticket.cuerpo) {
                <p class="text-[13px] text-ink-700 mt-1 line-clamp-2">{{ ticket.cuerpo }}</p>
              }
            </button>
          }
        </div>
        } @placeholder {
          <div class="card h-64"></div>
        }
      }

      @if (seleccionado(); as ticket) {
        <nx-ventana-modal [titulo]="ticket.asunto" ancho="sm:max-w-lg" (cierra)="cierra()">
          <span class="badge badge-sm" [class]="color(ticket.estado)">{{ ticket.estado }}</span>

          <nx-hilo-de-soporte [idTicket]="ticket.id" />

          <!-- Un caso ya resuelto no vuelve a ofrecer el cierre: no hay nada que volver a decidir. -->
          @if (admiteCierre(ticket)) {
            <div class="mt-3 pt-3 border-t border-ink-100 flex items-center gap-2">
              <label class="sr-only" for="soporte-resolucion">{{ t('admin.support.resolution') }}</label>
              <input id="soporte-resolucion" class="input flex-1 h-9 text-[13px]"
                     [formField]="formulario.resolucion"
                     [placeholder]="t('admin.support.resolution')" />
              <button type="button" class="btn btn-outline btn-sm" [disabled]="resolviendo()"
                      (click)="resuelve(ticket)">
                <fa-icon [icon]="iconos.resolver" /> {{ t('admin.support.resolve') }}
              </button>
            </div>
          }
        </nx-ventana-modal>
      }
    </div>
  `,
})
export class SoportePage {
  protected readonly t = inject(TraduccionService).t;
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaTickets);
  private readonly resolucionDelCaso = inject(ResuelveElTicket);

  protected readonly iconos = { soporte: faHeadset, ticket: faTicket, resolver: faCircleCheck };
  protected readonly estados = ESTADOS_DE_TICKET;
  protected readonly siluetas = SILUETAS;

  protected readonly tickets = signal<readonly Ticket[]>([]);
  protected readonly cargando = signal(true);
  protected readonly estado = signal('');
  protected readonly seleccionado = signal<Ticket | null>(null);

  /**
   * El texto de resolución.
   *
   * <p>No se declara obligatorio en el esquema aunque el caso de uso lo exija: el rótulo dice
   * «(opcional)» porque quien atiende puede cerrar el caso desde otro sitio, y quien decide de verdad es
   * el caso de uso, que devuelve el motivo. Apagar el botón aquí escondería ese mensaje.
   */
  protected readonly modelo = signal({ resolucion: '' });
  protected readonly formulario = form(this.modelo);

  protected readonly resolviendo = signal(false);

  constructor() {
    void this.carga();
  }

  protected color(estado: string): string {
    return COLORES[estado] ?? 'bg-ink-100 text-ink-600';
  }

  protected fecha(ticket: Ticket): string {
    return new Date(ticket.creadoEl).toLocaleString();
  }

  protected admiteCierre(ticket: Ticket): boolean {
    return admiteResolucion(ticket);
  }

  protected filtra(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value);
    void this.carga();
  }

  protected abre(ticket: Ticket): void {
    this.seleccionado.set(ticket);
    // `reset` escribe el valor y deja el campo limpio: abrir otro caso no arrastra el «tocado» del
    // anterior ni su texto.
    this.formulario().reset({ resolucion: ticket.resolucion ?? '' });
  }

  protected cierra(): void {
    this.seleccionado.set(null);
    this.formulario().reset({ resolucion: '' });
  }

  /**
   * Cierra el caso.
   *
   * <p>El caso de uso exige texto: sin él devuelve un rechazo y aquí se enseña, en vez de dejar la
   * ventana abierta como si no hubiera pasado nada.
   */
  protected async resuelve(ticket: Ticket): Promise<void> {
    this.resolviendo.set(true);
    const resultado = await this.resolucionDelCaso.ejecuta(ticket.id, this.modelo().resolucion);
    this.resolviendo.set(false);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
      return;
    }
    this.cierra();
    await this.carga();
  }

  private async carga(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.consulta.ejecuta(this.estado() || undefined);
    this.cargando.set(false);
    if (resultado.ok) {
      this.tickets.set(resultado.valor);
    }
  }
}
