import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form, pattern, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { NuevaSolicitud } from '../../domain/model/aprovisionamiento';
import { VentanaModal } from './ventana-modal';

/** Solo http(s): un `ftp://` o un `javascript:` no son un enlace a una ficha de producto. */
const ENLACE_HTTP = /^https?:\/\/\S+$/i;

/**
 * El formulario para abrir una solicitud de aprovisionamiento.
 *
 * <p>El error del enlace se pinta junto al campo y no en un aviso flotante: es un error DE ese campo, y
 * quien lo lee tiene que poder corregirlo sin buscar dónde estaba. El campo queda marcado con
 * `aria-invalid` y el mensaje asociado por `aria-describedby`, para que un lector de pantalla lo lea al
 * llegar al campo y no solo al aparecer.
 *
 * <p>Hay DOS orígenes de error para el mismo campo —lo que se ve al escribir y lo que responde el
 * servidor— y se pintan en el MISMO sitio: dos avisos a la vez sobre un único campo se leen como dos
 * problemas distintos. Manda el del servidor, que es el que acaba de pasar.
 */
@Component({
  selector: 'nx-dialogo-nueva-solicitud',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('sourcing.new')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="aprov-url" class="text-xs text-ink-500">{{ t('sourcing.url') }}</label>
          <input
            id="aprov-url"
            type="url"
            class="input mt-1"
            [class.border-red-300]="!!avisoDelEnlace()"
            [attr.aria-invalid]="!!avisoDelEnlace()"
            [attr.aria-describedby]="avisoDelEnlace() ? 'aprov-url-error' : null"
            [placeholder]="t('sourcing.url.placeholder')"
            [formField]="formulario.url"
            (input)="olvidaElRechazo()"
          />
          @if (avisoDelEnlace(); as mensaje) {
            <div id="aprov-url-error" role="alert" class="text-[11px] text-red-600 mt-1">
              {{ mensaje }}
            </div>
          }
        </div>

        <div>
          <label for="aprov-titulo" class="text-xs text-ink-500">{{ t('sourcing.title_hint') }}</label>
          <input id="aprov-titulo" class="input mt-1" [formField]="formulario.titulo" />
        </div>

        <div>
          <label for="aprov-notas" class="text-xs text-ink-500">{{ t('sourcing.notes') }}</label>
          <textarea
            id="aprov-notas"
            class="input mt-1"
            rows="3"
            [formField]="formulario.notas"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="!sePuedeEnviar()">
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

  protected readonly modelo = signal({ url: '', titulo: '', notas: '' });

  /**
   * Lo que se comprueba antes de gastar una llamada. Qué mercados se aceptan lo decide el dominio; aquí
   * solo se ataja lo que ni siquiera es un enlace, que antes viajaba al backend para volver rechazado.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.url, { message: () => this.t('dialog.field.required') });
    pattern(ruta.url, ENLACE_HTTP, { message: () => this.t('sourcing.url.invalid') });
  });

  /** El rechazo del servidor manda sobre el del formulario: es lo último que ha pasado. */
  protected readonly avisoDelEnlace = computed(
    () => this.error() ?? this.falloDe(this.formulario.url),
  );

  protected readonly sePuedeEnviar = computed(
    () => !this.enviando() && !this.formulario().invalid(),
  );

  protected olvidaElRechazo(): void {
    if (this.error()) {
      this.limpiaError.emit();
    }
  }

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const datos = this.modelo();
    this.crea.emit({
      url: datos.url,
      tituloOrientativo: datos.titulo.trim() || undefined,
      notas: datos.notas.trim() || undefined,
    });
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo un formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }
}
