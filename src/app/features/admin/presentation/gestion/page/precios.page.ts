import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faCircleCheck, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { Seleccion } from '../../../application/gestion/state/seleccion';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  AlternaLaRegla,
  AlternaReglasEnLote,
  AmbitosDisponibles,
  BorraLaRegla,
  BorraReglasEnLote,
  CargaLosAmbitos,
  ConsultaElAjusteDeMoq,
  ConsultaReglas,
  GuardaElAjusteDeMoq,
  GuardaLaRegla,
} from '../../../application/gestion/use-case/precios.use-case';
import { ResultadoMasivo } from '../../../domain/gestion/model/pagina';
import {
  AjusteDeMoq,
  BorradorDeRegla,
  ReglaDePrecio,
  reglaEnBlanco,
} from '../../../domain/gestion/model/precios';
import { PreciosAjusteMoq } from '../component/precios-ajuste-moq';
import { PreciosEditorDeRegla } from '../component/precios-editor-de-regla';
import { PreciosTablaDeReglas } from '../component/precios-tabla-de-reglas';

/**
 * Las reglas de MARGEN.
 *
 * <p>REGLA DEL NEGOCIO: el precio de venta lo calcula el BACKEND —margen, envío, arancel e IVA—. Esta
 * pantalla solo edita las reglas con las que lo hace; ninguna cuenta se rehace aquí. La columna que se
 * pinta en los listados del catálogo es el COSTE, no lo que paga nadie.
 *
 * <p>El país de una regla es aquel al que se aplica el margen, y el backend lo casa con el país de
 * REGISTRO de quien compra, nunca con el de envío del pedido.
 *
 * <p>Se avisa de las dos cosas que dejan los precios sin determinar: reglas DUPLICADAS —misma huella,
 * hacen lo mismo y sobra una— y TRAMOS DE COSTE SOLAPADOS del mismo ámbito, que hacen que el mismo
 * producto pueda salir a dos precios según el orden en que se evalúen las reglas.
 *
 * <p>En el React, tras tocar una regla había que invalidar además las cachés del catálogo, la portada y
 * las fichas: eran copias del precio guardadas en el cliente. Aquí no existen —el precio se pide cuando
 * se pinta y el backend ya recalcula—, así que basta con releer las reglas.
 *
 * <p>MOBILE FIRST: la tabla va en su contenedor con desplazamiento horizontal y la cabecera se pliega en
 * varias filas; las acciones en lote solo aparecen cuando hay algo marcado, para no ocupar sitio.
 */
