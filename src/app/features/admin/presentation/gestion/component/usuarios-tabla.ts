import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faKey,
  faLock,
  faLockOpen,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import {
  UsuarioGestionado,
  estaBloqueado,
  fechaDeReferencia,
} from '../../../domain/gestion/model/usuarios';

/** Lo que se puede pedir sobre UNA cuenta desde su fila. */
export type AccionSobreUsuario = 'activa' | 'bloquea' | 'desbloquea' | 'reinicia' | 'edita' | 'borra';

export interface PeticionSobreUsuario {
  readonly usuario: UsuarioGestionado;
  readonly accion: AccionSobreUsuario;
}

export interface CambioDeRol {
  readonly usuario: UsuarioGestionado;
  readonly rol: string;
}

/**
 * La tabla de cuentas del panel.
 *
 * <p>Solo PINTA y avisa: no llama a ningún caso de uso ni decide si una acción se puede hacer. Quien
 * confirma y quien manda es la página; así esta pieza se puede probar sin montar medio contexto.
 *
 * <p>El BLOQUEO se calcula con la fecha, no con «tiene valor el campo»: la marca se queda escrita cuando
 * caduca, y comprobar solo su presencia pintaba como bloqueada una cuenta que dejó de estarlo hace un
 * mes. La regla vive en el dominio (`estaBloqueado`) porque no es cosa de la tabla.
 *
 * <p>El PAÍS que se enseña es el de REGISTRO, que es el que decide el margen del comprador; nunca el de
 * envío. Son dos datos distintos y confundirlos cambia lo que se le cobra a un cliente.
 *
 * <p>MOBILE FIRST: la tabla se desplaza dentro de su propia caja (`overflow-x-auto`), de modo que en una
 * pantalla estrecha se lee arrastrando y la página no se descuadra a lo ancho.
 */
