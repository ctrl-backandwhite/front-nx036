import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRight,
  faFire,
  faTrophy,
  faVideo,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { Revela } from '@ds/component/movimiento/revela';
import { ContenidoNoDisponible } from '@core/error/contenido-no-disponible';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { EsqueletoTarjetaProducto } from '@ds/component/marcador/esqueleto-tarjeta-producto';
import { PORTADA_PORT } from '../../domain/port/catalogo.port';
import { TarjetaProducto } from './tarjeta-producto';
import { HileraDeslizable } from './hilera-deslizable';

/** Cuántos productos por hilera. Seis = una fila justa en escritorio. */
const POR_SECCION = 6;

/**
 * Escalón entre una hilera y la siguiente, en milisegundos.
 *
 * <p>Corto a propósito: lo justo para que se vean entrar una detrás de otra y no todas de golpe. Más
 * de un par de décimas y la última tarda tanto que parece que la página se ha quedado a medias.
 */
const RETARDO_ENTRE_HILERAS = 80;

const ICONO: Record<string, IconDefinition> = {
  trending: faFire,
  newest: faWandMagicSparkles,
  video: faVideo,
  top_selling: faTrophy,
};

const CLAVE: Record<string, string> = {
  trending: 'catalog.home.trending',
  newest: 'catalog.home.newest',
  video: 'catalog.home.video',
  top_selling: 'catalog.home.top_selling',
};

/**
 * Colores del círculo de cada categoría en el móvil.
 *
 * <p>Se reparten por POSICIÓN y no por nombre a propósito: así dos categorías contiguas nunca salen
 * del mismo color, que es lo que hace que la fila se lea de un vistazo. Un reparto por el nombre
 * repartiría mejor en teoría, pero deja parejas iguales pegadas.
 */
const TONOS = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
];

/**
 * Las hileras de producto y las categorías destacadas de la portada.
 *
 * <p>La portada pública es solo un ANTICIPO: una hilera por apartado. El catálogo completo exige
 * cuenta, y por eso «ver todos» lleva al listado.
 *
 * <p>En el móvil las categorías van PRIMERO (`order-first`): no son un cierre, son un punto de
 * partida. Quien entra buscando zapatillas no quiere deslizar cuatro hileras de novedades hasta el
 * final para encontrar por dónde entrar. En el escritorio el problema no existe —las secciones se
 * abarcan de un vistazo— y allí no se cambia el orden.
 */
