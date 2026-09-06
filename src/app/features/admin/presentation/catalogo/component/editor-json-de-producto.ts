import { Component, computed, inject, input, linkedSignal, output, resource, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from '../../../application/catalogo/use-case/reemplaza-producto-con-json.use-case';
import { falloDelCampo, mensajeDeError } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/**
 * El editor de la ficha completa como JSON.
 *
 * <p>ES DESTRUCTIVO Y COMPLETO: lo que se guarda pasa por la carga masiva, que hace UPSERT por
 * identificador externo, de modo que la ficha queda EXACTAMENTE como diga este JSON. Lo que no aparezca
 * aquí se pierde — no es un guardado parcial.
 *
 * <p>De ahí la norma del proyecto: para añadir un campo se reenvía el JSON original entero con el campo
 * puesto, nunca una fila mínima. El texto que se carga al abrir es la ficha completa justo para eso.
 */
@Component({
  selector: 'nx-editor-json-de-producto',
  imports: [FaIconComponent, FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.json.title')" ancho="sm:max-w-4xl" (cierra)="cierra.emit()">
      <p class="text-[12px] text-ink-500">{{ t('admin.json.hint') }}</p>

      @if (ficha.isLoading()) {
        <div class="text-center py-10 text-ink-400">
          <fa-icon [icon]="iconoGirando" class="fa-spin" />
        </div>
      } @else {
        <label for="editor-json" class="sr-only">{{ t('admin.json.title') }}</label>
        <textarea
          id="editor-json"
          class="textarea textarea-bordered w-full font-mono text-[11px] leading-snug h-[55vh] whitespace-pre"
          spellcheck="false"
          [formField]="formulario.texto"
          (input)="error.set(null)"
        ></textarea>
      }

      @if (aviso(); as detalle) {
        <pre role="alert" class="text-[11px] text-error whitespace-pre-wrap bg-error/5 rounded p-2 mt-2">{{ detalle }}</pre>
      }

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando() || ficha.isLoading() || formulario().invalid()"
          (click)="guarda()"
        >
          @if (guardando()) {
            <fa-icon [icon]="iconoGirando" class="fa-spin" />
          }
          {{ t('admin.json.save') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class EditorJsonDeProducto {
  readonly productoId = input.required<string>();
  readonly cierra = output<void>();
  readonly guardado = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly exporta = inject(ExportaProducto);
  private readonly reemplaza = inject(ReemplazaProductoConJson);

  protected readonly iconoGirando = faSpinner;
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);

  protected readonly ficha = resource({
    params: () => this.productoId(),
    loader: async ({ params }) => {
      const resultado = await this.exporta.ejecuta(params);
      return resultado.ok ? JSON.stringify(resultado.valor, null, 2) : '';
    },
    defaultValue: '',
  });

  /**
   * El texto del editor, atado a lo que llega del servidor.
   *
   * <p>Antes esto era un efecto que copiaba el valor del recurso al signal la primera vez. Un valor que
   * se recalcula desde otro es justo lo que hace `linkedSignal`: se rellena cuando llega la ficha y a
   * partir de ahí manda lo tecleado, sin un efecto que haya que leer para entender de dónde sale.
   */
  private readonly modelo = linkedSignal<string, { texto: string }>({
    source: () => this.ficha.value(),
    computation: (cargado) => ({ texto: cargado }),
  });

  /**
   * La única regla: lo que se manda tiene que ser JSON.
   *
   * <p>Antes se enviaba tal cual y era el backend quien contestaba «JSON no válido» después de subir la
   * ficha entera. Una coma de más se ve aquí, sin ir y volver.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    validate(ruta.texto, ({ value }) => {
      try {
        JSON.parse(value());
        return undefined;
      } catch {
        return { kind: 'parse', message: 'admin.json.invalid' };
      }
    });
  });

  protected readonly texto = computed(() => this.modelo().texto);

  /** Lo que se enseña en el aviso: lo que dijo el servidor y, si no, lo que dice el propio campo. */
  protected readonly aviso = computed(
    () => this.error() || falloDelCampo(this.t, this.formulario.texto()) || null,
  );

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.reemplaza.ejecuta(this.texto());
      if (!resultado.ok) {
        this.error.set(mensajeDeError(this.t, resultado.error, 'admin.json.invalid'));
        return;
      }
      this.avisos.exito(this.t('admin.json.saved'));
      this.guardado.emit();
      this.cierra.emit();
    } finally {
      this.guardando.set(false);
    }
  }
}
