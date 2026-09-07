import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AlternaFavorito } from '../../application/use-case/alterna-favorito.use-case';
import { ListaFavoritos } from '../../application/use-case/lista-guardados.use-case';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { CuadriculaProductos } from '../component/cuadricula-productos';
import { Paginador } from '../component/paginador';

/**
 * «Mis favoritos»: lo que el comprador ha marcado con el corazón.
 *
 * <p>Mismo canal de precios que el catálogo —el backend manda los importes ya formateados—. El idioma
 * y la MONEDA entran en la lectura para que al cambiarlos la lista se vuelva a pedir: sin eso, los
 * precios se quedaban en la divisa anterior hasta recargar.
 */
@Component({
  selector: 'nx-favoritos',
  imports: [RouterLink, FaIconComponent, CuadriculaProductos, Paginador],
  template: `
    <div class="space-y-5">
      <header>
        <h1 class="flex items-center gap-2">
          <fa-icon [icon]="iconoCorazon" class="text-red-500" />
          {{ t('favorites.title') }}
        </h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('favorites.subtitle') }}</p>
      </header>

      <nx-cuadricula-productos
        [productos]="productos()"
        [cargando]="lista.isLoading()"
        claveDeVacio="favorites.empty"
      >
        <a vacio routerLink="/catalog" class="btn btn-primary mt-4 text-sm">
          {{ t('favorites.browse') }}
        </a>
      </nx-cuadricula-productos>

      <nx-paginador [(pagina)]="pagina" [totalDePaginas]="totalDePaginas()" />
    </div>
  `,
})
export class FavoritosPage {
  private readonly casoDeUso = inject(ListaFavoritos);
  private readonly favoritos = inject(AlternaFavorito);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoCorazon = faHeart;
  protected readonly pagina = signal(0);

  /**
   * La lectura depende de la página, el idioma y la moneda: los tres entran en la petición, así que al
   * cambiar cualquiera se vuelve a pedir sola.
   */
  protected readonly lista = resource({
    params: () => ({
      pagina: this.pagina(),
      idioma: this.preferencias.idioma(),
      moneda: this.preferencias.moneda(),
    }),
    loader: async ({ params }) => {
      const resultado = await this.casoDeUso.ejecuta(params.pagina);
      return resultado.ok ? resultado.valor : null;
    },
  });

  protected readonly productos = () => this.lista.value()?.items ?? [];
  protected readonly totalDePaginas = () => Math.max(1, this.lista.value()?.totalDePaginas ?? 1);

  constructor() {
    /* Saber quién mira es lo que enciende el corazón de cada tarjeta; sin ello la lista se pintaría
     * entera SIN marcar. La sesión la resuelve el núcleo —aquí no se gestiona identidad, solo se
     * pregunta— y con ella resuelta ya se pueden traer los identificadores.
     *
     * <p>Traerlos no es adorno. El caso de uso decide entre marcar y desmarcar mirando ese conjunto, así
     * que con él vacío TODO parece sin marcar y el corazón de esta pantalla —donde por definición todo
     * está marcado— volvía a AÑADIR lo que ya estaba en vez de quitarlo: desde «Mis favoritos» no había
     * forma de sacar nada de la lista. */
    void inject(RECUPERADOR_DE_SESION)
      .asegura()
      .then(() => this.favoritos.carga());
  }
}
