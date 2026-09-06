import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHandshake, faLink } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import {
  EJEMPLOS_DE_FIRMA,
  EJEMPLO_DE_ERROR,
  ENDPOINT_DE_CREDENCIALES,
  ENDPOINT_DE_PEDIDO,
  ENDPOINT_DE_SEGUIMIENTO,
  PERMISOS,
  URL_DE_PRODUCCION,
  URL_DE_PRUEBAS,
  soloLaExplicacion,
} from '../../domain/model/referencia-api';
import { AvisoDeIntegraciones } from '../component/documentacion/aviso-de-integraciones';
import { BloqueDeCodigo } from '../component/documentacion/bloque-de-codigo';
import { BloqueDeUrl } from '../component/documentacion/bloque-de-url';
import { FichaDeEndpointComponent } from '../component/documentacion/ficha-de-endpoint';
import { IndiceDeDocumentacion } from '../component/documentacion/indice-de-documentacion';
import { PestanasDeCodigo } from '../component/documentacion/pestanas-de-codigo';
import { SeccionDeCatalogo } from '../component/documentacion/seccion-de-catalogo';
import { SeccionDeDocumentacion } from '../component/documentacion/seccion-de-documentacion';
import { SeccionDeIntegraciones } from '../component/documentacion/seccion-de-integraciones';
import {
  CicloDelPedido,
  TablaDeAvisos,
  TablaDeEntornos,
  TablaDeErrores,
} from '../component/documentacion/tablas-de-referencia';

/**
 * La documentación de la API pública.
 *
 * <p>En el front de React eran 1143 líneas en un solo fichero: cada endpoint escrito a mano con sus
 * cuatro ejemplos de código anidados dentro del marcado. Aquí el contenido vive en
 * `domain/model/referencia-api.ts` y `referencia-catalogo.ts`, y esta pantalla solo ordena capítulos.
 * Añadir un endpoint es añadir un objeto a una lista, no copiar cuarenta líneas de plantilla.
 *
 * <p>MOBILE FIRST: una sola columna con el artículo. El índice aparece a partir de `lg` y la barra
 * lateral de direcciones a partir de `xl` — en una pantalla estrecha, veintiuna entradas de índice
 * antes del primer párrafo son una pared, y la navegación por anclas sigue funcionando.
 */