@Component({
  /*
   * El anfitrión es BLOQUE, y no es cosmética.
   *
   * <p>Un elemento personalizado nace «display: inline», y una caja en línea no ocupa la altura de su
   * contenido: mide lo que la línea de texto. La portada separa sus bloques con `space-y`, que pone
   * `margin-top` al hermano siguiente — y ese margen se mide contra la caja en línea, no contra lo que
   * se ve. Resultado medido: CERO píxeles entre la fila de categorías destacadas y el boletín, pegados
   * el uno al otro, sin que ninguna regla de espaciado estuviera mal escrita.
   *
   * <p>Es el mismo defecto que ya apareció en la barra de filtros y en la cuadrícula del catálogo. Si
   * un componente propio va a ser hijo directo de un contenedor que reparte espacio con `space-y` o con
   * márgenes verticales, necesita esta línea.
   */
  host: { class: 'block' },
  selector: 'nx-secciones-portada',
  imports: [
    RouterLink,
    FaIconComponent,
    TarjetaProducto,
    HileraDeslizable,
    EsqueletoTarjetaProducto,
    ContenidoNoDisponible,
    Revela,
  ],
  template: `
    @if (portada.isLoading()) {
      <div class="space-y-10" aria-busy="true">
        @for (fila of [0, 1, 2]; track fila) {
          <section>
            <div class="skeleton h-6 w-40 mb-3"></div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              @for (hueco of huecos; track hueco) {
                <nx-esqueleto-tarjeta-producto />
              }
            </div>
          </section>
        }
      </div>
    } @else if (datos(); as datos) {
      <div class="flex flex-col gap-10">
        <!--
          Cada hilera entra al llegar a ella, escalonada por su posición: es lo que hace que bajar por la
          portada no sea una pared de tarjetas ya puestas. Se anima UNA vez y solo hacia abajo —repetir la
          entrada al subir marea— y respeta sola la preferencia de movimiento reducido del sistema.
        -->
        @for (seccion of datos.secciones; track seccion.codigo; let fila = $index) {
          @if (seccion.items.length > 0) {
            <nx-revela [retardo]="fila * RETARDO_ENTRE_HILERAS">
            <section>
              <header class="flex items-baseline justify-between mb-3">
                <h2 class="flex items-center gap-2 text-xl">
                  <fa-icon [icon]="icono(seccion.codigo)" class="text-brand-500 text-[16px]" />
                  {{ t(clave(seccion.codigo)) }}
                </h2>
                <a
                  [routerLink]="['/catalog']"
                  [queryParams]="destinoDeSeccion(seccion.codigo)"
                  class="text-[12px] text-brand-700 hover:underline"
                >
                  {{ t('catalog.home.see_all') }}
                  <fa-icon [icon]="iconoFlecha" class="text-[10px]" />
                </a>
              </header>
              <nx-hilera-deslizable>
                @for (producto of seccion.items.slice(0, porSeccion); track producto.id) {
                  <nx-tarjeta-producto [producto]="producto" />
                }
              </nx-hilera-deslizable>
            </section>
            </nx-revela>
          }
        }

        <!--
          Sin categorías no se pinta el encabezado: un título sobre una fila vacía deja un hueco roto en
          la portada, que es lo que se ve en un catálogo recién montado.
        -->
        @if (datos.categoriasDestacadas.length > 0) {
          <section class="order-first md:order-none">
            <h2 class="text-xl mb-3">{{ t('catalog.home.hot_categories') }}</h2>
            <!--
              No hay foto de categoría —el backend no la trae y todas comparten icono genérico—, así que
              la distinción visual la da un círculo de color con la inicial. Es el recurso de las
              aplicaciones cuando no hay imagen: reconocible de un vistazo y sin inventarse una foto.
            -->
            <!--
              En escritorio la fila va DENTRO de una caja; en móvil no.
              Las demás secciones de la portada tienen cuerpo porque sus tarjetas de producto lo dan.
              Ésta son ocho textos sueltos sobre el fondo de la página: sin nada que la encierre no se
              lee como un bloque, se lee como si se hubiera caído ahí. La caja es la misma superficie
              que el resto —borde fino y fondo base—, no una decoración nueva.

              El contenedor arranca en «md:» a propósito: en móvil la fila se desplaza a sangre, con
              márgenes negativos que la sacan del ancho de la página, y meterla en una caja con relleno
              cortaría ese desbordamiento y dejaría la última categoría partida contra el borde.
            -->
            <div
              class="flex snap-x overflow-x-auto gap-3 -mx-4 px-4 pb-1
                     md:grid md:grid-cols-4 lg:grid-cols-8 md:gap-3 md:overflow-visible md:mx-0
                     md:rounded-xl md:bg-primary md:px-3 md:py-3"
            >
              @for (categoria of datos.categoriasDestacadas; track categoria.id; let i = $index) {
                <a
                  [routerLink]="['/catalog']"
                  [queryParams]="{ categoryId: categoria.id }"
                  class="flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 text-center
                         md:card md:w-auto md:shrink md:px-4 md:py-3 md:border-transparent
                         md:hover:bg-primary-content/15 md:transition-colors md:p-4"
                >
                  <span
                    aria-hidden="true"
                    [class]="tono(i)"
                    class="flex h-14 w-14 items-center justify-center rounded-full text-[17px]
                           font-semibold text-white md:hidden"
                  >
                    {{ inicial(categoria.nombre) }}
                  </span>
                  <span
                    class="text-[11px] font-medium leading-tight text-ink-900 line-clamp-2
                           md:text-[13px] md:line-clamp-1 md:text-primary-content"
                    >{{ categoria.nombre }}</span
                  >
                  <span class="hidden text-[11px] text-ink-500 md:block md:mt-1 md:text-primary-content/70">
                    {{ categoria.cuantosProductos }}
                  </span>
                </a>
              }
            </div>
          </section>
        }
      </div>
    } @else {
      <!--
        Ni cargando ni con datos: la petición falló. Antes no se pintaba NADA, así que la portada salía
        sin hileras y con el resto del marco intacto — indistinguible de un catálogo recién montado que
        todavía no tiene productos. Aquí se dice lo que pasa y se ofrece reintentar SOLO este bloque,
        que es mucho mejor que recargar la página entera.
      -->
      <nx-contenido-no-disponible (reintentado)="portada.reload()" />
    }
  `,
})
export class SeccionesPortada {
  private readonly puerto = inject(PORTADA_PORT);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoFlecha = faArrowRight;
  protected readonly porSeccion = POR_SECCION;
  protected readonly huecos = Array.from({ length: POR_SECCION }, (_, i) => i);
  protected readonly RETARDO_ENTRE_HILERAS = RETARDO_ENTRE_HILERAS;

  /**
   * El idioma y la MONEDA entran en la petición: al cambiar cualquiera de los dos, las hileras se
   * vuelven a pedir. La moneda hace falta porque cada tarjeta trae su precio ya calculado por el
   * backend; sin ella la portada se quedaba con los importes de la divisa anterior.
   */
  protected readonly portada = resource({
    params: () => ({ idioma: this.preferencias.idioma(), moneda: this.preferencias.moneda() }),
    loader: async () => {
      const resultado = await this.puerto.secciones(POR_SECCION);
      // Una portada que no carga no puede romper la página: se pinta lo que haya y ya está.
      return resultado.ok ? resultado.valor : null;
    },
  });

  protected readonly datos = computed(() => this.portada.value() ?? null);

  protected icono(codigo: string) {
    return ICONO[codigo] ?? faFire;
  }

  protected clave(codigo: string): string {
    return CLAVE[codigo] ?? '';
  }

  protected tono(indice: number): string {
    return TONOS[indice % TONOS.length];
  }

  protected inicial(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase();
  }

  /** «Ver todos» lleva al listado con el mismo criterio que ordena esa hilera. */
  protected destinoDeSeccion(codigo: string): Record<string, string> {
    if (codigo === 'video') {
      return { hasVideo: '1' };
    }
    const orden = codigo === 'top_selling' ? 'sales' : codigo === 'newest' ? 'newest' : 'trending';
    return { sort: orden };
  }
}