@Component({
  selector: 'nx-precios-admin',
  imports: [FaIconComponent, PreciosAjusteMoq, PreciosEditorDeRegla, PreciosTablaDeReglas],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>{{ t('admin.pricing.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.pricing.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (seleccion.hayAlguno()) {
            <div class="flex items-center gap-1 flex-wrap mr-1">
              <span class="text-[11px] text-ink-500 mr-1">
                {{ tCon('admin.bulk.selected', { n: seleccion.cuantos() }) }}
              </span>
              <button
                type="button"
                class="btn btn-outline btn-sm text-[12px]"
                [disabled]="enLote()"
                [title]="t('admin.pricing.activate')"
                (click)="cambiaActividadEnLote(true)"
              >
                <fa-icon [icon]="iconos.si" /> {{ t('admin.pricing.activate') }}
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm text-[12px]"
                [disabled]="enLote()"
                [title]="t('admin.pricing.deactivate')"
                (click)="cambiaActividadEnLote(false)"
              >
                <fa-icon [icon]="iconos.no" /> {{ t('admin.pricing.deactivate') }}
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700 hover:bg-red-50"
                [disabled]="enLote()"
                [title]="t('actions.delete')"
                (click)="borraEnLote()"
              >
                <fa-icon [icon]="iconos.papelera" /> {{ t('actions.delete') }}
              </button>
            </div>
          }
          <button type="button" class="btn btn-primary" (click)="abreAlta()">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.pricing.add') }}
          </button>
        </div>
      </div>

      <nx-precios-ajuste-moq
        [ajuste]="moq()"
        [guardando]="guardandoMoq()"
        (guarda)="guardaElMoq($event)"
      />

      <nx-precios-tabla-de-reglas
        [reglas]="reglas()"
        [seleccion]="seleccion"
        [alternando]="alternando()"
        (edita)="abreEdicion($event)"
        (borra)="borra($event)"
        (alterna)="alterna($event)"
      />

      @if (editando(); as borrador) {
        <nx-precios-editor-de-regla
          [inicial]="borrador"
          [reglas]="reglas()"
          [ambitos]="ambitos()"
          [guardando]="guardando()"
          (cancela)="editando.set(null)"
          (guarda)="guardaLaRegla($event)"
        />
      }
    </div>
  `,
})
export class PreciosPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly consultaReglas = inject(ConsultaReglas);
  private readonly guardaRegla = inject(GuardaLaRegla);
  private readonly alternaRegla = inject(AlternaLaRegla);
  private readonly borraRegla = inject(BorraLaRegla);
  private readonly alternaEnLote = inject(AlternaReglasEnLote);
  private readonly borraLoteDeReglas = inject(BorraReglasEnLote);
  private readonly consultaMoq = inject(ConsultaElAjusteDeMoq);
  private readonly guardaMoq = inject(GuardaElAjusteDeMoq);
  private readonly cargaLosAmbitos = inject(CargaLosAmbitos);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  private readonly importes = inject(ImportesStore);

  protected readonly iconos = {
    mas: faPlus,
    papelera: faTrashCan,
    si: faCircleCheck,
    no: faBan,
  };

  /** Cada tabla tiene SU selección: es un campo del componente, no un servicio compartido. */
  protected readonly seleccion = new Seleccion();

  protected readonly reglas = signal<readonly ReglaDePrecio[]>([]);
  protected readonly moq = signal<AjusteDeMoq | null>(null);
  protected readonly ambitos = signal<AmbitosDisponibles>({
    categorias: [],
    proveedores: [],
    productos: [],
    grupos: [],
  });

  protected readonly editando = signal<BorradorDeRegla | null>(null);
  protected readonly guardando = signal(false);
  protected readonly guardandoMoq = signal(false);
  protected readonly alternando = signal(false);
  protected readonly enLote = signal(false);

  constructor() {
    void this.importes.carga();
    void this.recarga();
    void this.cargaAmbitos();
  }

  private async recarga(): Promise<void> {
    const [reglas, moq] = await Promise.all([
      this.consultaReglas.ejecuta(),
      this.consultaMoq.ejecuta(),
    ]);
    if (reglas.ok) {
      this.reglas.set(reglas.valor);
    } else {
      this.avisos.error(reglas.error.mensaje || this.t('errors.generic'));
    }
    if (moq.ok) {
      this.moq.set(moq.valor);
    }
    // El ajuste por pedido mínimo es una palanca aparte: si no se puede leer, su tarjeta no se pinta y
    // las reglas siguen administrándose.
  }

  private async cargaAmbitos(): Promise<void> {
    this.ambitos.set(await this.cargaLosAmbitos.ejecuta());
  }

  protected abreAlta(): void {
    this.editando.set(reglaEnBlanco());
  }

  protected abreEdicion(regla: ReglaDePrecio): void {
    this.editando.set({ ...regla });
  }

  protected async guardaLaRegla(borrador: BorradorDeRegla): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardaRegla.ejecuta(borrador);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.editando.set(null);
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(regla: ReglaDePrecio): Promise<void> {
    this.alternando.set(true);
    try {
      const resultado = await this.alternaRegla.ejecuta(regla.id);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      await this.recarga();
    } finally {
      this.alternando.set(false);
    }
  }

  protected async borra(regla: ReglaDePrecio): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.pricing.delete_confirm'),
      this.t('admin.pricing.delete_title'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.borraRegla.ejecuta(regla.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    await this.recarga();
  }

  protected async guardaElMoq(ajuste: AjusteDeMoq): Promise<void> {
    this.guardandoMoq.set(true);
    try {
      const resultado = await this.guardaMoq.ejecuta(ajuste);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.moq.set(resultado.valor);
      this.avisos.exito(this.t('admin.pricing.moq.saved'));
    } finally {
      this.guardandoMoq.set(false);
    }
  }

  protected cambiaActividadEnLote(activa: boolean): Promise<void> {
    return this.corre((ids) => this.alternaEnLote.ejecuta(ids, activa));
  }

  protected async borraEnLote(): Promise<void> {
    const cuantas = this.seleccion.cuantos();
    if (cuantas === 0) {
      return;
    }
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.bulk.delete_confirm', { n: cuantas }),
      this.t('admin.pricing.delete_title'),
    );
    if (!confirmado) {
      return;
    }
    await this.corre((ids) => this.borraLoteDeReglas.ejecuta(ids));
  }

  /**
   * El lote NO se aborta cuando una falla: el backend sigue con las demás, así que se dicen las dos
   * cifras. Repetir el lote entero volvería a intentar lo ya hecho y daría otro error encima.
   */
  private async corre(
    accion: (ids: readonly string[]) => Promise<Result<ResultadoMasivo, AppError>>,
  ): Promise<void> {
    const ids = this.seleccion.filasDe(this.reglas()).map((r) => r.id);
    if (ids.length === 0) {
      return;
    }
    this.enLote.set(true);
    try {
      const resultado = await accion(ids);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      const parte = resultado.valor;
      this.seleccion.limpia();
      await this.recarga();
      const resumen = this.tCon('admin.bulk.done', {
        ok: parte.correctos,
        fail: parte.fallidos,
      });
      this.avisos.muestra({
        tipo: parte.fallidos ? 'warning' : 'success',
        mensaje: parte.fallidos ? `${resumen}\n${parte.errores.slice(0, 8).join('\n')}` : resumen,
      });
    } finally {
      this.enLote.set(false);
    }
  }
}