@Component({
  selector: 'nx-usuarios-tabla',
  imports: [FaIconComponent],
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
            <tr>
              <th class="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  [checked]="todosMarcados()"
                  (change)="alternaTodos.emit()"
                  [attr.aria-label]="t('admin.categories.select_all')"
                />
              </th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.email') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.name') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.role') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.country') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.status') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.users.col.created') }}</th>
              <th class="px-4 py-2 font-medium w-72">{{ t('admin.users.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (usuario of usuarios(); track usuario.id) {
              <!-- Las clases van en UNA cadena: bg-brand-50/40 y hover:bg-ink-50/50 llevan barra y
                   dos puntos, y una asociacion [class.nombre] no admite esos caracteres. -->
              <tr [class]="clasesDeFila(usuario)">
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="marcados().has(usuario.id)"
                    (change)="alterna.emit(usuario.id)"
                    [attr.aria-label]="usuario.email"
                  />
                </td>
                <td class="px-4 py-2 text-[12px] font-mono">{{ usuario.email }}</td>
                <td class="px-4 py-2 text-[12px]">{{ usuario.nombreVisible ?? '—' }}</td>
                <td class="px-4 py-2">
                  <select
                    [value]="usuario.rol"
                    (change)="eligeRol(usuario, $event)"
                    [attr.aria-label]="t('admin.users.col.role') + ' · ' + usuario.email"
                    class="border border-ink-200 rounded px-2 py-1 text-[11px] hover:border-ink-300 focus:border-brand-500 focus:outline-none"
                  >
                    @for (opcion of roles(); track opcion.value) {
                      <option [value]="opcion.value">{{ opcion.label }}</option>
                    }
                  </select>
                </td>
                <td class="px-4 py-2 text-[12px] text-ink-500">{{ usuario.pais ?? '—' }}</td>
                <td class="px-4 py-2">
                  <span
                    class="badge"
                    [class.bg-emerald-100]="usuario.activo"
                    [class.text-emerald-700]="usuario.activo"
                    [class.bg-amber-100]="!usuario.activo"
                    [class.text-amber-700]="!usuario.activo"
                  >
                    {{ usuario.activo ? t('admin.users.active') : t('admin.users.inactive') }}
                  </span>
                  @if (bloqueado(usuario)) {
                    <span class="ml-1 badge bg-red-100 text-red-700">
                      {{ t('admin.users.locked') }}
                    </span>
                  }
                </td>
                <td class="px-4 py-2 text-[12px] text-ink-500">{{ fecha(usuario) }}</td>
                <td class="px-4 py-2">
                  <div class="flex flex-wrap gap-1">
                    @if (!usuario.activo) {
                      <button
                        type="button"
                        (click)="pide.emit({ usuario, accion: 'activa' })"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.users.actions.activate')"
                        [attr.aria-label]="t('admin.users.actions.activate') + ' · ' + usuario.email"
                      >
                        <fa-icon [icon]="iconos.activa" />
                      </button>
                    }
                    @if (bloqueado(usuario)) {
                      <button
                        type="button"
                        (click)="pide.emit({ usuario, accion: 'desbloquea' })"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.users.actions.unlock')"
                        [attr.aria-label]="t('admin.users.actions.unlock') + ' · ' + usuario.email"
                      >
                        <fa-icon [icon]="iconos.desbloquea" />
                      </button>
                    } @else {
                      <button
                        type="button"
                        (click)="pide.emit({ usuario, accion: 'bloquea' })"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.users.actions.lock')"
                        [attr.aria-label]="t('admin.users.actions.lock') + ' · ' + usuario.email"
                      >
                        <fa-icon [icon]="iconos.bloquea" />
                      </button>
                    }
                    <button
                      type="button"
                      (click)="pide.emit({ usuario, accion: 'reinicia' })"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.users.actions.reset')"
                      [attr.aria-label]="t('admin.users.actions.reset') + ' · ' + usuario.email"
                    >
                      <fa-icon [icon]="iconos.reinicia" />
                    </button>
                    <button
                      type="button"
                      (click)="pide.emit({ usuario, accion: 'edita' })"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.users.actions.edit')"
                      [attr.aria-label]="t('admin.users.actions.edit') + ' · ' + usuario.email"
                    >
                      <fa-icon [icon]="iconos.edita" />
                    </button>
                    <button
                      type="button"
                      (click)="pide.emit({ usuario, accion: 'borra' })"
                      class="btn btn-outline btn-square text-[11px] hover:border-red-300 hover:text-red-700"
                      [title]="t('admin.users.actions.delete')"
                      [attr.aria-label]="t('admin.users.actions.delete') + ' · ' + usuario.email"
                    >
                      <fa-icon [icon]="iconos.borra" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                  {{ t('filters.no_results') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UsuariosTabla {
  readonly usuarios = input<readonly UsuarioGestionado[]>([]);
  readonly marcados = input<ReadonlySet<string>>(new Set<string>());
  readonly roles = input<readonly OpcionFiltro[]>([]);

  readonly alterna = output<string>();
  readonly alternaTodos = output<void>();
  readonly pide = output<PeticionSobreUsuario>();
  readonly cambiaRol = output<CambioDeRol>();

  protected readonly iconos = {
    activa: faCircleCheck,
    bloquea: faLock,
    desbloquea: faLockOpen,
    reinicia: faKey,
    edita: faPen,
    borra: faTrash,
  };

  protected readonly t = inject(TraduccionService).t;

  /**
   * Una página vacía NO cuenta como «todas marcadas»: dejaría la casilla de la cabecera activada sin
   * ninguna fila debajo, que es la forma más rápida de que alguien crea que tiene selección.
   */
  protected readonly todosMarcados = computed(() => {
    const marcados = this.marcados();
    const filas = this.usuarios();
    return filas.length > 0 && filas.every((u) => marcados.has(u.id));
  });

  protected clasesDeFila(usuario: UsuarioGestionado): string {
    const base = 'border-t border-ink-100 hover:bg-ink-50/50';
    return this.marcados().has(usuario.id) ? `${base} bg-brand-50/40` : base;
  }

  protected bloqueado(usuario: UsuarioGestionado): boolean {
    return estaBloqueado(usuario);
  }

  protected fecha(usuario: UsuarioGestionado): string {
    const cuando = fechaDeReferencia(usuario);
    return cuando ? new Date(cuando).toLocaleDateString() : '—';
  }

  /**
   * El desplegable no cambia el papel por sí solo: avisa a la página, que pide confirmación antes.
   * Ascender a administrador por un clic accidental en una lista de veinticinco filas no puede pasar.
   */
  protected eligeRol(usuario: UsuarioGestionado, evento: Event): void {
    const elegido = (evento.target as HTMLSelectElement).value;
    if (elegido !== usuario.rol) {
      this.cambiaRol.emit({ usuario, rol: elegido });
    }
  }
}
