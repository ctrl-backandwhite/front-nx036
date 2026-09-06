import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faInbox,
  faPaperPlane,
  faReply,
  faRotateLeft,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  Aviso,
  Carpeta,
  ESTADOS_DE_GESTION,
  EstadoDeGestion,
  asuntoDeRespuesta,
  categoriaDe,
  correoDeRespuesta,
  esAccionable,
} from '../../domain/model/aviso';
import { Movimiento } from '../../application/use-case/mueve-avisos.use-case';
import {
  COLOR_DE_CATEGORIA,
  COLOR_DE_ESTADO,
  claveDeEstado,
  nombreDelSuceso,
} from './colores-del-buzon';

/**
 * El panel de lectura del buzón: el aviso abierto, sus acciones, el flujo de gestión y la respuesta por
 * correo.
 *
 * <p>Como la lista, solo PINTA y avisa: quien archiva, cambia de estado o manda el correo es la página.
 *
 * <p>MOBILE FIRST: en el móvil ocupa la pantalla entera y trae su propia flecha de volver a la lista
 * —que en escritorio no existe, porque las dos cosas se ven a la vez.
 */
@Component({
  selector: 'nx-lectura-de-aviso',
  imports: [FaIconComponent],
  template: `
    <section class="flex-1 flex-col overflow-y-auto bg-base-100"
             [class.flex]="!!aviso()" [class.hidden]="!aviso()" [class.sm:flex]="true">
      @if (aviso(); as abierto) {
        <div class="px-5 py-4 border-b border-base-200 flex items-start gap-3">
          <button type="button" class="btn btn-ghost btn-sm btn-square sm:hidden"
                  [attr.aria-label]="t('common.back')" (click)="cierra.emit()">
            <fa-icon [icon]="iconos.atras" />
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-base font-semibold">{{ abierto.titulo }}</h2>
            <div class="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[12px] opacity-70">
              @if (remitente(); as correo) {
                <span>{{ t('notif.reply.to') }}: <span class="font-medium">{{ correo }}</span></span>
              }
              <span>{{ cuando(abierto.creadoEl) }}</span>
              <span class="badge badge-sm" [class]="colorDeCategoria(abierto)">
                {{ t('notif.cat.' + categoria(abierto)) }}
              </span>
              <span class="badge badge-sm bg-base-300">{{ nombreDeSuceso(abierto) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            @if (carpeta() === 'inbox') {
              <button type="button" class="btn btn-ghost btn-sm" [title]="t('notif.action.archive')"
                      (click)="mueve.emit('archiva')">
                <fa-icon [icon]="iconos.archivar" />
                <span class="hidden lg:inline">{{ t('notif.action.archive') }}</span>
              </button>
            }
            @if (carpeta() === 'archived') {
              <button type="button" class="btn btn-ghost btn-sm" [title]="t('notif.action.unarchive')"
                      (click)="mueve.emit('desarchiva')">
                <fa-icon [icon]="iconos.bandeja" />
                <span class="hidden lg:inline">{{ t('notif.action.unarchive') }}</span>
              </button>
            }
            @if (carpeta() === 'trash') {
              <button type="button" class="btn btn-ghost btn-sm" [title]="t('notif.action.restore')"
                      (click)="mueve.emit('restaura')">
                <fa-icon [icon]="iconos.restaurar" />
                <span class="hidden lg:inline">{{ t('notif.action.restore') }}</span>
              </button>
              <button type="button" class="btn btn-ghost btn-sm text-error"
                      [title]="t('notif.action.delete_forever')" (click)="mueve.emit('borraParaSiempre')">
                <fa-icon [icon]="iconos.papelera" />
                <span class="hidden lg:inline">{{ t('notif.action.delete_forever') }}</span>
              </button>
            } @else {
              <button type="button" class="btn btn-ghost btn-sm text-error"
                      [title]="t('notif.action.trash')" (click)="mueve.emit('aLaPapelera')">
                <fa-icon [icon]="iconos.papelera" />
                <span class="hidden lg:inline">{{ t('notif.action.trash') }}</span>
              </button>
            }
          </div>
        </div>

        <!-- El flujo de gestión SOLO en lo accionable: un «pedido enviado» no se resuelve. -->
        @if (esDeLaCasa() && accionable()) {
          <div class="px-5 py-3 border-b border-base-200 bg-base-200/20 flex items-center flex-wrap gap-2">
            <label class="text-[12px] opacity-70" for="aviso-estado">{{ t('notif.status.label') }}:</label>
            <span class="badge badge-sm" [class]="colorDeEstado(abierto)">{{ t(claveEstado(abierto)) }}</span>
            <span class="text-[12px] opacity-50 ml-1">→</span>
            <select id="aviso-estado" class="select select-bordered select-sm text-[12px]"
                    [value]="abierto.estado || 'NEW'"
                    (change)="cambiaEstado.emit(estadoElegido($event))">
              @for (estado of estados; track estado) {
                <!-- «NEW» es el punto de partida: se enseña, pero no se puede volver a él a mano. -->
                <option [value]="estado" [disabled]="estado === 'NEW'">{{ t(claveDe(estado)) }}</option>
              }
            </select>
          </div>
        }

        <div class="px-5 py-5 flex-1">
          @if (abierto.cuerpo) {
            <p class="text-[14px] whitespace-pre-wrap leading-relaxed max-w-3xl">{{ abierto.cuerpo }}</p>
          } @else {
            <p class="text-sm opacity-50 italic">{{ t('notif.no_body') }}</p>
          }
        </div>

        @if (esDeLaCasa() && remitente()) {
          <div class="border-t border-base-200 px-5 py-4 bg-base-200/30">
            <div class="flex items-center gap-2 mb-3 text-sm font-medium">
              <fa-icon [icon]="iconos.responder" class="text-primary" /> {{ t('notif.reply.title') }}
            </div>
            <div class="space-y-3">
              <label class="sr-only" for="aviso-asunto">{{ t('notif.reply.subject') }}</label>
              <input id="aviso-asunto" class="input input-bordered input-sm w-full"
                     [placeholder]="t('notif.reply.subject')"
                     [value]="asunto()" (input)="asunto.set(valorDe($event))" />
              <label class="sr-only" for="aviso-mensaje">{{ t('notif.reply.message') }}</label>
              <textarea id="aviso-mensaje" class="textarea textarea-bordered w-full min-h-32 resize-y leading-relaxed"
                        [placeholder]="t('notif.reply.message_ph')"
                        [value]="mensaje()" (input)="mensaje.set(valorDe($event))"></textarea>
              <div class="flex justify-end">
                <button type="button" class="btn btn-primary btn-sm"
                        [disabled]="!asunto().trim() || !mensaje().trim() || enviando()"
                        (click)="mandaLaRespuesta()">
                  <fa-icon [icon]="iconos.enviar" /> {{ t('notif.reply.send') }}
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="m-auto text-center opacity-50 p-10">
          <fa-icon [icon]="iconos.bandeja" class="text-4xl opacity-40 mb-3" />
          <p class="text-sm">{{ t('notif.select_prompt') }}</p>
        </div>
      }
    </section>
  `,
})
export class LecturaDeAviso {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  readonly aviso = input<Aviso | null>(null);
  readonly carpeta = input.required<Carpeta>();
  /** Si quien mira es del personal de la casa: solo entonces hay gestión y respuesta. */
  readonly esDeLaCasa = input(false);
  readonly enviando = input(false);

