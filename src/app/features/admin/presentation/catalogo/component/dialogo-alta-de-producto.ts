import { Component, inject, output, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ListaTodasLasCategorias } from '../../../application/catalogo/use-case/administra-categorias.use-case';
import { ConsultaIdiomas } from '../../../application/catalogo/use-case/consulta-idiomas.use-case';
import { CreaProducto } from '../../../application/catalogo/use-case/crea-producto.use-case';
import {
  BORRADOR_DE_ALTA_VACIO,
  BorradorDeAlta,
  FalloDeAlta,
} from '../../../domain/catalogo/model/alta-de-producto';
import { nombreDeCategoria } from '../../../domain/catalogo/model/categoria-admin';
import { conRespaldo, textoDelFalloDeAlta } from '../etiquetas';
import {
  CAMPOS_AVANZADOS,
  CAMPOS_DE_LOGISTICA,
  CAMPOS_DE_MEDIOS,
  CAMPOS_DE_ORIGEN,
  CAMPOS_DE_PRECIO,
  CAMPOS_DE_PROVEEDOR,
} from './alta/campos-del-alta';
import { CambioDeCampo, CamposEscalares } from './alta/campos-escalares';
import {
  LISTA_DE_ATRIBUTOS,
  LISTA_DE_EJES,
  LISTA_DE_ESPECIFICACIONES,
  LISTA_DE_RESENAS,
  LISTA_DE_TRAMOS,
  LISTA_DE_VARIANTES,
  ListaDelAlta,
} from './alta/filas-del-alta';
import { CambioEnFila, ListaEditable } from './alta/lista-editable';
import { SeccionIdiomas } from './alta/seccion-idiomas';
import { SeccionPlegable } from './alta/seccion-plegable';
import { VentanaModal } from './ventana-modal';

/** Qué lista del borrador corresponde a cada definición. */
type ClaveDeLista = 'tramos' | 'ejes' | 'variantes' | 'atributos' | 'especificaciones' | 'resenas';

/**
 * Contador de filas: cada una nace con una clave estable.
 *
 * <p>Hace falta para poder seguirlas por identidad y no por posición. Editar un campo crea un objeto
 * nuevo, así que sin clave propia la lista se reconstruiría entera a cada tecla y el campo perdería el
 * foco.
 */
let siguienteFila = 0;

/**
 * El alta manual de un producto, con TODOS los datos que admite el catálogo: los mismos que la carga
 * masiva.
 *
 * <p>Existe porque hay productos que no vienen de una carga —los de prueba, los de un proveedor sin
 * volcado— y sin esto habría que escribir un JSON a mano para meter uno. Al crearlo lleva a su ficha,
 * que es lo que se quiere hacer a continuación.
 */
