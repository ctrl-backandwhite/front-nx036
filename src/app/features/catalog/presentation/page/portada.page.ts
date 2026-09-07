import { Component, computed, effect, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faBolt,
  faChartLine,
  faCubesStacked,
  faGlobe,
  faRocket,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { EtiquetasService } from '@core/seo/etiquetas.service';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PORTADA_PORT, TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { CIFRAS_DEL_SITIO_PORT } from '../../domain/port/cifras-del-sitio.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { FondoHero } from '../component/fondo-hero';
import { SeccionesPortada } from '../component/secciones-portada';
import { CartelPromociones } from '../component/cartel-promociones';
import { SeccionBoletin } from '../component/seccion-boletin';
import { BandaDePaises } from '../component/banda-de-paises';

/**
 * La portada de la tienda.
 *
 * <p>DECISIÓN DE PRODUCTO (4-sep-2026): del hero a las cifras institucionales, todo esto es
 * presentación de la EMPRESA y en el móvil se OCULTA. No es que estorbe estéticamente: ocupaba las
 * tres primeras pantallas. Quien entra desde el móvil llega a comprar, y antes tenía que pasar por el
 * titular, los sellos de confianza, dos tarjetas de propuesta de valor y cuatro cifras para ver el
 * primer producto. En una tienda, eso es la puerta cerrada. En el escritorio sí tiene sentido: hay
 * ancho de sobra, el primer producto se ve sin bajar y quien llega muchas veces está evaluando la
 * plataforma, no comprando.
 *
 * <p>Lo que el móvil conserva es lo que sirve para comprar: la promoción vigente, las hileras de
 * producto y las categorías. Registrarse y acceder siguen a un toque en la barra inferior.
 *
 * <p>La separación entre bloques también cambia con la pantalla: ochenta píxeles funcionan en
 * escritorio con las secciones de presentación de por medio; en el móvil, donde solo quedan las de
 * producto, ese hueco es media pantalla en blanco entre hilera e hilera y la tienda parece vacía.
 */
@Component({
  selector: 'nx-portada',
  imports: [
    RouterLink,
    FaIconComponent,
    FondoHero,
    SeccionesPortada,
    CartelPromociones,
    SeccionBoletin,
    BandaDePaises,
  ],
  template: `
    <div class="space-y-8 md:space-y-20">
      <section
        class="hidden md:flex hero relative isolate overflow-hidden w-screen ml-[calc(50%-50vw)]
               -mt-6 lg:-mt-10 -mb-20 px-4 lg:px-6 rounded-none"
      >
        <nx-fondo-hero />

        <div class="hero-content max-w-3xl mx-auto text-center flex-col py-16 lg:py-24">
          <div class="badge badge-outline gap-2 bg-base-100/70">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-success"></span>
            {{ pildora() }}
          </div>

          <h1 class="mt-5 text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight">
            {{ t('home.hero.title_pre') }}
            <span class="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              {{ t('home.hero.title_accent') }}
            </span>
          </h1>

          <p class="mt-5 text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">{{ cuerpo() }}</p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <!-- Con sesión, invitar a registrarse no tiene sentido: se lleva al catálogo. -->
            <a [routerLink]="sesion.haySesion() ? '/catalog' : '/register'" class="btn btn-primary">
              {{ sesion.haySesion() ? t('nav.catalog') : t('home.hero.cta_register') }}
              <fa-icon [icon]="iconos.flecha" />
            </a>
          </div>

          <div class="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] opacity-70">
            @for (sello of sellos; track sello.clave) {
              <span class="inline-flex items-center gap-1.5">
                <fa-icon [icon]="sello.icono" class="text-success" /> {{ t(sello.clave) }}
              </span>
            }
          </div>
        </div>
      </section>

      <!--
        Dos columnas y no tres: la tarjeta de «conecta tu tienda» se retiró de la portada (3-sep-2026)
        y con tres columnas quedaba un hueco a la derecha en vez de repartirse.

        Todo lo que sigue queda BAJO EL PLIEGUE. La portada se prerenderiza, así que su HTML llega ya
        pintado; con «hydrate on viewport» el código solo se descarga si de verdad se baja hasta aquí,
        y quien entra, mira el hero y se va no paga por nada de esto.
      -->
      @defer (on viewport; hydrate on viewport) {
        <section class="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (propuesta of propuestas(); track propuesta.clave) {
            <div class="card card-border bg-base-100" data-hover="true">
              <div class="card-body items-center text-center">
                <span class="kpi-icon" [class]="propuesta.tono" style="width: 3.25rem; height: 3.25rem">
                  <fa-icon [icon]="propuesta.icono" class="text-xl" />
                </span>
                <p class="mt-2 text-[14px] leading-relaxed">{{ propuesta.texto }}</p>
              </div>
            </div>
          }
        </section>
      } @placeholder {
        <div class="hidden md:block h-32"></div>
      }

      <!-- Las cifras son REALES: suben y bajan solas al publicar productos o activar idiomas. Los
           números escritos a mano contradecían lo que enseñaba el panel. -->
      @defer (on viewport; hydrate on viewport) {
        <section class="hidden md:block">
          <div class="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-100">
            @for (cifra of cifras(); track cifra.clave) {
              <div class="stat">
                <div class="stat-figure text-primary opacity-80">
                  <fa-icon [icon]="cifra.icono" class="text-2xl" />
                </div>
                <div class="stat-value text-3xl">{{ cifra.valor }}</div>
                <div class="stat-desc">{{ t(cifra.clave) }}</div>
              </div>
            }
          </div>
        </section>
      } @placeholder {
        <div class="hidden md:block h-24"></div>
      }

      <!--
        El cartel de rebajas va ANTES de las hileras: si hay promoción, es lo primero que se ve. Los
        dos bloques piden datos al servidor, así que diferirlos no solo ahorra código: ahorra las dos
        peticiones a quien no llega a bajar.
      -->
      @defer (on viewport; hydrate on viewport) {
        <nx-cartel-promociones />
      } @placeholder {
        <!-- Sin hueco reservado: el cartel puede no existir, y dejar un blanco fijo se vería como un
             fallo de maquetación en las portadas sin rebajas vigentes. -->
        <span></span>
      }

      @defer (on viewport; hydrate on viewport) {
        <nx-secciones-portada />
      } @placeholder {
        <div class="h-64"></div>
      }

      <!--
        El cierre de la portada, las dos secciones que le faltaban al porte.

        El BOLETÍN, en escritorio nada más: en el móvil el pie grande tampoco se pinta, y pedir un
        correo justo cuando alguien está deslizando productos con el pulgar interrumpe lo único que ha
        venido a hacer.

        La BANDA DE PAÍSES cuenta el alcance real del sitio. Va la última, como en el front anterior:
        es el remate, no un contenido que compita con los productos.

        Las dos van con los DOS disparadores. Con «hydrate on viewport» a secas quedarían invisibles
        para quien llega navegando desde otra pantalla, porque entonces no hay HTML prerenderizado que
        hidratar y nada dispara el bloque.
      -->
      @defer (on viewport; hydrate on viewport) {
        <div class="hidden md:block"><nx-seccion-boletin /></div>
      } @placeholder {
        <div class="hidden md:block h-64"></div>
      }

      @defer (on viewport; hydrate on viewport) {
        <div class="hidden md:block"><nx-banda-de-paises /></div>
      } @placeholder {
        <!-- Sin hueco reservado: si no hay cobertura la cinta no se pinta, y un blanco fijo al final de
             la portada se vería como un fallo de maquetación. -->
        <span></span>
      }
    </div>
  `,
})
export class PortadaPage {
  private readonly portada = inject(PORTADA_PORT);
  private readonly taxonomia = inject(TAXONOMIA_PORT);
  private readonly cifrasDelSitio = inject(CIFRAS_DEL_SITIO_PORT);
  private readonly traduccion = inject(TraduccionService);
  private readonly etiquetas = inject(EtiquetasService);

  protected readonly sesion = inject(SesionActual);
  protected readonly t = this.traduccion.t;

  protected readonly iconos = { flecha: faArrowRight };
  protected readonly sellos = [
    { icono: faShieldHalved, clave: 'home.hero.trust_verified' },
    { icono: faGlobe, clave: 'home.hero.trust_global' },
    { icono: faBolt, clave: 'home.hero.trust_fast' },
  ];

  /**
   * El total sale del endpoint PÚBLICO de secciones. Antes se pedía la primera página del listado solo
   * para leer su total y, desde que el listado exige cuenta, esa llamada devolvía 401: el interceptor
   * la tomaba por sesión caída y echaba a la pantalla de acceso a quien entraba sin registrarse.
   */
  private readonly resumen = resource({
    loader: async () => {
      const resultado = await this.portada.secciones(1);
      return resultado.ok ? resultado.valor : null;
    },
  });

  private readonly categorias = resource({
    loader: async () => {
      const resultado = await this.taxonomia.categoriasRaiz();
      return resultado.ok ? resultado.valor : [];
    },
  });

  /* Idiomas, divisas y almacenes. Nunca falla —el adaptador cae a los valores de respaldo— así que
   * la portada no tiene que decidir qué hacer si no llegan. */
  private readonly cifras_ = resource({
    loader: async () => {
      const resultado = await this.cifrasDelSitio.consulta();
      return resultado.ok ? resultado.valor : null;
    },
  });

  private readonly cuantosProductos = computed(() => this.resumen.value()?.totalDeProductos ?? 0);
  private readonly cuantasCategorias = computed(() => this.categorias.value()?.length ?? 0);

  protected readonly pildora = computed(() =>
    this.traduccion.tCon('home.hero.pill', {
      count: this.cuantosProductos() ? this.cuantosProductos().toLocaleString() : '…',
    }),
  );

  /**
   * El cuerpo del hero lleva los idiomas y las divisas dentro de la frase, y son los REALES.
   *
   * <p>Estaban escritos a mano —ocho y doce— y el doce llevaba tiempo siendo mentira: el panel
   * administra veinticinco divisas. Un número inventado en el escaparate es peor que no ponerlo,
   * porque nadie se entera de que ha dejado de ser cierto.
   */
  protected readonly cuerpo = computed(() =>
    this.traduccion.tCon('home.hero.body', {
      langs: String(this.cifras_.value()?.idiomas ?? 8),
      currencies: String(this.cifras_.value()?.divisas ?? 12),
    }),
  );

  protected readonly propuestas = computed(() => [
    { clave: 'home.feature.curated', icono: faRocket, tono: 'text-primary', texto: this.t('home.feature.curated') },
    {
      clave: 'home.feature.translate',
      icono: faGlobe,
      tono: 'text-secondary',
      texto: this.traduccion.tCon('home.feature.translate', {
        langCodes: 'es / en / pt / zh / fr / de / it / nl',
      }),
    },
  ]);

  /* Las CUATRO del front anterior. El porte enseñaba solo las dos primeras: faltaban los almacenes y
   * los idiomas, que son justo las que cuentan el alcance del sitio. */
  protected readonly cifras = computed(() => [
    {
      clave: 'home.stat.products',
      icono: faCubesStacked,
      valor: this.cuantosProductos() ? this.cuantosProductos().toLocaleString() : '…',
    },
    {
      clave: 'home.stat.categories',
      icono: faChartLine,
      valor: this.cuantasCategorias() ? String(this.cuantasCategorias()) : '…',
    },
    {
      clave: 'home.stat.warehouses',
      icono: faGlobe,
      valor: this.cifras_.value() ? String(this.cifras_.value()!.almacenes) : '…',
    },
    {
      clave: 'home.stat.languages',
      icono: faBolt,
      valor: this.cifras_.value() ? String(this.cifras_.value()!.idiomas) : '…',
    },
  ]);

  constructor() {
    // Saber quién mira es lo que enciende el corazón de cada tarjeta; sin ello la lista se pintaría
    // entera sin marcar. Lo resuelve el NÚCLEO: aquí no se gestiona identidad, solo se pregunta.
    void inject(RECUPERADOR_DE_SESION).asegura();

    /*
     * Las etiquetas para compartir de la PORTADA.
     *
     * <p>Faltaban, y es la página que más se comparte: el enlace del sitio a secas. Su HTML
     * prerenderizado salía con `<title>NX036</title>` a pelo, sin descripción ni foto, así que pegarlo
     * en WhatsApp o en LinkedIn daba una tarjeta con el nombre y nada más — mientras que cualquier
     * ficha de producto, que se comparte mucho menos, sí llevaba las suyas.
     *
     * <p>Va en un EFECTO y no en una llamada suelta porque el texto depende del idioma y de las cifras
     * reales del sitio, que llegan del servidor. Escrito una sola vez al montar, el enlace compartido
     * anunciaría «8 idiomas y 12 monedas» aunque haya veinticinco.
     */
    effect(() => {
      this.etiquetas.aplica({
        titulo: `${this.t('home.hero.title_pre')} ${this.t('home.hero.title_accent')}`,
        descripcion: this.cuerpo(),
        ruta: '/',
        tipo: 'website',
      });
    });
  }
}
