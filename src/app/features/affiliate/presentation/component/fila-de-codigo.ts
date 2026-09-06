import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faCopy, faLink } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { CodigoDeReferido } from '../../domain/model/afiliado';

/** Cuánto se queda la marca de «copiado» antes de volver al icono normal. */
const MARCA_MS = 1500;

/**
 * Un enlace de referido con su recuento de clics y el botón de copiar.
 *
 * <p>El fallo al copiar se AVISA. El navegador deniega el portapapeles sin TLS, sin permiso o dentro de
 * un marco sin `clipboard-write`; antes la promesa quedaba rechazada sin atender y el afiliado se iba a
 * pegar un enlace que nunca llegó a copiarse. Un enlace de referido que no se copia y no lo dice es un
 * afiliado que no puede trabajar.
 */
@Component({
  selector: 'nx-fila-de-codigo',
  imports: [FaIconComponent],
  template: `
    <div class="flex items-center gap-2 p-2 rounded-box bg-base-200/50 border border-base-200">
      <fa-icon [icon]="iconos.enlace" class="text-ink-400 text-[12px]" />
      <code class="text-[12px] flex-1 truncate">{{ enlace() }}</code>
      <span class="text-[11px] text-ink-500 whitespace-nowrap">
        {{ codigo().clics }} {{ t('affiliate.codes.clicks') }}
      </span>
      <button
        type="button"
        (click)="copia()"
        class="btn btn-ghost btn-xs btn-square"
        [title]="t('affiliate.codes.copy')"
        [attr.aria-label]="t('affiliate.codes.copy')"
      >
        <fa-icon
          [icon]="copiado() ? iconos.marca : iconos.copiar"
          [class.text-success]="copiado()"
        />
      </button>
    </div>
  `,
})
export class FilaDeCodigo {
  readonly codigo = input.required<CodigoDeReferido>();
  /** El dominio con el que se compone el enlace. Lo pone quien monta la fila. */
  readonly origen = input('');

  private readonly avisos = inject(AvisosStore);
  private readonly destruccion = inject(DestroyRef);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { enlace: faLink, copiar: faCopy, marca: faCheck };
  protected readonly copiado = signal(false);

  protected readonly enlace = computed(() => `${this.origen()}${this.codigo().camino}`);

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Si el afiliado cambia de pantalla justo después de copiar, no debe quedar un temporizador
    // pendiente sobre un componente que ya no existe.
    this.destruccion.onDestroy(() => clearTimeout(this.temporizador));
  }

  protected async copia(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('sin portapapeles');
      }
      await navigator.clipboard.writeText(this.enlace());
      this.copiado.set(true);
      this.avisos.exito(this.t('affiliate.codes.copied'));
      this.temporizador = setTimeout(() => this.copiado.set(false), MARCA_MS);
    } catch {
      this.avisos.error(this.t('common.error'));
    }
  }
}
