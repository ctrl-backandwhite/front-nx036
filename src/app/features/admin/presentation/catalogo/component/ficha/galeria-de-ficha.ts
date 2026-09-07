import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faArrowRight, faImage, faMagnifyingGlassPlus, faPlus, faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EjeDeVariacion, esEjeDeColor, fotoDelValor } from '../../../../domain/catalogo/model/eje-de-variacion';
import {
  FotoDeVariante,
  ImagenDeProducto,
  claveDeImagen,
  direccionDeImagen,
  extraeDirecciones,
  mueve,
  yaEnLaGaleria,
} from '../../../../domain/catalogo/model/imagen-de-producto';

/**
 * El lado de la miniatura en píxeles.
 *
 * <p>Las celdas son cuadradas y se estiran con la rejilla, pero la imagen optimizada necesita saber la
 * proporción para reservar el hueco y no dar el salto de maquetación al cargar.
 */
const LADO_DE_LA_MINIATURA = 400;

/**
 * La galería del producto.
 *
 * <p>Se reordena arrastrando y el PRIMERO pasa a ser la imagen principal: no es cosmética, cambia la
 * foto con la que el producto sale en el escaparate y en los correos.
 *
 * <p>Las fotos de los colores se pueden arrastrar a la galería para copiarlas como imagen de producto
 * (la misma dirección, sin volver a subir nada). Se ofrecen solo las que aún no están, comparadas por
 * su identificador `O1CN`: la misma foto llega con direcciones distintas según el tamaño y el CDN.
 */
