import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FieldTree, FormField, form, maxLength, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faTrashCan, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { codigoDeBajaSuficiente } from '../../domain/model/perfil';
import { DescargaMisDatos } from '../../application/use-case/descarga-mis-datos.use-case';
import {
  ConfirmaBajaDeCuenta,
  SolicitaBajaDeCuenta,
} from '../../application/use-case/baja-de-cuenta.use-case';

/**
 * Llevarse los datos y cerrar la cuenta.
 *
 * <p>La descarga va ENCIMA del borrado a propósito: quien viene a cerrar la cuenta es quien más necesita
 * llevarse sus datos primero, y el orden inverso convierte el derecho de portabilidad en papel mojado.
 *
 * <p>Y una precisión que importa: cerrar la cuenta NO borra nada. El servidor anonimiza los datos
 * personales y apunta la fecha; pedidos, facturas y apuntes contables siguen ahí porque hay que
 * conservarlos por ley. Lo que desaparece es la persona, no el rastro.
 *
 * <p>El código de confirmación lo lleva Signal Forms. El largo máximo se declara en el ESQUEMA y no como
 * atributo del campo: la directiva lo proyecta ella misma al elemento, así la pantalla y la regla no
 * pueden acabar diciendo cosas distintas.
 */
@Component({
  selector: 'nx-zona-de-peligro',
  imports: [FaIconComponent, FormField],
  template: `
    <section class="card p-5 mb-4">
      <h3 class="flex items-center gap-2">
        <fa-icon [icon]="iconos.descargar" /> {{ t('profile.export.title') }}
      </h3>
      <p class="text-[13px] text-ink-600 mt-2">{{ t('profile.export.desc') }}</p>
      <button type="button" class="btn btn-outline btn-sm mt-3" [disabled]="descargando()" (click)="descarga()">
        <fa-icon [icon]="iconos.descargar" />
        {{ descargando() ? t('common.processing') : t('profile.export.action') }}
      </button>
    </section>

    <section class="card p-5 border border-red-200 bg-red-50/40">
      <h3 class="flex items-center gap-2 text-red-700">
        <fa-icon [icon]="iconos.aviso" /> {{ t('profile.danger.title') }}
      </h3>
      <p class="text-[13px] text-ink-600 mt-2">{{ t('profile.danger.desc') }}</p>

      @if (!codigoPedido()) {
        <button type="button" class="btn btn-outline btn-error btn-sm mt-3" [disabled]="ocupado()" (click)="empieza()">
          <fa-icon [icon]="iconos.borrar" /> {{ ocupado() ? t('common.saving') : t('profile.delete.button') }}
        </button>
      } @else {
        <div class="mt-3 max-w-sm space-y-2">
          <label for="perfil-borrado-codigo" class="text-xs text-ink-500 block">
            {{ t('profile.delete.code_label') }}
          </label>
          <input id="perfil-borrado-codigo" inputmode="numeric" placeholder="••••••"
                 class="input input-bordered w-full tracking-[0.4em] text-center"
                 [formField]="formulario" />
          @if (falloDe(formulario); as fallo) {
            <span role="alert" class="text-xs text-red-700 block">{{ fallo }}</span>
          }
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn btn-error btn-sm" [disabled]="ocupado() || formulario().invalid()"
                    (click)="confirma()">
              <fa-icon [icon]="iconos.borrar" />
              {{ ocupado() ? t('common.saving') : t('profile.delete.confirm_btn') }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="cancela()">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn-ghost btn-xs" [disabled]="ocupado()" (click)="reenvia()">
              {{ t('profile.delete.resend') }}
            </button>
          </div>
        </div>
      }

      @if (aviso(); as mensaje) {
        <span role="alert" [class]="'text-xs mt-2 block ' + (correcto() ? 'text-emerald-700' : 'text-red-700')">
          {{ mensaje }}
        </span>
      }
    </section>
  `,
})
export class ZonaDePeligro {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly router = inject(Router);
  private readonly descargaMisDatos = inject(DescargaMisDatos);
  private readonly solicita = inject(SolicitaBajaDeCuenta);
  private readonly confirmaBaja = inject(ConfirmaBajaDeCuenta);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = {
    descargar: faDownload,
    borrar: faTrashCan,
    aviso: faTriangleExclamation,
  };

  protected readonly descargando = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly codigoPedido = signal(false);
  protected readonly escrito = signal('');
  protected readonly aviso = signal<string | null>(null);
  protected readonly correcto = signal(false);

  /**
   * El código que llega por correo.
   *
   * <p>Se declara en dos tramos porque dicen cosas distintas: vacío es «te lo has dejado» y tiene texto
   * que enseñar; corto es «sigue escribiendo» y no hay clave con la que decirlo sin inventarla, así que
   * se deja sin mensaje y basta con que el botón siga apagado. Quien decide cuántos caracteres bastan es
   * el dominio: el original aceptaba a partir de cuatro y estrecharlo aquí bloquearía a quien recibió un
   * código más corto.
   */
  protected readonly formulario = form(this.escrito, (ruta) => {
    maxLength(ruta, 6);
    validate(ruta, ({ value }) => {
      if (value().trim() === '') {
        return { kind: 'required', message: this.t('dialog.field.required') };
      }
      return codigoDeBajaSuficiente(value()) ? undefined : { kind: 'minLength' };
    });
  });

  /** El código tal como va a viajar. Derivado, no recalculado en cada sitio que lo usa. */
  protected readonly codigo = computed(() => this.escrito());

  /**
   * El mensaje que toca enseñar bajo el campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo un campo recién abierto acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async descarga(): Promise<void> {
    this.descargando.set(true);
    try {
      const resultado = await this.descargaMisDatos.ejecuta();
      if (!resultado.ok) {
        await this.dialogo.alerta(
          resultado.error.mensaje || this.t('profile.export.error'),
          undefined,
          'error',
        );
      }
    } finally {
      this.descargando.set(false);
    }
  }

  protected async empieza(): Promise<void> {
    if (!(await this.dialogo.confirma(this.t('profile.delete.confirm')))) {
      return;
    }
    this.aviso.set(null);
    await this.pideCodigo();
  }

  protected async reenvia(): Promise<void> {
    this.aviso.set(null);
    await this.pideCodigo();
  }

  private async pideCodigo(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.solicita.ejecuta();
      this.correcto.set(resultado.ok);
      if (resultado.ok) {
        this.codigoPedido.set(true);
        this.aviso.set(this.t('profile.delete.code_sent'));
        return;
      }
      this.aviso.set(resultado.error.mensaje || this.t('profile.delete.error'));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected cancela(): void {
    this.codigoPedido.set(false);
    this.escrito.set('');
    // Se deja también sin tocar: si no, al volver a pedir el código el campo aparecería ya en rojo.
    this.formulario().reset();
    this.aviso.set(null);
  }

  protected async confirma(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.confirmaBaja.ejecuta(this.codigo());
      if (!resultado.ok) {
        this.correcto.set(false);
        this.aviso.set(resultado.error.mensaje || this.t('profile.delete.error'));
        return;
      }
      await this.router.navigateByUrl('/', { replaceUrl: true });
      await this.dialogo.alerta(this.t('profile.delete.success'), undefined, 'success');
    } finally {
      this.ocupado.set(false);
    }
  }
}
