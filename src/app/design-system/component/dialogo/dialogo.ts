import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EnfocaAlAparecer } from '../../directive/enfoca-al-aparecer.directive';
import { DialogoStore, VarianteDialogo } from './dialogo.store';
import { errorDeCampo } from './validacion-campo';

const ICONO: Record<VarianteDialogo, IconDefinition> = {
  info: faCircleInfo,
  success: faCircleCheck,
  warning: faTriangleExclamation,
  error: faCircleExclamation,
};

const COLOR: Record<VarianteDialogo, string> = {
  info: 'text-info bg-info/15',
  success: 'text-success bg-success/15',
  warning: 'text-warning bg-warning/15',
  error: 'text-error bg-error/15',
};

const BOTON: Record<VarianteDialogo, string> = {
  info: 'btn-primary',
  success: 'btn-primary',
  warning: 'btn-warning',
  error: 'btn-error',
};

/**
 * El anfitrión del diálogo. Se monta UNA vez en el marco de página y pinta el que haya vivo.
 *
 * <p>Cómo se cierra: el aviso siempre confirma; la confirmación devuelve «no» al cancelar, con la tecla
 * de escape o pulsando el fondo; la pregunta devuelve el texto o nulo; el formulario, sus campos —y no
 * se cierra si hay errores, porque cerrar obligaría a volver a teclearlo todo.
 */
