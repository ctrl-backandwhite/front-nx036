import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import {
  PLANTILLAS_DE_INSTRUCCION,
  ProductoEnBlanco,
  sePuedeCrear,
} from '../../domain/model/diseno-pod';
import { VentanaModal } from './ventana-modal';

/**
 * El formulario para crear un diseño sobre una prenda en blanco.
 *
 * <p>La generación con inteligencia artificial es un paso APARTE de crear el diseño: se puede probar
 * una instrucción varias veces antes de guardar nada. Por eso el botón de generar solo aparece cuando
 * hay instrucción escrita, y la maqueta se enseña debajo sin comprometer a nada.
 */
@Component({
  selector: 'nx-dialogo-nuevo-diseno',
  imports: [FaIconComponent, ImagenSegura, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" ancho="2xl" (cierra)="cancela.emit()">
      <p class="text-[12px] text-ink-500 -mt-2 mb-4">{{ t('pod.create_body') }}</p>

      <form class="space-y-4" (submit)="envia($event)">
        <div>
          <label for="pod-nombre" class="text-[12px] text-ink-500">{{ t('pod.field.name') }}</label>
          <input
            id="pod-nombre"
            required
            class="input mt-1"
            [placeholder]="t('pod.field.name_placeholder')"
            [value]="nombre()"
            (input)="nombre.set(valor($event))"
          />
        </div>

        <div>
          <label for="pod-instruccion" class="text-[12px] text-ink-500">
            {{ t('pod.field.prompt') }}
          </label>
          <textarea
            id="pod-instruccion"
            rows="3"
            class="input mt-1"
            [placeholder]="t('pod.field.prompt_placeholder')"
            [value]="instruccion()"
            (input)="instruccion.set(valor($event))"
          ></textarea>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @for (plantilla of plantillas; track plantilla.clave) {
              <button
                type="button"
                class="chip text-[11px]"
                (click)="instruccion.set(plantilla.instruccion)"
              >
                {{ t(plantilla.clave) }}
              </button>
            }
          </div>
        </div>

        @if (instruccion()) {
          <button
            type="button"
            class="btn btn-outline w-full text-[12px]"
            [disabled]="generando()"
            (click)="genera.emit(instruccion())"
          >
            <fa-icon [icon]="iconos.varita" />
            {{ generando() ? t('pod.ai_generating') : t('pod.ai_generate') }}
          </button>
        }

        @if (maqueta(); as url) {
          <nx-imagen-segura
            [src]="url"
            [alt]="nombre() || t('pod.field.prompt')"
            clase="w-full aspect-square object-cover rounded-md border border-ink-100"
            claseMarcador="w-full aspect-square rounded-md"
          />
        }

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn btn-outline text-[12px]" (click)="cancela.emit()">
            {{ t('actions.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary text-[12px]" [disabled]="!sePuedeEnviar()">
            <fa-icon [icon]="iconos.mas" />
            {{ creando() ? t('common.saving') : t('pod.create') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class DialogoNuevoDiseno {
  readonly producto = input.required<ProductoEnBlanco>();
  readonly creando = input(false);
  readonly generando = input(false);
  /** La última maqueta generada, si la hubo. */
  readonly maqueta = input<string | null>(null);

  readonly crea = output<{ nombre: string; instruccion: string }>();
  readonly genera = output<string>();
  readonly cancela = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly plantillas = PLANTILLAS_DE_INSTRUCCION;
  protected readonly iconos = { varita: faWandMagicSparkles, mas: faPlus };

  protected readonly nombre = signal('');
  protected readonly instruccion = signal('');

  protected readonly titulo = computed(
    () => `${this.t('pod.create_for')} ${this.producto().titulo}`,
  );

  protected readonly sePuedeEnviar = computed(() => !this.creando() && sePuedeCrear(this.nombre()));

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    this.crea.emit({ nombre: this.nombre().trim(), instruccion: this.instruccion() });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
}
