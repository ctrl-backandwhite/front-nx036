import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy, faKey } from '@fortawesome/free-solid-svg-icons';
import QRCode from 'qrcode';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  ConsultaElSegundoFactor, DesactivaElSegundoFactor, IniciaElSegundoFactor,
  VerificaElSegundoFactor,
} from '../../../application/gestion/use-case/perfil.use-case';
import { VentanaModal } from './ventana-modal';

/** Cuántas cifras tiene el código de un autenticador. Por debajo, ni se intenta enviar. */
const LARGO_DEL_CODIGO = 6;

/** Identificadores únicos por montaje: dos campos con el mismo `id` rompen su etiqueta. */
let contador = 0;

/** Qué ventana está abierta, si alguna. */
type Paso = 'verifica' | 'codigos' | 'desactiva' | null;

/**
 * El segundo factor de la propia cuenta: activarlo, verificarlo y quitarlo.
 *
 * <p>SEGURIDAD, tres cosas que no se pueden perder al tocar esto:
 * <ul>
 *   <li>El código QR se dibuja EN EL NAVEGADOR. La dirección `otpauth` lleva dentro la semilla del
 *       segundo factor: mandarla a un servicio de imágenes ajeno —como se hacía— es entregarle a un
 *       tercero la llave de todas las cuentas que pasen por aquí.
 *   <li>Verificado el alta, el secreto y el QR se borran de memoria: no tienen por qué seguir vivos en
 *       la pestaña ni aparecer en las herramientas del navegador.
 *   <li>Quitar el segundo factor exige la contraseña. Si no, una sesión robada bastaría para desarmarlo.
 * </ul>
 */
