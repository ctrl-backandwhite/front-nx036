import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy, faKey, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { EnfocaAlAparecer } from '@ds/directive/enfoca-al-aparecer.directive';
import { codigoTotpCompleto } from '../../domain/model/seguridad';
import {
  ActivaDobleFactor,
  AltaDibujada,
  ConfirmaDobleFactor,
  ConsultaDobleFactor,
  DesactivaDobleFactor,
} from '../../application/use-case/seguridad.use-case';
import { VentanaModal } from './ventana-modal';

/** En qué punto del alta o de la baja estamos. Nulo mientras no haya ninguna ventana abierta. */
type Paso = 'verificar' | 'codigos' | 'desactivar' | null;

/**
 * El segundo factor de la cuenta.
 *
 * <p>El código QR se dibuja EN EL PROPIO NAVEGADOR porque lleva dentro la semilla: quien la tenga puede
 * generar los códigos de esta cuenta para siempre. Enviarla a un servicio externo de códigos QR —que es
 * lo que se hacía— era regalarla.
 *
 * <p>Las dos casillas —el código de un solo uso y la contraseña con la que se quita el segundo factor—
 * viven en UN formulario de Signal Forms, aunque se enseñen en ventanas distintas: son dos pasos del
 * mismo trámite y así hay un único sitio que sabe si cada paso puede seguir. El largo del código se
 * declara en el ESQUEMA y no como atributo: la directiva lo proyecta ella misma al elemento.
 */