  readonly cierra = output<void>();
  readonly mueve = output<Movimiento>();
  readonly cambiaEstado = output<EstadoDeGestion>();
  readonly responde = output<{ email: string; asunto: string; mensaje: string }>();

  protected readonly estados = ESTADOS_DE_GESTION;
  protected readonly asunto = signal('');
  protected readonly mensaje = signal('');

  protected readonly remitente = computed(() => {
    const abierto = this.aviso();
    return abierto ? correoDeRespuesta(abierto) : null;
  });

  protected readonly accionable = computed(() => {
    const abierto = this.aviso();
    return !!abierto && esAccionable(abierto);
  });

  protected readonly iconos = {
    atras: faArrowLeft,
    archivar: faBoxArchive,
    bandeja: faInbox,
    papelera: faTrash,
    restaurar: faRotateLeft,
    responder: faReply,
    enviar: faPaperPlane,
  };

  constructor() {
    // Al abrir otro aviso se prepara el asunto y se vacía el cuerpo: arrastrar lo escrito para el
    // anterior es la forma más rápida de contestarle a quien no era.
    effect(() => {
      const abierto = this.aviso();
      this.asunto.set(abierto ? asuntoDeRespuesta(abierto) : '');
      this.mensaje.set('');
    });
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected estadoElegido(evento: Event): EstadoDeGestion {
    return (evento.target as HTMLSelectElement).value as EstadoDeGestion;
  }

  protected categoria(aviso: Aviso): string {
    return categoriaDe(aviso.tipoDeSuceso);
  }

  protected colorDeCategoria(aviso: Aviso): string {
    return COLOR_DE_CATEGORIA[categoriaDe(aviso.tipoDeSuceso)];
  }

  protected colorDeEstado(aviso: Aviso): string {
    return COLOR_DE_ESTADO[aviso.estado ?? 'NEW'] ?? COLOR_DE_ESTADO['NEW'];
  }

  protected claveEstado(aviso: Aviso): string {
    return claveDeEstado(aviso.estado);
  }

  protected claveDe(estado: EstadoDeGestion): string {
    return claveDeEstado(estado);
  }

  protected nombreDeSuceso(aviso: Aviso): string {
    return nombreDelSuceso(this.t, aviso.tipoDeSuceso);
  }

  protected cuando(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  protected mandaLaRespuesta(): void {
    const correo = this.remitente();
    if (!correo) {
      return;
    }
    this.responde.emit({ email: correo, asunto: this.asunto(), mensaje: this.mensaje() });
    this.mensaje.set('');
  }
}
