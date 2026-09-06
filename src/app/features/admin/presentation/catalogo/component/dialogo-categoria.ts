import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, pattern, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_CATEGORIA_VACIO,
  BorradorDeCategoria,
  CategoriaAdmin,
  SLUG_DE_CATEGORIA,
  padresPosibles,
  rutaDeCategoria,
  saneaSlug,
} from '../../../domain/catalogo/model/categoria-admin';
import { EstadoDeCampo, falloDelCampo } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/** Los cuatro idiomas que se teclean, y con qué rótulo. El español y el inglés son obligatorios. */
const CAMPOS_DE_NOMBRE = [
  { clave: 'nombreEs' as const, etiqueta: 'admin.categories.col.es' },
  { clave: 'nombreEn' as const, etiqueta: 'admin.categories.col.en' },
  { clave: 'nombrePt' as const, etiqueta: 'admin.categories.col.pt' },
  { clave: 'nombreZh' as const, etiqueta: 'admin.categories.col.zh' },
];

/**
 * El alta y la edición de una categoría.
 *
 * <p>El SLUG forma parte de la dirección pública y de la exportación, así que se sanea al teclear en
 * vez de rechazarse después: es más rápido corregir sobre la marcha que descubrirlo al guardar.
 *
 * <p>El selector de padre EXCLUYE la propia categoría y toda su descendencia: dejar que una categoría
 * sea hija de su nieta crea un ciclo del que el menú no sale.
 */
@Component({
  selector: 'nx-dialogo-categoria',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      <div class="space-y-2 text-sm">
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.categories.col.slug') }}</span>
          <input
            class="input w-full font-mono"
            [class.border-red-300]="!!fallo(formulario.slug())"
            [attr.aria-invalid]="!!fallo(formulario.slug())"
            [formField]="formulario.slug"
          />
          @if (fallo(formulario.slug()); as texto) {
            <span class="text-[11px] text-red-600 mt-0.5 block">{{ texto }}</span>
          }
        </label>

        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.categories.col.parent') }}</span>
          <select class="input w-full" [formField]="formulario.padreId">
            <option value="">{{ t('admin.categories.parent_none') }}</option>
            @for (padre of padres(); track padre.id) {
              <option [value]="padre.id">{{ ruta(padre) }}</option>
            }
          </select>
        </label>

        @for (campo of camposDeNombre; track campo.clave) {
          <label class="block">
            <span class="text-xs text-ink-500">{{ t(campo.etiqueta) }}</span>
            <input
              class="input w-full"
              [class.border-red-300]="!!fallo(formulario[campo.clave]())"
              [attr.aria-invalid]="!!fallo(formulario[campo.clave]())"
              [formField]="formulario[campo.clave]"
            />
            @if (fallo(formulario[campo.clave]()); as texto) {
              <span class="text-[11px] text-red-600 mt-0.5 block">{{ texto }}</span>
            }
          </label>
        }
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="guardando() || !sePuedeGuardar()"
          (click)="guarda.emit(modelo())"
        >
          {{ t(editandoId() ? 'actions.save' : 'admin.categories.create') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoCategoria {
  readonly inicial = input<BorradorDeCategoria>(BORRADOR_DE_CATEGORIA_VACIO);
  readonly editandoId = input<string | null>(null);
  readonly todas = input<readonly CategoriaAdmin[]>([]);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly guarda = output<BorradorDeCategoria>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly camposDeNombre = CAMPOS_DE_NOMBRE;

  /**
   * Lo que se está tecleando, con el SLUG saneado en cada escritura.
   *
   * <p>El saneado va en el `set` del propio signal y no en el manejador de un campo: así lo pasa
   * cualquiera que escriba en el modelo —el campo, una prueba o un futuro botón de «sugerir slug»— y no
   * solo la ruta que se acordó de llamarlo. Es lo que hacía la versión anterior a cada tecla, y quitarlo
   * cambiaría lo que se ve: en vez de corregirse solo, el slug se quedaría en rojo hasta arreglarlo.
   */
  protected readonly modelo = linkedSignal<BorradorDeCategoria, BorradorDeCategoria>({
    source: () => this.inicial(),
    computation: (inicial) => ({ ...inicial }),
    set: (valor, escribe) => escribe({ ...valor, slug: saneaSlug(valor.slug) }),
  });

  /**
   * Las reglas de una categoría, declaradas.
   *
   * <p>Son las mismas que comprobaba `validaCategoria` a mano: slug obligatorio y con formato de slug,
   * y nombre en español y en inglés. Esos dos idiomas son obligatorios porque son con los que se opera:
   * una categoría sin ellos aparece en blanco en el menú de la tienda.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.slug, { message: 'admin.categories.error.slug_required' });
    pattern(ruta.slug, SLUG_DE_CATEGORIA, { message: 'admin.categories.error.slug_format' });
    required(ruta.nombreEs, { message: 'admin.categories.error.name_required' });
    required(ruta.nombreEn, { message: 'admin.categories.error.name_required' });
  });

  protected readonly sePuedeGuardar = computed(() => !this.formulario().invalid());

  protected readonly padres = computed(() => padresPosibles(this.todas(), this.editandoId()));

  private readonly porId = computed(
    () => new Map(this.todas().map((categoria) => [categoria.id, categoria] as const)),
  );

  protected readonly titulo = computed(() =>
    this.t(this.editandoId() ? 'admin.categories.edit' : 'admin.categories.create'),
  );

  protected ruta(categoria: CategoriaAdmin): string {
    return rutaDeCategoria(categoria, this.porId());
  }

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }
}
