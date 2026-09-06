import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  EjemplosDeCodigo,
  ETIQUETAS_DE_LENGUAJE,
  LenguajeDeEjemplo,
} from '../../../domain/model/referencia-api';
import { CopiaAlPortapapeles } from './copia-al-portapapeles';

/**
 * El mismo ejemplo en cuatro lenguajes, con pestañas.
 *
 * <p>Solo se pintan las pestañas que traen ejemplo: un endpoint documentado únicamente con `curl` no
 * tiene por qué enseñar tres pestañas vacías.
 */
@Component({
  selector: 'nx-pestanas-de-codigo',
  imports: [FaIconComponent],
  providers: [CopiaAlPortapapeles],
  template: `
    <div class="rounded-md overflow-hidden border border-ink-900/10">
      <div
        role="tablist"
        class="bg-ink-900 text-ink-50 flex items-center justify-between text-[11px] px-2"
      >
        <div class="flex">
          @for (lenguaje of lenguajes(); track lenguaje) {
            <button
              role="tab"
              type="button"
              [attr.aria-selected]="lenguaje === activo()"
              [class]="clasesDePestana(lenguaje === activo())"
              (click)="activo.set(lenguaje)"
            >
              {{ etiquetas[lenguaje] }}
            </button>
          }
        </div>
        <button
          type="button"
          class="text-ink-300 hover:text-white px-2 py-1 flex items-center gap-1"
          (click)="portapapeles.copia(codigo())"
        >
          <fa-icon
            [icon]="portapapeles.copiado() ? iconos.hecho : iconos.copiar"
            class="text-[10px]"
          />
          {{ portapapeles.copiado() ? t('docs.copied') : t('docs.copy') }}
        </button>
      </div>
      <pre
        class="bg-ink-900 text-ink-50 p-3.5 overflow-x-auto text-[12px] leading-relaxed font-mono"
      ><code>{{ codigo() }}</code></pre>
    </div>
  `,
})
export class PestanasDeCodigo {
  readonly ejemplos = input.required<EjemplosDeCodigo>();

  protected readonly portapapeles = inject(CopiaAlPortapapeles);
  protected readonly t = inject(TraduccionService).t;
  protected readonly etiquetas = ETIQUETAS_DE_LENGUAJE;
  protected readonly iconos = { copiar: faCopy, hecho: faCheck };

  /** El orden es el de las pestañas, no el del objeto: `curl` primero, que es lo que más se copia. */
  protected readonly lenguajes = computed<readonly LenguajeDeEjemplo[]>(() => {
    const ejemplos = this.ejemplos();
    return (['curl', 'node', 'python', 'php'] as const).filter((l) => !!ejemplos[l]);
  });

  /** Al cambiar de ejemplo se vuelve a la primera pestaña disponible: la anterior puede no existir. */
  protected readonly activo = linkedSignal<readonly LenguajeDeEjemplo[], LenguajeDeEjemplo | null>({
    source: () => this.lenguajes(),
    computation: (lenguajes) => lenguajes[0] ?? null,
  });

  /**
   * Las clases de una pestaña, en UNA cadena: `hover:text-white` lleva dos puntos, y ese carácter
   * rompe el analizador de plantillas dentro de un `[class.x]`.
   */
  protected clasesDePestana(activa: boolean): string {
    const comunes = 'px-3 py-1.5 transition-colors border-b-2';
    return activa
      ? `${comunes} text-white border-brand-400`
      : `${comunes} text-ink-300 hover:text-white border-transparent`;
  }

  protected readonly codigo = computed(() => {
    const activo = this.activo();
    return activo ? (this.ejemplos()[activo] ?? '') : '';
  });
}