@Component({
  selector: 'nx-dialogo-alta-de-producto',
  imports: [
    FaIconComponent,
    VentanaModal,
    SeccionPlegable,
    CamposEscalares,
    SeccionIdiomas,
    ListaEditable,
  ],
  template: `
    <nx-ventana-modal
      [titulo]="t('admin.create_product.title')"
      ancho="sm:max-w-2xl"
      (cierra)="cierra.emit()"
    >
      <div class="space-y-3">
        <nx-seccion-plegable [titulo]="'1 · ' + t('admin.create_product.category')" [abierta]="true">
          <label class="block">
            <span class="text-[12px] font-medium text-ink-600 mb-1 block">
              {{ t('admin.create_product.category') }}
            </span>
            <select
              class="select select-bordered select-sm w-full"
              [value]="borrador().campos['categorySlug']"
              (change)="cambiaCampo({ clave: 'categorySlug', valor: $any($event.target).value })"
            >
              <option value="">{{ t('admin.catalog.fields.category_none') }}</option>
              @for (categoria of categorias.value(); track categoria.slug) {
                <option [value]="categoria.slug">{{ categoria.etiqueta }}</option>
              }
            </select>
          </label>
          <nx-campos-escalares
            [campos]="camposDeOrigen"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>

        <nx-seccion-plegable
          [titulo]="'2 · ' + t('admin.create_product.title_field')"
          [abierta]="true"
        >
          <nx-seccion-idiomas
            [idiomas]="idiomas.value()"
            [contenido]="borrador().contenido"
            (cambia)="cambiaContenido($event.idioma, $event.contenido)"
          />
        </nx-seccion-plegable>

        <nx-seccion-plegable
          [titulo]="'3 · ' + conRespaldo('admin.create_product.section.pricing', 'Precio, marca y estado')"
          [abierta]="true"
        >
          <nx-campos-escalares
            [campos]="camposDePrecio"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>

        <nx-seccion-plegable [titulo]="'4 · ' + t('admin.suppliers.title')">
          <nx-campos-escalares
            [campos]="camposDeProveedor"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>

        <nx-seccion-plegable
          [titulo]="'5 · ' + t('admin.catalog.detail.images')"
          [abierta]="true"
        >
          <nx-campos-escalares
            [campos]="camposDeMedios"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>

        <nx-seccion-plegable
          [titulo]="'6 · ' + conRespaldo('admin.create_product.section.logistics', 'Logística y dimensiones')"
        >
          <nx-campos-escalares
            [campos]="camposDeLogistica"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>

        @for (lista of listas; track lista.clave) {
          <nx-seccion-plegable [titulo]="tituloDeLista($index, lista.definicion)">
            <nx-lista-editable
              [definicion]="lista.definicion"
              [filas]="filasDe(lista.clave)"
              (cambia)="cambiaFila(lista.clave, $event)"
              (anade)="anadeFila(lista.clave, lista.definicion)"
              (quita)="quitaFila(lista.clave, $event)"
            />
          </nx-seccion-plegable>
        }

        <nx-seccion-plegable
          [titulo]="'13 · ' + conRespaldo('admin.create_product.section.advanced', 'Valoración y datos avanzados')"
        >
          <nx-campos-escalares
            [campos]="camposAvanzados"
            [valores]="borrador().campos"
            (cambia)="cambiaCampo($event)"
          />
        </nx-seccion-plegable>
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando()"
          (click)="crea()"
        >
          <fa-icon [icon]="guardando() ? iconos.girando : iconos.mas" [class.fa-spin]="guardando()" />
          {{ t('admin.create_product.create') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoAltaDeProducto {
  readonly cierra = output<void>();
  readonly creado = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly router = inject(Router);
  private readonly creaProducto = inject(CreaProducto);
  private readonly consultaIdiomas = inject(ConsultaIdiomas);
  private readonly consultaCategorias = inject(ListaTodasLasCategorias);

  protected readonly iconos = { mas: faPlus, girando: faSpinner };
  protected readonly camposDeOrigen = CAMPOS_DE_ORIGEN;
  protected readonly camposDePrecio = CAMPOS_DE_PRECIO;
  protected readonly camposDeProveedor = CAMPOS_DE_PROVEEDOR;
  protected readonly camposDeMedios = CAMPOS_DE_MEDIOS;
  protected readonly camposDeLogistica = CAMPOS_DE_LOGISTICA;
  protected readonly camposAvanzados = CAMPOS_AVANZADOS;

  protected readonly listas: readonly { clave: ClaveDeLista; definicion: ListaDelAlta }[] = [
    { clave: 'tramos', definicion: LISTA_DE_TRAMOS },
    { clave: 'ejes', definicion: LISTA_DE_EJES },
    { clave: 'variantes', definicion: LISTA_DE_VARIANTES },
    { clave: 'atributos', definicion: LISTA_DE_ATRIBUTOS },
    { clave: 'especificaciones', definicion: LISTA_DE_ESPECIFICACIONES },
    { clave: 'resenas', definicion: LISTA_DE_RESENAS },
  ];

  protected readonly borrador = signal<BorradorDeAlta>(BORRADOR_DE_ALTA_VACIO);
  protected readonly guardando = signal(false);

  protected readonly idiomas = resource({
    loader: async () => {
      const resultado = await this.consultaIdiomas.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  /** Las categorías se ofrecen por SLUG: es lo que entiende el alta y lo que cruza entre entornos. */
  protected readonly categorias = resource({
    loader: async () => {
      const resultado = await this.consultaCategorias.ejecuta();
      return resultado.ok
        ? resultado.valor
            .map((categoria) => ({ slug: categoria.slug, etiqueta: nombreDeCategoria(categoria) }))
            .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
        : [];
    },
    defaultValue: [],
  });

  protected conRespaldo(clave: string, respaldo: string): string {
    return conRespaldo(this.t, clave, respaldo);
  }

  protected tituloDeLista(indice: number, definicion: ListaDelAlta): string {
    return `${indice + 7} · ${conRespaldo(this.t, definicion.titulo, definicion.respaldo)}`;
  }

  protected filasDe(clave: ClaveDeLista): readonly Readonly<Record<string, string>>[] {
    return this.borrador()[clave];
  }

  protected cambiaCampo(cambio: CambioDeCampo): void {
    this.borrador.update((actual) => ({
      ...actual,
      campos: { ...actual.campos, [cambio.clave]: cambio.valor },
    }));
  }

  protected cambiaContenido(idioma: string, contenido: { titulo: string; descripcion: string }): void {
    this.borrador.update((actual) => ({
      ...actual,
      contenido: { ...actual.contenido, [idioma]: contenido },
    }));
  }

  protected cambiaFila(clave: ClaveDeLista, cambio: CambioEnFila): void {
    this.borrador.update((actual) => ({
      ...actual,
      [clave]: actual[clave].map((fila, indice) =>
        indice === cambio.indice ? { ...fila, [cambio.clave]: cambio.valor } : fila,
      ),
    }));
  }

  protected anadeFila(clave: ClaveDeLista, definicion: ListaDelAlta): void {
    this.borrador.update((actual) => ({
      ...actual,
      [clave]: [...actual[clave], { ...definicion.filaVacia, idDeFila: `fila-${++siguienteFila}` }],
    }));
  }

  protected quitaFila(clave: ClaveDeLista, indice: number): void {
    this.borrador.update((actual) => ({
      ...actual,
      [clave]: actual[clave].filter((_, i) => i !== indice),
    }));
  }

  protected async crea(): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.creaProducto.ejecuta(this.borrador());
      if (!resultado.ok) {
        const fallo = resultado.error.codigo as FalloDeAlta | undefined;
        this.avisos.error(
          fallo
            ? this.t(textoDelFalloDeAlta(fallo))
            : resultado.error.mensaje || this.t('admin.create_product.error'),
        );
        return;
      }
      this.avisos.exito(this.t('admin.create_product.ok'));
      this.creado.emit();
      this.cierra.emit();
      if (resultado.valor) {
        await this.router.navigate(['/admin/catalog', resultado.valor]);
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