@Component({
  selector: 'nx-galeria-de-ficha',
  imports: [FaIconComponent, FormField, NgOptimizedImage],
  template: `
    <div class="card p-4 lg:col-span-2">
      <h3 class="font-medium mb-2 text-sm">{{ t('admin.catalog.detail.images') }}</h3>

      <div
        class="relative rounded transition-colors"
        [class.ring-2]="soltandoVariante()"
        [class.ring-primary]="soltandoVariante()"
        (dragover)="permiteSoltar($event)"
        (dragleave)="soltandoVariante.set(false)"
        (drop)="sueltaVariante($event)"
      >
        @if (orden().length > 0) {
          @if (marcadas().size > 0) {
            <div class="flex items-center gap-2 mb-2 p-2 rounded bg-primary/10 border border-primary/30">
              <span class="text-[12px] font-medium">{{ textoDeMarcadas() }}</span>
              <button
                type="button"
                class="btn btn-error btn-xs text-[12px]"
                (click)="eliminaMarcadas()"
              >
                <fa-icon [icon]="iconos.borrar" /> {{ t('admin.catalog.images.delete_selected') }}
              </button>
              <button type="button" class="btn btn-ghost btn-xs text-[12px]" (click)="marcadas.set(nuevoConjunto())">
                {{ t('admin.catalog.images.clear_sel') }}
              </button>
            </div>
          }
          <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            @for (imagen of orden(); track imagen.id; let i = $index) {
              <div
                class="aspect-square relative group cursor-move rounded"
                [class.ring-2]="marcadas().has(imagen.id)"
                [class.ring-primary]="marcadas().has(imagen.id)"
                draggable="true"
                (dragstart)="indiceArrastrado.set(i)"
                (dragover)="$event.preventDefault()"
                (drop)="suelta(i)"
              >
                <label class="absolute top-1 left-1 z-20 cursor-pointer" [title]="t('admin.catalog.images.select')">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs checkbox-primary bg-white/90"
                    [checked]="marcadas().has(imagen.id)"
                    (change)="alterna(imagen.id)"
                    [attr.aria-label]="t('admin.catalog.images.select')"
                  />
                </label>
                @if (i === 0) {
                  <span class="absolute bottom-1 left-1 z-10 badge badge-primary badge-xs text-[9px]">
                    {{ t('admin.catalog.images.main') }}
                  </span>
                }
                <button type="button" class="w-full h-full block" (click)="amplia.emit(direccion(imagen))">
                  <!--
                    Sin marcar la primera como PRIORITARIA, y no es un olvido.

                    DEFECTO CERRADO: la primera miniatura llevaba la entrada de prioridad atada a su
                    posición, y como las miniaturas se siguen por identificador, al reordenar Angular
                    MUEVE el mismo elemento en vez de rehacerlo. Entonces esa entrada cambiaba de
                    valor sobre una imagen ya cargada y la directiva de imagen optimizada lanzaba
                    NG02953 en cada reordenación. En una
                    compilación de producción la comprobación no corre y el aviso no sale, así que
                    esto habría pasado desapercibido: lo destapó la prueba de las flechas.

                    Y la prioridad tampoco hacía falta aquí: es el editor de la ficha, detrás del
                    acceso, no una pantalla pública cuyo primer pintado haya que ganar.
                  -->
                  <img
                    [ngSrc]="direccion(imagen)"
                    [width]="LADO_DE_LA_MINIATURA"
                    [height]="LADO_DE_LA_MINIATURA"
                    [alt]="titulo() + ' — ' + (i + 1)"
                    class="w-full h-full object-cover rounded border border-ink-100"
                  />
                  <span
                    class="absolute inset-0 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-black/30 transition-colors"
                  >
                    <fa-icon [icon]="iconos.lupa" class="text-white" />
                  </span>
                </button>
                <button
                  type="button"
                  class="absolute top-1 right-1 btn btn-error btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                  [title]="t('admin.catalog.images.delete')"
                  [attr.aria-label]="t('admin.catalog.images.delete')"
                  (click)="elimina.emit([imagen.id])"
                >
                  <fa-icon [icon]="iconos.borrar" class="text-[10px]" />
                </button>
                <!--
                  Las dos flechas son el equivalente TÁCTIL del arrastre, y de paso el teclado llega
                  aquí. El arrastre HTML5 no existe en una pantalla táctil —el gesto lo interpreta el
                  navegador como desplazamiento—, así que desde una tableta no había forma de decidir
                  cuál es la imagen principal, que es lo que de verdad se está eligiendo al reordenar.
                  Van SIEMPRE visibles y no al pasar el ratón: en táctil no hay ratón que pasar.
                -->
                <div class="absolute bottom-1 right-1 z-20 flex gap-0.5">
                  <button
                    type="button"
                    class="btn btn-xs btn-square"
                    [disabled]="i === 0"
                    [title]="t('admin.catalog.images.move_prev')"
                    [attr.aria-label]="t('admin.catalog.images.move_prev')"
                    (click)="mueveA(i, i - 1)"
                  >
                    <fa-icon [icon]="iconos.antes" class="text-[10px]" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-square"
                    [disabled]="i === orden().length - 1"
                    [title]="t('admin.catalog.images.move_next')"
                    [attr.aria-label]="t('admin.catalog.images.move_next')"
                    (click)="mueveA(i, i + 1)"
                  >
                    <fa-icon [icon]="iconos.despues" class="text-[10px]" />
                  </button>
                </div>
              </div>
            }
          </div>
          <p class="text-[11px] text-ink-400 mt-2">{{ t('admin.catalog.images.reorder_hint') }}</p>
        } @else {
          <div class="flex flex-col items-center justify-center py-10 text-ink-400">
            <fa-icon [icon]="iconos.imagen" class="text-3xl mb-2" />
            <span class="text-[12px]">{{ t('admin.catalog.detail.gallery_empty') }}</span>
          </div>
        }
      </div>

      @if (fotosDeVariante().length > 0) {
        <div class="mt-3 pt-3 border-t border-ink-100">
          <h4 class="text-[12px] font-medium text-ink-600 mb-1">
            {{ t('admin.catalog.images.from_variants') }}
          </h4>
          <p class="text-[11px] text-ink-400 mb-2">{{ t('admin.catalog.images.from_variants_hint') }}</p>
          <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            @for (foto of fotosDeVariante(); track foto.id) {
              <div
                class="aspect-square relative rounded border border-ink-100 cursor-grab active:cursor-grabbing"
                draggable="true"
                [title]="foto.etiqueta"
                (dragstart)="empiezaVariante(foto.url)"
                (dragend)="terminaVariante()"
              >
                <img
                  [ngSrc]="foto.url"
                  [width]="LADO_DE_LA_MINIATURA"
                  [height]="LADO_DE_LA_MINIATURA"
                  [alt]="foto.etiqueta"
                  class="w-full h-full object-cover rounded"
                />
                @if (foto.etiqueta) {
                  <span class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] truncate px-1 py-0.5 rounded-b">
                    {{ foto.etiqueta }}
                  </span>
                }
                <!-- Mismo motivo que las flechas: arrastrar esta foto hasta la galería es un gesto de
                     ratón, y sin este botón la copia era imposible desde una tableta. -->
                <button
                  type="button"
                  class="absolute top-0.5 right-0.5 z-10 btn btn-primary btn-xs btn-square"
                  [title]="t('admin.catalog.images.use_in_gallery')"
                  [attr.aria-label]="t('admin.catalog.images.use_in_gallery')"
                  (click)="copiaDeVariante.emit(foto.url)"
                >
                  <fa-icon [icon]="iconos.mas" class="text-[10px]" />
                </button>
              </div>
            }
          </div>
        </div>
      }

      <div class="mt-3 pt-3 border-t border-ink-100">
        <label for="galeria-urls" class="sr-only">{{ t('admin.catalog.images.url_ph') }}</label>
        <textarea
          id="galeria-urls"
          rows="3"
          class="textarea textarea-bordered w-full text-[12px] leading-snug"
          [placeholder]="t('admin.catalog.images.url_ph')"
          [formField]="formulario.direcciones"
        ></textarea>
        <div class="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <span class="text-[11px] text-ink-400">{{ t('admin.catalog.images.multi_hint') }}</span>
          <button
            type="button"
            class="btn btn-outline btn-sm text-[12px]"
            [disabled]="nuevas().length === 0"
            (click)="anadeNuevas()"
          >
            <fa-icon [icon]="iconos.mas" /> {{ t('admin.catalog.images.add_url') }}
            @if (nuevas().length > 1) {
              <span> ({{ nuevas().length }})</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class GaleriaDeFicha {
  readonly imagenes = input.required<readonly ImagenDeProducto[]>();
  readonly ejes = input<readonly EjeDeVariacion[]>([]);
  readonly titulo = input('');

  readonly reordena = output<readonly string[]>();
  readonly elimina = output<readonly string[]>();
  readonly anade = output<readonly string[]>();
  readonly copiaDeVariante = output<string>();
  readonly amplia = output<string>();

  protected readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;

  protected readonly LADO_DE_LA_MINIATURA = LADO_DE_LA_MINIATURA;
  protected readonly iconos = {
    imagen: faImage,
    lupa: faMagnifyingGlassPlus,
    borrar: faTrash,
    mas: faPlus,
    antes: faArrowLeft,
    despues: faArrowRight,
  };

  /**
   * El orden que se ve mientras se arrastra. `linkedSignal` lo REINICIA cuando cambian las imágenes del
   * servidor: sin eso, al añadir o quitar una, la galería seguía enseñando el orden viejo.
   */
  protected readonly orden = linkedSignal<readonly ImagenDeProducto[], readonly ImagenDeProducto[]>({
    source: () => this.imagenes(),
    // Las que no traen ninguna dirección no se pintan: no hay nada que enseñar y el componente de
    // imagen optimizada se niega a intentarlo.
    computation: (imagenes) => imagenes.filter((imagen) => !!direccionDeImagen(imagen)),
  });

  protected readonly marcadas = linkedSignal<readonly ImagenDeProducto[], ReadonlySet<string>>({
    source: () => this.imagenes(),
    computation: () => new Set<string>(),
  });

  protected readonly indiceArrastrado = signal<number | null>(null);
  protected readonly soltandoVariante = signal(false);
  private readonly urlArrastrada = signal<string | null>(null);

  /** Las direcciones que se pegan de golpe, una por línea. Sin reglas: el filtro lo hace el dominio. */
  private readonly modelo = signal({ direcciones: '' });
  protected readonly formulario = form(this.modelo);

  protected readonly nuevas = computed(() => extraeDirecciones(this.modelo().direcciones));

  /** Las fotos de color que todavía no están en la galería, sin repetidas por identificador `O1CN`. */
  protected readonly fotosDeVariante = computed<readonly FotoDeVariante[]>(() => {
    const vistas = new Set<string>();
    const salida: FotoDeVariante[] = [];
    for (const eje of this.ejes().filter(esEjeDeColor)) {
      for (const valor of eje.valores) {
        const url = fotoDelValor(valor);
        const clave = claveDeImagen(url);
        if (!url || vistas.has(clave) || yaEnLaGaleria(this.imagenes(), url)) {
          continue;
        }
        vistas.add(clave);
        salida.push({ id: valor.id, url, etiqueta: valor.valor || valor.valorZh || '' });
      }
    }
    return salida;
  });

  protected direccion(imagen: ImagenDeProducto): string {
    return direccionDeImagen(imagen);
  }

  protected nuevoConjunto(): ReadonlySet<string> {
    return new Set<string>();
  }

  protected readonly textoDeMarcadas = computed(() =>
    this.tCon('admin.catalog.images.selected', { n: this.marcadas().size }),
  );

  protected alterna(id: string): void {
    this.marcadas.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  protected eliminaMarcadas(): void {
    this.elimina.emit([...this.marcadas()]);
  }

  protected suelta(destino: number): void {
    const origen = this.indiceArrastrado();
    this.indiceArrastrado.set(null);
    if (origen === null) {
      return;
    }
    this.mueveA(origen, destino);
  }

  /**
   * Mover una imagen de sitio. Lo llaman el arrastre y las flechas, para que las dos maneras hagan
   * exactamente lo mismo: `mueve` devuelve la MISMA lista cuando el movimiento no lleva a ninguna
   * parte —fuera de rango, o al sitio donde ya estaba—, y entonces no se avisa al servidor.
   */
  protected mueveA(desde: number, hasta: number): void {
    const actual = this.orden();
    const siguiente = mueve(actual, desde, hasta);
    if (siguiente === actual) {
      return;
    }
    this.orden.set(siguiente);
    this.reordena.emit(siguiente.map((imagen) => imagen.id));
  }

  protected empiezaVariante(url: string): void {
    this.urlArrastrada.set(url);
    this.indiceArrastrado.set(null);
  }

  protected terminaVariante(): void {
    this.urlArrastrada.set(null);
    this.soltandoVariante.set(false);
  }

  protected permiteSoltar(evento: DragEvent): void {
    if (this.urlArrastrada()) {
      evento.preventDefault();
      this.soltandoVariante.set(true);
    }
  }

  protected sueltaVariante(evento: DragEvent): void {
    const url = this.urlArrastrada();
    if (!url) {
      return;
    }
    evento.preventDefault();
    this.terminaVariante();
    this.copiaDeVariante.emit(url);
  }

  protected anadeNuevas(): void {
    this.anade.emit(this.nuevas());
    this.modelo.set({ direcciones: '' });
  }
}
