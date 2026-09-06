import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxesPacking, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ProyectoOdm, tienePresupuesto } from '../../domain/model/proyecto-odm';
import { TasaDeCambio, formateaImporte } from '../../domain/model/tasa-de-cambio';
import { ESTADO_DE_PROYECTO_ODM_PORT, PROYECTOS_ODM_PORT } from '../../domain/port/odm.port';
import { TASAS_DE_CAMBIO_PORT } from '../../domain/port/tasas-de-cambio.port';
import {
  CreaProyectoOdm,
  FormularioDeProyecto,
} from '../../application/use-case/crea-proyecto-odm.use-case';
import {
  DialogoDetalleDeProyecto,
  EdicionDeProyecto,
} from '../component/dialogo-detalle-de-proyecto';
import { DialogoNuevoProyecto } from '../component/dialogo-nuevo-proyecto';

/**
 * Proyectos a medida: ODM, OEM y empaquetado con marca propia.
 *
 * <p>Un rechazo del backend siempre se avisa. Sin eso, el formulario se quedaba abierto, sin proyecto y
 * sin decir nada: quien lo usaba no podía distinguir un fallo del servidor de un campo mal puesto.
 *
 * <p>MOBILE FIRST: las tarjetas en una columna, dos a partir de `sm` y tres en pantalla grande.
 */
