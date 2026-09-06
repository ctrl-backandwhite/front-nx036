import { Component, inject, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ClaseDeTicket, NuevoTicket } from '../../domain/model/ticket';

/**
 * El formulario para abrir un ticket.
 *
 * <p>Va aparte de la página porque son responsabilidades distintas: la página decide qué pasa con lo que
 * se escribe y esto solo lo recoge.
 *
 * <p>NO se limpia solo al enviar. Si el backend rechaza, lo escrito sigue ahí para corregirlo sin volver
 * a teclearlo; quien lo borra es la página, y solo cuando el ticket existe de verdad.
 */
@Component({
  selector: 'nx-dialogo-de-ticket',
  template: `
    <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" [attr.aria-label]="t('support.new')">
      <div class="absolute inset-0" (click)="cierra.emit()" (keydown.escape)="cierra.emit()" tabindex="-1"></div>
      <div class="card bg-base-100 relative w-full max-w-md p-5 border border-base-200 shadow-xl">
        <h3 class="text-lg font-semibold">{{ t('support.new') }}</h3>
        <form (submit)="envia($event)" class="space-y-3 mt-3">
          <div>
            <label for="ticket-clase" class="text-xs opacity-70">{{ t('support.kind') }}</label>
            <select id="ticket-clase" class="select select-bordered w-full mt-1"
                    [value]="clase()" (change)="clase.set(claseElegida($event))">
              <option value="SUPPORT">{{ t('support.kind.SUPPORT') }}</option>
              <option value="DISPUTE">{{ t('support.kind.DISPUTE') }}</option>
            </select>
          </div>
          <div>
            <label for="ticket-asunto" class="text-xs opacity-70">{{ t('support.subject') }}</label>
            <input id="ticket-asunto" required class="input input-bordered w-full mt-1"
                   [value]="asunto()" (input)="asunto.set(valorDe($event))" />
          </div>
          <div>
            <label for="ticket-cuerpo" class="text-xs opacity-70">{{ t('support.body') }}</label>
            <textarea id="ticket-cuerpo" rows="4" class="textarea textarea-bordered w-full mt-1"
                      [value]="cuerpo()" (input)="cuerpo.set(valorDe($event))"></textarea>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" (click)="cierra.emit()">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" [disabled]="enviando() || !asunto().trim()">
              {{ t('support.new') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class DialogoDeTicket {
  protected readonly t = inject(TraduccionService).t;

  readonly enviando = signal(false);
  readonly cierra = output<void>();
  readonly abre = output<NuevoTicket>();

  protected readonly clase = signal<ClaseDeTicket>('SUPPORT');
  protected readonly asunto = signal('');
  protected readonly cuerpo = signal('');

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected claseElegida(evento: Event): ClaseDeTicket {
    return (evento.target as HTMLSelectElement).value as ClaseDeTicket;
  }

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.asunto().trim()) {
      return;
    }
    this.abre.emit({ clase: this.clase(), asunto: this.asunto(), cuerpo: this.cuerpo() });
  }
}
