import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPencil, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { FijaLaComisionDelAfiliado } from '../../../application/gestion/use-case/afiliados.use-case';

/**
 * El porcentaje de comisión de UN afiliado, con su editor.
 *
 * <p>Regla del titular (25-sep-2026): aprobado el afiliado cobra el porcentaje base del programa, y se
 * le puede subir <b>solo a su cuenta y a su código</b>. Por eso esto vive en la fila del afiliado y no
 * en la caja de configuración general, que es la que cambia el porcentaje de todos.
 *
 * <p>Se distingue a la vista quién cobra lo suyo y quién el del programa: sin esa marca, un 10 % propio
 * y el 10 % general se leen igual, y al bajar el general uno se quedaría donde estaba sin que nadie
 * entendiera por qué.
 *
 * <p>Vaciar el campo BORRA el porcentaje propio y devuelve al afiliado al del programa. Vacío y cero no
 * son lo mismo: un 0 % es una comisión de cero que alguien ha decidido escribir —dejar de pagar sin
 * expulsar— y tiene que poder escribirse.
 */
@Component({
  selector: 'nx-afiliados-comision',
  imports: [FaIconComponent],
  template: `
    @if (editando()) {
      <div class="flex items-center gap-1">
        <label class="sr-only" [attr.for]="'comision-' + idDeAfiliado()">
          {{ t('admin.affiliates.commission.label') }}
        </label>
        <input
          [id]="'comision-' + idDeAfiliado()"
          class="input input-xs w-20 text-right"
          type="number"
          min="0"
          max="100"
          step="0.5"
          [value]="borrador()"
          [attr.placeholder]="porDefecto()"
          (input)="borrador.set($any($event.target).value)"
          (keydown.enter)="guarda()"
          (keydown.escape)="cancela()"
        />
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square text-emerald-600"
          [attr.title]="t('common.save')"
          [attr.aria-label]="t('common.save')"
          (click)="guarda()"
        >
          <fa-icon [icon]="iconos.acepta" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          [attr.title]="t('common.cancel')"
          [attr.aria-label]="t('common.cancel')"
          (click)="cancela()"
        >
          <fa-icon [icon]="iconos.cancela" />
        </button>
      </div>
    } @else {
      <div class="flex items-center justify-end gap-1">
        <span class="text-[13px]" [class.font-medium]="propio()">{{ efectivo() }}%</span>
        @if (propio()) {
          <span class="badge badge-xs badge-outline">{{ t('admin.affiliates.commission.own') }}</span>
        }
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          [attr.title]="t('admin.affiliates.commission.edit')"
          [attr.aria-label]="t('admin.affiliates.commission.edit')"
          (click)="empieza()"
        >
          <fa-icon [icon]="iconos.edita" />
        </button>
      </div>
    }
  `,
})
export class AfiliadosComision {
  readonly idDeAfiliado = input.required<string>();
  /** Su porcentaje propio, o indefinido si cobra el del programa. */
  readonly comisionPropia = input<number | undefined>(undefined);
  /** El del programa, para enseñarlo cuando no tiene uno propio. */
  readonly porcentajeDelPrograma = input(0);

  /** Avisa de que el porcentaje ya está guardado, para que la tabla se refresque. */
  readonly cambia = output<void>();

  protected readonly iconos = { edita: faPencil, acepta: faCheck, cancela: faXmark };
  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly fijaLaComision = inject(FijaLaComisionDelAfiliado);

  protected readonly editando = signal(false);
  protected readonly borrador = signal('');

  protected readonly propio = computed(() => this.comisionPropia() !== undefined);
  protected readonly efectivo = computed(() => this.comisionPropia() ?? this.porcentajeDelPrograma());
  protected readonly porDefecto = computed(() => String(this.porcentajeDelPrograma()));

  protected empieza(): void {
    this.borrador.set(this.comisionPropia() !== undefined ? String(this.comisionPropia()) : '');
    this.editando.set(true);
  }

  protected cancela(): void {
    this.editando.set(false);
  }

  /**
   * Manda el cambio. Vacío significa «quítale el porcentaje propio», no «cero».
   *
   * <p>Un valor fuera de 0-100 no se manda: el servidor lo rechaza igualmente, pero avisar aquí evita
   * un viaje y un mensaje de error para algo que se ve en el propio campo.
   */
  protected async guarda(): Promise<void> {
    const texto = this.borrador().trim();
    let porcentaje: number | null = null;
    if (texto !== '') {
      const valor = Number(texto);
      if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
        return;
      }
      porcentaje = valor;
    }
    const resultado = await this.fijaLaComision.ejecuta(this.idDeAfiliado(), porcentaje);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.t('admin.affiliates.commission.saved'));
    this.editando.set(false);
    this.cambia.emit();
  }
}
