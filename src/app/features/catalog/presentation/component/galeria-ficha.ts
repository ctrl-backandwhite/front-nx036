import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faPlay,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenDeProducto } from '../../domain/model/producto';
import { VisorGaleria } from './visor-galeria';

/**
 * La galería de la ficha: miniaturas, foto grande, vídeo y ampliación.
 *
 * <p>MOBILE FIRST: en el móvil la foto ocupa el ancho, se pasa DESLIZANDO y hay puntos debajo —el
 * gesto que ya se espera en una tienda—. A partir de `sm` aparece la columna de miniaturas y las
 * flechas, que en una pantalla táctil no hacen falta y estorban sobre la foto.
 *
 * <p>El componente no sabe NADA del producto: recibe fotos y avisa de lo que se toca. Es lo que
 * permite que el pase automático, que vive fuera, se corte con cualquier interacción sin que la
 * galería tenga que conocerlo.
 */
@Component({
  selector: 'nx-galeria-ficha',
  imports: [FaIconComponent, NgOptimizedImage, VisorGaleria],
  template: `
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Miniaturas SOLO a partir de sm: en el móvil se navega deslizando y con los puntos. -->
      <div class="hidden sm:flex sm:flex-col gap-2 shrink-0 sm:max-h-136 sm:overflow-y-auto scrollbar-thin">
        @if (urlDelVideo(); as video) {
          <div class="relative w-20 shrink-0 group">
            <!-- El aviso de interacción va ANTES de abrir el vídeo: sin él, el pase automático seguía
                 corriendo y a los cinco segundos cambiaba la foto, lo que cerraba el vídeo a media
                 reproducción. El pase es solo para las FOTOS. -->
            <button
              type="button"
              (click)="interactua.emit(); enVideo.set(true)"
              class="aspect-square w-full border border-base-200 rounded-lg overflow-hidden relative hover:border-primary block"
              [attr.aria-label]="t('product.play_video')"
            >
              <video [src]="video" muted playsinline class="w-full h-full object-cover"></video>
              <span class="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <fa-icon [icon]="iconos.play" />
              </span>
            </button>
            @if (puedeEditar()) {
              <button
                type="button"
                (click)="borraVideo.emit(); $event.stopPropagation()"
                [title]="t('admin.catalog.video.delete')"
                class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-error text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
              >
                <fa-icon [icon]="iconos.papelera" />
              </button>
            }
          </div>
        }
        @for (foto of fotos(); track foto.id; let i = $index) {
          <div
            class="relative w-20 shrink-0 group"
            [class.cursor-move]="puedeEditar()"
            [attr.draggable]="puedeEditar() ? true : null"
            (dragstart)="arrastrada.set(i)"
            (dragover)="permiteSoltar($event)"
            (drop)="suelta(i)"
          >
            <button
              type="button"
              (click)="elige(i)"
              [attr.aria-label]="t('product.image_n') + ' ' + (i + 1)"
              [attr.aria-current]="i === activa() && !enVideo() && !fotoDeVariante()"
              class="aspect-square w-full border rounded-lg overflow-hidden transition-colors block"
              [class]="
                i === activa() && !enVideo() && !fotoDeVariante()
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-base-200 hover:border-base-content/30'
              "
            >
              <img
                [src]="foto.direccion"
                alt=""
                loading="lazy"
                class="w-full h-full object-contain bg-base-100"
              />
            </button>
            @if (puedeEditar()) {
              <button
                type="button"
                (click)="borraImagen.emit(foto.id); $event.stopPropagation()"
                [title]="t('admin.catalog.images.delete')"
                class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-error text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <fa-icon [icon]="iconos.papelera" />
              </button>
            }
          </div>
        }
      </div>

      <!-- En escritorio, con que el cursor entre en la foto el pase se detiene: quien la está mirando
           no quiere que se la cambien debajo. En el móvil lo hace el primer toque. -->
      <div
        class="relative flex-1 min-w-0"
        (mouseenter)="interactua.emit()"
        (touchstart)="empiezaGesto($event)"
        (touchend)="terminaGesto($event)"
      >
        <div
          class="relative aspect-square bg-base-100 border border-base-200 rounded-xl overflow-hidden flex items-center justify-center select-none"
        >
          @if (enVideo() && urlDelVideo()) {
            <!-- El vídeo va SIEMPRE mudo, y sin manera de dejar de estarlo.
                 Los clips del proveedor llegan con música o locución en chino y aquí solo sirven de
                 demostración visual. Antes bastaba con silenciarlo y volver a silenciarlo si alguien
                 subía el volumen, pero el control seguía a la vista: al pulsarlo sonaba un instante
                 —lo suficiente para que el navegador marcara la pestaña con el altavoz— y luego se
                 callaba solo. Quedaba como una avería.
                 Ahora se esconden los mandos de sonido (la clase «video-sin-sonido» de la hoja
                 central), se quitan descarga y reproducción remota, y se deja el re-silenciado como
                 última red por si algún navegador enseña el control de todos modos. -->
            <video
              [src]="urlDelVideo()!"
              controls
              controlsList="nodownload noremoteplayback"
              disableRemotePlayback
              autoplay
              muted
              playsinline
              (volumechange)="silencia($event)"
              class="video-sin-sonido w-full h-full object-contain bg-black"
            ></video>
          } @else if (principal(); as foto) {
            <!--
              La foto principal es lo que decide cuándo se ve algo útil en una ficha, así que va con
              «priority»: se pide antes que nada y sin esperar a que el navegador la descubra bajando
              por el documento. «fill» porque el hueco ya lo fija el contenedor cuadrado de arriba.
            -->
            <button
              type="button"
              (click)="interactua.emit(); ampliada.set(true)"
              class="absolute inset-0 w-full h-full cursor-zoom-in"
              [attr.aria-label]="titulo()"
            >
              <img
                id="nx-pdp-main-img"
                [ngSrc]="foto"
                fill
                priority
                [alt]="titulo()"
                class="object-contain bg-base-100"
                [class]="pasePasando() ? 'animate-fade-gallery' : 'animate-fade-gallery-fast'"
              />
            </button>
          } @else {
            <span class="opacity-40 text-sm">{{ t('product.no_image') }}</span>
          }
        </div>

        <!-- En el móvil las miniaturas están ocultas, así que el vídeo necesita su propio botón. -->
        @if (urlDelVideo() && !enVideo()) {
          <button
            type="button"
            (click)="interactua.emit(); enVideo.set(true)"
            [attr.aria-label]="t('product.play_video')"
            class="sm:hidden btn btn-sm btn-circle bg-base-100/85 backdrop-blur border-base-200 absolute top-2 left-2"
          >
            <fa-icon [icon]="iconos.play" class="text-primary" />
          </button>
        }

        @if (cuantas() > 1 && !enVideo()) {
          <button
            type="button"
            (click)="pasa(-1)"
            [attr.aria-label]="t('quickview.prev')"
            class="hidden sm:flex btn btn-sm btn-circle btn-ghost bg-base-100/80 backdrop-blur absolute left-2 top-1/2 -translate-y-1/2"
          >
            <fa-icon [icon]="iconos.izquierda" />
          </button>
          <button
            type="button"
            (click)="pasa(1)"
            [attr.aria-label]="t('quickview.next')"
            class="hidden sm:flex btn btn-sm btn-circle btn-ghost bg-base-100/80 backdrop-blur absolute right-2 top-1/2 -translate-y-1/2"
          >
            <fa-icon [icon]="iconos.derecha" />
          </button>
          <span
            class="absolute bottom-2 right-3 text-[11px] px-2 py-0.5 rounded-full bg-base-100/80 border border-base-200"
          >
            {{ activa() + 1 }} / {{ cuantas() }}
          </span>
        }
      </div>

      <!-- Puntos SOLO en el móvil: tocar salta a esa foto, como en cualquier aplicación. -->
      @if (cuantas() > 1 && !enVideo()) {
        <div class="sm:hidden order-3 flex flex-wrap justify-center gap-1.5 pt-0.5">
          @for (foto of fotos(); track foto.id; let i = $index) {
            <button
              type="button"
              (click)="elige(i)"
              [attr.aria-label]="t('product.image_n') + ' ' + (i + 1)"
              class="h-1.5 rounded-full transition-all"
              [class]="i === activa() ? 'w-5 bg-primary' : 'w-1.5 bg-base-300'"
            ></button>
          }
        </div>
      }
    </div>

    @if (ampliada() && principal()) {
      <nx-visor-galeria
        [src]="principal()!"
        [titulo]="titulo()"
        [indice]="activa()"
        [total]="cuantas()"
        (cierra)="ampliada.set(false)"
        (anterior)="pasa(-1)"
        (siguiente)="pasa(1)"
      />
    }
  `,
})
export class GaleriaFicha {
  readonly fotos = input.required<readonly ImagenDeProducto[]>();
  readonly urlDelVideo = input<string | undefined>(undefined);
  readonly titulo = input('');
  /** Foto que se enseña en grande cuando el color elegido no tiene miniatura propia. */
  readonly fotoDeVariante = input<string | undefined>(undefined);
  /** Mientras el pase corre el fundido es largo; en cuanto manda quien mira, inmediato. */
  readonly pasePasando = input(false);
  readonly puedeEditar = input(false);

