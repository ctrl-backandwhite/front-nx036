import { Component, effect, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMugSaucer, faPalette, faPen, faTrash, faTshirt } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { DisenoPod, ProductoEnBlanco, esRenombradoValido } from '../../domain/model/diseno-pod';
import { TasaDeCambio, convierte, formateaImporte } from '../../domain/model/tasa-de-cambio';
import {
  DISENOS_PORT,
  GENERACION_DE_DISENO_PORT,
  PRODUCTOS_EN_BLANCO_PORT,
} from '../../domain/port/pod.port';
import { TASAS_DE_CAMBIO_PORT } from '../../domain/port/tasas-de-cambio.port';
import { DialogoNuevoDiseno } from '../component/dialogo-nuevo-diseno';
import { PortadaDeImpresion } from '../component/portada-de-impresion';

/**
 * Impresión bajo demanda: elegir una prenda, ponerle un diseño y venderla sin stock.
 *
 * <p>Los fallos se avisan SIEMPRE, y con la generación por inteligencia artificial es especialmente
 * importante: el botón vuelve solo de «Generando…» a «Generar», no aparece imagen y no se dice nada,
 * así que sin aviso es imposible distinguir un servicio caído de una instrucción rechazada.
 *
 * <p>MOBILE FIRST: las rejillas arrancan en dos columnas —una tarjeta de producto por debajo de eso
 * queda ilegible— y crecen hasta seis.
 */