@Component({
  selector: 'nx-doble-factor',
  imports: [FaIconComponent, VentanaModal, EnfocaAlAparecer, FormField],
  template: `
    <div class="mt-4 flex items-center justify-between gap-3 py-2 border-b border-ink-100">
      <div>
        <div class="text-sm font-medium">{{ t('admin.profile.2fa.title') }}</div>
        <div class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.body') }}</div>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <span [class]="'text-[12px] font-medium ' + (activo() ? 'text-emerald-600' : 'text-ink-400')">
          {{ activo() ? t('admin.profile.2fa.on') : t('admin.profile.2fa.off') }}
        </span>
        <input
          type="checkbox"
          role="switch"
          class="toggle toggle-success"
          [checked]="activo()"
          [attr.aria-label]="activo() ? t('admin.profile.2fa.disable') : t('admin.profile.2fa.enable')"
          (change)="alterna()"
        />
      </div>
    </div>

    @if (paso() === 'verificar') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.scan_title')" ancho="max-w-md" (cierra)="cierra()">
        <fa-icon icono [icon]="iconos.qr" />
        <div class="space-y-3">
          <p class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.scan_body') }}</p>
          @if (alta()?.qr; as qr) {
            <img [src]="qr" alt="" class="mx-auto w-44 h-44 border border-ink-100 rounded p-2 bg-white" />
          } @else {
            <div class="bg-ink-50 rounded p-3 text-center font-mono text-[12px] break-all">
              {{ alta()?.secreto }}
            </div>
          }
          <div class="flex items-center gap-2 text-[11px] text-ink-500">
            <span class="font-mono break-all">{{ alta()?.secreto }}</span>
            <button type="button" class="btn btn-xs btn-outline" [attr.aria-label]="t('admin.profile.2fa.copy')"
                    (click)="copia(alta()?.secreto ?? '')">
              <fa-icon [icon]="iconos.copiar" />
            </button>
          </div>
          <label for="perfil-2fa-otp" class="text-xs text-ink-500 mt-2 block">{{ t('admin.profile.2fa.otp_label') }}</label>
          <input id="perfil-2fa-otp" type="text" inputmode="numeric" nxEnfocaAlAparecer
                 class="input font-mono text-center text-lg tracking-widest w-full" placeholder="123456"
                 [formField]="formulario.codigo" />
          @if (falloDe(formulario.codigo); as fallo) {
            <span role="alert" class="text-[12px] text-error block">{{ fallo }}</span>
          }
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" class="btn btn-outline text-[12px]" (click)="cierra()">{{ t('actions.cancel') }}</button>
            <button type="button" class="btn btn-primary text-[12px]" [disabled]="formulario.codigo().invalid() || ocupado()"
                    (click)="verifica()">
              {{ t('admin.profile.2fa.enable') }}
            </button>
          </div>
        </div>
      </nx-ventana-modal>
    }

    @if (paso() === 'codigos') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.backup_title')" ancho="max-w-md" (cierra)="cierra()">
        <fa-icon icono [icon]="iconos.llave" />
        <div class="space-y-3">
          <p class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.backup_body') }}</p>
          <pre class="bg-ink-50 rounded p-3 text-[12px] font-mono whitespace-pre-wrap">{{ codigosDeRespaldo() }}</pre>
          <div class="flex justify-end gap-2 flex-wrap">
            <button type="button" class="btn btn-outline text-[12px]" (click)="copia(codigosDeRespaldo())">
              <fa-icon [icon]="iconos.copiar" /> {{ t('admin.profile.2fa.copy') }}
            </button>
            <button type="button" class="btn btn-primary text-[12px]" (click)="cierra()">{{ t('actions.save') }}</button>
          </div>
        </div>
      </nx-ventana-modal>
    }

    @if (paso() === 'desactivar') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.disable_title')" ancho="max-w-sm" (cierra)="cierra()">
        <div class="space-y-3">
          <p class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.disable_body') }}</p>
          <input type="password" autocomplete="current-password" nxEnfocaAlAparecer class="input w-full"
                 [attr.aria-label]="t('profile.current_password')" [placeholder]="t('profile.current_password')"
                 [formField]="formulario.contrasena" />
          @if (falloDe(formulario.contrasena); as fallo) {
            <span role="alert" class="text-[12px] text-error block">{{ fallo }}</span>
          }
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-outline text-[12px]" (click)="cierra()">{{ t('actions.cancel') }}</button>
            <button type="button" class="btn btn-error text-[12px]" [disabled]="formulario.contrasena().invalid() || ocupado()"
                    (click)="desactiva()">
              {{ t('admin.profile.2fa.disable') }}
            </button>
          </div>
        </div>
      </nx-ventana-modal>
    }
  `,
})
export class DobleFactor {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaDobleFactor);
  private readonly activa = inject(ActivaDobleFactor);
  private readonly confirma = inject(ConfirmaDobleFactor);
  private readonly desactivaUso = inject(DesactivaDobleFactor);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { qr: faQrcode, llave: faKey, copiar: faCopy };

  protected readonly activo = signal(false);
  protected readonly paso = signal<Paso>(null);
  protected readonly alta = signal<AltaDibujada | null>(null);
  protected readonly respaldo = signal<readonly string[]>([]);
  protected readonly ocupado = signal(false);

  protected readonly modelo = signal({ codigo: '', contrasena: '' });

  /**
   * El esquema de los dos pasos.
   *
   * <p>Cada campo se declara en dos tramos porque dicen cosas distintas: vacío es «te lo has dejado» y
   * tiene texto que enseñar; el código a medias es «sigue escribiendo» y no hay clave con la que decirlo
   * sin inventarla, así que se deja sin mensaje y basta con que el botón siga apagado. Quien decide
   * cuántos dígitos hacen un código es el dominio, no esta pantalla.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    maxLength(ruta.codigo, 6);
    validate(ruta.codigo, ({ value }) => {
      if (value().trim() === '') {
        return { kind: 'required', message: this.t('dialog.field.required') };
      }
      return codigoTotpCompleto(value()) ? undefined : { kind: 'pattern' };
    });
    validate(ruta.contrasena, ({ value }) =>
      value() === '' ? { kind: 'required', message: this.t('dialog.field.required') } : undefined,
    );
  });

  protected readonly codigosDeRespaldo = computed(() => this.respaldo().join('\n'));

  constructor() {
    void this.consulta.ejecuta().then((activo) => this.activo.set(activo));
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo una ventana recién abierta acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /** Vacía las dos casillas y las deja SIN TOCAR: si no, la ventana se reabriría ya en rojo. */
  private limpiaElFormulario(): void {
    this.modelo.set({ codigo: '', contrasena: '' });
    this.formulario().reset();
  }

  protected alterna(): void {
    if (this.activo()) {
      this.paso.set('desactivar');
      return;
    }
    void this.empieza();
  }

  private async empieza(): Promise<void> {
    const resultado = await this.activa.ejecuta();
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.setup_error');
      return;
    }
    this.alta.set(resultado.valor);
    this.limpiaElFormulario();
    this.paso.set('verificar');
  }

  protected async verifica(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.confirma.ejecuta(this.modelo().codigo);
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.verify_error');
        return;
      }
      this.respaldo.set(resultado.valor);
      this.activo.set(true);
      this.paso.set('codigos');
      // Ya verificado: el secreto y su dibujo no tienen por qué seguir en memoria.
      this.alta.set(null);
      this.limpiaElFormulario();
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async desactiva(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.desactivaUso.ejecuta(this.modelo().contrasena);
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.disable_error');
        return;
      }
      this.activo.set(false);
      this.limpiaElFormulario();
      this.paso.set(null);
      await this.dialogo.alerta(this.t('admin.profile.2fa.disabled_ok'), undefined, 'success');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected cierra(): void {
    this.paso.set(null);
    this.limpiaElFormulario();
    this.alta.set(null);
  }

  /**
   * Copia al portapapeles.
   *
   * <p>Se calla si el navegador no lo permite —contexto no seguro o permiso denegado—: el secreto sigue
   * a la vista para teclearlo, así que un fallo aquí no impide terminar el alta.
   */
  protected copia(texto: string): void {
    void navigator.clipboard?.writeText(texto).catch(() => undefined);
  }

  private async avisa(mensaje: string, claveDeRespaldo: string): Promise<void> {
    await this.dialogo.alerta(mensaje || this.t(claveDeRespaldo), undefined, 'error');
  }
}
