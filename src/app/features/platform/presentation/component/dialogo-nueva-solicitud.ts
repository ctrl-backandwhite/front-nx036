import { Component, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { NuevaSolicitud } from '../../domain/model/aprovisionamiento';
import { VentanaModal } from './ventana-modal';

/**
 * El formulario para abrir una solicitud de aprovisionamiento.
 *
 * <p>El error del enlace se pinta junto al campo y no en un aviso flotante: es un error DE ese campo, y
 * quien lo lee tiene que poder corregirlo sin buscar dónde estaba. El campo queda marcado con
 * `aria-invalid` y el mensaje asociado por `aria-describedby`, para que un lector de pantalla lo lea al
 * llegar al campo y no solo al aparecer.
 */
@Component({
  selector: 'nx-dialogo-nueva-solicitud',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('sourcing.new')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="aprov-url" class="text-xs text-ink-500">{{ t('sourcing.url') }}</label>
          <input
            id="aprov-url"
            type="url"
            required
            class="input mt-1"
            [class.border-red-300]="!!error()"
            [attr.aria-invalid]="!!error()"
            [attr.aria-describedby]="error() ? 'aprov-url-error' : null"
            [placeholder]="t('sourcing.url.placeholder')"
            [value]="url()"
            (input)="escribeUrl($event)"
          />
          @if (error(); as mensaje) {
            <div id="aprov-url-error" role="alert" class="text-[11px] text-red-600 mt-1">
              {{ mensaje }}
            </div>
          }
        </div>

        <div>
          <label for="aprov-titulo" class="text-xs text-ink-500">{{ t('sourcing.title_hint') }}</label>
          <input
            id="aprov-titulo"
            class="input mt-1"
            [value]="titulo()"
            (input)="titulo.set(valor($event))"
          />
        </div>

        <div>
          <label for="aprov-notas" class="text-xs text-ink-500">{{ t('sourcing.notes') }}</label>
          <textarea
            id="aprov-notas"
            class="input mt-1"
            rows="3"
            [value]="notas()"
            (input)="notas.set(valor($event))"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="enviando()">
            {{ enviando() ? t('common.saving') : t('sourcing.new') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class DialogoNuevaSolicitud {
  readonly enviando = input(false);
  /** El mensaje del último rechazo, sea de la validación o del servidor. */
  readonly error = input<string | null>(null);

  readonly crea = output<NuevaSolicitud>();
  readonly cancela = output<void>();
  /** Al volver a escribir se borra el error de fuera: seguir enseñándolo es acusar de lo ya corregido. */
  readonly limpiaError = output<void>();

  protected readonly t = inject(TraduccionService).t;

  protected readonly url = signal('');
  protected readonly titulo = signal('');
  protected readonly notas = signal('');

  protected escribeUrl(evento: Event): void {
    this.url.set(this.valor(evento));
    if (this.error()) {
      this.limpiaError.emit();
    }
  }

  protected envia(evento: Event): void {
    evento.preventDefault();
    this.crea.emit({
      url: this.url(),
      tituloOrientativo: this.titulo().trim() || undefined,
      notas: this.notas().trim() || undefined,
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
}
