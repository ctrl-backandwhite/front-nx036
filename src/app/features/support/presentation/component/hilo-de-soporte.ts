import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import { MensajeDelHilo, esMio } from '../../domain/model/ticket';
import { ConversaEnElTicket } from '../../application/use-case/conversa-en-el-ticket.use-case';

/** Cada cuánto se vuelve a mirar si hay respuesta. Cinco segundos se nota como «en directo». */
const CADA_MS = 5000;

/**
 * El hilo de mensajes de un ticket.
 *
 * <p>Sirve a los dos lados: quien abrió el ticket y el personal de la casa. Lo único que cambia es qué
 * mensajes se pintan a la derecha, que es una regla del dominio y no una clase de CSS.
 *
 * <p>Se refresca por sondeo cada cinco segundos, que es lo que lo hace parecer una conversación. Solo en
 * el NAVEGADOR: al prerenderizar no hay conversación que seguir y el reloj dejaría la construcción
 * esperando.
 */
@Component({
  selector: 'nx-hilo-de-soporte',
  imports: [FaIconComponent],
  template: `
    <div class="flex flex-col h-[420px]">
      <div class="flex-1 overflow-y-auto space-y-2 p-3 bg-base-200/40 rounded-box">
        @if (mensajes().length === 0) {
          <p class="text-[12px] opacity-50 text-center mt-6">{{ t('support.thread.empty') }}</p>
        }
        @for (mensaje of mensajes(); track mensaje.id) {
          <div class="flex" [class.justify-end]="mio(mensaje)" [class.justify-start]="!mio(mensaje)">
            <div class="max-w-[75%] px-3 py-2 rounded-2xl text-[13px] whitespace-pre-wrap"
                 [class.bg-primary]="mio(mensaje)"
                 [class.text-primary-content]="mio(mensaje)"
                 [class.bg-base-100]="!mio(mensaje)"
                 [class.border]="!mio(mensaje)"
                 [class.border-base-300]="!mio(mensaje)">
              {{ mensaje.cuerpo }}
            </div>
          </div>
        }
      </div>

      <form (submit)="envia($event)" class="flex items-center gap-2 mt-2">
        <label class="sr-only" [attr.for]="idCampo()">{{ t('support.thread.placeholder') }}</label>
        <input [id]="idCampo()" class="input input-bordered flex-1"
               [placeholder]="t('support.thread.placeholder')"
               [value]="borrador()" (input)="borrador.set(valorDe($event))" />
        <button type="submit" class="btn btn-primary btn-sm"
                [attr.aria-label]="t('support.thread.send')"
                [disabled]="enviando() || !borrador().trim()">
          <fa-icon [icon]="iconoEnviar" />
        </button>
      </form>
    </div>
  `,
})
export class HiloDeSoporte {
  private readonly conversa = inject(ConversaEnElTicket);

  protected readonly t = inject(TraduccionService).t;

  readonly idTicket = input.required<string>();
  /** Desde qué lado se mira. Decide la ruta del backend y de qué lado se pintan los mensajes. */
  readonly comoSoporte = input(false);

  protected readonly mensajes = signal<readonly MensajeDelHilo[]>([]);
  protected readonly borrador = signal('');
  protected readonly enviando = signal(false);
  protected readonly iconoEnviar = faPaperPlane;

  /** Un identificador propio por instancia: puede haber dos hilos abiertos y las etiquetas colisionan. */
  protected readonly idCampo = computed(() => `hilo-${this.idTicket()}`);

  constructor() {
    effect(() => {
      // Depende del ticket: al abrir otro se recarga solo, sin que nadie tenga que acordarse.
      this.idTicket();
      void this.recarga();
    });
    if (!esNavegador()) {
      return;
    }
    const reloj = setInterval(() => void this.recarga(), CADA_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected mio(mensaje: MensajeDelHilo): boolean {
    return esMio(mensaje, this.comoSoporte());
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    const texto = this.borrador().trim();
    if (!texto || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    try {
      const resultado = await this.conversa.responde(this.idTicket(), texto, this.comoSoporte());
      if (resultado.ok) {
        // Se limpia SOLO si se envió. Si falla, lo escrito sigue ahí para poder reintentarlo.
        this.borrador.set('');
        await this.recarga();
      }
    } finally {
      this.enviando.set(false);
    }
  }

  private async recarga(): Promise<void> {
    const resultado = await this.conversa.mensajes(this.idTicket(), this.comoSoporte());
    if (resultado.ok) {
      this.mensajes.set(resultado.valor);
    }
    // Un fallo del sondeo no se cuenta: la conversación anterior sigue en pantalla y el siguiente
    // intento llega en cinco segundos. Un aviso cada cinco segundos sería insufrible.
  }
}