@Component({
  selector: 'nx-dialogo',
  imports: [FaIconComponent, EnfocaAlAparecer],
  template: `
    @if (actual(); as dialogo) {
      <div
        class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nx-dialog-title"
      >
        <div
          class="absolute inset-0 bg-black/40 animate-fade-in"
          (click)="cancela()"
          aria-hidden="true"
        ></div>
        <div
          class="card relative bg-base-100 shadow-pastel-lg w-full animate-scale-in"
          [class.max-w-lg]="dialogo.clase === 'form'"
          [class.max-w-md]="dialogo.clase !== 'form'"
        >
          <button
            type="button"
            (click)="cancela()"
            [attr.aria-label]="t('dialog.close')"
            class="absolute top-2 right-2 btn btn-ghost btn-xs btn-square opacity-60 hover:opacity-100"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
          <div class="card-body">
            <div class="flex items-start gap-3">
              <span
                [class]="
                  'shrink-0 inline-flex w-10 h-10 items-center justify-center rounded-full ' +
                  colorVariante()
                "
              >
                <fa-icon [icon]="iconoVariante()" class="text-lg" />
              </span>
              <div class="flex-1 min-w-0">
                <h3 id="nx-dialog-title" class="font-medium text-base mt-0.5">{{ titulo() }}</h3>
                @if (dialogo.mensaje) {
                  <p class="text-sm opacity-80 mt-1 whitespace-pre-line break-words">
                    {{ dialogo.mensaje }}
                  </p>
                }
                @if (dialogo.clase === 'form') {
                  <div class="mt-3 space-y-3">
                    @for (campo of dialogo.campos ?? []; track campo.nombre; let primero = $first) {
                      <div>
                        <label class="label py-1" [attr.for]="'nx-dialog-' + campo.nombre">
                          <span class="label-text text-sm">
                            {{ campo.etiqueta }}
                            @if (campo.obligatorio) {
                              <span class="text-error ml-0.5" aria-hidden="true">*</span>
                            }
                          </span>
                        </label>
                        <input
                          [id]="'nx-dialog-' + campo.nombre"
                          [type]="campo.tipo ?? 'text'"
                          class="input input-bordered w-full"
                          [class.input-error]="!!error(campo.nombre)"
                          [placeholder]="campo.marcador ?? ''"
                          [value]="valorDe(campo.nombre)"
                          [attr.min]="campo.tipo === 'number' ? campo.min : null"
                          [attr.required]="campo.obligatorio ? '' : null"
                          [attr.aria-required]="campo.obligatorio ? 'true' : null"
                          [attr.aria-invalid]="error(campo.nombre) ? 'true' : null"
                          [attr.aria-describedby]="
                            error(campo.nombre) ? 'nx-dialog-' + campo.nombre + '-error' : null
                          "
                          [nxEnfocaAlAparecer]="primero"
                          (input)="escribeCampo(campo.nombre, $event)"
                          (keydown.enter)="enviaFormulario()"
                        />
                        @if (error(campo.nombre); as clave) {
                          <p
                            [id]="'nx-dialog-' + campo.nombre + '-error'"
                            role="alert"
                            class="text-xs text-error mt-1"
                          >
                            {{ t(clave) }}
                          </p>
                        } @else if (campo.ayuda) {
                          <p class="text-xs opacity-60 mt-1">{{ campo.ayuda }}</p>
                        }
                      </div>
                    }
                  </div>
                }
                @if (dialogo.clase === 'prompt') {
                  <input
                    [type]="dialogo.tipoCampo ?? 'text'"
                    class="input input-bordered w-full mt-3"
                    [placeholder]="dialogo.marcador ?? ''"
                    [value]="texto()"
                    (input)="escribeTexto($event)"
                    (keydown.enter)="confirma()"
                    [attr.aria-label]="titulo()"
                    nxEnfocaAlAparecer
                  />
                }
              </div>
            </div>

            <div class="card-actions justify-end gap-2 mt-3">
              @if (dialogo.clase !== 'alert') {
                <button type="button" (click)="cancela()" class="btn btn-ghost btn-sm">
                  {{ dialogo.etiquetaCancelar || t('dialog.cancel') }}
                </button>
              }
              <button type="button" (click)="confirma()" [class]="'btn btn-sm ' + botonVariante()">
                {{ etiquetaConfirmar() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  host: { '(document:keydown.escape)': 'cancela()' },
})
export class Dialogo {
  private readonly store = inject(DialogoStore);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAspa = faXmark;

  protected readonly actual = this.store.actual;

  /** Lo tecleado se reinicia solo al cambiar de diálogo: heredar el texto del anterior confunde. */
  protected readonly texto = linkedSignal(() => this.actual()?.valorInicial ?? '');
  protected readonly valores = linkedSignal<number | undefined, Record<string, string>>({
    source: () => this.actual()?.id,
    computation: () =>
      Object.fromEntries(
        (this.actual()?.campos ?? []).map((campo) => [campo.nombre, campo.valorInicial ?? '']),
      ),
  });
  private readonly errores = signal<Record<string, string>>({});

  protected readonly variante = computed<VarianteDialogo>(() => {
    const dialogo = this.actual();
    return dialogo?.variante ?? (dialogo?.clase === 'confirm' ? 'warning' : 'info');
  });
  protected readonly iconoVariante = computed(() => ICONO[this.variante()]);
  protected readonly colorVariante = computed(() => COLOR[this.variante()]);
  protected readonly botonVariante = computed(() => BOTON[this.variante()]);

  protected readonly titulo = computed(() => {
    const dialogo = this.actual();
    return dialogo?.titulo || this.t(`dialog.${dialogo?.clase ?? 'alert'}.title`);
  });

  protected readonly etiquetaConfirmar = computed(() => {
    const dialogo = this.actual();
    return dialogo?.etiquetaConfirmar || this.t(`dialog.${dialogo?.clase ?? 'alert'}.ok`);
  });

  protected valorDe(nombre: string): string {
    return this.valores()[nombre] ?? '';
  }

  protected error(nombre: string): string | undefined {
    return this.errores()[nombre];
  }

  protected escribeTexto(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected escribeCampo(nombre: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.valores.update((previos) => ({ ...previos, [nombre]: valor }));
    // El error se retira al CORREGIR, no al volver a enviar: castigar dos veces por el mismo fallo es
    // lo que hace que un formulario se sienta hostil.
    this.errores.update((previos) => {
      if (!previos[nombre]) {
        return previos;
      }
      const siguiente = { ...previos };
      delete siguiente[nombre];
      return siguiente;
    });
  }

  protected confirma(): void {
    const dialogo = this.actual();
    if (!dialogo) {
      return;
    }
    switch (dialogo.clase) {
      case 'alert':
      case 'confirm':
        this.store.cierra(true);
        break;
      case 'prompt':
        this.store.cierra(this.texto());
        break;
      case 'form':
        this.enviaFormulario();
        break;
    }
  }

  protected cancela(): void {
    const dialogo = this.actual();
    if (!dialogo) {
      return;
    }
    // Un aviso no tiene «no»: se ha leído y punto. Cerrarlo con nulo obligaría a quien lo espera a
    // distinguir dos respuestas que significan lo mismo.
    this.store.cierra(dialogo.clase === 'alert' ? true : dialogo.clase === 'confirm' ? false : null);
  }

  protected enviaFormulario(): void {
    const campos = this.actual()?.campos ?? [];
    const encontrados: Record<string, string> = {};
    for (const campo of campos) {
      const error = errorDeCampo(campo, this.valorDe(campo.nombre));
      if (error) {
        encontrados[campo.nombre] = error;
      }
    }
    this.errores.set(encontrados);
    if (Object.keys(encontrados).length > 0) {
      return;
    }
    this.store.cierra(
      Object.fromEntries(campos.map((campo) => [campo.nombre, this.valorDe(campo.nombre).trim()])),
    );
  }
}
