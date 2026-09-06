import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCircleInfo,
  faCopy,
  faFileImport,
  faPaperclip,
  faSpinner,
  faTriangleExclamation,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ImportaFilas } from '../../../application/catalogo/use-case/importa-filas.use-case';
import { ImportaNdjson } from '../../../application/catalogo/use-case/importa-ndjson.use-case';
import { LeeArchivoDeImportacion } from '../../../application/catalogo/use-case/lee-archivo-de-importacion.use-case';
import { analizaJson } from '../../../domain/catalogo/model/analisis-de-json';
import { ClaseDeImportacion, ESQUEMAS } from '../../../domain/catalogo/model/esquema-de-importacion';
import { FilaDeImportacion } from '../../../domain/catalogo/model/importacion-masiva';
import { EJEMPLOS, PLANTILLAS } from '../../../domain/catalogo/model/plantilla-de-importacion';
import { ArchivoLocal } from '../../../domain/catalogo/port/transferencia-de-catalogo.port';
import { mensajeDeError, textoDelProblema } from '../etiquetas';
import { TablaDeCampos } from './tabla-de-campos';
import { VentanaModal } from './ventana-modal';

/** Cuántos problemas se enumeran de una vez: más no caben ni ayudan. */
const PROBLEMAS_VISIBLES = 50;

/**
 * Un problema con identidad propia.
 *
 * <p>El texto no sirve como identidad —dos filas pueden fallar por lo mismo— y el índice tampoco:
 * `track` por posición reconstruye la lista entera en cuanto cambia. Se numeran al publicarlos.
 */
interface ProblemaVisible {
  readonly id: number;
  readonly texto: string;
}

let siguienteProblema = 0;

function conIdentidad(textos: readonly string[]): readonly ProblemaVisible[] {
  return textos.map((texto) => ({ id: ++siguienteProblema, texto }));
}

/**
 * El importador masivo de productos y de categorías.
 *
 * <p>Es una de las dos mitades de la vía por la que el catálogo cruza de entorno a entorno —la otra es
 * la exportación—, así que su formato es el mismo en los dos sentidos y hace UPSERT por identificador
 * externo: reimportar un fichero exportado actualiza, no duplica.
 *
 * <p>Hay tres formas de meter datos, y no sobra ninguna: pegar el JSON (lo normal), adjuntar un `.json`
 * (miles de filas) y adjuntar un `.ndjson`, que se recorre por flujo y aguanta millones sin cargarse en
 * memoria.
 */