@Component({
  selector: 'nx-odm',
  imports: [FaIconComponent, DialogoNuevoProyecto, DialogoDetalleDeProyecto],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('odm.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('odm.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="formularioAbierto.set(true)">
          <fa-icon [icon]="iconos.mas" /> {{ t('odm.new') }}
        </button>
      </header>

      @if (proyectos().length === 0) {
        <!--
          El texto de esta tarjeta estaba escrito en castellano dentro del componente: salía en español
          con la interfaz en inglés o en chino. Se compone con claves ya traducidas a los ocho idiomas
          y se remata con la llamada a crear el primer proyecto, que es lo único que se puede hacer
          desde una lista vacía.
        -->
        <div class="card p-10 text-center text-ink-500 space-y-3">
          <fa-icon [icon]="iconos.cajas" class="text-3xl text-ink-300" />
          <p>{{ t('odm.subtitle') }}</p>
          <button
            type="button"
            class="btn btn-primary btn-sm mx-auto"
            (click)="formularioAbierto.set(true)"
          >
            <fa-icon [icon]="iconos.mas" /> {{ t('odm.new') }}
          </button>
        </div>
      }

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (proyecto of proyectos(); track proyecto.id) {
          <button
            type="button"
            class="card p-4 text-left hover:border-brand-300 transition-colors"
            (click)="detalle.set(proyecto)"
          >
            <div class="flex items-baseline justify-between mb-2">
              <span class="badge bg-brand-50 text-brand-700">
                {{ t('odm.kind.' + proyecto.clase) }}
              </span>
              <span class="badge bg-ink-100 text-ink-700">{{ proyecto.estado }}</span>
            </div>
            <div class="font-medium">{{ proyecto.titulo }}</div>
            @if (proyecto.resumen; as resumen) {
              <p class="text-[12px] text-ink-600 mt-1 line-clamp-3">{{ resumen }}</p>
            }
            <div class="text-[11px] text-ink-500 mt-2">
              @if (tienePresupuesto(proyecto)) {
                {{ presupuesto(proyecto) }} ·
              }
              SLA {{ proyecto.diasDeCompromiso }}d
            </div>
          </button>
        }
      </div>

      @if (detalle(); as abierto) {
        <nx-dialogo-detalle-de-proyecto
          [proyecto]="abierto"
          [guardando]="guardando()"
          (cambiaEstado)="cambiaEstado(abierto, $event)"
          (guardaCambios)="guarda(abierto, $event)"
          (elimina)="elimina(abierto)"
          (cancela)="detalle.set(null)"
        />
      }

      @if (formularioAbierto()) {
        <nx-dialogo-nuevo-proyecto
          [tasas]="tasas()"
          [divisaInicial]="divisa()"
          [enviando]="creando()"
          (crea)="crea($event)"
          (cancela)="formularioAbierto.set(false)"
        />
      }
    </div>
  `,
})
export class OdmPage {
  private readonly puertoDeProyectos = inject(PROYECTOS_ODM_PORT);
  private readonly puertoDeEstado = inject(ESTADO_DE_PROYECTO_ODM_PORT);
  private readonly puertoDeTasas = inject(TASAS_DE_CAMBIO_PORT);
  private readonly creaProyecto = inject(CreaProyectoOdm);
  private readonly dialogo = inject(DialogoStore);
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = this.traduccion.t;

  protected readonly iconos = { mas: faPlus, cajas: faBoxesPacking };

  protected readonly proyectos = signal<readonly ProyectoOdm[]>([]);
  protected readonly tasas = signal<readonly TasaDeCambio[]>([]);
  protected readonly divisa = this.preferencias.moneda;

  protected readonly detalle = signal<ProyectoOdm | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly creando = signal(false);
  protected readonly guardando = signal(false);

  constructor() {
    void this.recarga();
    void this.cargaTasas();
  }

  protected tienePresupuesto = tienePresupuesto;

  protected presupuesto(proyecto: ProyectoOdm): string {
    return formateaImporte(
      (proyecto.presupuestoEnCentimosUsd ?? 0) / 100,
      'USD',
      this.traduccion.idioma(),
    );
  }

  protected async crea(formulario: FormularioDeProyecto): Promise<void> {
    this.creando.set(true);
    try {
      const resultado = await this.creaProyecto.ejecuta(formulario, this.tasas());
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje);
        return;
      }
      this.formularioAbierto.set(false);
      await this.recarga();
    } finally {
      this.creando.set(false);
    }
  }

  protected async guarda(proyecto: ProyectoOdm, edicion: EdicionDeProyecto): Promise<void> {
    this.guardando.set(true);
    try {
      const centimos = parseFloat(edicion.presupuestoEnDolares);
      const resultado = await this.puertoDeProyectos.actualiza(proyecto.id, {
        // La clase no se edita: cambiarla convertiría el proyecto en otro distinto con su historia.
        clase: proyecto.clase,
        titulo: edicion.titulo.trim(),
        resumen: edicion.resumen.trim() || undefined,
        presupuestoEnCentimosUsd: Number.isFinite(centimos) ? Math.round(centimos * 100) : undefined,
      });
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje);
        return;
      }
      this.detalle.set(resultado.valor);
      await this.recarga();
      await this.dialogo.alerta(this.t('odm.action.saved'), undefined, 'success');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async cambiaEstado(proyecto: ProyectoOdm, estado: string): Promise<void> {
    const resultado = await this.puertoDeEstado.cambia(proyecto.id, estado);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    this.detalle.set(resultado.valor);
    await this.recarga();
  }

  protected async elimina(proyecto: ProyectoOdm): Promise<void> {
    const mensaje = this.t('odm.action.delete_confirm').replace('{title}', proyecto.titulo);
    if (!(await this.dialogo.confirma(mensaje))) {
      return;
    }
    const resultado = await this.puertoDeProyectos.elimina(proyecto.id);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    this.detalle.set(null);
    await this.recarga();
    await this.dialogo.alerta(this.t('odm.action.deleted'), undefined, 'success');
  }

  private async recarga(): Promise<void> {
    const resultado = await this.puertoDeProyectos.mios();
    if (resultado.ok) {
      this.proyectos.set(resultado.valor);
    }
  }

  private async cargaTasas(): Promise<void> {
    const resultado = await this.puertoDeTasas.consulta();
    if (resultado.ok) {
      this.tasas.set(resultado.valor);
    }
  }

  private async avisa(mensaje: string): Promise<void> {
    await this.dialogo.alerta(mensaje || this.t('odm.action.error'), undefined, 'error');
  }
}
