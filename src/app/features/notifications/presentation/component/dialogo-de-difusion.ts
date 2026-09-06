import { Component, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Difusion } from '../../domain/port/avisos.port';

/**
 * El formulario para mandar un aviso desde el panel.
 *
 * <p>Está en su propio componente y no dentro de la página porque el buzón ya hace bastante: la página
 * decide qué pasa, y esto solo recoge tres campos y los entrega.
 *
 * <p>MOBILE FIRST: en el móvil ocupa el ancho disponible con márgenes; a partir de `sm` se queda en una
 * tarjeta centrada de ancho fijo.
 */
@Component({
  selector: 'nx-dialogo-de-difusion',
  imports: [FaIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"
         [attr.aria-label]="t('notif.send.title')">
      <!-- El fondo cierra al pulsarlo, como cualquier diálogo de la aplicación. -->
      <div class="absolute inset-0 bg-black/40" (click)="cierra.emit()"
           (keydown.escape)="cierra.emit()" tabindex="-1"></div>

      <div class="relative bg-base-100 rounded-box shadow-xl w-full max-w-xl p-6 border border-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <fa-icon [icon]="iconos.enviar" class="text-primary" /> {{ t('notif.send.title') }}
          </h3>
          <button type="button" class="btn btn-ghost btn-sm btn-square"
                  [attr.aria-label]="t('common.close')" (click)="cierra.emit()">
            <fa-icon [icon]="iconos.cerrar" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label for="difusion-destino" class="text-sm opacity-70 mb-1 block">{{ t('notif.send.target') }}</label>
            <input id="difusion-destino" class="input input-bordered w-full" placeholder="all"
                   [value]="destino()" (input)="destino.set(valorDe($event))" />
            <p class="text-xs opacity-60 mt-1">{{ t('notif.send.target_help') }}</p>
          </div>
          <div>
            <label for="difusion-titulo" class="text-sm opacity-70 mb-1 block">{{ t('notif.send.title_ph') }}</label>
            <input id="difusion-titulo" class="input input-bordered w-full"
                   [placeholder]="t('notif.send.title_ph')"
                   [value]="titulo()" (input)="titulo.set(valorDe($event))" />
          </div>
          <div>
            <label for="difusion-cuerpo" class="text-sm opacity-70 mb-1 block">{{ t('notif.send.body_ph') }}</label>
            <textarea id="difusion-cuerpo" class="textarea textarea-bordered w-full min-h-48 resize-y leading-relaxed"
                      [placeholder]="t('notif.send.body_ph')"
                      [value]="cuerpo()" (input)="cuerpo.set(valorDe($event))"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn btn-ghost" (click)="cierra.emit()">{{ t('common.cancel') }}</button>
          <button type="button" class="btn btn-primary"
                  [disabled]="!titulo().trim() || !cuerpo().trim()"
                  (click)="envia()">
            <fa-icon [icon]="iconos.enviar" /> {{ t('notif.send.send') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DialogoDeDifusion {
  protected readonly t = inject(TraduccionService).t;

  readonly cierra = output<void>();
  readonly manda = output<Difusion>();

  /** «all» es el valor por defecto: la difusión normal es a todo el mundo. */
  protected readonly destino = signal('all');
  protected readonly titulo = signal('');
  protected readonly cuerpo = signal('');

  protected readonly iconos = { enviar: faPaperPlane, cerrar: faXmark };

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected envia(): void {
    this.manda.emit({
      destino: this.destino(),
      titulo: this.titulo(),
      cuerpo: this.cuerpo(),
    });
  }
}
