import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto, ImagenDeProducto } from '../../domain/model/producto';
import { GaleriaDeDetalle } from './galeria-de-detalle';
import { saneaHtml } from '../sanea-html';
import { SesionActual } from '@core/auth/sesion-actual';
import { AdvertenciasSeguridad, IdentidadCumplimiento } from './cumplimiento-producto';
import { SeccionResenas } from './seccion-resenas';
import { TablaAtributos } from './tabla-atributos';
import { BasculaVariantes } from './bascula-variantes';
import { HistoricoDePrecios } from './historico-de-precios';

/**
 * La mitad de abajo de la ficha: detalle, reseñas, atributos, báscula y cumplimiento.
 *
 * <p>Los RECOMENDADOS ya no están aquí: desde el 12-sep-2026 van arriba, justo debajo de «Vendido y
 * enviado por NX036», que es donde se miran —mientras se decide— y no al final de todo.
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
    GaleriaDeDetalle,
    FaIconComponent,
    AdvertenciasSeguridad,
    IdentidadCumplimiento,
    SeccionResenas,
    TablaAtributos,
    BasculaVariantes,
    HistoricoDePrecios,
  ],
  template: `
    <div class="space-y-10 mt-6">
      <!--
        El DETALLE va ANTES que las reseñas (petición del dueño, 12-sep-2026). Es lo que se mira para
        decidir la compra —medidas, materiales, cómo cae la prenda— y las reseñas se leen después, si
        se leen. Con el detalle debajo quedaba tras una sección que carga en diferido y crece sola.
      -->
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

          <!--
            Las fotos de la DESCRIPCIÓN van AQUÍ, dentro de la tarjeta de detalles, y no arriba con el
            carrusel: son los carteles largos del proveedor —medidas, materiales, cómo se lleva— y
            pertenecen a lo que se lee, no a la primera impresión del producto.

            Es el MISMO componente que la galería principal, así que trae de serie el visor ampliado y,
            para quien administra, reordenar y borrar sin pasar por el panel.
          -->
          @if (fotosDeDetalle().length) {
            <nx-galeria-de-detalle
              [fotos]="fotosDeDetalle()"
              [titulo]="ficha().titulo"
              [puedeEditar]="puedeEditar()"
              (borra)="borraImagen.emit($event)"
              (borraSeleccion)="borraSeleccion.emit($event)"
              (reordena)="reordenaDetalle.emit($event)"
            />
          }

          <div class="divider"></div>

          <!--
            El histórico y el estimado de margen se cargan SOLO al asomarse a esta zona: son dos
            consultas que no hacen falta para decidir la compra, y arrastrarlas en el arranque de la
            ficha retrasaba lo único que de verdad importa, que es ver el producto.
          -->
          <div class="grid lg:grid-cols-2 gap-4">
            <!--
              Sin hueco reservado a propósito. El histórico NO SIEMPRE tiene datos: la mayoría de las
              fichas no ha cambiado de precio, y entonces el componente no pinta nada, que es lo
              correcto. Pero el hueco de carga sí reservaba 165 píxeles, así que quedaba un rectángulo
              gris «cargando» para siempre debajo de los detalles, prometiendo algo que no iba a venir.
              El front anterior no reserva nada tampoco cuando no hay gráfica.

              El componente ya enseña su propio esqueleto mientras pide los datos, así que el aviso de
              que algo está en camino no se pierde: solo deja de aparecer cuando no hay nada que
              esperar. El hueco sigue existiendo —hace falta para saber cuándo asomarse— pero sin
              altura.
            -->
            @defer (on viewport) {
              <nx-historico-de-precios [idDelProducto]="ficha().id" />
            } @placeholder {
              <!-- Vacío y sin altura, pero TIENE que existir: un bloque diferido que se dispara «al
                   asomarse» observa precisamente su hueco, y sin él la compilación falla con «defer on
                   trigger with no target name must have a placeholder block». Lo que se quita es la
                   altura reservada, no el hueco. -->
              <div></div>
            }

            <!-- RETIRADA la «Estimación de rentabilidad», por decisión del titular el 7-sep-2026.
                 Era una divergencia deliberada del front anterior, que sí la enseña a quien administra.
                 Su componente y su caso de uso SE QUEDAN en el proyecto —siguen probados y con su
                 puerto— para que volver a ponerla sea añadir esta línea, no rehacerla. -->
          </div>

          <!--
            El aviso de procedencia va DENTRO de la tarjeta de detalles y no al final de la página:
            habla de ESTAS imágenes y de ESTA descripción —las pone el proveedor y se traducen solas—,
            así que se lee donde están, no doscientos píxeles más abajo tras las reseñas y las
            recomendaciones, donde ya nadie lo relaciona con nada.
          -->
          <p class="text-[11px] opacity-60 leading-relaxed border-t border-base-200 pt-3 mt-2">
            <fa-icon [icon]="iconoAviso" class="text-warning mr-1" />
            {{ t('product.content_disclaimer') }}
          </p>
        </div>
      </section>

      <!--
        TODAS las secciones van con la MISMA separación, la del contenedor. El aviso de seguridad y las
        reseñas compartían una caja de cinco píxeles —se leían como un bloque— y eso dejó de tener
        sentido el 12-sep-2026, cuando el detalle pasó a ir primero y las separó. Con el hueco pequeño,
        las reseñas parecían colgar del aviso en vez de ser una sección más.
      -->
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
          <!--
            El hueco tiene la FORMA de lo que va a llegar, no un rectángulo gris.
            Era un «skeleton» liso de 160 px y se leía como un fallo: un cuadro apagado sin nada dentro,
            justo debajo de un título que promete reseñas. Con la silueta —el encabezado y tres fichas—
            se entiende que está cargando algo concreto.

            Y mide parecido a lo que sustituye. El liso venía 200 px corto y, al resolverse, empujaba
            hacia abajo todo lo que había debajo: quien acababa de pulsar «Reseñas» veía saltar la
            página en el momento de llegar.
          -->
          <div class="space-y-4" aria-busy="true">
            <div class="flex items-center justify-between">
              <div class="skeleton h-6 w-48"></div>
              <div class="skeleton h-8 w-36"></div>
            </div>
            @for (hueco of [0, 1, 2]; track hueco) {
              <div class="flex gap-3">
                <div class="skeleton h-10 w-10 shrink-0 rounded-full"></div>
                <div class="flex-1 space-y-2">
                  <div class="skeleton h-4 w-32"></div>
                  <div class="skeleton h-3 w-full"></div>
                  <div class="skeleton h-3 w-4/5"></div>
                </div>
              </div>
            }
          </div>
        }
        </section>

      <section id="tab-attributes">
        <nx-tabla-atributos [ficha]="ficha()" />
      </section>

      <section id="tab-packing">
        <nx-bascula-variantes [ficha]="ficha()" />
      </section>

      <nx-identidad-cumplimiento [cumplimiento]="ficha().cumplimiento" />
    </div>
  `,
})
export class SeccionesFicha {
  readonly ficha = input.required<FichaDeProducto>();

  protected readonly sesion = inject(SesionActual);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAviso = faCircleExclamation;

  /** Las fotos de la descripción del proveedor; vacías en casi todo el catálogo cargado antes del 12-sep-2026. */
  readonly fotosDeDetalle = input<readonly ImagenDeProducto[]>([]);
  readonly puedeEditar = input(false);
  readonly borraImagen = output<string>();
  readonly borraSeleccion = output<readonly string[]>();
  /** El nuevo orden de las fotos de la descripción; la página es quien tiene el caso de uso. */
  readonly reordenaDetalle = output<readonly string[]>();

  protected readonly descripcion = computed(() => saneaHtml(this.ficha().descripcion) || null);
}
