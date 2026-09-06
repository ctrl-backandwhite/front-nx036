import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_CATEGORIA_VACIO,
  BorradorDeCategoria,
  CategoriaAdmin,
  padresPosibles,
  rutaDeCategoria,
  saneaSlug,
  validaCategoria,
} from '../../../domain/catalogo/model/categoria-admin';
import { textoDelFalloDeCategoria } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

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
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      <div class="space-y-2 text-sm">
        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.categories.col.slug') }}</span>
          <input
            class="input w-full font-mono"
            [class.border-red-300]="fallos()['slug']"
            [attr.aria-invalid]="!!fallos()['slug']"
            [value]="borrador().slug"
            (input)="fija('slug', saneado($event))"
          />
          @if (fallos()['slug']; as fallo) {
            <span class="text-[11px] text-red-600 mt-0.5 block">{{ t(textoDelFallo(fallo)) }}</span>
          }
        </label>

        <label class="block">
          <span class="text-xs text-ink-500">{{ t('admin.categories.col.parent') }}</span>
          <select
            class="input w-full"
            [value]="borrador().padreId"
            (change)="fija('padreId', $any($event.target).value)"
          >
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
              [class.border-red-300]="fallos()[campo.clave]"
              [attr.aria-invalid]="!!fallos()[campo.clave]"
              [value]="valorDe(campo.clave)"
              (input)="fija(campo.clave, $any($event.target).value)"
            />
            @if (fallos()[campo.clave]; as fallo) {
              <span class="text-[11px] text-red-600 mt-0.5 block">{{ t(textoDelFallo(fallo)) }}</span>
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
          (click)="guarda.emit(borrador())"
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

  protected readonly camposDeNombre = [
    { clave: 'nombreEs' as const, etiqueta: 'admin.categories.col.es' },
    { clave: 'nombreEn' as const, etiqueta: 'admin.categories.col.en' },
    { clave: 'nombrePt' as const, etiqueta: 'admin.categories.col.pt' },
    { clave: 'nombreZh' as const, etiqueta: 'admin.categories.col.zh' },
  ];

  private readonly cambios = signal<Partial<BorradorDeCategoria>>({});

  protected readonly borrador = computed<BorradorDeCategoria>(() => ({
    ...this.inicial(),
    ...this.cambios(),
  }));

  protected readonly fallos = computed(() => validaCategoria(this.borrador()));
  protected readonly sePuedeGuardar = computed(() => Object.keys(this.fallos()).length === 0);

  protected readonly padres = computed(() => padresPosibles(this.todas(), this.editandoId()));
  private readonly porId = computed(
    () => new Map(this.todas().map((categoria) => [categoria.id, categoria] as const)),
  );

  protected titulo(): string {
    return this.t(this.editandoId() ? 'admin.categories.edit' : 'admin.categories.create');
  }

  protected ruta(categoria: CategoriaAdmin): string {
    return rutaDeCategoria(categoria, this.porId());
  }

  protected valorDe(clave: keyof BorradorDeCategoria): string {
    return this.borrador()[clave];
  }

  protected saneado(evento: Event): string {
    return saneaSlug((evento.target as HTMLInputElement).value);
  }

  protected fija(clave: keyof BorradorDeCategoria, valor: string): void {
    this.cambios.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected textoDelFallo(fallo: ReturnType<typeof validaCategoria>[string]): string {
    return textoDelFalloDeCategoria(fallo);
  }
}
