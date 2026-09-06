import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLaptop, faMobileScreen, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { SesionActiva, esDispositivoMovil } from '../../domain/model/seguridad';
import {
  CargaSesionesActivas,
  RevocaSesion,
} from '../../application/use-case/seguridad.use-case';

/** Los tramos de tiempo, del más corto al más largo, con su unidad y cuántos segundos mide cada uno. */
const TRAMOS: readonly { readonly limite: number; readonly unidad: Intl.RelativeTimeFormatUnit; readonly segundos: number }[] = [
  { limite: 3600, unidad: 'minute', segundos: 60 },
  { limite: 86400, unidad: 'hour', segundos: 3600 },
  { limite: 86400 * 30, unidad: 'day', segundos: 86400 },
  { limite: 86400 * 365, unidad: 'month', segundos: 2592000 },
];

/**
 * Los dispositivos con la sesión abierta, con la opción de echarlos.
 *
 * <p>La sesión actual no se puede cerrar a sí misma: hacerlo dejaría a quien mira fuera sin avisar, y
 * para eso está el botón de salir.
 */
@Component({
  selector: 'nx-sesiones-activas',
  imports: [FaIconComponent],
  template: `
    <div class="mt-8">
      <div class="text-sm font-medium mb-2">{{ t('admin.profile.sessions.title') }}</div>
      <ul class="space-y-2">
        @if (sesiones().length === 0) {
          <li class="text-[12px] text-ink-400">{{ t('admin.profile.sessions.empty') }}</li>
        }
        @for (sesion of sesiones(); track sesion.id) {
          <li class="flex items-center justify-between gap-2 text-[13px]">
            <span class="flex items-center gap-2 min-w-0">
              <fa-icon [icon]="icono(sesion)" class="text-ink-500 shrink-0" />
              <span class="truncate">{{ sesion.dispositivo }}</span>
              <span class="text-ink-400 truncate">{{ detalle(sesion) }}</span>
              @if (sesion.actual) {
                <span class="badge bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                  {{ t('admin.profile.sessions.current') }}
                </span>
              }
            </span>
            @if (!sesion.actual) {
              <button type="button" class="text-[11px] text-red-600 hover:underline shrink-0"
                      [disabled]="ocupado()" (click)="revoca(sesion.id)">
                <fa-icon [icon]="iconos.salir" /> {{ t('admin.profile.sessions.revoke') }}
              </button>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class SesionesActivas {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly carga = inject(CargaSesionesActivas);
  private readonly revocaUso = inject(RevocaSesion);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { salir: faRightFromBracket };

  protected readonly sesiones = signal<readonly SesionActiva[]>([]);
  protected readonly ocupado = signal(false);

  constructor() {
    void this.carga.ejecuta().then((lista) => this.sesiones.set(lista));
  }

  protected icono(sesion: SesionActiva) {
    return esDispositivoMovil(sesion.dispositivo) ? faMobileScreen : faLaptop;
  }

  protected detalle(sesion: SesionActiva): string {
    const direccion = sesion.ip ? `· ${sesion.ip} ` : '';
    return `${direccion}· ${this.haceCuanto(new Date(sesion.ultimoUsoEl))}`;
  }

  /** «Hace tres minutos», en el idioma activo. Por debajo del minuto se dice «ahora». */
  private haceCuanto(fecha: Date): string {
    const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
    if (segundos < 60) {
      return this.t('admin.profile.sessions.now');
    }
    const formato = new Intl.RelativeTimeFormat(this.traduccion.idioma(), { numeric: 'auto' });
    const tramo = TRAMOS.find((t) => Math.abs(segundos) < t.limite);
    return tramo
      ? formato.format(-Math.round(segundos / tramo.segundos), tramo.unidad)
      : formato.format(-Math.round(segundos / 31536000), 'year');
  }

  protected async revoca(id: string): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.revocaUso.ejecuta(id);
      if (resultado.ok) {
        this.sesiones.set(resultado.valor);
        return;
      }
      // El respaldo NO puede ser la etiqueta del botón: al fallar, el aviso decía literalmente
      // «Revocar» y no contaba nada. Sin motivo del servidor, un texto de error de verdad.
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
    } finally {
      this.ocupado.set(false);
    }
  }
}
