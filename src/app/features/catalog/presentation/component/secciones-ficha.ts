import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto } from '../../domain/model/producto';
import { saneaHtml } from '../sanea-html';
import { SesionActual } from '@core/auth/sesion-actual';
import { AdvertenciasSeguridad, IdentidadCumplimiento } from './cumplimiento-producto';
import { SeccionResenas } from './seccion-resenas';
import { TablaAtributos } from './tabla-atributos';
import { BasculaVariantes } from './bascula-variantes';
import { Recomendados } from './recomendados';
import { HistoricoDePrecios } from './historico-de-precios';
import { EstimacionDeMargen } from './estimacion-de-margen';

/**
 * La mitad de abajo de la ficha: seguridad, reseñas, atributos, báscula, descripción, cumplimiento y
 * recomendados.
 *
 * <p>Va separada de la pantalla porque son dos cosas distintas: arriba se decide la compra y aquí se
 * consulta. Juntas pasaban de las cuatrocientas líneas que avisa el lint, y ese aviso casi siempre
 * significa que había dos componentes.
 *
 * <p>Cada bloque lleva su ancla `#tab-…`: las pestañas de arriba llevan a ellas y el contenido está
 * SIEMPRE en la página, lo que permite buscar dentro con el navegador y compartir un enlace a una
 * sección concreta.
 */
@Component({
  selector: 'nx-secciones-ficha',
  imports: [
    FaIconComponent,
    AdvertenciasSeguridad,
    IdentidadCumplimiento,
    SeccionResenas,
    TablaAtributos,
    BasculaVariantes,
    Recomendados,
    HistoricoDePrecios,
    EstimacionDeMargen,
  ],
  template: `
    <div class="space-y-10 mt-6">
      <nx-advertencias-seguridad [cumplimiento]="ficha().cumplimiento" />

      <!--
        Las reseñas quedan bajo el pliegue y traen su propia consulta al servidor. Diferirlas hasta que
        se asoman ahorra esa petición —y su código— a quien mira las fotos, decide y añade a la cesta
        sin llegar a bajar, que es la mayoría.
      -->
      <section id="tab-reviews">
        @defer (on viewport; hydrate on viewport) {
          <nx-seccion-resenas [idDelProducto]="ficha().id" />
        } @placeholder {
          <div class="skeleton h-40 w-full"></div>
        }
      </section>

      <section id="tab-attributes">
        <nx-tabla-atributos [ficha]="ficha()" />
      </section>

      <section id="tab-packing">
        <nx-bascula-variantes [ficha]="ficha()" />
      </section>

      <section id="tab-details" class="card card-border bg-base-100">
        <div class="card-body">
          <h2 class="card-title">{{ t('pdp.section.details') }}</h2>
          @if (descripcion(); as html) {
            <!--
              La descripción viene del PROVEEDOR y llega como HTML. Se limpia antes de pintarla, con
              la misma herramienta que el otro frontal: es HTML escrito por un tercero al que no
              controlamos.
            -->
            <div class="prose prose-sm max-w-none mt-2" [innerHTML]="html"></div>
          } @else {
            <p class="opacity-70 text-sm mt-2">{{ t('pdp.details.empty') }}</p>
          }

          <div class="divider"></div>

          <!--
            El histórico y el estimado de margen se cargan SOLO al asomarse a esta zona: son dos
            consultas que no hacen falta para decidir la compra, y arrastrarlas en el arranque de la
            ficha retrasaba lo único que de verdad importa, que es ver el producto.
          -->
          <div class="grid lg:grid-cols-2 gap-4">
            @defer (on viewport) {
              <nx-historico-de-precios [idDelProducto]="ficha().id" />
            } @placeholder {
              <div class="skeleton h-44 w-full"></div>
            }

            <!-- El estimado de ganancia es SOLO del administrador: ni el código viaja al resto. -->
            @if (sesion.esAdministrador()) {
              @defer (on viewport) {
                <nx-estimacion-de-margen [idDelProducto]="ficha().id" />
              } @placeholder {
                <div class="skeleton h-44 w-full"></div>
              }
            }
          </div>
        </div>
      </section>

      <nx-identidad-cumplimiento [cumplimiento]="ficha().cumplimiento" />

      <section id="tab-recommend">
        <nx-recomendados [idDelProducto]="ficha().id" />
      </section>

      <p class="text-[11px] opacity-60 leading-relaxed border-t border-base-200 pt-4">
        <fa-icon [icon]="iconoAviso" class="text-warning mr-1" />
        {{ t('product.content_disclaimer') }}
      </p>
    </div>
  `,
})
export class SeccionesFicha {
  readonly ficha = input.required<FichaDeProducto>();

  protected readonly sesion = inject(SesionActual);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAviso = faCircleExclamation;

  protected readonly descripcion = computed(() => saneaHtml(this.ficha().descripcion) || null);
}