  readonly activa = model(0);
  readonly interactua = output<void>();
  readonly borraImagen = output<string>();
  readonly borraVideo = output<void>();
  readonly reordena = output<readonly string[]>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = {
    play: faPlay,
    papelera: faTrash,
    izquierda: faChevronLeft,
    derecha: faChevronRight,
  };

  protected readonly enVideo = signal(false);
  protected readonly ampliada = signal(false);
  protected readonly arrastrada = signal<number | null>(null);
  private readonly inicioDelGesto = signal<number | null>(null);

  protected readonly cuantas = computed(() => this.fotos().length);

  /** Si hay foto de color sin miniatura propia, esa manda; si no, la activa de la galería. */
  protected readonly principal = computed(
    () => this.fotoDeVariante() ?? this.fotos()[this.activa()]?.direccion,
  );

  protected elige(indice: number): void {
    this.enVideo.set(false);
    this.interactua.emit();
    this.activa.set(indice);
  }

  /** Da la vuelta en los extremos: llegar a la última y no poder seguir es un callejón sin salida. */
  protected pasa(paso: number): void {
    const total = this.cuantas();
    if (total < 2) {
      return;
    }
    this.elige((this.activa() + paso + total) % total);
  }

  protected silencia(evento: Event): void {
    const video = evento.target as HTMLVideoElement;
    if (!video.muted) {
      video.muted = true;
    }
  }

