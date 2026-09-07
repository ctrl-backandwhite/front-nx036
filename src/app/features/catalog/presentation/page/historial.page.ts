import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AlternaFavorito } from '../../application/use-case/alterna-favorito.use-case';
import { ListaHistorial } from '../../application/use-case/lista-guardados.use-case';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { CuadriculaProductos } from '../component/cuadricula-productos';
import { Paginador } from '../component/paginador';

/**
 * «Lo que has visto»: las fichas por las que ha pasado el comprador, de la más reciente a la más
 * antigua, con el mismo canal de precios que el catálogo.
 */
@Component({
  selector: 'nx-historial',
  imports: [RouterLink, FaIconComponent, CuadriculaProductos, Paginador],
  template: `
    <div class="space-y-5">
      <header>
        <h1 class="flex items-center gap-2">
          <fa-icon [icon]="iconoReloj" class="text-brand-600" />
          {{ t('history.title') }}
        </h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('history.subtitle') }}</p>
      </header>

      <nx-cuadricula-productos
        [productos]="productos()"
        [cargando]="lista.isLoading()"
        claveDeVacio="history.empty"
      >
        <a vacio routerLink="/catalog" class="btn btn-primary mt-4 text-sm">
          {{ t('history.browse') }}
        </a>
      </nx-cuadricula-productos>

      <nx-paginador [(pagina)]="pagina" [totalDePaginas]="totalDePaginas()" />

      <!--
        La retención es una promesa que se le hace al comprador en las condiciones: se le repite donde
        está mirando el dato, no solo en el documento legal.
      -->
      <p class="text-xs text-ink-400 text-center">{{ t('history.retention') }}</p>
    </div>
  `,
})
export class HistorialPage {
  private readonly casoDeUso = inject(ListaHistorial);
  private readonly favoritos = inject(AlternaFavorito);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoReloj = faClockRotateLeft;
  protected readonly pagina = signal(0);

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
    /* Mismo caso que «Mis favoritos»: sin los identificadores traídos, el corazón sale apagado sobre
     * productos que SÍ están marcados y al pulsarlo se vuelve a añadir lo que ya estaba. */
    void inject(RECUPERADOR_DE_SESION)
      .asegura()
      .then(() => this.favoritos.carga());
  }
}
