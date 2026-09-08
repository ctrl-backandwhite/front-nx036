import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPenToSquare, faShop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { FichaDeProducto } from '../../../domain/model/producto';
import { EditaLaFicha } from '../../../application/use-case/edita-la-ficha.use-case';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';

/**
 * El bloque de administración de la ficha: de dónde salió el producto, si está revisado y cómo
 * borrarlo.
 *
 * <p>Se carga EN DIFERIDO y solo para el administrador: nada de esto —ni el enlace al proveedor, ni el
 * código externo, ni el botón de borrar— debe viajar al navegador de quien compra. El enlace de origen
 * es especialmente delicado: enseñarlo invitaría a comprar directamente al proveedor.
 *
 * <p>El enlace se pide en un FORMULARIO y no en una cadena de preguntas sueltas, para poder revisar lo
 * pegado antes de guardar. El dominio lo valida el backend, que es quien manda.
 */
@Component({
  selector: 'nx-panel-de-origen',
  imports: [FaIconComponent],
  template: `
    <div class="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
      <div class="flex items-center gap-2 flex-wrap text-[12px]">
        <span class="badge badge-warning badge-sm gap-1">
          <fa-icon [icon]="iconos.tienda" />
          {{ t('admin.product.origin') }}:
          <strong class="capitalize">{{ ficha().origen }}</strong>
        </span>
        <span class="opacity-70">
          EXT <code class="font-mono">{{ ficha().idExterno }}</code>
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        @if (ficha().urlDeOrigen; as enlace) {
          <a
            [href]="enlace"
            target="_blank"
            rel="noreferrer"
            class="btn btn-sm btn-warning btn-outline gap-2 w-full sm:w-auto"
          >
            <fa-icon [icon]="iconos.tienda" />
            {{ t('admin.product.buy_at_origin') }} ({{ ficha().origen }})
          </a>
        }
        <button
          type="button"
          (click)="pideElEnlace()"
          [disabled]="trabajando()"
          class="btn btn-sm btn-ghost gap-2 w-full sm:w-auto"
        >
          <fa-icon [icon]="iconos.lapiz" />
          {{ ficha().urlDeOrigen ? t('admin.product.source_url.edit') : t('admin.product.source_url.add') }}
        </button>
      </div>

      @if (ficha().urlDeOrigen; as enlace) {
        <p class="text-[11px] opacity-60 font-mono break-all">{{ enlace }}</p>
      }
      <p class="text-[11px] opacity-60 leading-snug">{{ t('admin.product.origin_hint') }}</p>

      <!-- Esta casilla NO es un formulario y por eso no pasa por Signal Forms: no guarda ningún estado
           propio que validar o enviar. Lo que enseña es la ficha que llega, y marcarla es un GESTO que
           llama al servidor al instante. Darle un modelo local sería crear una segunda verdad sobre un
           dato que manda el backend, y quedaría desincronizada en cuanto el guardado fallara. -->
      <label class="flex items-center gap-2 pt-2 border-t border-warning/30 cursor-pointer text-[12px]">
        <input
          type="checkbox"
          class="checkbox checkbox-xs checkbox-success"
          [checked]="!!ficha().verificado"
          [disabled]="trabajando()"
          (change)="marcaVerificado($any($event.target).checked)"
        />
        <span class="font-medium">{{ t('admin.catalog.col.verified') }}</span>
        <span class="opacity-60">
          {{ ficha().verificado ? t('admin.catalog.verified.yes') : t('admin.catalog.verified.no') }}
        </span>
      </label>

      <button
        type="button"
        [disabled]="trabajando()"
        (click)="borraElProducto()"
        class="btn btn-sm btn-error btn-outline gap-2 w-full mt-1"
      >
        <fa-icon [icon]="iconos.papelera" /> {{ t('admin.catalog.product.delete') }}
      </button>
    </div>
  `,
})
export class PanelDeOrigen {
  readonly ficha = input.required<FichaDeProducto>();
  /** Algo ha cambiado y la ficha hay que volver a pedirla. */
  /**
   * Sale la ficha YA actualizada, no un aviso de que algo cambió.
   *
   * <p>Antes era `output<void>()` y la pantalla respondía volviendo a pedir la ficha entera: marcar
   * «Verificado» —un interruptor— repintaba galería, variantes, reseñas y desglose. El backend
   * responde a estas ediciones con el producto completo, así que basta con pasarlo hacia arriba.
   */
  readonly cambiada = output<FichaDeProducto>();
  /** El producto ya no existe: quien lo mostraba tiene que irse de aquí. */
  readonly borrada = output<void>();

  private readonly editor = inject(EditaLaFicha);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { tienda: faShop, lapiz: faPenToSquare, papelera: faTrash };
  protected readonly trabajando = signal(false);

  private readonly enlaceActual = computed(() => this.ficha().urlDeOrigen ?? '');

  protected async pideElEnlace(): Promise<void> {
    const respuesta = await this.dialogo.formulario({
      titulo: this.t('admin.product.source_url.title'),
      mensaje: this.t('admin.product.source_url.help'),
      etiquetaConfirmar: this.t('common.save'),
      campos: [
        {
          nombre: 'sourceUrl',
          etiqueta: this.t('admin.product.source_url.label'),
          marcador: 'https://detail.1688.com/offer/123456789.html',
          valorInicial: this.enlaceActual(),
          obligatorio: true,
          ayuda: this.t('admin.product.source_url.hint'),
        },
      ],
    });
    // Sin cambio no se llama: un guardado que no guarda nada solo sirve para gastar una petición y
    // enseñar una confirmación que no significa nada.
    if (!respuesta || respuesta['sourceUrl'] === this.enlaceActual()) {
      return;
    }
    await this.ejecuta(
      () => this.editor.guardaUrlDeOrigen(this.ficha().id, respuesta['sourceUrl']),
      'admin.product.source_url.saved',
    );
  }

  protected async marcaVerificado(verificado: boolean): Promise<void> {
    await this.ejecuta(
      () => this.editor.marcaVerificado(this.ficha().id, verificado),
      'admin.catalog.edit.ok',
    );
  }

  protected async borraElProducto(): Promise<void> {
    const confirmado = await this.dialogo.confirma(this.t('admin.catalog.product.delete_confirm'));
    if (!confirmado) {
      return;
    }
    this.trabajando.set(true);
    try {
      const resultado = await this.editor.borraProducto(this.ficha().id);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.product.delete_error'));
        return;
      }
      this.avisos.exito(this.t('admin.catalog.product.deleted'));
      this.borrada.emit();
    } finally {
      this.trabajando.set(false);
    }
  }

  /**
   * Todo gesto de edición sigue el mismo guion: bloquear, ejecutar, avisar y PUBLICAR LA FICHA.
   *
   * <p>Lo último era «recargar la ficha», y ahí estaba el problema: quien lo montaba respondía pidiendo
   * el producto otra vez. Ahora se publica lo que el servidor ya devolvió.
   */
  private async ejecuta(
    accion: () => Promise<Result<FichaDeProducto, AppError>>,
    claveDeExito: string,
  ): Promise<void> {
    this.trabajando.set(true);
    try {
      const resultado = await accion();
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.edit.error'));
        return;
      }
      this.avisos.exito(this.t(claveDeExito));
      this.cambiada.emit(resultado.valor);
    } finally {
      this.trabajando.set(false);
    }
  }
}
