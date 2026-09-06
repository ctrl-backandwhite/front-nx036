import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AnuncioFallido } from '../../../domain/catalogo/port/productos-admin.port';

/** Cuántos fallos se enumeran: los suficientes para reconocer el patrón sin llenar la pantalla. */
const FALLOS_QUE_SE_ENUMERAN = 5;

/**
 * El aviso de los productos que no llegaron al bus del catálogo.
 *
 * <p>Que el fallo SE VEA es la razón de existir de este aviso: como el anuncio al bus va diferido, el
 * error no cabe en la respuesta de certificar, y sin esto un producto certificado que no llegó a
 * producción no se echaría en falta hasta semanas después. El detalle lleva el motivo del último
 * intento.
 */
@Component({
  selector: 'nx-aviso-anuncios-bus',
  imports: [RouterLink, FaIconComponent],
  template: `
    @if (fallidos().length > 0) {
      <div role="alert" class="alert alert-warning items-start gap-3 text-[13px]">
        <fa-icon [icon]="iconoAviso" class="mt-[3px]" />
        <div class="flex-1">
          <p class="font-medium">{{ titulo() }}</p>
          <ul class="mt-1 space-y-0.5">
            @for (fallo of visibles(); track fallo.id) {
              <li class="opacity-80">
                <a [routerLink]="['/admin/catalog', fallo.id]" class="link">
                  {{ fallo.titulo || fallo.slug || fallo.idExterno }}
                </a>
                @if (fallo.error) {
                  <span> — {{ fallo.error }}</span>
                }
              </li>
            }
          </ul>
        </div>
        <button
          type="button"
          class="btn btn-outline text-[12px]"
          [disabled]="reintentando()"
          (click)="reintenta.emit()"
        >
          {{ reintentando() ? t('common.loading') : t('admin.catalog.bus.retry') }}
        </button>
      </div>
    }
  `,
})
export class AvisoAnunciosBus {
  readonly fallidos = input<readonly AnuncioFallido[]>([]);
  readonly reintentando = input(false);
  readonly reintenta = output<void>();

  protected readonly iconoAviso = faTriangleExclamation;
  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;

  protected titulo(): string {
    return this.tCon('admin.catalog.bus.failed_title', { n: this.fallidos().length });
  }

  protected visibles(): readonly AnuncioFallido[] {
    return this.fallidos().slice(0, FALLOS_QUE_SE_ENUMERAN);
  }
}
