import { Component, effect, inject, input, output, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from '../../../application/catalogo/use-case/reemplaza-producto-con-json.use-case';
import { mensajeDeError } from '../etiquetas';
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
  imports: [FaIconComponent, VentanaModal],
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
          [value]="texto()"
          (input)="escribe($event)"
        ></textarea>
      }

      @if (error(); as detalle) {
        <pre role="alert" class="text-[11px] text-error whitespace-pre-wrap bg-error/5 rounded p-2 mt-2">{{ detalle }}</pre>
      }

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando() || ficha.isLoading()"
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
  protected readonly texto = signal('');
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

  constructor() {
    // El texto se rellena UNA vez con lo que llega del servidor y a partir de ahí manda lo tecleado:
    // volver a escribirlo en cada repintado borraría lo que se estuviera editando.
    effect(() => {
      const cargado = this.ficha.value();
      if (cargado && !this.texto()) {
        this.texto.set(cargado);
      }
    });
  }

  protected escribe(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
    this.error.set(null);
  }

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
