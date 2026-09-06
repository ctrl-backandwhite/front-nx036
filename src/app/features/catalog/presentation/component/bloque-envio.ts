import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGlobe, faRotateLeft, faTruck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Envío, devoluciones y origen: las tres promesas que decide la plataforma, no el producto.
 *
 * <p>MOBILE FIRST: una columna en el móvil, tres a partir de `sm`. En tres columnas estrechas los
 * textos se partían palabra a palabra y no se leían.
 */
@Component({
  selector: 'nx-bloque-envio',
  imports: [FaIconComponent],
  template: `
    <ul class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
      @for (promesa of promesas; track promesa.clave) {
        <li class="flex items-start gap-2">
          <fa-icon [icon]="promesa.icono" class="text-primary mt-0.5" />
          <span>
            <strong>{{ t(promesa.clave + '.title') }}</strong>
            <br />
            <span class="opacity-70">{{ t(promesa.clave + '.body') }}</span>
          </span>
        </li>
      }
    </ul>
  `,
})
export class BloqueEnvio {
  protected readonly t = inject(TraduccionService).t;
  protected readonly promesas = [
    { clave: 'pdp.shipping', icono: faTruck },
    { clave: 'pdp.returns', icono: faRotateLeft },
    { clave: 'pdp.origin', icono: faGlobe },
  ];
}
