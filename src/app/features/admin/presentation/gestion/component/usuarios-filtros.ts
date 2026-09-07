import { Component, computed, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroDesplegable, OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';

/**
 * Los filtros del listado de cuentas.
 *
 * <p>Los tres criterios son los que entiende el SERVIDOR —papel, país y texto—; aquí no se recorta nada
 * en local, porque la página que se está mirando es solo una de muchas y filtrarla daría un resultado
 * que depende de por dónde ibas.
 *
 * <p>El filtro de PAÍS solo aparece si hay países que ofrecer: un desplegable con la única opción
 * «Todos» ocupa sitio y no hace nada.
 *
 * <p>MOBILE FIRST: la barra los pliega sola en pantalla estrecha; aquí solo se colocan.
 */
@Component({
  selector: 'nx-usuarios-filtros',
  imports: [BarraFiltros, FiltroDesplegable, CampoBusqueda],
  template: `
    <nx-barra-filtros [activos]="cuantos()" [hayActivos]="cuantos() > 0" (limpia)="limpia()">
      <nx-campo-busqueda
        [(valor)]="texto"
        [marcador]="t('admin.users.search_placeholder')"
        clase="min-w-[280px]"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('filters.role')"
        [(valor)]="rol"
        [opciones]="roles()"
        [marcador]="t('filters.all')"
      />
      @if (paises().length > 0) {
        <nx-filtro-desplegable
          [etiqueta]="t('filters.country')"
          [(valor)]="pais"
          [opciones]="paises()"
          [marcador]="t('filters.all')"
        />
      }
      <span class="text-[11px] text-ink-400 ml-auto">
        {{ t('pagination.showing') }} <strong>{{ visibles() }}</strong> / {{ total() }}
      </span>
    </nx-barra-filtros>
  `,
})
export class UsuariosFiltros {
  readonly texto = model('');
  readonly rol = model<string | null>(null);
  readonly pais = model<string | null>(null);

  readonly roles = input<readonly OpcionDeFiltro[]>([]);
  readonly paises = input<readonly OpcionDeFiltro[]>([]);
  readonly visibles = input(0);
  readonly total = input(0);

  protected readonly t = inject(TraduccionService).t;

  protected readonly cuantos = computed(
    () => [this.texto(), this.rol(), this.pais()].filter(Boolean).length,
  );

  protected limpia(): void {
    this.texto.set('');
    this.rol.set(null);
    this.pais.set(null);
  }
}
