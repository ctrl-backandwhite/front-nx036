import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  NOTA_DE_INTEGRACION,
  PASOS_DE_INTEGRACION,
  RESUMEN_TECNICO,
} from '../../../domain/model/contenido-de-conexion';
import {
  ApartadoDeDocumentacion,
  SeccionDeDocumentacion,
} from './seccion-de-documentacion';

/**
 * El capítulo de integraciones de la documentación: Shopify y WooCommerce paso a paso.
 *
 * <p>Va aparte porque es el único capítulo que no son endpoints, sino prosa: cinco pasos por
 * plataforma más un resumen técnico. Dentro de la pantalla de documentación se comía cien líneas de
 * marcado entre las fichas de endpoint.
 *
 * <p>DEUDA HEREDADA: estos textos vienen escritos en castellano desde el front de React, sin pasar por
 * el diccionario, así que salen en español con la interfaz en cualquier idioma. Están sacados a datos
 * en `contenido-de-conexion.ts`, que es el paso previo para poder traducirlos sin tocar la pantalla.
 */
@Component({
  selector: 'nx-seccion-de-integraciones',
  imports: [FaIconComponent, SeccionDeDocumentacion, ApartadoDeDocumentacion],
  template: `
    <nx-seccion-de-documentacion
      id="integrations"
      nombreDelIcono="enchufe"
      [titulo]="t('docs.toc.integrations')"
    >
      <p>
        Vende nuestros productos en tu tienda <strong>Shopify</strong> o
        <strong>WooCommerce</strong> sin inventario: importas nuestro catálogo, tus clientes compran en
        tu tienda y nosotros nos encargamos de abastecer y enviar cada pedido con seguimiento. Los
        precios ya llegan como precio mayorista final, en la moneda de tu tienda. Sigue el paso a paso
        de tu plataforma.
      </p>
      <div class="card p-4 bg-brand-50 border-brand-100 text-[13px]">
        <strong class="text-brand-700">Lo que necesitas (5 min):</strong> una cuenta en NX036, tu
        tienda Shopify o WooCommerce, y permisos de administrador en ella.
      </div>

      <nx-apartado-de-documentacion
        id="int-shopify"
        nombreDelIcono="tienda"
        [titulo]="t('docs.int.shopify.title')"
      >
        <ol class="space-y-3 text-[14px]">
          @for (paso of pasosShopify; track paso.titulo) {
            <li><strong>{{ paso.titulo }}.</strong> {{ paso.cuerpo }}</li>
          }
        </ol>
        <p class="text-[12px] text-ink-500 mt-2">{{ notaShopify }}</p>
      </nx-apartado-de-documentacion>

      <nx-apartado-de-documentacion
        id="int-woocommerce"
        nombreDelIcono="tienda"
        [titulo]="t('docs.int.woocommerce.title')"
      >
        <ol class="space-y-3 text-[14px]">
          @for (paso of pasosWoo; track paso.titulo) {
            <li><strong>{{ paso.titulo }}.</strong> {{ paso.cuerpo }}</li>
          }
        </ol>
        <p class="text-[12px] text-ink-500 mt-2">{{ notaWoo }}</p>
      </nx-apartado-de-documentacion>

      <h3 class="text-[14px] font-medium mt-6 mb-2 flex items-center gap-2">
        <fa-icon [icon]="iconoGiro" class="text-brand-500" />
        Cómo funciona por dentro (resumen técnico)
      </h3>
      <ul class="text-[13px] text-ink-700 list-disc pl-5 space-y-1">
        @for (punto of resumen; track punto) {
          <li>{{ punto }}</li>
        }
      </ul>
      <p class="text-[13px] mt-3">
        Guía resumida también en
        <a href="/connect" class="text-brand-700 hover:underline">/connect</a>.
      </p>
    </nx-seccion-de-documentacion>
  `,
})
export class SeccionDeIntegraciones {
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoGiro = faRotate;

  protected readonly pasosShopify = PASOS_DE_INTEGRACION['shopify'];
  protected readonly pasosWoo = PASOS_DE_INTEGRACION['woocommerce'];
  protected readonly notaShopify = NOTA_DE_INTEGRACION['shopify'];
  protected readonly notaWoo = NOTA_DE_INTEGRACION['woocommerce'];
  protected readonly resumen = RESUMEN_TECNICO;
}
