import { Component, computed, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCode,
  faKey,
  faPlug,
  faRotate,
  faStore,
} from '@fortawesome/free-solid-svg-icons';
import {
  NOTAS_DE_CONEXION,
  PASOS_DE_CONEXION,
  PLATAFORMAS_DE_CONEXION,
  PlataformaDeConexion,
} from '../../domain/model/contenido-de-conexion';

/**
 * «Conecta tu tienda»: el paso a paso público para Shopify y WooCommerce.
 *
 * <p>Es la versión corta de la documentación de desarrolladores, pensada para quien todavía no ha
 * decidido integrarse: credenciales, conectar, sincronizar y recibir pedidos. Sin llamadas al backend,
 * así que se prerenderiza entera.
 *
 * <p>MOBILE FIRST: los pasos van en una columna y las tres notas del pie también; a partir de la
 * pantalla pequeña las notas pasan a tres columnas. Las pestañas se centran en las dos anchuras.
 */
@Component({
  selector: 'nx-conecta-tu-tienda',
  imports: [FaIconComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-6 py-4">
      <header class="text-center space-y-2">
        <fa-icon [icon]="iconos.enchufe" class="text-4xl text-primary" />
        <h1 class="text-2xl font-semibold">Conecta tu tienda en minutos</h1>
        <p class="text-ink-500">
          Sincroniza el catálogo de NX036 con tu Shopify o WooCommerce y deja que nosotros abastezcamos
          y enviemos cada pedido. Sin inventario.
        </p>
      </header>

      <div role="tablist" class="tabs tabs-boxed justify-center">
        @for (opcion of plataformas; track opcion) {
          <button
            role="tab"
            type="button"
            [attr.aria-selected]="plataforma() === opcion"
            class="tab"
            [class.tab-active]="plataforma() === opcion"
            (click)="plataforma.set(opcion)"
          >
            <fa-icon [icon]="iconos.tienda" class="mr-2" />
            {{ etiquetas[opcion] }}
          </button>
        }
      </div>

      <ol class="space-y-3">
        @for (paso of pasos(); track paso.titulo) {
          <li class="card bg-base-100 p-5 flex-row gap-4 items-start">
            <fa-icon [icon]="iconos.hecho" class="text-success text-xl mt-0.5" />
            <div>
              <div class="font-medium">{{ paso.titulo }}</div>
              <p class="text-sm text-ink-500 mt-1">{{ paso.cuerpo }}</p>
            </div>
          </li>
        }
      </ol>

      <!-- Las notas técnicas cierran la página: quien solo quiere el paso a paso no llega a ellas. -->
      @defer (on idle; hydrate on viewport) {
      <div class="grid gap-3 sm:grid-cols-3">
        @for (nota of notas; track nota.titulo) {
          <div class="card bg-base-100 p-4 text-sm">
            <fa-icon [icon]="iconos[nota.icono]" class="text-primary" />
            <strong class="block mt-1">{{ nota.titulo }}</strong>
            {{ nota.cuerpo }}
            @for (codigo of nota.codigos; track codigo) {
              <code class="text-[12px]">{{ codigo }}</code>
            }
          </div>
        }
      </div>
      }
    </div>
  `,
})
export class ConectaTuTiendaPage {
  protected readonly plataformas = PLATAFORMAS_DE_CONEXION;
  protected readonly notas = NOTAS_DE_CONEXION;

  /** Nombres propios de producto: no se traducen ni pasan por el diccionario. */
  protected readonly etiquetas: Readonly<Record<PlataformaDeConexion, string>> = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
  };

  protected readonly plataforma = signal<PlataformaDeConexion>('shopify');
  protected readonly pasos = computed(() => PASOS_DE_CONEXION[this.plataforma()]);

  protected readonly iconos = {
    enchufe: faPlug,
    tienda: faStore,
    hecho: faCircleCheck,
    llave: faKey,
    giro: faRotate,
    codigo: faCode,
  };
}
