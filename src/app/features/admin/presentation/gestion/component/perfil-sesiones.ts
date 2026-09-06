import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLaptop, faMobileScreen, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { SesionAbierta, esMovil, haceCuanto } from '../../../domain/gestion/model/perfil';
import {
  ConsultaLasSesiones, RevocaLaSesion,
} from '../../../application/gestion/use-case/perfil.use-case';

/**
 * Los dispositivos con la sesión abierta, con la opción de echarlos.
 *
 * <p>La sesión actual no se puede cerrar a sí misma: dejaría fuera a quien mira sin avisar, y para eso
 * está el botón de salir.
 *
 * <p>Tras revocar se vuelve a LEER la lista en vez de quitar la fila a mano: quien decide qué sesiones
 * quedan vivas es el servidor, y borrar por nuestra cuenta enseñaría una lista que puede no ser la suya.
 */
@Component({
  selector: 'nx-perfil-sesiones',
  imports: [FaIconComponent],
  template: `
    <div class="mt-4">
      <div class="text-sm font-medium mb-2">{{ t('admin.profile.sessions.title') }}</div>
      <ul class="space-y-2">
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
        } @empty {
          <li class="text-[12px] text-ink-400">{{ t('admin.profile.sessions.empty') }}</li>
        }
      </ul>
    </div>
  `,
})
export class PerfilSesiones {
  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaLasSesiones);
  private readonly revocaUso = inject(RevocaLaSesion);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { salir: faRightFromBracket };

  protected readonly sesiones = signal<readonly SesionAbierta[]>([]);
  protected readonly ocupado = signal(false);

  constructor() {
    void this.carga();
  }

  protected icono(sesion: SesionAbierta): IconDefinition {
    return esMovil(sesion.dispositivo) ? faMobileScreen : faLaptop;
  }

  /** La dirección y cuándo se vio por última vez, en el idioma activo. */
  protected detalle(sesion: SesionAbierta): string {
    const direccion = sesion.ip ? `· ${sesion.ip} ` : '';
    const cuando = haceCuanto(
      new Date(sesion.vistaEl), this.traduccion.idioma(), Date.now(),
      this.t('admin.profile.sessions.now'),
    );
    return `${direccion}· ${cuando}`;
  }

  protected async revoca(id: string): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.revocaUso.ejecuta(id);
      if (!resultado.ok) {
        // El respaldo NO puede ser la etiqueta del botón: al fallar, el aviso decía literalmente
        // «Revocar» y no contaba nada. Sin motivo del servidor, un texto de error de verdad.
        await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
        return;
      }
      await this.carga();
    } finally {
      this.ocupado.set(false);
    }
  }

  private async carga(): Promise<void> {
    this.sesiones.set(await this.consulta.ejecuta());
  }
}