@Component({
  selector: 'nx-desarrolladores',
  imports: [
    FaIconComponent,
    IndiceDeDocumentacion,
    SeccionDeDocumentacion,
    SeccionDeIntegraciones,
    SeccionDeCatalogo,
    FichaDeEndpointComponent,
    PestanasDeCodigo,
    BloqueDeCodigo,
    BloqueDeUrl,
    TablaDeAvisos,
    TablaDeErrores,
    TablaDeEntornos,
    CicloDelPedido,
    AvisoDeIntegraciones,
  ],
  template: `
    <div class="grid gap-8 lg:grid-cols-[16rem_1fr] xl:grid-cols-[16rem_1fr_18rem] xl:gap-10">
      @if (avisoVisible()) {
        <nx-aviso-de-integraciones (cierra)="avisoVisible.set(false)" />
      }

      <nx-indice-de-documentacion />

      <article class="max-w-3xl min-w-0">
        <header class="mb-8">
          <div class="text-[11px] uppercase tracking-wider text-brand-700 font-medium mb-2">
            v1 · API Reference
          </div>
          <h1 class="text-3xl">{{ t('docs.title') }}</h1>
          <p class="text-ink-700 mt-2 text-[15px] leading-relaxed">{{ t('docs.subtitle') }}</p>
        </header>

        <section class="card p-5 mb-8 bg-brand-50 border-brand-100">
          <h2 class="mt-0! flex items-center gap-2 text-brand-700 text-base font-medium">
            <fa-icon [icon]="iconos.apreton" /> {{ t('docs.mission.heading') }}
          </h2>
          <p class="text-[14px] text-ink-700 leading-relaxed mt-2">{{ t('docs.mission.body') }}</p>
        </section>

        <nx-seccion-de-documentacion
          id="quickstart"
          nombreDelIcono="cohete"
          [titulo]="t('docs.intro.heading')"
        >
          <ol class="space-y-2 text-[14px] text-ink-700">
            <li>{{ t('docs.intro.step1') }}</li>
            <li>{{ t('docs.intro.step2') }}</li>
            <li>{{ t('docs.intro.step3') }}</li>
          </ol>
          <nx-tabla-de-entornos />
        </nx-seccion-de-documentacion>

        <nx-seccion-de-documentacion
          id="overview"
          nombreDelIcono="nodos"
          [titulo]="t('docs.section.overview')"
        >
          <p>{{ t('docs.overview.body') }}</p>
        </nx-seccion-de-documentacion>

        <nx-seccion-de-documentacion
          id="auth"
          nombreDelIcono="escudo"
          [titulo]="t('docs.section.auth')"
        >
          <p>{{ t('docs.auth.intro') }}</p>
          <nx-ficha-de-endpoint [ficha]="credenciales" />
          <p class="text-[12px] text-ink-500">{{ t('docs.auth.notes') }}</p>
        </nx-seccion-de-documentacion>

        <!--
          De aquí abajo, TODO se hidrata al llegar. Es la mitad larga de la página —el capítulo de
          integraciones y la treintena de endpoints con sus cuatro ejemplos cada uno— y nadie la ve sin
          desplazarse. El HTML sigue llegando escrito del prerenderizado, así que un buscador la indexa
          igual y quien llega desde un enlace con ancla la encuentra donde estaba; lo que se ahorra es
          el código que la gobierna hasta que hace falta.
        -->
        @defer (hydrate on viewport) {
          <nx-seccion-de-integraciones />

          <nx-seccion-de-catalogo />

          <nx-seccion-de-documentacion
            id="checkout"
            nombreDelIcono="rayo"
            [titulo]="t('docs.section.checkout')"
          >
            <p>{{ t('docs.checkout.intro') }}</p>
            <nx-ficha-de-endpoint [ficha]="pedido" />
            <h3 class="text-[14px] font-medium mt-8 mb-3 flex items-center gap-2">
              <fa-icon [icon]="iconos.enlace" class="text-brand-500" />
              {{ t('docs.checkout.flow.title') }}
            </h3>
            <nx-ciclo-del-pedido />
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="tracking"
            nombreDelIcono="camionRapido"
            [titulo]="t('docs.section.tracking')"
          >
            <p>{{ t('docs.tracking.intro') }}</p>
            <nx-ficha-de-endpoint [ficha]="seguimiento" />
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="webhooks"
            nombreDelIcono="antena"
            [titulo]="t('docs.section.webhooks')"
          >
            <p>{{ t('docs.webhooks.intro') }}</p>
            <h3 class="text-[14px] font-medium mt-6 mb-3">{{ t('docs.webhooks.events') }}</h3>
            <nx-tabla-de-avisos />
            <h3 class="text-[14px] font-medium mt-8 mb-3">{{ t('docs.webhooks.verify_label') }}</h3>
            <nx-pestanas-de-codigo [ejemplos]="firma" />
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="errors"
            nombreDelIcono="aviso"
            [titulo]="t('docs.section.errors')"
          >
            <p>{{ t('docs.errors.intro') }}</p>
            <nx-bloque-de-codigo [codigo]="ejemploDeError" />
            <h3 class="text-[14px] font-medium mt-6 mb-3">{{ t('docs.errors.codes') }}</h3>
            <nx-tabla-de-errores />
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="scopes"
            nombreDelIcono="llave"
            [titulo]="t('docs.scopes.heading')"
          >
            <ul class="space-y-1.5 text-[13px] text-ink-700 list-disc pl-5">
              @for (permiso of permisos; track permiso.nombre) {
                <li>
                  <code>{{ permiso.nombre }}</code> — {{ explicacion(permiso.clave) }}
                </li>
              }
            </ul>
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="limits"
            nombreDelIcono="medidor"
            [titulo]="t('docs.rate_limit.heading')"
          >
            <p>{{ t('docs.rate_limit.body') }}</p>
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="changelog"
            nombreDelIcono="reloj"
            [titulo]="t('docs.changelog.heading')"
          >
            <div class="border-l-2 border-brand-200 pl-4 space-y-2">
              <div class="text-[13px] font-medium">{{ t('docs.changelog.v1') }}</div>
              <p class="text-[13px] text-ink-700 leading-relaxed">{{ t('docs.changelog.v1.body') }}</p>
            </div>
          </nx-seccion-de-documentacion>

          <nx-seccion-de-documentacion
            id="support"
            nombreDelIcono="apreton"
            [titulo]="t('docs.section.support')"
          >
            <p>{{ t('docs.support.body') }}</p>
            <p class="mt-4">
              <a href="/swagger-ui.html" class="text-brand-700 hover:underline text-[14px]">
                <fa-icon [icon]="iconos.enlace" class="mr-1 text-[11px]" />
                OpenAPI · /swagger-ui.html
              </a>
            </p>
          </nx-seccion-de-documentacion>
        }

      </article>

      <aside class="hidden xl:block">
        @defer (hydrate on idle) {
        <div class="sticky top-20 space-y-4 text-[12px]">
          <div class="card p-4">
            <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-2">
              {{ t('docs.base_url') }}
            </div>
            <nx-bloque-de-url [url]="urlDeProduccion" />
            <div class="mt-3 text-[11px] uppercase tracking-wider text-ink-500 font-medium">
              {{ t('docs.env.sandbox') }}
            </div>
            <nx-bloque-de-url [url]="urlDePruebas" />
          </div>
        </div>
        }
      </aside>
    </div>
  `,
})
export class DesarrolladoresPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly credenciales = ENDPOINT_DE_CREDENCIALES;
  protected readonly pedido = ENDPOINT_DE_PEDIDO;
  protected readonly seguimiento = ENDPOINT_DE_SEGUIMIENTO;
  protected readonly firma = EJEMPLOS_DE_FIRMA;
  protected readonly ejemploDeError = EJEMPLO_DE_ERROR;
  protected readonly permisos = PERMISOS;
  protected readonly urlDeProduccion = `${URL_DE_PRODUCCION}/api/v1`;
  protected readonly urlDePruebas = `${URL_DE_PRUEBAS}/api/v1`;

  protected readonly iconos = { apreton: faHandshake, enlace: faLink };

  /**
   * El aviso solo se enseña en el navegador: forma parte de lo que ve quien llega, no del HTML que se
   * escribe al construir. Prerenderizarlo dejaría el aviso cacheado encima de la documentación para
   * todo el mundo, incluidos los buscadores.
   */
  protected readonly avisoVisible = signal(esNavegador());

  protected explicacion(clave: string): string {
    return soloLaExplicacion(this.t(clave));
  }
}
