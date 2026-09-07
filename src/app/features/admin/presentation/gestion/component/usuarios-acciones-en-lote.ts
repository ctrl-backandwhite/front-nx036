import { Component, inject, input, model, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faLock,
  faLockOpen,
  faTrash,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { AccionEnLote } from '../../../application/gestion/use-case/usuarios.use-case';

/**
 * La barra de acciones sobre las cuentas marcadas.
 *
 * <p>Solo aparece cuando hay algo marcado: ocupando sitio siempre, con los botones apagados, se leía
 * como una función rota.
 *
 * <p>Las acciones van sobre la PÁGINA que se está mirando. Marcar «todos» no marca los mil usuarios del
 * backend, sino los veinticinco visibles: es lo que espera quien pulsa la casilla de la cabecera, y lo
 * contrario sería una forma silenciosa de dar de baja a media plataforma.
 *
 * <p>MOBILE FIRST: los botones se envuelven en varias filas cuando no caben; en escritorio quedan en
 * una sola línea junto al título.
 */
@Component({
  selector: 'nx-usuarios-acciones-en-lote',
  imports: [FaIconComponent],
  template: `
    @if (cuantos() > 0) {
      <div class="flex items-center gap-1 flex-wrap mr-1">
        <span class="text-[11px] text-ink-500 mr-1">
          {{ tCon('admin.bulk.selected', { n: cuantos() }) }}
        </span>
        <button
          type="button"
          (click)="pide.emit('activa')"
          [disabled]="ocupado()"
          class="btn btn-outline btn-sm text-[12px]"
          [title]="t('admin.users.actions.activate')"
        >
          <fa-icon [icon]="iconos.activa" /> {{ t('admin.users.actions.activate') }}
        </button>
        <button
          type="button"
          (click)="pide.emit('bloquea')"
          [disabled]="ocupado()"
          class="btn btn-outline btn-sm text-[12px]"
          [title]="t('admin.users.actions.lock')"
        >
          <fa-icon [icon]="iconos.bloquea" /> {{ t('admin.users.actions.lock') }}
        </button>
        <button
          type="button"
          (click)="pide.emit('desbloquea')"
          [disabled]="ocupado()"
          class="btn btn-outline btn-sm text-[12px]"
          [title]="t('admin.users.actions.unlock')"
        >
          <fa-icon [icon]="iconos.desbloquea" /> {{ t('admin.users.actions.unlock') }}
        </button>
        <select
          [value]="rol()"
          (change)="eligeRol($event)"
          class="border border-ink-200 rounded px-2 py-1 text-[11px]"
          [attr.aria-label]="t('admin.bulk.role')"
        >
          @for (opcion of roles(); track opcion.valor) {
            <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
          }
        </select>
        <button
          type="button"
          (click)="aplicaRol.emit()"
          [disabled]="ocupado()"
          class="btn btn-outline btn-sm text-[12px]"
          [title]="t('admin.bulk.role')"
        >
          <fa-icon [icon]="iconos.rol" /> {{ t('admin.bulk.set_role') }}
        </button>
        <!-- Dar de baja es lo único destructivo de la barra, y por eso es lo único en rojo. -->
        <button
          type="button"
          (click)="pide.emit('borra')"
          [disabled]="ocupado()"
          class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700 hover:bg-red-50"
          [title]="t('admin.users.actions.delete')"
        >
          <fa-icon [icon]="iconos.borra" /> {{ t('admin.users.actions.delete') }}
        </button>
      </div>
    }
  `,
})
export class UsuariosAccionesEnLote {
  readonly cuantos = input(0);
  readonly ocupado = input(false);
  /** Las opciones ya traducidas: las compone la página una vez y las comparte con la tabla. */
  readonly roles = input<readonly OpcionDeFiltro[]>([]);
  /** El papel que se aplicaría al lote. Es `model` para que la página lo lea al confirmar. */
  readonly rol = model('USER');

  readonly pide = output<AccionEnLote>();
  readonly aplicaRol = output<void>();

  protected readonly iconos = {
    activa: faCircleCheck,
    bloquea: faLock,
    desbloquea: faLockOpen,
    rol: faUserShield,
    borra: faTrash,
  };

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected eligeRol(evento: Event): void {
    this.rol.set((evento.target as HTMLSelectElement).value);
  }
}
