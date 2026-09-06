import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CopiaAlPortapapeles } from './copia-al-portapapeles';

/**
 * Un bloque de código con su botón de copiar.
 *
 * <p>MOBILE FIRST: el código se desplaza dentro de su propia caja (`overflow-x-auto`); si no, una línea
 * de `curl` larga empujaba la página entera y en el móvil se podía desplazar hacia los lados la
 * documentación completa.
 */
@Component({
  selector: 'nx-bloque-de-codigo',
  imports: [FaIconComponent],
  providers: [CopiaAlPortapapeles],
  template: `
    <div class="rounded-md overflow-hidden border border-ink-900/10">
      <div class="bg-ink-900 text-ink-50 flex items-center justify-between text-[11px] px-3 py-1.5">
        <span class="font-mono text-ink-400">{{ etiqueta() }}</span>
        <button
          type="button"
          class="text-ink-300 hover:text-white flex items-center gap-1"
          (click)="portapapeles.copia(codigo())"
        >
          <fa-icon [icon]="portapapeles.copiado() ? iconos.hecho : iconos.copiar" class="text-[10px]" />
          {{ portapapeles.copiado() ? t('docs.copied') : t('docs.copy') }}
        </button>
      </div>
      <pre
        class="bg-ink-900 text-ink-50 p-3.5 overflow-x-auto text-[12px] leading-relaxed font-mono"
      ><code>{{ codigo() }}</code></pre>
    </div>
  `,
})
export class BloqueDeCodigo {
  readonly codigo = input.required<string>();
  readonly etiqueta = input('json');

  protected readonly portapapeles = inject(CopiaAlPortapapeles);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { copiar: faCopy, hecho: faCheck };
}
