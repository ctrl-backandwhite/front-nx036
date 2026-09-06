import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CambiosDeFicha,
  FichaDeProducto,
} from '../../../domain/catalogo/model/ficha-de-producto';
import { CategoriaParaElegir } from '../../../domain/catalogo/port/categorias-admin.port';
import { VentanaModal } from './ventana-modal';

/** Las divisas que admite el coste de origen. Es una lista corta y fija: son las de los proveedores. */
const DIVISAS = ['CNY', 'USD', 'EUR', 'GBP', 'BRL', 'MXN', 'JPY'];

/** Un valor que puede faltar, escrito para un campo de texto: el hueco es la cadena vacía. */
function comoTexto(valor: string | number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

/** La ficha volcada a los nombres que usan los campos del formulario. */
function camposDeLaFicha(ficha: FichaDeProducto): Record<string, string> {
  return {
    titulo: comoTexto(ficha.titulo),
    marca: comoTexto(ficha.marca),
    coste: comoTexto(ficha.coste),
    divisa: ficha.divisa,
    categoriaId: comoTexto(ficha.categoriaId),
    moq: comoTexto(ficha.moq ?? 1),
    recargo: comoTexto(ficha.yuanes.recargo),
    urlVideo: comoTexto(ficha.urlVideo),
    fabricanteNombre: comoTexto(ficha.fabricante?.nombre),
    fabricanteDireccion: comoTexto(ficha.fabricante?.direccion),
    fabricanteCorreo: comoTexto(ficha.fabricante?.correo),
  };
}

/**
 * La edición rápida de la ficha: lo que se cambia a menudo, sin abrir el editor completo.
 *
 * <p>El bloque de FABRICANTE no es decorativo: el artículo 19 del Reglamento (UE) 2023/988 obliga a
 * publicar a alguien con quien contactar, y no es lo mismo que la marca. 1688 no lo entrega en la
 * carga, así que se completa aquí a mano.
 *
 * <p>Los tres campos del fabricante se mandan SIEMPRE, aunque estén vacíos: el backend trata la cadena
 * vacía como borrado y el nulo como «no lo edito». Sin eso no habría forma de quitar un dato mal metido.
 */
@Component({
  selector: 'nx-dialogo-edicion-rapida',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.catalog.edit.title')" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.title') }}</span>
          <input class="input w-full" [value]="valor('titulo')" (input)="fija('titulo', $event)" />
        </label>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.brand') }}</span>
          <input class="input w-full" [value]="valor('marca')" (input)="fija('marca', $event)" />
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.basePrice') }}</span>
            <input
              type="number"
              step="0.01"
              class="input w-full"
              [value]="valor('coste')"
              (input)="fija('coste', $event)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.currency') }}</span>
            <select class="select w-full" [value]="valor('divisa')" (change)="fija('divisa', $event)">
              @for (divisa of divisas; track divisa) {
                <option [value]="divisa">{{ divisa }}</option>
              }
            </select>
          </label>
        </div>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.category') }}</span>
          <select
            class="select w-full"
            [value]="valor('categoriaId')"
            (change)="fija('categoriaId', $event)"
          >
            <option value="">{{ t('admin.catalog.fields.category_none') }}</option>
            @for (categoria of categorias(); track categoria.id) {
              <option [value]="categoria.id">{{ categoria.etiqueta }}</option>
            }
          </select>
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.moq') }}</span>
            <input
              type="number"
              min="1"
              class="input w-full"
              [value]="valor('moq')"
              (input)="fija('moq', $event)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.surchargeCny') }}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              class="input w-full"
              [value]="valor('recargo')"
              (input)="fija('recargo', $event)"
            />
          </label>
        </div>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.video_url') }}</span>
          <input
            type="url"
            class="input w-full"
            placeholder="https://…"
            [value]="valor('urlVideo')"
            (input)="fija('urlVideo', $event)"
          />
        </label>

        <fieldset class="border-t border-base-200 pt-3 mt-1">
          <legend class="text-xs font-semibold text-ink-700">
            {{ t('admin.catalog.fields.manufacturer_section') }}
          </legend>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.name') }}</span>
            <input
              class="input w-full"
              maxlength="200"
              [value]="valor('fabricanteNombre')"
              (input)="fija('fabricanteNombre', $event)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.address') }}</span>
            <input
              class="input w-full"
              maxlength="300"
              [value]="valor('fabricanteDireccion')"
              (input)="fija('fabricanteDireccion', $event)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.email') }}</span>
            <input
              type="email"
              class="input w-full"
              maxlength="200"
              [value]="valor('fabricanteCorreo')"
              (input)="fija('fabricanteCorreo', $event)"
            />
          </label>
        </fieldset>
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="guardando()"
          (click)="confirma()"
        >
          {{ t('actions.save') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoEdicionRapida {
  readonly ficha = input.required<FichaDeProducto>();
  readonly categorias = input<readonly CategoriaParaElegir[]>([]);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly guarda = output<CambiosDeFicha>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly divisas = DIVISAS;

  /** Lo tecleado. Arranca vacío y solo lleva lo que se ha tocado; el resto sale de la ficha. */
  private readonly cambios = signal<Record<string, string>>({});

  protected valor(campo: string): string {
    const tecleado = this.cambios()[campo];
    return tecleado !== undefined ? tecleado : this.deLaFicha(campo);
  }

  /** Lo que la ficha trae hoy, con el mismo nombre que usan los campos del formulario. */
  private readonly original = computed<Record<string, string>>(() =>
    camposDeLaFicha(this.ficha()),
  );

  private deLaFicha(campo: string): string {
    return this.original()[campo] ?? '';
  }

  protected fija(campo: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.cambios.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected confirma(): void {
    this.guarda.emit({
      titulo: this.valor('titulo') || undefined,
      marca: this.valor('marca') || undefined,
      coste: this.valor('coste') ? parseFloat(this.valor('coste')) : undefined,
      divisa: this.valor('divisa') || undefined,
      moq: this.valor('moq') ? parseInt(this.valor('moq'), 10) : undefined,
      urlVideo: this.valor('urlVideo'),
      categoriaId: this.valor('categoriaId') || undefined,
      // Cero se manda para poder QUITAR el recargo; sin valor significa «no lo edito».
      yuanes: { recargo: this.valor('recargo') !== '' ? parseFloat(this.valor('recargo')) : 0 },
      fabricante: {
        nombre: this.valor('fabricanteNombre'),
        direccion: this.valor('fabricanteDireccion'),
        correo: this.valor('fabricanteCorreo'),
      },
    });
  }
}
