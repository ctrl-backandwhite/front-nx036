import { Component, inject, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileSignature, faRotate, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  CambiaAprobacionDeGrupo,
  GuardaDescripcionDeGrupo,
  ListaGruposDeDeclaracion,
  SiembraGruposDeDeclaracion,
} from '../../../application/catalogo/use-case/administra-grupos-de-declaracion.use-case';
import { GrupoDeDeclaracion } from '../../../domain/catalogo/model/grupo-de-declaracion';
import { FilaDeDeclaracion } from '../component/fila-de-declaracion';
import { mensajeDeError } from '../etiquetas';

/**
 * Los grupos de declaración aduanera: la terna (partida, material y uso) y la descripción genérica con
 * la que se declaran todos los productos que la comparten.
 *
 * <p>El derecho temporal de la Unión son 3 EUR <b>por línea de declaración</b>, no por producto. Dos
 * artículos con la misma descripción son una sola línea y pagan un solo derecho; con descripciones
 * distintas son dos y pagan dos. Esta pantalla es donde se decide ese texto.
 *
 * <p><b>Aprobar es firmar.</b> Mientras un grupo esté sin aprobar, cada producto sigue siendo su propia
 * línea: se cobra de más, nunca de menos. Y guardar el texto de uno ya aprobado lo devuelve a «sin
 * revisar» —lo decide el backend—, por eso se avisa: irse creyendo que el texto ya agrupa cuando cada
 * producto ha vuelto a ser su propia línea sale caro.
 */
@Component({
  selector: 'nx-admin-grupos-de-declaracion',
  imports: [FaIconComponent, FilaDeDeclaracion],
  template: `
    <div class="space-y-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-medium flex items-center gap-2">
            <fa-icon [icon]="iconos.firma" class="text-brand-600" />
            {{ t('admin.declgroups.title') }}
          </h1>
          <p class="text-[12px] text-ink-500 max-w-3xl mt-1">{{ t('admin.declgroups.intro') }}</p>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline"
          [disabled]="ocupado()"
          (click)="siembra()"
        >
          <fa-icon [icon]="iconos.sincronizar" [class.animate-spin]="ocupado()" />
          {{ t('admin.declgroups.sync') }}
        </button>
      </header>

      @if (aviso(); as texto) {
        <div
          role="alert"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 flex items-center gap-2"
        >
          <fa-icon [icon]="iconos.atencion" />
          {{ texto }}
        </div>
      }

      @if (!grupos.isLoading() && grupos.value().length === 0) {
        <p class="text-[13px] text-ink-500">{{ t('admin.declgroups.empty') }}</p>
      }

      <div class="overflow-x-auto">
        <table class="table table-sm w-full">
          <thead>
            <tr class="text-[11px] uppercase tracking-wide text-ink-400">
              <th class="text-left">{{ t('admin.declgroups.terna') }}</th>
              <th class="text-right">{{ t('admin.declgroups.products') }}</th>
              <th class="text-left">{{ t('admin.declgroups.ename') }}</th>
              <th class="text-left">{{ t('admin.declgroups.cname') }}</th>
              <th class="text-left">{{ t('admin.declgroups.state') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (grupo of grupos.value(); track grupo.id) {
              <nx-fila-de-declaracion
                [grupo]="grupo"
                (guarda)="guarda(grupo, $event.ingles, $event.chino)"
                (cambiaAprobacion)="cambia(grupo, $event)"
              />
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class GruposDeDeclaracionPage {
  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly lista = inject(ListaGruposDeDeclaracion);
  private readonly guardaDescripcion = inject(GuardaDescripcionDeGrupo);
  private readonly cambiaAprobacion = inject(CambiaAprobacionDeGrupo);
  private readonly siembraGrupos = inject(SiembraGruposDeDeclaracion);

  protected readonly iconos = {
    firma: faFileSignature,
    sincronizar: faRotate,
    atencion: faTriangleExclamation,
  };

  protected readonly aviso = signal<string | null>(null);
  protected readonly ocupado = signal(false);

  protected readonly grupos = resource({
    loader: async () => {
      const resultado = await this.lista.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  /**
   * Guardar el texto DESAPRUEBA el grupo en el backend, y eso hay que decirlo: cambiar la descripción
   * es cambiar lo que se declara ante veintisiete aduanas.
   */
  protected async guarda(
    grupo: GrupoDeDeclaracion,
    ingles: string,
    chino: string,
  ): Promise<void> {
    const resultado = await this.guardaDescripcion.ejecuta(grupo.id, ingles, chino);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'common.error'));
      return;
    }
    this.aviso.set(this.t('admin.declgroups.saved_unapproved'));
    this.grupos.reload();
  }

  protected async cambia(grupo: GrupoDeDeclaracion, aprobar: boolean): Promise<void> {
    const resultado = await this.cambiaAprobacion.ejecuta(grupo, aprobar);
    if (!resultado.ok) {
      this.avisos.error(mensajeDeError(this.t, resultado.error, 'common.error'));
      return;
    }
    this.aviso.set(null);
    this.grupos.reload();
  }

  protected async siembra(): Promise<void> {
    this.ocupado.set(true);
    try {
      const resultado = await this.siembraGrupos.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'common.error'));
        return;
      }
      this.aviso.set(this.tCon('admin.declgroups.synced', { n: resultado.valor }));
      this.grupos.reload();
    } finally {
      this.ocupado.set(false);
    }
  }
}
