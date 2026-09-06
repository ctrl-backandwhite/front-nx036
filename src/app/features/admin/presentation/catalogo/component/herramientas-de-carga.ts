import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileImport, faRotate, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ReindexaCatalogo } from '../../../application/catalogo/use-case/reindexa-catalogo.use-case';
import { ClaseDeImportacion } from '../../../domain/catalogo/model/esquema-de-importacion';
import { mensajeDeError } from '../etiquetas';
import { ImportadorMasivo } from './importador-masivo';

/**
 * Las dos herramientas que acompañan a las tablas del catálogo: sincronizar con el buscador e importar
 * en bloque.
 *
 * <p>Van juntas porque se usan seguidas: se importa y se reindexa. El reindexado corre en segundo plano
 * y aquí se sondea hasta que acaba, para poder decir cuántos entraron.
 */
@Component({
  selector: 'nx-herramientas-de-carga',
  imports: [FaIconComponent, ImportadorMasivo],
  template: `
    <button
      type="button"
      class="btn btn-outline btn-sm text-[12px]"
      [disabled]="reindexando()"
      [title]="t('admin.catalog.reindex.hint')"
      (click)="reindexa()"
    >
      <fa-icon [icon]="reindexando() ? iconos.girando : iconos.sincronizar" [class.fa-spin]="reindexando()" />
      {{ t('admin.catalog.reindex.btn') }}
    </button>
    <button type="button" class="btn btn-outline btn-sm text-[12px]" (click)="abierto.set(true)">
      <fa-icon [icon]="iconos.importar" /> {{ t('admin.catalog.bulk.btn') }}
    </button>

    <!--
      El importador trae la plantilla completa, la referencia de campos y el lector de archivos por
      flujo. Nada de eso hace falta hasta que alguien lo abre, así que su código tampoco.
    -->
    @defer (when abierto()) {
      @if (abierto()) {
        <nx-importador-masivo
          [clase]="clase()"
          (cierra)="abierto.set(false)"
          (terminado)="terminado.emit()"
        />
      }
    }
  `,
})
export class HerramientasDeCarga {
  readonly clase = input.required<ClaseDeImportacion>();
  readonly terminado = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly reindexado = inject(ReindexaCatalogo);

  protected readonly iconos = { sincronizar: faRotate, importar: faFileImport, girando: faSpinner };
  protected readonly abierto = signal(false);
  protected readonly reindexando = signal(false);

  protected async reindexa(): Promise<void> {
    this.reindexando.set(true);
    try {
      const resultado = await this.reindexado.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error, 'admin.catalog.reindex.error'));
        return;
      }
      if (resultado.valor.yaEstabaEnMarcha) {
        this.avisos.muestra({
          tipo: 'info',
          mensaje: this.t('admin.catalog.reindex.running_already'),
        });
        return;
      }
      this.avisos.exito(
        this.tCon('admin.catalog.reindex.ok', { n: resultado.valor.indexados }),
      );
    } finally {
      this.reindexando.set(false);
    }
  }
}