@Component({
  selector: 'nx-perfil-segundo-factor',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100">
      <div>
        <div class="text-sm font-medium">{{ t('admin.profile.2fa.title') }}</div>
        <div class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.body') }}</div>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <span class="text-[12px] font-medium"
              [class.text-emerald-600]="activo()" [class.text-ink-400]="!activo()">
          {{ activo() ? t('admin.profile.2fa.on') : t('admin.profile.2fa.off') }}
        </span>
        <input type="checkbox" role="switch" class="toggle toggle-success" [checked]="activo()"
               [attr.aria-label]="activo() ? t('admin.profile.2fa.disable') : t('admin.profile.2fa.enable')"
               (change)="alterna($event)" />
      </div>
    </div>

    @if (paso() === 'verifica') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.scan_title')" (cierra)="cierra()">
        <p class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.scan_body') }}</p>
        @if (qr(); as imagen) {
          <img [src]="imagen" [attr.alt]="t('admin.profile.2fa.scan_title')"
               class="mx-auto w-44 h-44 border border-ink-100 rounded p-2 bg-white" />
        } @else {
          <div class="bg-ink-50 rounded p-3 text-center font-mono text-[12px] break-all">{{ secreto() }}</div>
        }
        <div class="flex items-center gap-2 text-[11px] text-ink-500">
          <span class="font-mono break-all">{{ secreto() }}</span>
          <!-- Botón de solo icono: sin nombre accesible se anuncia como «botón» a secas y no hay
               forma de saber que copia el secreto. -->
          <button type="button" class="btn btn-xs btn-outline"
                  [attr.aria-label]="t('admin.profile.2fa.copy')" [title]="t('admin.profile.2fa.copy')"
                  (click)="copia(secreto())">
            <fa-icon [icon]="iconos.copiar" />
          </button>
        </div>
        <label [attr.for]="idDelCodigo"
               class="text-xs text-ink-500 mt-2 block">{{ t('admin.profile.2fa.otp_label') }}</label>
        <!-- Sin autofocus: robar el foco al abrir desorienta a quien navega con lector de pantalla
             o con el teclado, y el proyecto lo prohíbe. Llevar el foco DENTRO de la ventana es tarea de
             la propia ventana modal, que es donde se resuelve una vez para todas las pantallas. -->
        <input [id]="idDelCodigo" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
               autocomplete="one-time-code" placeholder="123456"
               class="input font-mono text-center text-lg tracking-widest"
               [value]="codigo()" (input)="escribeCodigo($event)" />
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn btn-outline text-[12px]"
                  (click)="cierra()">{{ t('actions.cancel') }}</button>
          <button type="button" class="btn btn-primary text-[12px]"
                  [disabled]="codigo().length !== largoDelCodigo || ocupado()"
                  (click)="verifica()">{{ t('admin.profile.2fa.enable') }}</button>
        </div>
      </nx-ventana-modal>
    }

    @if (paso() === 'codigos') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.backup_title')" (cierra)="cierra()">
        <p class="text-[12px] text-ink-500">
          <fa-icon [icon]="iconos.llave" /> {{ t('admin.profile.2fa.backup_body') }}
        </p>
        <pre class="bg-ink-50 rounded p-3 text-[12px] font-mono whitespace-pre-wrap">{{ codigosEnTexto() }}</pre>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn btn-outline text-[12px]" (click)="copia(codigosEnTexto())">
            <fa-icon [icon]="iconos.copiar" /> {{ t('admin.profile.2fa.copy') }}
          </button>
          <button type="button" class="btn btn-primary text-[12px]"
                  (click)="cierra()">{{ t('actions.save') }}</button>
        </div>
      </nx-ventana-modal>
    }

    @if (paso() === 'desactiva') {
      <nx-ventana-modal [titulo]="t('admin.profile.2fa.disable_title')" ancho="sm:max-w-sm"
                        (cierra)="cierra()">
        <p class="text-[12px] text-ink-500">{{ t('admin.profile.2fa.disable_body') }}</p>
        <label [attr.for]="idDeLaContrasena"
               class="text-xs text-ink-500 block">{{ t('admin.profile.pw.current') }}</label>
        <input [id]="idDeLaContrasena" type="password" class="input" autocomplete="current-password"
               [placeholder]="t('admin.profile.pw.current')"
               [value]="contrasena()" (input)="escribeContrasena($event)" />
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-outline text-[12px]"
                  (click)="cierra()">{{ t('actions.cancel') }}</button>
          <button type="button" class="btn btn-error text-[12px]"
                  [disabled]="!contrasena() || ocupado()"
                  (click)="desactiva()">{{ t('admin.profile.2fa.disable') }}</button>
        </div>
      </nx-ventana-modal>
    }
  `,
})
export class PerfilSegundoFactor {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaElSegundoFactor);
  private readonly inicia = inject(IniciaElSegundoFactor);
  private readonly verificaUso = inject(VerificaElSegundoFactor);
  private readonly desactivaUso = inject(DesactivaElSegundoFactor);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { copiar: faCopy, llave: faKey };
  protected readonly largoDelCodigo = LARGO_DEL_CODIGO;
  protected readonly idDelCodigo = `nx-perfil-2fa-codigo-${++contador}`;
  protected readonly idDeLaContrasena = `nx-perfil-2fa-clave-${contador}`;

  protected readonly activo = signal(false);
  protected readonly paso = signal<Paso>(null);
  protected readonly ocupado = signal(false);
  protected readonly secreto = signal('');
  protected readonly qr = signal('');
  protected readonly codigo = signal('');
  protected readonly contrasena = signal('');
  protected readonly codigosEnTexto = signal('');

  constructor() {
    void this.consulta.ejecuta().then((estado) => this.activo.set(estado));
  }

  /**
   * El interruptor no cambia por sí solo: abre el paso que corresponda y el estado real llega después.
   *
   * <p>Hay que devolver la casilla a la verdad a mano. El navegador ya la ha marcado al pulsarla y, como
   * el signal no ha cambiado, Angular no reescribe la propiedad: quedaría enseñando «activado» con el
   * segundo factor todavía sin verificar.
   */
  protected alterna(evento: Event): void {
    (evento.target as HTMLInputElement).checked = this.activo();
    if (this.activo()) {
      this.contrasena.set('');
      this.paso.set('desactiva');
      return;
    }
    void this.empiezaElAlta();
  }

  /**
   * Cerrar cualquiera de las ventanas deja la memoria limpia.
   *
   * <p>Los códigos de respaldo se borran AQUÍ y no en `olvidaElSecreto`, que se llama justo después de
   * recibirlos: se los llevaría por delante antes de que nadie llegue a leerlos.
   */
  protected cierra(): void {
    this.paso.set(null);
    this.contrasena.set('');
    this.codigosEnTexto.set('');
    this.olvidaElSecreto();
  }

  protected escribeCodigo(evento: Event): void {
    this.codigo.set((evento.target as HTMLInputElement).value);
  }

  protected escribeContrasena(evento: Event): void {
    this.contrasena.set((evento.target as HTMLInputElement).value);
  }

  private async empiezaElAlta(): Promise<void> {
    const resultado = await this.inicia.ejecuta();
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.setup_error');
      return;
    }
    this.secreto.set(resultado.valor.secreto);
    // El QR se dibuja AQUÍ, en el navegador. La dirección `otpauth` lleva la semilla dentro y no sale
    // del dispositivo: antes se mandaba a un generador de imágenes público, que es filtrarla.
    this.qr.set(await QRCode.toDataURL(resultado.valor.urlOtpauth, { width: 240, margin: 2 }));
    this.codigo.set('');
    this.paso.set('verifica');
  }

  protected async verifica(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.verificaUso.ejecuta(this.codigo());
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.verify_error');
        return;
      }
      this.codigosEnTexto.set(resultado.valor.join('\n'));
      this.activo.set(true);
      this.paso.set('codigos');
      // Ya verificado: ni el secreto ni su imagen tienen por qué seguir en memoria.
      this.olvidaElSecreto();
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async desactiva(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.desactivaUso.ejecuta(this.contrasena());
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje, 'admin.profile.2fa.disable_error');
        return;
      }
      this.activo.set(false);
      this.contrasena.set('');
      this.paso.set(null);
      await this.dialogo.alerta(this.t('admin.profile.2fa.disabled_ok'), undefined, 'success');
    } finally {
      this.ocupado.set(false);
    }
  }

  /**
   * Copia avisando si NO se ha podido.
   *
   * <p>El navegador rechaza el portapapeles en contexto no seguro o sin permiso. Sin este aviso, quien
   * copia sus códigos de respaldo cree que los tiene, cierra la ventana y se queda sin la única vía de
   * entrada el día que pierda el teléfono.
   */
  protected async copia(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      await this.dialogo.alerta(this.t('errors.generic'), undefined, 'error');
    }
  }

  private olvidaElSecreto(): void {
    this.secreto.set('');
    this.qr.set('');
    this.codigo.set('');
  }

  /** El motivo lo escribe el backend, ya traducido; si no vino ninguno, el texto propio del paso. */
  private avisa(mensaje: string, claveDeRespaldo: string): Promise<unknown> {
    return this.dialogo.alerta(mensaje || this.t(claveDeRespaldo), undefined, 'error');
  }
}
