import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CopiaAlPortapapeles } from './copia-al-portapapeles';

/** Una dirección con su botón de copiar. Es lo que más se copia de toda la documentación. */
@Component({
  selector: 'nx-bloque-de-url',
  imports: [FaIconComponent],
  providers: [CopiaAlPortapapeles],
  template: `
    <div
      class="flex items-center gap-2 bg-ink-50 border border-ink-100 rounded-md px-2.5 py-1.5"
      [class.flex-1]="compacto()"
      [class.min-w-0]="compacto()"
    >
      <code class="font-mono text-[12px] text-ink-900 flex-1 truncate">{{ url() }}</code>
      <button
        type="button"
        class="text-ink-400 hover:text-ink-900 shrink-0"
        [attr.aria-label]="t('docs.copy')"
        (click)="portapapeles.copia(url())"
      >
        <fa-icon [icon]="portapapeles.copiado() ? iconos.hecho : iconos.copiar" class="text-[11px]" />
      </button>
    </div>
  `,
})
export class BloqueDeUrl {
  readonly url = input.required<string>();
  /** En la línea de un endpoint va compacto, para que quepa junto a la insignia del método. */
  readonly compacto = input(false);

  protected readonly portapapeles = inject(CopiaAlPortapapeles);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { copiar: faCopy, hecho: faCheck };
}
