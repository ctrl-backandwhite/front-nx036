import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ConsultaArbolDeCategorias } from '../../../application/catalogo/use-case/consulta-arbol-de-categorias.use-case';
import { ConsultaFicha } from '../../../application/catalogo/use-case/consulta-ficha.use-case';
import { ConsultaIdiomas } from '../../../application/catalogo/use-case/consulta-idiomas.use-case';
import { ConsultaTasasDeCambio } from '../../../application/catalogo/use-case/consulta-tasas-de-cambio.use-case';
import {
  CambiosDeFicha,
  ImporteEnYuanes,
  PestanaDeFicha,
} from '../../../domain/catalogo/model/ficha-de-producto';
import { yaEnLaGaleria } from '../../../domain/catalogo/model/imagen-de-producto';
import { DialogoEdicionRapida } from '../component/dialogo-edicion-rapida';
import { EditorJsonDeProducto } from '../component/editor-json-de-producto';
import { GestorDeVariantes } from '../component/gestor-de-variantes';
import { AccionDeFicha, CabeceraDeFicha } from '../component/ficha/cabecera-de-ficha';
import { DescripcionDeFicha } from '../component/ficha/descripcion-de-ficha';
import { EtiquetasDeVariacion } from '../component/ficha/etiquetas-de-variacion';
import { GaleriaDeFicha } from '../component/ficha/galeria-de-ficha';
import { PreciosDeFicha } from '../component/ficha/precios-de-ficha';
import { ResumenDeFicha } from '../component/ficha/resumen-de-ficha';
import { SeoDeFicha } from '../component/ficha/seo-de-ficha';
import { VisorDeImagen } from '../component/ficha/visor-de-imagen';
import { AccionesDelCatalogo } from './catalogo-acciones';
import { AccionesDeFicha } from './ficha-acciones';

/**
 * La ficha de un producto en el panel.
 *
 * <p>Todo el contenido —título, descripción, SEO— es POR IDIOMA y se revisa con el selector de la
 * cabecera, sin cambiar el idioma de la aplicación. Cambiarlo vuelve a pedir la ficha, que es lo que
 * trae los textos de ese idioma.
 */