@Component({
  selector: 'nx-pod',
  imports: [FaIconComponent, ImagenSegura, PortadaDeImpresion, DialogoNuevoDiseno],
  template: `
    <div class="space-y-12">
      <nx-portada-de-impresion />

      <section id="blancos">
        <header class="section-header">
          <h2 class="text-xl flex items-center gap-2">
            <fa-icon [icon]="iconos.camiseta" class="text-brand-500" /> {{ t('pod.blanks') }}
          </h2>
          <span class="text-[12px] text-ink-500">
            {{ enBlanco().length }} {{ t('pod.blanks_count') }}
          </span>
        </header>

        @if (cargandoBlancos()) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            @for (hueco of huecos; track hueco) {
              <div class="card p-3">
                <div class="skeleton aspect-square w-full mb-2"></div>
                <div class="skeleton h-3 w-4/5"></div>
              </div>
            }
          </div>
        } @else if (enBlanco().length === 0) {
          <div class="card p-10 text-center">
            <fa-icon [icon]="iconos.taza" class="text-4xl text-ink-300 mb-3" />
            <p class="font-medium">{{ t('pod.empty.title') }}</p>
            <p class="text-[12px] text-ink-500 mt-1">{{ t('pod.empty.body') }}</p>
          </div>
        } @else {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            @for (producto of enBlanco(); track producto.id) {
              <button
                type="button"
                class="card overflow-hidden text-left hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                (click)="elegido.set(producto)"
              >
                <nx-imagen-segura
                  [src]="producto.imagen"
                  [alt]="producto.titulo"
                  clase="aspect-square w-full object-cover"
                  claseMarcador="aspect-square w-full"
                />
                <div class="p-3">
                  <div class="text-[12px] font-medium line-clamp-2 min-h-[2.5rem]">
                    {{ producto.titulo }}
                  </div>
                  <div class="text-[12px] text-brand-700 mt-1">{{ precio(producto) }}</div>
                </div>
              </button>
            }
          </div>
        }
      </section>

      <section id="disenos">
        <header class="section-header">
          <h2 class="text-xl flex items-center gap-2">
            <fa-icon [icon]="iconos.paleta" class="text-brand-500" /> {{ t('pod.designs') }}
          </h2>
        </header>

        @if (disenos().length === 0) {
          <div class="card p-10 text-center">
            <fa-icon [icon]="iconos.paleta" class="text-4xl text-ink-300 mb-3" />
            <p class="font-medium">{{ t('pod.designs_empty.title') }}</p>
            <p class="text-[12px] text-ink-500 mt-1">{{ t('pod.designs_empty.body') }}</p>
          </div>
        } @else {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            @for (diseno of disenos(); track diseno.id) {
              <div class="card overflow-hidden group relative">
                <nx-imagen-segura
                  [src]="diseno.maquetaUrl"
                  [alt]="diseno.nombre"
                  clase="aspect-square w-full object-cover"
                  claseMarcador="aspect-square w-full"
                />
                <!--
                  Los botones aparecen al pasar por encima en el escritorio, pero NO dependen de ello:
                  siguen en el árbol y se alcanzan con el tabulador, que es como llega quien no usa
                  ratón — y como se ven en el móvil, donde no hay «encima».
                -->
                <div
                  class="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity"
                >
                  <button
                    type="button"
                    class="btn btn-xs btn-square bg-base-100/90 border-base-200"
                    [attr.aria-label]="t('pod.action.rename')"
                    [title]="t('pod.action.rename')"
                    (click)="renombra(diseno)"
                  >
                    <fa-icon [icon]="iconos.lapiz" class="text-[10px]" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-square bg-base-100/90 border-base-200 text-error"
                    [attr.aria-label]="t('pod.action.delete')"
                    [title]="t('pod.action.delete')"
                    (click)="elimina(diseno)"
                  >
                    <fa-icon [icon]="iconos.papelera" class="text-[10px]" />
                  </button>
                </div>
                <div class="p-3">
                  <div class="text-[12px] font-medium line-clamp-1">{{ diseno.nombre }}</div>
                  <div class="text-[11px] text-ink-500 line-clamp-1">
                    {{ diseno.tituloDelProducto }}
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>

      @if (elegido(); as producto) {
        <nx-dialogo-nuevo-diseno
          [producto]="producto"
          [creando]="creando()"
          [generando]="generando()"
          [maqueta]="maqueta()"
          (crea)="crea(producto, $event)"
          (genera)="genera($event)"
          (cancela)="cierra()"
        />
      }
    </div>
  `,
})
export class PodPage {
  private readonly puertoDeBlancos = inject(PRODUCTOS_EN_BLANCO_PORT);
  private readonly puertoDeDisenos = inject(DISENOS_PORT);
  private readonly puertoDeGeneracion = inject(GENERACION_DE_DISENO_PORT);
  private readonly puertoDeTasas = inject(TASAS_DE_CAMBIO_PORT);
  private readonly avisos = inject(AvisosStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = this.traduccion.t;

  protected readonly iconos = {
    camiseta: faTshirt,
    taza: faMugSaucer,
    paleta: faPalette,
    lapiz: faPen,
    papelera: faTrash,
  };

  /** Doce huecos mientras carga: los mismos que caben en la rejilla, para que no dé un salto. */
  protected readonly huecos = Array.from({ length: 12 }, (_, i) => i);

  protected readonly enBlanco = signal<readonly ProductoEnBlanco[]>([]);
  protected readonly disenos = signal<readonly DisenoPod[]>([]);
  protected readonly tasas = signal<readonly TasaDeCambio[]>([]);
  protected readonly cargandoBlancos = signal(true);

  protected readonly elegido = signal<ProductoEnBlanco | null>(null);
  protected readonly maqueta = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly generando = signal(false);

  constructor() {
    // El catálogo de prendas se recarga al cambiar de idioma: sus títulos vienen traducidos del
    // backend, no del diccionario de la interfaz.
    effect(() => {
      void this.cargaBlancos(this.traduccion.idioma());
    });
    void this.cargaDisenos();
    void this.cargaTasas();
  }

  protected precio(producto: ProductoEnBlanco): string {
    const divisa = this.preferencias.moneda();
    const enDivisa = convierte(producto.precio, producto.divisa, divisa, this.tasas());
    return formateaImporte(enDivisa, divisa, this.traduccion.idioma());
  }

  protected async genera(instruccion: string): Promise<void> {
    this.generando.set(true);
    try {
      const resultado = await this.puertoDeGeneracion.genera(instruccion);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('pod.action.error'));
        return;
      }
      this.maqueta.set(resultado.valor.maquetaUrl);
      this.avisos.exito(this.t('pod.toast.ai_done'));
    } finally {
      this.generando.set(false);
    }
  }

  protected async crea(
    producto: ProductoEnBlanco,
    datos: { nombre: string; instruccion: string },
  ): Promise<void> {
    this.creando.set(true);
    try {
      const resultado = await this.puertoDeDisenos.crea({
        idProducto: producto.id,
        nombre: datos.nombre,
        instruccionIa: datos.instruccion || undefined,
      });
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('pod.action.error'));
        return;
      }
      this.cierra();
      this.avisos.exito(this.t('pod.toast.created'));
      await this.cargaDisenos();
    } finally {
      this.creando.set(false);
    }
  }

  protected async renombra(diseno: DisenoPod): Promise<void> {
    const nuevo = await this.dialogo.pregunta({
      mensaje: this.t('pod.action.rename_prompt'),
      valorInicial: diseno.nombre,
    });
    // Vacío o el mismo de antes: no se llama al servidor. Guardar lo que ya estaba guardado gasta una
    // petición y enseña una confirmación de algo que no ha pasado.
    if (!esRenombradoValido(nuevo, diseno.nombre)) {
      return;
    }
    const resultado = await this.puertoDeDisenos.renombra(diseno.id, (nuevo ?? '').trim());
    if (!resultado.ok) {
      this.avisos.error(this.t('pod.action.error'));
      return;
    }
    this.avisos.exito(this.t('pod.action.renamed'));
    await this.cargaDisenos();
  }

  protected async elimina(diseno: DisenoPod): Promise<void> {
    const mensaje = this.t('pod.action.delete_confirm').replace('{name}', diseno.nombre);
    if (!(await this.dialogo.confirma(mensaje))) {
      return;
    }
    const resultado = await this.puertoDeDisenos.elimina(diseno.id);
    if (!resultado.ok) {
      this.avisos.error(this.t('pod.action.error'));
      return;
    }
    this.avisos.exito(this.t('pod.action.deleted'));
    await this.cargaDisenos();
  }

  protected cierra(): void {
    this.elegido.set(null);
    this.maqueta.set(null);
  }

  private async cargaBlancos(idioma: string): Promise<void> {
    this.cargandoBlancos.set(true);
    try {
      const resultado = await this.puertoDeBlancos.lista(idioma);
      if (resultado.ok) {
        this.enBlanco.set(resultado.valor);
      }
    } finally {
      this.cargandoBlancos.set(false);
    }
  }

  private async cargaDisenos(): Promise<void> {
    const resultado = await this.puertoDeDisenos.mios();
    if (resultado.ok) {
      this.disenos.set(resultado.valor);
    }
  }

  private async cargaTasas(): Promise<void> {
    const resultado = await this.puertoDeTasas.consulta();
    if (resultado.ok) {
      this.tasas.set(resultado.valor);
    }
  }
}
