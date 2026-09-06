import { Component, computed, inject, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faBoxesStacked,
  faCircleCheck,
  faEye,
  faEyeSlash,
  faFileExport,
  faFolderPlus,
  faPen,
  faPlus,
  faRotateRight,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import {
  BORRADOR_DE_CATEGORIA_VACIO,
  BorradorDeCategoria,
  CategoriaAdmin,
  CriterioDeCategorias,
} from '../../../domain/catalogo/model/categoria-admin';
import { DialogoCategoria } from '../component/dialogo-categoria';
import { HerramientasDeCarga } from '../component/herramientas-de-carga';
import { Paginacion } from '../component/paginacion';
import { TablaDeCategorias } from '../component/tabla-de-categorias';
import { AccionesDeCategorias } from './categorias-acciones';

/** Cuántas filas por página se pueden elegir. */
const TAMANOS = [25, 50, 100, 200];

/**
 * Las categorías del catálogo.
 *
 * <p>El listado va PAGINADO EN SERVIDOR contra el punto indexado: son casi dos mil y cargarlas todas
 * para pintar cincuenta filas costaba varios segundos en cada visita. El árbol completo solo se pide
 * cuando de verdad hace falta —el selector de padre del formulario y la exportación—.
 */
@Component({
  selector: 'nx-admin-categorias',
  imports: [
    FaIconComponent,
    CampoBusqueda,
    Paginacion,
    HerramientasDeCarga,
    DialogoCategoria,
    TablaDeCategorias,
  ],
  providers: [AccionesDeCategorias],
  template: `
    <div class="space-y-4">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold">{{ t('admin.categories.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('pagination.showing') }} {{ total() }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (marcadas().length > 0) {
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              [disabled]="acciones.ocupado()"
              (click)="activaMarcadas(true)"
            >
              <fa-icon [icon]="iconos.activar" /> {{ t('admin.categories.activate_selected') }}
              ({{ marcadas().length }})
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px]"
              [disabled]="acciones.ocupado()"
              (click)="activaMarcadas(false)"
            >
              <fa-icon [icon]="iconos.desactivar" /> {{ t('admin.categories.deactivate_selected') }}
              ({{ marcadas().length }})
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700 hover:bg-red-50"
              [disabled]="acciones.ocupado()"
              (click)="borraMarcadas()"
            >
              <fa-icon [icon]="acciones.ocupado() ? iconos.recargar : iconos.borrar" [class.fa-spin]="acciones.ocupado()" />
              {{ t('admin.categories.delete_selected') }} ({{ marcadas().length }})
            </button>
          }
          <button type="button" class="btn btn-outline btn-sm text-[12px]" (click)="exporta()">
            <fa-icon [icon]="iconos.exportar" /> {{ t('admin.categories.export') }}
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm text-[12px]"
            [disabled]="acciones.ocupado()"
            [title]="t('admin.categories.reindex_hint')"
            (click)="reindexa()"
          >
            <fa-icon [icon]="iconos.recargar" [class.fa-spin]="acciones.ocupado()" />
            {{ t('admin.categories.reindex') }}
          </button>
          <nx-herramientas-de-carga clase="categories" (terminado)="categorias.reload()" />
          <button type="button" class="btn btn-primary text-[12px]" (click)="abre(null)">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.categories.create') }}
          </button>
        </div>
      </header>

      <div class="flex items-center gap-2 flex-wrap">
        <nx-campo-busqueda
          [valor]="texto()"
          (valorChange)="cambiaTexto($event)"
          [marcador]="t('admin.categories.search_placeholder')"
          clase="w-full sm:min-w-[280px]"
        />
        <label class="text-[12px] text-ink-500">
          <span class="sr-only">{{ t('admin.categories.filter.all') }}</span>
          <select
            class="select select-bordered select-sm text-[12px]"
            [value]="conProductos()"
            (change)="cambiaFiltro($any($event.target).value)"
          >
            <option value="">{{ t('admin.categories.filter.all') }}</option>
            <option value="true">{{ t('admin.categories.filter.with_products') }}</option>
            <option value="false">{{ t('admin.categories.filter.empty') }}</option>
          </select>
        </label>
        <label class="text-[12px] text-ink-500">
          <span class="sr-only">{{ t('pagination.page') }}</span>
          <select
            class="input input-sm w-auto"
            [value]="tamano()"
            (change)="cambiaTamano(+$any($event.target).value)"
          >
            @for (opcion of tamanos; track opcion) {
              <option [value]="opcion">{{ opcion }} / {{ t('pagination.page') }}</option>
            }
          </select>
        </label>
        <span class="text-[11px] text-ink-400 ml-auto">
          {{ t('pagination.showing') }} <strong>{{ filas().length }}</strong> / {{ total() }}
        </span>
      </div>

      <nx-tabla-de-categorias
        [categorias]="filas()"
        [marcadas]="marcadasComoConjunto()"
        [cargando]="categorias.isLoading()"
        (alternaUna)="alterna($event)"
        (alternaTodas)="alternaTodas()"
        (edita)="abre($event)"
        (activa)="alternaActiva($event)"
        (borra)="borra($event)"
      />

      <nx-paginacion [pagina]="pagina()" (paginaChange)="pagina.set($event)" [paginas]="paginas()" />

      @if (formularioAbierto()) {
        <nx-dialogo-categoria
          [inicial]="borrador()"
          [editandoId]="editandoId()"
          [todas]="todas.value()"
          [guardando]="acciones.ocupado()"
          (cierra)="formularioAbierto.set(false)"
          (guarda)="guarda($event)"
        />
      }
    </div>
  `,
})
export class CategoriasPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly acciones = inject(AccionesDeCategorias);
  private readonly avisos = inject(AvisosStore);
  private readonly dialogos = inject(DialogoStore);

  protected readonly iconos = {
    mas: faPlus,
    editar: faPen,
    borrar: faTrash,
    ver: faEye,
    ocultar: faEyeSlash,
    productos: faBoxesStacked,
    exportar: faFileExport,
    recargar: faRotateRight,
    activar: faCircleCheck,
    desactivar: faBan,
    vacia: faFolderPlus,
  };
  protected readonly tamanos = TAMANOS;

  protected readonly texto = signal('');
  protected readonly conProductos = signal('');
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(50);
  protected readonly formularioAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly borrador = signal<BorradorDeCategoria>(BORRADOR_DE_CATEGORIA_VACIO);
  private readonly seleccion = signal<ReadonlySet<string>>(new Set());

  private readonly criterio = computed<CriterioDeCategorias>(() => ({
    texto: this.texto() || undefined,
    conProductos: this.conProductos() === '' ? undefined : this.conProductos() === 'true',
    pagina: this.pagina(),
    tamano: this.tamano(),
  }));

  protected readonly categorias = resource({
    params: () => this.criterio(),
    loader: async ({ params }) => {
      const resultado = await this.acciones.lista(params);
      return resultado ?? { categorias: [], total: 0, paginas: 1 };
    },
    defaultValue: { categorias: [], total: 0, paginas: 1 },
  });

  /** El árbol completo solo se pide con el formulario abierto: es lo único que necesita los padres. */
  protected readonly todas = resource({
    params: () => this.formularioAbierto(),
    loader: async ({ params }) => (params ? ((await this.acciones.todas()) ?? []) : []),
    defaultValue: [],
  });

  protected readonly filas = computed(() => this.categorias.value().categorias);
  protected readonly total = computed(() => this.categorias.value().total);
  protected readonly paginas = computed(() => Math.max(1, this.categorias.value().paginas));
  protected readonly marcadas = computed(() => [...this.seleccion()]);
  protected readonly marcadasComoConjunto = computed(() => this.seleccion());

  protected cambiaTexto(valor: string): void {
    this.texto.set(valor);
    this.pagina.set(0);
  }

  protected cambiaFiltro(valor: string): void {
    this.conProductos.set(valor);
    this.pagina.set(0);
  }

  protected cambiaTamano(valor: number): void {
    this.tamano.set(valor);
    this.pagina.set(0);
  }

  protected alterna(id: string): void {
    this.seleccion.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  protected alternaTodas(): void {
    const ids = this.filas().map((categoria) => categoria.id);
    const todas = ids.length > 0 && ids.every((id) => this.seleccion().has(id));
    this.seleccion.update((actual) => {
      const copia = new Set(actual);
      for (const id of ids) {
        if (todas) {
          copia.delete(id);
        } else {
          copia.add(id);
        }
      }
      return copia;
    });
  }

  protected abre(categoria: CategoriaAdmin | null): void {
    this.editandoId.set(categoria?.id ?? null);
    this.borrador.set(
      categoria
        ? {
            slug: categoria.slug ?? '',
            nombreZh: categoria.nombreZh ?? '',
            nombreEn: categoria.nombres['en'] ?? '',
            nombreEs: categoria.nombres['es'] ?? '',
            nombrePt: categoria.nombres['pt'] ?? '',
            padreId: categoria.padreId ?? '',
          }
        : BORRADOR_DE_CATEGORIA_VACIO,
    );
    this.formularioAbierto.set(true);
  }

  protected async guarda(borrador: BorradorDeCategoria): Promise<void> {
    if (await this.acciones.guarda(borrador, this.editandoId())) {
      this.formularioAbierto.set(false);
      this.categorias.reload();
    }
  }

  protected async alternaActiva(categoria: CategoriaAdmin): Promise<void> {
    if (await this.acciones.alterna(categoria.id)) {
      this.categorias.reload();
    }
  }

  protected async borra(categoria: CategoriaAdmin): Promise<void> {
    const confirmado = await this.dialogos.confirma(
      this.t('admin.categories.delete_confirm').replace('{slug}', categoria.slug),
      this.t('admin.categories.delete'),
    );
    if (confirmado && (await this.acciones.borra([categoria.id]))) {
      this.categorias.reload();
    }
  }

  protected async borraMarcadas(): Promise<void> {
    const ids = this.marcadas();
    const confirmado = await this.dialogos.confirma(
      this.t('admin.categories.delete_selected_confirm').replace('{n}', String(ids.length)),
      this.t('admin.categories.delete_selected'),
    );
    if (confirmado && (await this.acciones.borra(ids))) {
      this.seleccion.set(new Set());
      this.categorias.reload();
    }
  }

  protected async activaMarcadas(activa: boolean): Promise<void> {
    if (await this.acciones.activaEnLote(this.marcadas(), activa)) {
      this.seleccion.set(new Set());
      this.categorias.reload();
    }
  }

  protected async reindexa(): Promise<void> {
    await this.acciones.reindexa();
    this.categorias.reload();
  }

  protected async exporta(): Promise<void> {
    const cuantas = await this.acciones.exporta();
    if (cuantas === null) {
      this.avisos.error(this.t('admin.categories.reindex_error'));
    }
  }
}