@Component({
  selector: 'nx-admin-ficha-de-producto',
  imports: [
    CabeceraDeFicha,
    ResumenDeFicha,
    GaleriaDeFicha,
    DescripcionDeFicha,
    SeoDeFicha,
    PreciosDeFicha,
    EtiquetasDeVariacion,
    GestorDeVariantes,
    DialogoEdicionRapida,
    EditorJsonDeProducto,
    VisorDeImagen,
  ],
  providers: [CatalogoAdminStore, AccionesDeFicha, AccionesDelCatalogo],
  template: `
    @if (ficha.value(); as producto) {
      <div class="space-y-5">
        <nx-cabecera-de-ficha
          [ficha]="producto"
          [idiomas]="idiomas.value()"
          [ocupado]="acciones.ocupado()"
          [(activa)]="pestana"
          [(idioma)]="idioma"
          (acciona)="atiende($event)"
        />

        @switch (pestana()) {
          @case ('overview') {
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <nx-resumen-de-ficha [ficha]="producto" (guarda)="guardaYuanes($event)" />
              <nx-galeria-de-ficha
                [imagenes]="producto.imagenes"
                [ejes]="producto.ejes"
                [titulo]="producto.titulo"
                (reordena)="reordena($event)"
                (elimina)="eliminaImagenes($event)"
                (anade)="anadeImagenes($event)"
                (copiaDeVariante)="copiaDeVariante($event)"
                (amplia)="ampliada.set($event)"
              />
            </div>
          }
          @case ('description') {
            <nx-descripcion-de-ficha
              [ficha]="producto"
              [guardando]="acciones.ocupado()"
              (guarda)="guarda({ descripcion: $event })"
            />
          }
          @case ('seo') {
            <nx-seo-de-ficha
              [ficha]="producto"
              [idioma]="idioma()"
              [guardando]="acciones.ocupado()"
              (guarda)="guarda({ metaTitulo: $event.metaTitulo, metaDescripcion: $event.metaDescripcion })"
            />
          }
          @case ('inventory') {
            <!--
              El gestor de variantes y la pestaña de precios no se ven al abrir la ficha: viven en su
              pestaña. Diferirlos deja fuera del arranque su tabla editable y su glosario.
            -->
            @defer {
              <nx-gestor-de-variantes [productoId]="id()" (cambiado)="ficha.reload()" />
            }
          }
          @case ('pricing') {
            @defer {
            <nx-precios-de-ficha
              [ficha]="producto"
              [idioma]="idioma()"
              [ocupado]="acciones.ocupado()"
              (borraTramo)="eliminaTramo($event)"
              (cambiaPrecio)="cambiaPrecio($event)"
            >
              @if (producto.ejes.length > 0) {
                <nx-etiquetas-de-variacion
                  [ejes]="producto.ejes"
                  [ocupado]="acciones.ocupado()"
                  (renombrado)="renombraValor($event)"
                  (fotoFijada)="fijaFotoDeValor($event)"
                  (borra)="eliminaValores($event)"
                />
              }
            </nx-precios-de-ficha>
            }
          }
        }

        @if (ampliada(); as direccion) {
          <nx-visor-de-imagen
            [src]="direccion"
            [alt]="producto.titulo"
            (cierra)="ampliada.set(null)"
          />
        }
        <!--
          Las dos ventanas emergentes son pesadas —el editor en bloque carga la ficha entera— y casi
          ninguna visita las abre: su código espera a que se abran.
        -->
        @defer (when edicionAbierta()) {
        @if (edicionAbierta()) {
          <nx-dialogo-edicion-rapida
            [ficha]="producto"
            [categorias]="categorias.value()"
            [guardando]="acciones.ocupado()"
            (cierra)="edicionAbierta.set(false)"
            (guarda)="guardaEdicion($event)"
          />
        }
        }
        @defer (when jsonAbierto()) {
        @if (jsonAbierto()) {
          <nx-editor-json-de-producto
            [productoId]="id()"
            (cierra)="jsonAbierto.set(false)"
            (guardado)="ficha.reload()"
          />
        }
        }
      </div>
    } @else {
      <p class="text-ink-500 text-sm">{{ t('common.loading') }}</p>
    }
  `,
})
export class FichaDeProductoPage {
  /** Llega de la ruta `/admin/catalog/:id`, enlazado por `withComponentInputBinding`. */
  readonly id = input.required<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly acciones = inject(AccionesDeFicha);
  private readonly catalogo = inject(AccionesDelCatalogo);
  private readonly almacen = inject(CatalogoAdminStore);
  private readonly avisos = inject(AvisosStore);
  private readonly dialogos = inject(DialogoStore);
  private readonly router = inject(Router);
  private readonly consulta = inject(ConsultaFicha);
  private readonly consultaIdiomas = inject(ConsultaIdiomas);
  private readonly arbol = inject(ConsultaArbolDeCategorias);
  private readonly tasas = inject(ConsultaTasasDeCambio);

  protected readonly pestana = signal<PestanaDeFicha>('overview');
  protected readonly idioma = signal(inject(TraduccionService).idioma());
  protected readonly ampliada = signal<string | null>(null);
  protected readonly edicionAbierta = signal(false);
  protected readonly jsonAbierto = signal(false);

