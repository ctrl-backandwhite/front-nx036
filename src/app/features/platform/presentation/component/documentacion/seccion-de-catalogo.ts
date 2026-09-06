import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { APARTADOS_DE_CATALOGO } from '../../../domain/model/referencia-catalogo';
import { FichaDeEndpointComponent } from './ficha-de-endpoint';
import {
  ApartadoDeDocumentacion,
  SeccionDeDocumentacion,
} from './seccion-de-documentacion';

/**
 * El capítulo de catálogo: seis apartados y una treintena de endpoints.
 *
 * <p>Todo sale de `referencia-catalogo.ts`. Antes eran seiscientas líneas de marcado con cada endpoint
 * escrito a mano; ahora es un bucle. La diferencia práctica es que se puede comprobar que la
 * documentación cubre lo que el backend expone recorriendo un array, en vez de leyendo la página.
 */
@Component({
  selector: 'nx-seccion-de-catalogo',
  imports: [
    FaIconComponent,
    SeccionDeDocumentacion,
    ApartadoDeDocumentacion,
    FichaDeEndpointComponent,
  ],
  template: `
    <nx-seccion-de-documentacion
      id="catalog"
      nombreDelIcono="tienda"
      [titulo]="t('docs.cat.heading')"
    >
      <p>{{ t('docs.cat.intro') }}</p>
    </nx-seccion-de-documentacion>

    @for (apartado of apartados; track apartado.id) {
      <nx-apartado-de-documentacion
        [id]="apartado.id"
        [nombreDelIcono]="apartado.icono"
        [titulo]="t(apartado.claveTitulo)"
      >
        @if (apartado.claveIntro; as intro) {
          <p>{{ t(intro) }}</p>
        }

        @for (endpoint of apartado.endpoints; track endpoint.ruta; let primero = $first) {
          <nx-ficha-de-endpoint [ficha]="endpoint" />
          @if (primero && apartado.avisoTrasElPrimero; as aviso) {
            <!--
              El aviso va pegado al endpoint al que se refiere y no al principio del apartado: es el
              LISTADO el que exige identificarse —enumerar el catálogo entero es lo que hace un
              raspador—, mientras que la ficha suelta sigue siendo pública.
            -->
            <p
              role="note"
              class="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 -mt-2"
            >
              <fa-icon [icon]="iconoEscudo" class="mr-1.5" />
              {{ t(aviso) }}
            </p>
          }
        }
      </nx-apartado-de-documentacion>
    }
  `,
})
export class SeccionDeCatalogo {
  protected readonly t = inject(TraduccionService).t;
  protected readonly apartados = APARTADOS_DE_CATALOGO;
  protected readonly iconoEscudo = faShieldHalved;
}
