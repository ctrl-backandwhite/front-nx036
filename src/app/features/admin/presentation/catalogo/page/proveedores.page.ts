import { Component, computed, inject, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCheckCircle,
  faPlus,
  faFileImport,
  faRotate,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { nombreDePais } from '@ds/component/pais/paises';
import {
  BORRADOR_DE_PROVEEDOR_VACIO,
  BorradorDeProveedor,
  CriterioDeProveedores,
  PAISES_DE_PROVEEDOR,
  ProveedorAdmin,
  aBorradorDeProveedor,
} from '../../../domain/catalogo/model/proveedor-admin';
import { DialogoProveedor } from '../component/dialogo-proveedor';
import { FichaDeProveedor } from '../component/ficha-de-proveedor';
import { Paginacion } from '../component/paginacion';
import { TablaDeProveedores } from '../component/tabla-de-proveedores';
import { AccionesDeProveedores } from './proveedores-acciones';

/** Cuántos proveedores trae cada página. */
const POR_PAGINA = 20;

/**
 * Los proveedores del catálogo.
 *
 * <p>Paginado en SERVIDOR y ordenado del más reciente al más antiguo: son decenas de miles y llegan del
 * buscador, con respaldo en la base de datos.
 *
 * <p>Verificar en LOTE fija el valor en vez de alternarlo: al marcar veinte, alternar dejaría la mitad
 * verificados y la otra mitad no, que es justo lo contrario de lo que se pide.
 */
@Component({
  selector: 'nx-admin-proveedores',
  imports: [
    FaIconComponent,
    BarraFiltros,
    FiltroSeleccion,
    CampoBusqueda,
    TablaDeProveedores,
    Paginacion,
    DialogoProveedor,
    FichaDeProveedor,
  ],
  providers: [AccionesDeProveedores],
  template: `
    <div class="space-y-5">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1>{{ t('admin.suppliers.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.suppliers.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (marcados().length > 0) {
            <span class="text-[11px] text-ink-500">{{ textoDeMarcados() }}</span>
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px]"
              [disabled]="acciones.ocupado()"
              (click)="verificaMarcados(true)"
            >
              <fa-icon [icon]="iconos.verificar" /> {{ t('admin.suppliers.actions.verify') }}
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px]"
              [disabled]="acciones.ocupado()"
              (click)="verificaMarcados(false)"
            >
              <fa-icon [icon]="iconos.desverificar" /> {{ t('admin.suppliers.actions.unverify') }}
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm text-[12px] border-red-300 text-red-700 hover:bg-red-50"
              [disabled]="acciones.ocupado()"
              (click)="borraMarcados()"
            >
              <fa-icon [icon]="iconos.borrar" /> {{ t('admin.suppliers.actions.delete') }}
            </button>
          }
          <button type="button" class="btn btn-primary text-[12px]" (click)="abreFormulario(null)">
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.suppliers.actions.create') }}
          </button>
          <!--
            La importación de proveedores todavía no existe en el backend. Se conserva el botón con su
            aviso, como en el frontal anterior: quitarlo haría creer que la función se ha perdido.
          -->
          <button type="button" class="btn btn-outline text-[12px]" (click)="avisaDeLaImportacion()">
            <fa-icon [icon]="iconos.importar" /> {{ t('admin.suppliers.actions.import') }}
          </button>
          <button
            type="button"
            class="btn btn-outline text-[12px]"
            [disabled]="acciones.ocupado()"
            [title]="t('admin.reindex')"
            (click)="reindexa()"
          >
            <fa-icon [icon]="iconos.sincronizar" [class.fa-spin]="acciones.ocupado()" />
            {{ t('admin.reindex') }}
          </button>
        </div>
      </header>

      <nx-barra-filtros
        [activos]="cuantosFiltros()"
        [hayActivos]="cuantosFiltros() > 0"
        (limpia)="limpia()"
      >
        <nx-campo-busqueda
          [valor]="texto()"
          (valorChange)="cambia(texto.set, $event)"
          [marcador]="t('admin.suppliers.search_placeholder')"
          clase="w-full md:min-w-[260px]"
        />
        <nx-filtro-seleccion
          [etiqueta]="t('admin.suppliers.col.country')"
          [valor]="pais()"
          (valorChange)="cambiaPais($event)"
          [opciones]="opcionesDePais"
          [marcador]="t('filters.all')"
        />
        <nx-filtro-seleccion
          [etiqueta]="t('admin.suppliers.col.verified')"
          [valor]="verificado()"
          (valorChange)="cambiaVerificado($event)"
          [opciones]="opcionesDeVerificacion()"
          [marcador]="t('filters.all')"
        />
        <span class="text-[11px] text-ink-400 md:ml-auto">
          {{ t('pagination.showing') }} <strong>{{ filas().length }}</strong> / {{ total() }}
        </span>
      </nx-barra-filtros>

      <nx-tabla-de-proveedores
        [proveedores]="filas()"
        [marcados]="seleccion()"
        [cargando]="proveedores.isLoading()"
        (alternaUno)="alterna($event)"
        (alternaTodos)="alternaTodos()"
        (abre)="detalle.set($event)"
        (edita)="abreFormulario($event)"
        (verifica)="alternaVerificado($event)"
        (borra)="borra($event)"
      />

      <nx-paginacion [pagina]="pagina()" (paginaChange)="pagina.set($event)" [paginas]="paginas()" />

      @if (detalle(); as elegido) {
        <nx-ficha-de-proveedor [proveedor]="elegido" (cierra)="detalle.set(null)" />
      }
      @if (formularioAbierto()) {
        <nx-dialogo-proveedor
          [inicial]="borrador()"
          [editando]="!!editandoId()"
          [guardando]="acciones.ocupado()"
          (cierra)="formularioAbierto.set(false)"
          (guarda)="guarda($event)"
        />
      }
    </div>
  `,
})
export class ProveedoresPage {
  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  protected readonly acciones = inject(AccionesDeProveedores);
  private readonly dialogos = inject(DialogoStore);

  protected readonly iconos = {
    mas: faPlus,
    borrar: faTrash,
    verificar: faCheckCircle,
    desverificar: faBan,
    sincronizar: faRotate,
    importar: faFileImport,
  };

  protected readonly texto = signal('');
  protected readonly pais = signal<string | null>(null);
  protected readonly verificado = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly detalle = signal<ProveedorAdmin | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly borrador = signal<BorradorDeProveedor>(BORRADOR_DE_PROVEEDOR_VACIO);
  protected readonly seleccion = signal<ReadonlySet<string>>(new Set());

  /** La lista de países es FIJA: derivarla de la página que se ve daría un desplegable distinto en cada una. */
  protected readonly opcionesDePais: readonly OpcionFiltro[] = PAISES_DE_PROVEEDOR.map((codigo) => ({
    value: codigo,
    label: nombreDePais(codigo) || codigo,
  }));

  private readonly criterio = computed<CriterioDeProveedores>(() => ({
    texto: this.texto() || undefined,
    pais: this.pais() ?? undefined,
    verificado: this.verificado() === null ? undefined : this.verificado() === 'yes',
    pagina: this.pagina(),
    tamano: POR_PAGINA,
  }));

  protected readonly proveedores = resource({
    params: () => this.criterio(),
    loader: async ({ params }) =>
      (await this.acciones.lista(params)) ?? { proveedores: [], total: 0, paginas: 1 },
    defaultValue: { proveedores: [], total: 0, paginas: 1 },
  });

  protected readonly filas = computed(() => this.proveedores.value().proveedores);
  protected readonly total = computed(() => this.proveedores.value().total);
  protected readonly paginas = computed(() => Math.max(1, this.proveedores.value().paginas));
  protected readonly marcados = computed(() => [...this.seleccion()]);

  protected readonly opcionesDeVerificacion = computed<readonly OpcionFiltro[]>(() => [
    { value: 'yes', label: this.t('admin.suppliers.yes') },
    { value: 'no', label: this.t('admin.suppliers.no') },
  ]);

  protected readonly cuantosFiltros = computed(
    () => [this.texto(), this.pais(), this.verificado()].filter(Boolean).length,
  );

  protected textoDeMarcados(): string {
    return this.tCon('admin.bulk.selected', { n: this.marcados().length });
  }

  protected cambia(fija: (valor: string) => void, valor: string): void {
    fija(valor);
    this.pagina.set(0);
  }

  protected cambiaPais(valor: string | null): void {
    this.pais.set(valor);
    this.pagina.set(0);
  }

  protected cambiaVerificado(valor: string | null): void {
    this.verificado.set(valor);
    this.pagina.set(0);
  }

  protected limpia(): void {
    this.texto.set('');
    this.pais.set(null);
    this.verificado.set(null);
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

  protected alternaTodos(): void {
    const ids = this.filas().map((proveedor) => proveedor.id);
    const todos = ids.length > 0 && ids.every((id) => this.seleccion().has(id));
    this.seleccion.update((actual) => {
      const copia = new Set(actual);
      for (const id of ids) {
        if (todos) {
          copia.delete(id);
        } else {
          copia.add(id);
        }
      }
      return copia;
    });
  }

  protected abreFormulario(proveedor: ProveedorAdmin | null): void {
    this.editandoId.set(proveedor?.id ?? null);
    this.borrador.set(proveedor ? aBorradorDeProveedor(proveedor) : BORRADOR_DE_PROVEEDOR_VACIO);
    this.formularioAbierto.set(true);
  }

  protected async guarda(borrador: BorradorDeProveedor): Promise<void> {
    if (await this.acciones.guarda(borrador, this.editandoId())) {
      this.formularioAbierto.set(false);
      this.proveedores.reload();
    }
  }

  /** Desverificar pide confirmación; verificar no: quitar la marca es lo que tiene consecuencias. */
  protected async alternaVerificado(proveedor: ProveedorAdmin): Promise<void> {
    if (proveedor.verificado) {
      const confirmado = await this.dialogos.confirma(
        this.t('admin.suppliers.unverify_confirm').replace('{name}', proveedor.nombre),
      );
      if (!confirmado) {
        return;
      }
    }
    if (await this.acciones.verifica([proveedor.id])) {
      this.proveedores.reload();
    }
  }

  protected async verificaMarcados(verificado: boolean): Promise<void> {
    if (await this.acciones.verifica(this.marcados(), verificado)) {
      this.seleccion.set(new Set());
      this.proveedores.reload();
    }
  }

  protected async borra(proveedor: ProveedorAdmin): Promise<void> {
    const confirmado = await this.dialogos.confirma(
      this.t('admin.suppliers.delete_confirm').replace('{name}', proveedor.nombre),
    );
    if (confirmado && (await this.acciones.elimina([proveedor.id]))) {
      this.proveedores.reload();
    }
  }

  protected async borraMarcados(): Promise<void> {
    const ids = this.marcados();
    const confirmado = await this.dialogos.confirma(
      this.t('admin.bulk.delete_confirm').replace('{n}', String(ids.length)),
      this.t('admin.suppliers.actions.delete'),
    );
    if (confirmado && (await this.acciones.elimina(ids))) {
      this.seleccion.set(new Set());
      this.proveedores.reload();
    }
  }

  protected avisaDeLaImportacion(): void {
    void this.dialogos.alerta(this.t('admin.suppliers.import_soon'));
  }

  protected async reindexa(): Promise<void> {
    if (await this.acciones.reindexa()) {
      this.proveedores.reload();
    }
  }
}