  protected readonly ficha = resource({
    params: () => ({ id: this.id(), idioma: this.idioma() }),
    loader: async ({ params }) => {
      const resultado = await this.consulta.ejecuta(params.id, params.idioma);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.edit.error'));
        return undefined;
      }
      return resultado.valor;
    },
  });

  protected readonly idiomas = resource({
    loader: async () => {
      const resultado = await this.consultaIdiomas.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  protected readonly categorias = resource({
    params: () => this.idioma(),
    loader: async ({ params }) => {
      const resultado = await this.arbol.ejecuta(params);
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  private readonly divisas = resource({
    loader: async () => {
      const resultado = await this.tasas.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  protected readonly galeria = computed(() => this.ficha.value()?.imagenes ?? []);

  constructor() {
    // Las tasas solo sirven para enseñar el coste en la moneda de quien administra: en cuanto están, se
    // dejan en el almacén, que es quien convierte para toda la pantalla.
    effect(() => this.almacen.divisas.set(this.divisas.value()));
  }

  protected async guarda(cambios: CambiosDeFicha): Promise<void> {
    if (await this.acciones.guarda(this.id(), cambios, this.idioma())) {
      this.ficha.reload();
    }
  }

  protected guardaYuanes(cambio: { campo: ImporteEnYuanes; importe: number }): void {
    void this.guarda({ yuanes: { [cambio.campo]: cambio.importe } });
  }

  protected async guardaEdicion(cambios: CambiosDeFicha): Promise<void> {
    if (await this.acciones.guarda(this.id(), cambios, this.idioma())) {
      this.edicionAbierta.set(false);
      this.ficha.reload();
    }
  }

  protected async atiende(accion: AccionDeFicha): Promise<void> {
    switch (accion) {
      case 'editar':
        this.edicionAbierta.set(true);
        return;
      case 'json':
        this.jsonAbierto.set(true);
        return;
      case 'duplicar':
        await this.catalogo.duplica(this.id());
        return;
      case 'eliminar':
        await this.elimina();
        return;
      default:
        await this.cambiaEstado(accion);
    }
  }

  private async cambiaEstado(accion: 'publicar' | 'pausar' | 'archivar'): Promise<void> {
    const estado = accion === 'publicar' ? 'ACTIVE' : accion === 'pausar' ? 'PAUSED' : 'ARCHIVED';
    if (await this.catalogo.cambiaEstado([this.id()], estado)) {
      this.ficha.reload();
    }
  }

  /** Borrar lleva de vuelta al listado: quedarse en la ficha de algo que ya no existe no tiene sentido. */
  private async elimina(): Promise<void> {
    if (!(await this.dialogos.confirma(this.t('admin.catalog.delete.confirm')))) {
      return;
    }
    if (await this.catalogo.elimina([this.id()])) {
      await this.router.navigate(['/admin/catalog']);
    }
  }

  protected async eliminaTramo(cantidadMinima: number): Promise<void> {
    if (await this.acciones.eliminaTramo(this.id(), cantidadMinima)) {
      this.ficha.reload();
    }
  }

  protected async anadeImagenes(direcciones: readonly string[]): Promise<void> {
    await this.acciones.anadeImagenes(this.id(), direcciones);
    this.ficha.reload();
  }

  protected async eliminaImagenes(ids: readonly string[]): Promise<void> {
    await this.acciones.eliminaImagenes(ids);
    this.ficha.reload();
  }

  protected async reordena(ids: readonly string[]): Promise<void> {
    if (!(await this.acciones.reordenaImagenes(this.id(), ids))) {
      // La galería ya enseña el orden nuevo: si el servidor lo rechaza hay que volver a pedirla, o se
      // quedaría enseñando un orden que no existe.
      this.ficha.reload();
    }
  }

  /**
   * Copia la foto de un color a la galería.
   *
   * <p>Se comprueba antes que no esté ya, comparando por identificador `O1CN`: la misma foto llega con
   * direcciones distintas según el tamaño y el CDN, y sin esa comprobación la galería acababa con la
   * misma imagen dos veces.
   */
  protected async copiaDeVariante(url: string): Promise<void> {
    if (yaEnLaGaleria(this.galeria(), url)) {
      this.avisos.muestra({
        tipo: 'warning',
        mensaje: this.t('admin.catalog.images.variant_dup'),
      });
      return;
    }
    if (await this.acciones.anadeImagenes(this.id(), [url])) {
      this.avisos.exito(this.t('admin.catalog.images.variant_added'));
      this.ficha.reload();
    }
  }

  protected async renombraValor(cambio: { id: string; etiqueta: string }): Promise<void> {
    if (await this.acciones.renombraValor(cambio.id, cambio.etiqueta)) {
      this.ficha.reload();
    }
  }

  protected async fijaFotoDeValor(cambio: { id: string; url: string }): Promise<void> {
    if (await this.acciones.fijaImagenDeValor(cambio.id, cambio.url)) {
      this.ficha.reload();
    }
  }

  protected async eliminaValores(ids: readonly string[]): Promise<void> {
    const confirmado = await this.dialogos.confirma(
      this.t('admin.catalog.detail.labels.delete_confirm').replace('{n}', String(ids.length)),
    );
    if (confirmado && (await this.acciones.eliminaValores(ids))) {
      this.ficha.reload();
    }
  }

  protected async cambiaPrecio(cambio: {
    id: string;
    precio: number;
    anterior: number;
  }): Promise<void> {
    if (await this.acciones.cambiaPrecioDeVariante(cambio.id, cambio.precio, cambio.anterior)) {
      this.ficha.reload();
    }
  }
}
