import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MensajeDeTicket } from '../../../domain/gestion/model/soporte';
import {
  ConsultaElHilo, RespondeAlTicket,
} from '../../../application/gestion/use-case/soporte.use-case';

/** Cada cuánto se relee el hilo. Lo mismo que el React: la otra parte contesta mientras se mira. */
const REFRESCO_MS = 5000;

/**
 * El hilo de mensajes de un ticket, en su versión de ADMINISTRACIÓN.
 *
 * <p>Lee y escribe por los endpoints de admin: quien atiende ve el hilo de cualquier cliente, y quien
 * compra solo el suyo. Compartir un camino para las dos cosas es como se acaban filtrando conversaciones
 * de otra persona, así que el porte del componente del escaparate irá por su propio puerto.
 *
 * <p>Se refresca cada cinco segundos porque no hay empuje del servidor: sin ello, quien atiende escribe
 * y no ve la respuesta hasta cerrar y volver a abrir el caso.
 *
 * <p>«Mío» aquí es lo que escribió SOPORTE: es el lado desde el que se mira.
 */
@Component({
  selector: 'nx-hilo-de-soporte',
  imports: [FaIconComponent],
  template: `
    <div class="flex flex-col h-[420px]">
      <div class="flex-1 overflow-y-auto space-y-2 p-3 bg-ink-50/40 rounded-box">
        @if (mensajes().length === 0) {
          <p class="text-[12px] text-ink-400 text-center mt-6">{{ t('support.thread.empty') }}</p>
        }
        @for (mensaje of mensajes(); track mensaje.id) {
          <div class="flex" [class]="mensaje.deSoporte ? 'justify-end' : 'justify-start'">
            <div class="max-w-[75%] px-3 py-2 rounded-2xl text-[13px] whitespace-pre-wrap"
                 [class]="mensaje.deSoporte
                   ? 'bg-brand-600 text-white'
                   : 'bg-base-100 border border-ink-100 text-ink-700'">
              {{ mensaje.cuerpo }}
            </div>
          </div>
        }
      </div>
      @if (error()) {
        <p role="alert" class="text-[12px] text-error mt-2">{{ error() }}</p>
      }
      <form class="flex items-center gap-2 mt-2" (submit)="envia($event)">
        <input class="input flex-1" [value]="texto()" (input)="escribe($event)"
               [placeholder]="t('support.thread.placeholder')"
               [attr.aria-label]="t('support.thread.placeholder')" />
        <button type="submit" class="btn btn-primary btn-sm" [disabled]="enviando() || !texto().trim()"
                [attr.aria-label]="t('chat.send')">
          <fa-icon [icon]="iconoEnviar" />
        </button>
      </form>
    </div>
  `,
})
export class HiloDeSoporte {
  readonly idTicket = input.required<string>();

  protected readonly t = inject(TraduccionService).t;
  private readonly consulta = inject(ConsultaElHilo);
  private readonly responde = inject(RespondeAlTicket);
  private readonly destruccion = inject(DestroyRef);

  protected readonly iconoEnviar = faPaperPlane;
  protected readonly mensajes = signal<readonly MensajeDeTicket[]>([]);
  protected readonly texto = signal('');
  protected readonly enviando = signal(false);
  /** Un rechazo al enviar se ENSEÑA: tragárselo deja creer que el cliente ya tiene la respuesta. */
  protected readonly error = signal('');

  constructor() {
    // Al cambiar de ticket se relee: el mismo componente sirve para el siguiente caso que se abra.
    effect(() => {
      this.idTicket();
      void this.carga();
    });
    const reloj = setInterval(() => void this.carga(), REFRESCO_MS);
    this.destruccion.onDestroy(() => clearInterval(reloj));
  }

  protected escribe(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    const cuerpo = this.texto().trim();
    if (!cuerpo) {
      return;
    }
    this.enviando.set(true);
    const resultado = await this.responde.ejecuta(this.idTicket(), cuerpo);
    this.enviando.set(false);
    if (!resultado.ok) {
      this.error.set(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.error.set('');
    this.texto.set('');
    await this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta(this.idTicket());
    if (resultado.ok) {
      this.mensajes.set(resultado.valor);
    }
  }
}
