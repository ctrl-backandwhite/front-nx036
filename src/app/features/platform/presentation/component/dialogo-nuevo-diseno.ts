import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form, required, validate } from '@angular/forms/signals';
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
  imports: [FaIconComponent, FormField, ImagenSegura, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" ancho="2xl" (cierra)="cancela.emit()">
      <p class="text-[12px] text-ink-500 -mt-2 mb-4">{{ t('pod.create_body') }}</p>

      <form class="space-y-4" (submit)="envia($event)">
        <div>
          <label for="pod-nombre" class="text-[12px] text-ink-500">{{ t('pod.field.name') }}</label>
          <input
            id="pod-nombre"
            class="input mt-1"
            [placeholder]="t('pod.field.name_placeholder')"
            [formField]="formulario.nombre"
          />
          @if (falloDe(formulario.nombre); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
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
            [formField]="formulario.instruccion"
          ></textarea>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @for (plantilla of plantillas; track plantilla.clave) {
              <button
                type="button"
                class="chip text-[11px]"
                (click)="usaLaPlantilla(plantilla.instruccion)"
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

  protected readonly modelo = signal({ nombre: '', instruccion: '' });

  /**
   * Quien MANDA sobre el nombre es el dominio: `sePuedeCrear` ya sabe que un nombre de solo espacios no
   * vale. `required` va además porque es quien devuelve el atributo nativo al campo, que antes estaba
   * escrito a mano en la plantilla y con `[formField]` no puede estarlo.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: () => this.t('dialog.field.required') });
    validate(ruta.nombre, ({ value }) =>
      sePuedeCrear(value()) ? null : { kind: 'sin-nombre', message: this.t('dialog.field.required') },
    );
  });

  /** Lo escrito, para lo que la plantilla necesita fuera del campo: el botón de generar y el alt. */
  protected readonly nombre = computed(() => this.modelo().nombre);
  protected readonly instruccion = computed(() => this.modelo().instruccion);

  protected readonly titulo = computed(
    () => `${this.t('pod.create_for')} ${this.producto().titulo}`,
  );

  protected readonly sePuedeEnviar = computed(
    () => !this.creando() && !this.formulario().invalid(),
  );

  /** Las plantillas escriben en el campo, no al lado: lo que se elige se puede seguir editando. */
  protected usaLaPlantilla(instruccion: string): void {
    this.formulario.instruccion().value.set(instruccion);
  }

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const datos = this.modelo();
    this.crea.emit({ nombre: datos.nombre.trim(), instruccion: datos.instruccion });
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