@Component({
  selector: 'nx-importador-masivo',
  imports: [FaIconComponent, VentanaModal, TablaDeCampos],
  template: `
    <nx-ventana-modal
      [titulo]="t(clase() === 'products' ? 'admin.catalog.bulk.title_products' : 'admin.catalog.bulk.title_categories')"
      ancho="sm:max-w-6xl"
      (cierra)="cierra.emit()"
    >
      <p class="text-[12px] opacity-70 mb-2">{{ t('admin.catalog.bulk.help') }}</p>

      <button
        type="button"
        class="btn btn-ghost btn-xs text-[12px] px-1"
        [attr.aria-expanded]="camposVisibles()"
        (click)="camposVisibles.set(!camposVisibles())"
      >
        <fa-icon [icon]="iconos.info" /> {{ t('admin.catalog.bulk.fields') }}
      </button>
      @if (camposVisibles()) {
        <nx-tabla-de-campos [campos]="esquema()" />
      }

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mt-2">
        <span class="text-[12px]" [class.text-success]="analisis().clase === 'valido'">
          {{ resumenDelAnalisis() }}
        </span>
        <div class="flex items-center gap-1 flex-wrap">
          <!--
            El diccionario no tiene una entrada propia para «adjuntar»: se reutiliza la de subir, que
            dice lo mismo, en vez de inventar una clave que saldría sin traducir en siete idiomas.
          -->
          <label class="btn btn-ghost btn-xs text-[12px] cursor-pointer">
            <fa-icon [icon]="iconos.clip" /> {{ t('admin.catalog.images.upload') }}
            <input
              type="file"
              class="hidden"
              [accept]="formatosAdmitidos()"
              [disabled]="ocupado()"
              (change)="adjunta($event)"
            />
          </label>
          <button type="button" class="btn btn-ghost btn-xs text-[12px]" (click)="ponEjemplo()">
            <fa-icon [icon]="iconos.varita" /> {{ t('admin.catalog.bulk.example') }}
          </button>
          <button type="button" class="btn btn-ghost btn-xs text-[12px]" (click)="ponPlantilla()">
            <fa-icon [icon]="iconos.importar" /> {{ t('admin.catalog.bulk.template_full') }}
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs text-[12px]"
            [disabled]="!texto().trim()"
            (click)="copia()"
          >
            <fa-icon
              [icon]="copiado() ? iconos.marca : iconos.copiar"
              [class.text-success]="copiado()"
            />
            {{ t('docs.copy') }}
          </button>
        </div>
      </div>

      @if (adjunto(); as archivo) {
        <div class="my-1 p-2 rounded-box bg-primary/10 border border-primary/30 text-[12px] flex items-center justify-between gap-2">
          <span class="flex items-center gap-2 min-w-0">
            <fa-icon [icon]="iconos.clip" class="text-primary" />
            <span class="truncate"><b>{{ archivo.nombre }}</b></span>
          </span>
          <button
            type="button"
            class="btn btn-ghost btn-xs shrink-0"
            [disabled]="ocupado()"
            (click)="quitaAdjunto()"
          >
            <fa-icon [icon]="iconos.aspa" /> {{ t('actions.cancel') }}
          </button>
        </div>
      }

      @if (avance(); as progreso) {
        <div class="my-1">
          <div class="flex items-center justify-between text-[12px] mb-0.5">
            <span class="flex items-center gap-1">
              <fa-icon [icon]="iconos.girando" class="fa-spin" /> {{ t('common.loading') }}
            </span>
            <span class="font-mono">{{ porcentaje() }}%</span>
          </div>
          <progress class="progress progress-primary w-full" [value]="progreso.hechas" [max]="progreso.total"></progress>
        </div>
      }

      <label for="importador-json" class="sr-only">{{ t('admin.catalog.bulk.help') }}</label>
      <textarea
        id="importador-json"
        class="textarea textarea-bordered w-full font-mono text-[12px] h-64 resize-none"
        spellcheck="false"
        [disabled]="!!adjunto()"
        [value]="texto()"
        (input)="escribe($event)"
      ></textarea>

      @if (problemas().length > 0) {
        <div role="alert" class="mt-2 p-3 rounded-box bg-error/10 border border-error/30 text-[12px] max-h-40 overflow-auto">
          <div class="font-semibold text-error mb-1">
            <fa-icon [icon]="iconos.aviso" /> {{ t('admin.catalog.bulk.validation_errors') }}
          </div>
          <ul class="list-disc pl-4 space-y-0.5">
            @for (problema of problemas(); track problema.id) {
              <li>{{ problema.texto }}</li>
            }
          </ul>
        </div>
      }

      <ng-container pie>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          [disabled]="ocupado()"
          (click)="cierra.emit()"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="ocupado() || !sePuedeImportar()"
          (click)="importa()"
        >
          @if (ocupado()) {
            <fa-icon [icon]="iconos.girando" class="fa-spin" />
          }
          {{ t('admin.catalog.bulk.import') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class ImportadorMasivo {
  readonly clase = input.required<ClaseDeImportacion>();
  readonly cierra = output<void>();
  readonly terminado = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly importaFilas = inject(ImportaFilas);
  private readonly importaNdjson = inject(ImportaNdjson);
  private readonly leeArchivo = inject(LeeArchivoDeImportacion);

  protected readonly iconos = {
    info: faCircleInfo,
    clip: faPaperclip,
    varita: faWandMagicSparkles,
    importar: faFileImport,
    copiar: faCopy,
    aspa: faXmark,
    girando: faSpinner,
    aviso: faTriangleExclamation,
    marca: faCircleCheck,
  };

  /**
   * El texto del editor.
   *
   * <p>Arranca con la PLANTILLA COMPLETA porque es lo único que enseña de golpe todos los campos que se
   * aceptan. Se deriva de `clase` con `linkedSignal` y no se fija en el constructor: un `input`
   * obligatorio todavía no tiene valor ahí, y además así cambiar de productos a categorías trae la
   * plantilla que toca.
   */
  protected readonly texto = linkedSignal<ClaseDeImportacion, string>({
    source: () => this.clase(),
    computation: (clase) => PLANTILLAS[clase],
  });
  protected readonly camposVisibles = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly avance = signal<{ hechas: number; total: number } | null>(null);
  protected readonly problemas = signal<readonly ProblemaVisible[]>([]);
  protected readonly copiado = signal(false);

  /** El archivo adjunto y, si es JSON, sus filas ya analizadas. El NDJSON no se analiza aquí. */
  protected readonly adjunto = signal<ArchivoLocal | null>(null);
  private readonly filasDelArchivo = signal<readonly FilaDeImportacion[] | null>(null);

  protected readonly esquema = computed(() => ESQUEMAS[this.clase()]);

  /** Análisis EN VIVO del texto pegado: el error típico se arregla en dos segundos si se ve dónde está. */
  protected readonly analisis = computed(() => analizaJson(this.texto(), this.clase()));

  protected readonly sePuedeImportar = computed(
    () => !!this.adjunto() || this.analisis().clase === 'valido',
  );

  protected readonly porcentaje = computed(() => {
    const progreso = this.avance();
    return progreso && progreso.total > 0
      ? Math.round((progreso.hechas / progreso.total) * 100)
      : 0;
  });

  protected formatosAdmitidos(): string {
    return this.clase() === 'products'
      ? '.json,.ndjson,application/json,application/x-ndjson'
      : '.json,application/json';
  }

  protected resumenDelAnalisis(): string {
    const analisis = this.analisis();
    switch (analisis.clase) {
      case 'valido':
        return this.tCon('admin.catalog.bulk.rows_count', { n: analisis.filas });
      case 'sintaxis':
        return `${this.t('admin.catalog.bulk.invalid_json')} — ${analisis.mensaje}`;
      case 'no-es-lista':
        return this.t('admin.catalog.bulk.err_object');
      case 'invalido':
        return this.tCon('admin.catalog.bulk.rows_count', { n: analisis.filas });
      default:
        return this.t('admin.catalog.bulk.empty');
    }
  }

  protected escribe(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
    this.problemas.set([]);
  }

  protected ponEjemplo(): void {
    this.texto.set(EJEMPLOS[this.clase()]);
    this.problemas.set([]);
  }

  protected ponPlantilla(): void {
    this.texto.set(PLANTILLAS[this.clase()]);
    this.problemas.set([]);
  }

  /**
   * Copia el JSON del editor.
   *
   * <p>La confirmación es un ICONO y no un texto: el diccionario no tiene una entrada para «copiado» en
   * este contexto, y una marca verde durante un segundo y medio se entiende en los ocho idiomas.
   */
  protected async copia(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.texto());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1500);
    } catch {
      // Sin portapapeles disponible no hay nada que avisar: el texto sigue ahí para copiarlo a mano.
    }
  }

  protected async adjunta(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    // Se vacía para poder volver a elegir el MISMO archivo: sin esto, el segundo intento no dispara.
    campo.value = '';
    if (!archivo) {
      return;
    }
    this.problemas.set([]);
    const local: ArchivoLocal = { nombre: archivo.name, tamano: archivo.size, fuente: archivo };
    if (this.clase() === 'products' && /\.ndjson$/i.test(archivo.name)) {
      this.filasDelArchivo.set(null);
      this.adjunto.set(local);
      return;
    }
    const leido = await this.leeArchivo.ejecuta(local);
    if (!leido.ok) {
      this.problemas.set(
        conIdentidad([mensajeDeError(this.t, leido.error, 'admin.catalog.bulk.invalid_json')]),
      );
      return;
    }
    this.filasDelArchivo.set(leido.valor);
    this.adjunto.set(local);
  }

  protected quitaAdjunto(): void {
    this.adjunto.set(null);
    this.filasDelArchivo.set(null);
    this.problemas.set([]);
  }

  protected async importa(): Promise<void> {
    this.ocupado.set(true);
    this.problemas.set([]);
    try {
      const resultado = await this.ejecutaImportacion();
      if (!resultado) {
        return;
      }
      const mensaje = this.tCon('admin.catalog.bulk.result', {
        ok: resultado.creados,
        fail: resultado.fallidos,
      });
      if (resultado.fallidos > 0) {
        // Los errores NO se borran al acabar: tras una carga de horas, «fallidos: 200» sin decir cuáles
        // ni por qué no deja nada que corregir.
        this.problemas.set(conIdentidad(resultado.errores));
        this.avisos.error(mensaje);
      } else {
        this.avisos.exito(mensaje);
        this.cierra.emit();
      }
      this.terminado.emit();
    } finally {
      this.ocupado.set(false);
      this.avance.set(null);
    }
  }

  private async ejecutaImportacion(): Promise<
    { creados: number; fallidos: number; errores: readonly string[] } | null
  > {
    const archivo = this.adjunto();
    const filas = this.filasDelArchivo();
    if (archivo && !filas) {
      const resultado = await this.importaNdjson.ejecuta(archivo, (progreso) =>
        this.avance.set({ hechas: progreso.bytes, total: progreso.total }),
      );
      return resultado.ok ? resultado.valor : this.avisa(resultado.error);
    }
    const analisis = this.analisis();
    const aMandar = filas ?? (analisis.clase === 'valido' ? analisis.lista : null);
    if (!aMandar) {
      this.problemas.set(conIdentidad(this.problemasDelAnalisis()));
      return null;
    }
    const resultado = await this.importaFilas.ejecuta(aMandar, this.clase(), (progreso) =>
      this.avance.set(progreso),
    );
    return resultado.ok ? resultado.valor : this.avisa(resultado.error);
  }

  private problemasDelAnalisis(): readonly string[] {
    const analisis = this.analisis();
    if (analisis.clase !== 'invalido') {
      return [this.resumenDelAnalisis()];
    }
    return analisis.problemas
      .slice(0, PROBLEMAS_VISIBLES)
      .map((problema) => textoDelProblema(this.t, this.tCon, problema));
  }

  private avisa(error: { mensaje?: string }): null {
    this.avisos.error(mensajeDeError(this.t, error, 'admin.catalog.bulk.error'));
    return null;
  }
}
