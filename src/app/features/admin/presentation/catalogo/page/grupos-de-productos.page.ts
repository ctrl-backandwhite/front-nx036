import { Component, inject, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPen, faPlus, faTrash, faUsers, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  EliminaGrupoDeProductos,
  GuardaGrupoDeProductos,
  ListaGruposDeProductos,
} from '../../../application/catalogo/use-case/administra-grupos-de-productos.use-case';
import {
  BORRADOR_DE_GRUPO_VACIO,
  BorradorDeGrupo,
  GrupoDeProductos,
} from '../../../domain/catalogo/model/grupo-de-productos';
import { DialogoGrupo } from '../component/dialogo-grupo';
import { DialogoMiembrosDeGrupo } from '../component/dialogo-miembros-de-grupo';
import { mensajeDeError } from '../etiquetas';

/**
 * Los grupos de productos.
 *
 * <p>Son el ámbito `PRODUCT_GROUP` de las reglas de MARGEN: de a qué grupo pertenece un producto depende
 * con qué margen se vende. Por eso el backend se niega a borrar un grupo que una regla siga usando, y
 * por eso esa negativa se enseña: sin ella, la fila seguía en su sitio y se volvía a pulsar creyendo
 * que el clic no había entrado.
 */
@Component({
  selector: 'nx-admin-grupos-de-productos',
  imports: [FaIconComponent, DialogoGrupo, DialogoMiembrosDeGrupo],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('admin.groups.title') }}</h1>
          <p class="text-ink-500 text-sm">{{ t('admin.groups.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" (click)="abre(null)">
          <fa-icon [icon]="iconos.mas" /> {{ t('admin.groups.new') }}
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2">{{ t('admin.groups.col.name') }}</th>
                <th class="px-4 py-2">{{ t('admin.groups.col.description') }}</th>
                <th class="px-4 py-2 text-center">{{ t('admin.groups.col.members') }}</th>
                <th class="px-4 py-2 text-center">{{ t('admin.groups.col.active') }}</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (grupo of grupos.value(); track grupo.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2 font-medium">{{ grupo.nombre }}</td>
                  <td class="px-4 py-2 text-ink-500 text-[12px]">{{ grupo.descripcion || '—' }}</td>
                  <td class="px-4 py-2 text-center">{{ grupo.numeroDeMiembros }}</td>
                  <td class="px-4 py-2 text-center">
                    <fa-icon
                      [icon]="grupo.activo ? iconos.si : iconos.no"
                      [class.text-success]="grupo.activo"
                      [class.text-ink-400]="!grupo.activo"
                    />
                  </td>
                  <td class="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square"
                      [title]="t('admin.groups.manage_members')"
                      [attr.aria-label]="t('admin.groups.manage_members')"
                      (click)="miembrosDe.set(grupo)"
                    >
                      <fa-icon [icon]="iconos.miembros" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square"
                      [title]="t('actions.edit')"
                      [attr.aria-label]="t('actions.edit')"
                      (click)="abre(grupo)"
                    >
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs btn-square text-error"
                      [title]="t('actions.delete')"
                      [attr.aria-label]="t('actions.delete')"
                      (click)="borra(grupo)"
                    >
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </td>
                </tr>
              }
              @if (grupos.value().length === 0) {
                <tr>
                  <td colspan="5" class="px-4 py-6 text-center text-ink-400 text-[12px]">
                    {{ t('admin.groups.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (formularioAbierto()) {
        <nx-dialogo-grupo
          [inicial]="borrador()"
          [guardando]="guardando()"
          (cierra)="formularioAbierto.set(false)"
          (guarda)="guarda($event)"
        />
      }
      @if (miembrosDe(); as grupo) {
        <nx-dialogo-miembros-de-grupo [grupo]="grupo" (cierra)="cierraMiembros()" />
      }
    </div>
  `,
})
export class GruposDeProductosPage {
  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly dialogos = inject(DialogoStore);
  private readonly lista = inject(ListaGruposDeProductos);
  private readonly guardaGrupo = inject(GuardaGrupoDeProductos);
  private readonly eliminaGrupo = inject(EliminaGrupoDeProductos);

  protected readonly iconos = {
    mas: faPlus,
    editar: faPen,
    borrar: faTrash,
    miembros: faUsers,
    si: faCheck,
    no: faXmark,
  };

  protected readonly formularioAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly borrador = signal<BorradorDeGrupo>(BORRADOR_DE_GRUPO_VACIO);
  protected readonly miembrosDe = signal<GrupoDeProductos | null>(null);

  protected readonly grupos = resource({
    loader: async () => {
      const resultado = await this.lista.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  protected abre(grupo: GrupoDeProductos | null): void {
    this.borrador.set(
      grupo
        ? {
            id: grupo.id,
            nombre: grupo.nombre,
            descripcion: grupo.descripcion ?? '',
            activo: grupo.activo,
          }
        : BORRADOR_DE_GRUPO_VACIO,
    );
    this.formularioAbierto.set(true);
  }

  protected async guarda(borrador: BorradorDeGrupo): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardaGrupo.ejecuta(borrador);
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.groups.name_required'));
        return;
      }
      this.formularioAbierto.set(false);
      this.grupos.reload();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async borra(grupo: GrupoDeProductos): Promise<void> {
    if (!(await this.dialogos.confirma(this.t('admin.groups.delete_confirm')))) {
      return;
    }
    const resultado = await this.eliminaGrupo.ejecuta(grupo.id);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'common.error'));
      return;
    }
    this.grupos.reload();
  }

  /** Al cerrar la gestión de miembros se recarga: el recuento de la tabla ha cambiado. */
  protected cierraMiembros(): void {
    this.miembrosDe.set(null);
    this.grupos.reload();
  }
}