  protected empiezaGesto(evento: TouchEvent): void {
    this.interactua.emit();
    this.inicioDelGesto.set(evento.touches[0]?.clientX ?? null);
  }

  /** Cuarenta píxeles de umbral: por debajo suele ser un desplazamiento vertical, no un deslizamiento. */
  protected terminaGesto(evento: TouchEvent): void {
    const inicio = this.inicioDelGesto();
    if (inicio === null || this.cuantas() < 2) {
      return;
    }
    const recorrido = (evento.changedTouches[0]?.clientX ?? inicio) - inicio;
    if (Math.abs(recorrido) > 40) {
      this.pasa(recorrido < 0 ? 1 : -1);
    }
    this.inicioDelGesto.set(null);
  }

  protected permiteSoltar(evento: DragEvent): void {
    if (this.puedeEditar()) {
      evento.preventDefault();
    }
  }

  /** Reordenar es de administrador: la primera foto pasa a ser la principal del producto. */
  protected suelta(hasta: number): void {
    const desde = this.arrastrada();
    this.arrastrada.set(null);
    if (desde === null || desde === hasta || !this.puedeEditar()) {
      return;
    }
    const ids = this.fotos().map((foto) => foto.id);
    const [movida] = ids.splice(desde, 1);
    ids.splice(hasta, 0, movida);
    this.reordena.emit(ids);
  }
}
