import { Component, inject, input, linkedSignal, output } from '@angular/core';
import {
  FormField,
  form,
  email as validaCorreo,
  maxLength,
  min,
  pattern,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CambiosDeFicha,
  FichaDeProducto,
} from '../../../domain/catalogo/model/ficha-de-producto';
import { CategoriaParaElegir } from '../../../domain/catalogo/port/categorias-admin.port';
import { EstadoDeCampo, falloDelCampo } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/** Las divisas que admite el coste de origen. Es una lista corta y fija: son las de los proveedores. */
const DIVISAS = ['CNY', 'USD', 'EUR', 'GBP', 'BRL', 'MXN', 'JPY'];

/** Lo que admite cada dato del fabricante. Son los topes del backend: pasarse rechaza el guardado. */
const TOPE_DE_NOMBRE = 200;
const TOPE_DE_DIRECCION = 300;
const TOPE_DE_CORREO = 200;

/** Una dirección web de verdad: el vídeo se pide por HTTP, no por un texto cualquiera. */
const DIRECCION_WEB = /^https?:\/\/\S+$/;

/** Lo que se teclea en la edición rápida. Los importes son números; el resto, texto. */
interface FormularioDeEdicionRapida {
  titulo: string;
  marca: string;
  coste: number | null;
  divisa: string;
  categoriaId: string;
  moq: number | null;
  recargo: number | null;
  urlVideo: string;
  fabricanteNombre: string;
  fabricanteDireccion: string;
  fabricanteCorreo: string;
}

/** Un valor que puede faltar, escrito para un campo de texto: el hueco es la cadena vacía. */
function comoTexto(valor: string | null | undefined): string {
  return valor == null ? '' : valor;
}

/** La ficha volcada a los nombres y los tipos que usan los campos del formulario. */
function camposDeLaFicha(ficha: FichaDeProducto): FormularioDeEdicionRapida {
  return {
    titulo: comoTexto(ficha.titulo),
    marca: comoTexto(ficha.marca),
    coste: ficha.coste ?? null,
    divisa: ficha.divisa,
    categoriaId: comoTexto(ficha.categoriaId),
    moq: ficha.moq ?? 1,
    recargo: ficha.yuanes.recargo ?? null,
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
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.catalog.edit.title')" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.title') }}</span>
          <input class="input w-full" [formField]="formulario.titulo" />
        </label>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.brand') }}</span>
          <input class="input w-full" [formField]="formulario.marca" />
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.basePrice') }}</span>
            <input type="number" step="0.01" class="input w-full" [formField]="formulario.coste" />
            @if (fallo(formulario.coste()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.currency') }}</span>
            <select class="select w-full" [formField]="formulario.divisa">
              @for (divisa of divisas; track divisa) {
                <option [value]="divisa">{{ divisa }}</option>
              }
            </select>
          </label>
        </div>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.category') }}</span>
          <select class="select w-full" [formField]="formulario.categoriaId">
            <option value="">{{ t('admin.catalog.fields.category_none') }}</option>
            @for (categoria of categorias(); track categoria.id) {
              <option [value]="categoria.id">{{ categoria.etiqueta }}</option>
            }
          </select>
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.moq') }}</span>
            <input type="number" class="input w-full" [formField]="formulario.moq" />
            @if (fallo(formulario.moq()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.surchargeCny') }}</span>
            <input type="number" step="0.01" class="input w-full" [formField]="formulario.recargo" />
            @if (fallo(formulario.recargo()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
        </div>
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.catalog.fields.video_url') }}</span>
          <input
            type="url"
            class="input w-full"
            placeholder="https://…"
            [formField]="formulario.urlVideo"
          />
          @if (fallo(formulario.urlVideo()); as texto) {
            <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
          }
        </label>

        <fieldset class="border-t border-base-200 pt-3 mt-1">
          <legend class="text-xs font-semibold text-ink-700">
            {{ t('admin.catalog.fields.manufacturer_section') }}
          </legend>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.name') }}</span>
            <input class="input w-full" [formField]="formulario.fabricanteNombre" />
            @if (fallo(formulario.fabricanteNombre()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.address') }}</span>
            <input class="input w-full" [formField]="formulario.fabricanteDireccion" />
            @if (fallo(formulario.fabricanteDireccion()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
          <label class="block">
            <span class="text-xs text-ink-500">{{ t('compliance.field.email') }}</span>
            <input type="email" class="input w-full" [formField]="formulario.fabricanteCorreo" />
            @if (fallo(formulario.fabricanteCorreo()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
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
          [disabled]="guardando() || formulario().invalid()"
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

  /** Lo tecleado. Arranca con lo que trae la ficha y vuelve a ella si la pantalla cambia de producto. */
  protected readonly modelo = linkedSignal<FichaDeProducto, FormularioDeEdicionRapida>({
    source: () => this.ficha(),
    computation: (ficha) => camposDeLaFicha(ficha),
  });

  /**
   * Las reglas de la edición rápida.
   *
   * <p>Ninguna es nueva del todo: los topes de longitud y los mínimos ya estaban escritos en el marcado
   * como `maxlength` y `min`, que el navegador solo respeta mientras se teclea —un texto pegado o un
   * número escrito a mano pasaban enteros— y que además terminaban en un rechazo del backend sin decir
   * qué campo era. Aquí valen para las dos cosas: apagan el botón y dicen dónde está el problema.
   *
   * <p>Las dos que sí se añaden son las del CONTACTO obligatorio del artículo 19: un correo que no tiene
   * forma de correo y una dirección de vídeo que no es una dirección no sirven de nada publicados.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    min(ruta.coste, 0);
    min(ruta.moq, 1);
    min(ruta.recargo, 0);
    pattern(ruta.urlVideo, DIRECCION_WEB, { message: 'sourcing.url.invalid' });
    maxLength(ruta.fabricanteNombre, TOPE_DE_NOMBRE);
    maxLength(ruta.fabricanteDireccion, TOPE_DE_DIRECCION);
    maxLength(ruta.fabricanteCorreo, TOPE_DE_CORREO);
    validaCorreo(ruta.fabricanteCorreo);
  });

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }

  protected confirma(): void {
    const valores = this.modelo();
    this.guarda.emit({
      titulo: valores.titulo || undefined,
      marca: valores.marca || undefined,
      coste: valores.coste ?? undefined,
      divisa: valores.divisa || undefined,
      // El pedido mínimo son unidades enteras: el campo numérico admite decimales y el backend no.
      moq: valores.moq === null ? undefined : Math.trunc(valores.moq),
      urlVideo: valores.urlVideo,
      categoriaId: valores.categoriaId || undefined,
      // Cero se manda para poder QUITAR el recargo; sin valor significa «no lo edito».
      yuanes: { recargo: valores.recargo ?? 0 },
      fabricante: {
        nombre: valores.fabricanteNombre,
        direccion: valores.fabricanteDireccion,
        correo: valores.fabricanteCorreo,
      },
    });
  }
}
