import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import {
  BuscaProductosParaGrupo,
  CambiaMiembrosDelGrupo,
  ListaMiembrosDelGrupo,
} from '../../../application/catalogo/use-case/administra-grupos-de-productos.use-case';
import {
  GrupoDeProductos,
  MiembroDeGrupo,
  candidatosAMiembro,
} from '../../../domain/catalogo/model/grupo-de-productos';
import { mensajeDeError } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/**
 * Quién está dentro de un grupo de productos.
 *
 * <p>Importa más de lo que parece: el grupo es un ámbito de las reglas de MARGEN, así que un producto
 * que se queda fuera se vende con el margen genérico y la diferencia solo aparece al cuadrar el mes.
 * Por eso todo fallo se avisa en vez de tragarse.
 */
@Component({
  selector: 'nx-dialogo-miembros-de-grupo',
  imports: [FaIconComponent, CampoBusqueda, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" ancho="sm:max-w-lg" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <div>
          <label class="text-[12px] font-medium text-ink-600 mb-1 block" for="buscar-producto">
            {{ t('admin.groups.add_product') }}
          </label>
          <nx-campo-busqueda
            [valor]="texto()"
            (valorChange)="texto.set($event)"
            [marcador]="t('admin.groups.search_product')"
            clase="w-full"
          />
          @if (texto() && candidatos().length > 0) {
            <div class="mt-1 max-h-40 overflow-y-auto border border-ink-100 rounded-md divide-y divide-ink-100">
              @for (candidato of candidatos(); track candidato.id) {
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-[12px] hover:bg-ink-50 flex items-center gap-2"
                  (click)="anade(candidato)"
                >
                  <fa-icon [icon]="iconos.mas" class="text-ink-400" /> {{ candidato.titulo }}
                </button>
              }
            </div>
          }
        </div>

        <div>
          <div class="text-[12px] font-medium text-ink-600 mb-1">
            {{ t('admin.groups.col.members') }} ({{ miembros.value().length }})
          </div>
          @if (miembros.value().length === 0) {
            <div class="text-[12px] text-ink-400 text-center py-4">
              {{ t('admin.groups.no_members') }}
            </div>
          } @else {
            <div class="space-y-1">
              @for (miembro of miembros.value(); track miembro.id) {
                <div class="flex items-center gap-2 text-[12px] bg-ink-50 rounded-md px-2 py-1">
                  <span class="flex-1 truncate">{{ miembro.titulo }}</span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error"
                    [title]="t('actions.delete')"
                    [attr.aria-label]="t('actions.delete')"
                    (click)="quita(miembro)"
                  >
                    <fa-icon [icon]="iconos.borrar" />
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoMiembrosDeGrupo {
  readonly grupo = input.required<GrupoDeProductos>();
  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly lista = inject(ListaMiembrosDelGrupo);
  private readonly busca = inject(BuscaProductosParaGrupo);
  private readonly cambia = inject(CambiaMiembrosDelGrupo);

  protected readonly iconos = { mas: faPlus, borrar: faTrash };
  protected readonly texto = signal('');

  protected readonly miembros = resource({
    params: () => this.grupo().id,
    loader: async ({ params }) => {
      const resultado = await this.lista.ejecuta(params);
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  private readonly encontrados = resource({
    params: () => this.texto(),
    loader: async ({ params }) => {
      if (!params) {
        return [];
      }
      const resultado = await this.busca.ejecuta(params);
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  /** Los candidatos son los encontrados que todavía no son miembros. */
  protected readonly candidatos = computed(() =>
    candidatosAMiembro(this.encontrados.value(), this.miembros.value()),
  );

  protected titulo(): string {
    return this.tCon('admin.groups.members_of', { name: this.grupo().nombre });
  }

  protected anade(candidato: MiembroDeGrupo): void {
    void this.mueve(candidato.id, true);
  }

  protected quita(miembro: MiembroDeGrupo): void {
    void this.mueve(miembro.id, false);
  }

  private async mueve(productoId: string, dentro: boolean): Promise<void> {
    const resultado = await this.cambia.ejecuta(this.grupo().id, productoId, dentro);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'common.error'));
      return;
    }
    this.miembros.reload();
  }
}
