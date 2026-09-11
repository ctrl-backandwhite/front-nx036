import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faLaptop,
  faMobileScreen,
  faRightFromBracket,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
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
 *
 * <p>Cada sesión es una FILA CON CUERPO, no un renglón de lista. Esto no es un listado cualquiera: es
 * donde alguien mira cuando sospecha que le han entrado en la cuenta, y ahí hace falta poder recorrer
 * cuatro entradas de un vistazo y distinguirlas. Escrito todo seguido en una línea —dispositivo, red,
 * cuándo, y el botón de echar a la derecha— las cuatro se leían iguales y la acción destructiva
 * quedaba a la misma altura visual que el texto que la acompaña.
 *
 * <p>MOBILE FIRST: en el móvil el botón baja a su propia línea; a partir de «sm» vuelve al costado.
 */
@Component({
  selector: 'nx-sesiones-activas',
  imports: [FaIconComponent],
  // Un elemento propio nace en línea y se comería el `mt-6` del encabezado. Ha pasado cuatro veces.
  host: { class: 'block' },
  template: `
    <h4 class="mt-6 mb-1 text-sm font-medium flex items-center gap-2">
      <fa-icon [icon]="iconos.escudo" class="text-brand-600" />
      {{ t('admin.profile.sessions.title') }}
    </h4>

    @if (sesiones().length === 0) {
      <p class="mt-2 rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center
                text-[12px] text-ink-400">
        {{ t('admin.profile.sessions.empty') }}
      </p>
    } @else {
      <ul class="mt-2 divide-y divide-ink-100 rounded-lg border border-ink-100 overflow-hidden">
        @for (sesion of sesiones(); track sesion.id) {
          <li
            class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between
                   sm:gap-4"
            [class.bg-emerald-50/40]="sesion.actual"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                aria-hidden="true"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                [class]="sesion.actual ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700'"
              >
                <fa-icon [icon]="icono(sesion)" />
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[13px] font-medium truncate">{{ sesion.dispositivo }}</span>
                  @if (sesion.actual) {
                    <span class="badge bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                      {{ t('admin.profile.sessions.current') }}
                    </span>
                  }
                </div>
                <!--
                  La red y el cuándo, en SEGUNDA línea y apagados: son la pista con la que se
                  reconoce una sesión ajena, pero no es lo primero que se busca. Antes iban en la
                  misma línea que el dispositivo y las cuatro filas se leían como una sola mancha.
                -->
                <div class="text-[12px] text-ink-500">{{ detalle(sesion) }}</div>
              </div>
            </div>
            @if (!sesion.actual) {
              <!--
                Un BOTÓN con cuerpo, no un enlace rojo suelto: echar a un dispositivo es una acción
                destructiva y tiene que verse como algo que se pulsa, no como parte del texto.
              -->
              <button
                type="button"
                class="btn btn-ghost btn-xs shrink-0 self-start text-error hover:bg-red-50 sm:self-auto"
                [disabled]="ocupado()"
                (click)="revoca(sesion.id)"
              >
                <fa-icon [icon]="iconos.salir" /> {{ t('admin.profile.sessions.revoke') }}
              </button>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class SesionesActivas {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly carga = inject(CargaSesionesActivas);
  private readonly revocaUso = inject(RevocaSesion);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { salir: faRightFromBracket, escudo: faShieldHalved };

  protected readonly sesiones = signal<readonly SesionActiva[]>([]);
  protected readonly ocupado = signal(false);

  constructor() {
    void this.carga.ejecuta().then((lista) => this.sesiones.set(lista));
  }

  protected icono(sesion: SesionActiva) {
    return esDispositivoMovil(sesion.dispositivo) ? faMobileScreen : faLaptop;
  }

  /**
   * La red y el cuándo, que ahora van en su propia línea.
   *
   * <p>Antes empezaba por un punto medio —«· 172.27.0.1 · hace 7 minutos»— porque colgaba del nombre
   * del dispositivo en la misma línea. Separada, ese primer separador no une nada: es un símbolo
   * suelto al principio de la frase.
   */
  protected detalle(sesion: SesionActiva): string {
    const cuando = this.haceCuanto(new Date(sesion.ultimoUsoEl));
    return sesion.ip ? `${sesion.ip} · ${cuando}` : cuando;
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
