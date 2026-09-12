import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenDeProducto } from '../../domain/model/producto';
import { VisorGaleria } from './visor-galeria';

/**
 * Las fotos de la DESCRIPCIÓN del producto: una tira horizontal de miniaturas que se abre en grande.
 *
 * <p><b>Por qué no se reutiliza {@code GaleriaFicha}.</b> Se intentó, y en esta tarjeta queda mal: ese
 * componente es el carrusel PRINCIPAL de la ficha —una imagen enorme, la tira debajo y una barra de
 * selección múltiple para borrar en lote—. Metido dentro de «Detalles del producto» ocupaba la pantalla
 * entera y su barra de selección se apretujaba en el ancho de una miniatura, ilegible.
 *
 * <p>Aquí lo que se quiere es lo contrario: miniaturas PEQUEÑAS en una fila, y la foto grande solo
 * cuando alguien la pide. Es material de consulta —medidas, materiales, cómo se lleva la prenda—, no
 * la primera impresión del producto, así que no debe competir con el carrusel de arriba.
 *
 * <p>El visor ampliado es el mismo {@link VisorGaleria} que usa el carrusel, así que se pasan las fotos
 * con las flechas, el contador y las teclas de siempre sin duplicar nada.
 */
@Component({
  selector: 'nx-galeria-de-detalle',
  imports: [FaIconComponent, VisorGaleria],
  template: `
    <div class="mt-4">
      <!--
        Tira horizontal con desplazamiento propio: se desplaza en horizontal en vez de envolver. Con
        quince carteles de descripción, envolver llenaría media pantalla de miniaturas y volvería a
        empujar hacia abajo lo que viene después, que es justo lo que se quería evitar.
      -->
      <div class="flex gap-2 overflow-x-auto pb-1" role="list">
        @for (foto of fotos(); track foto.id; let i = $index) {
          <!--
            Se arrastra la CELDA entera, no la miniatura: dentro hay un botón, una casilla y una
            papelera, y poner el arrastre en el botón hacía que soltar sobre él se leyera como un clic
            y abriera el visor en mitad del gesto.
          -->
          <div
            class="relative shrink-0"
            role="listitem"
            [class.cursor-move]="puedeEditar()"
            [attr.draggable]="puedeEditar() ? true : null"
            (dragstart)="arrastrada.set(i)"
            (dragover)="permiteSoltar($event)"
            (drop)="suelta(i)"
          >
            <button
              type="button"
              (click)="abre(i)"
              class="block w-[120px] h-[120px] rounded-lg overflow-hidden border border-base-300 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              [attr.aria-label]="etiquetaDeAmpliar(i)"
            >
              <!--
                img con src normal, NO NgOptimizedImage, igual que las miniaturas del carrusel. Se
                probo con ngSrc y las nueve salieron EN BLANCO: con medidas fijas reescribe la
                direccion y las imagenes remotas del almacen local no cargan. En este front ngSrc solo
                se usa en la imagen GRANDE, con fill; las miniaturas van con src a secas.

                Y object-contain, no cover: en la descripcion hay carteles y tablas de medidas, y
                recortarlos por el centro los deja ilegibles justo cuando hay que decidir si valen.
              -->
              <img
                [src]="foto.direccion"
                [alt]="etiquetaDeAmpliar(i)"
                loading="lazy"
                class="w-full h-full object-contain bg-base-100"
              />
            </button>
            @if (puedeEditar()) {
              <!--
                Los dos controles van DENTRO del marco de la miniatura, no colgando por fuera: puestos
                con desplazamiento negativo, el de la primera foto se salía del contenedor y el navegador
                lo recortaba, que es como se quedó la papelera medio cortada y sin icono visible.
              -->
              <label
                class="absolute top-1 left-1 cursor-pointer"
                [attr.aria-label]="etiquetaDeMarcar(i)"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary [&:not(:checked)]:bg-white/90"
                  [checked]="estaMarcada(foto.id)"
                  (change)="alterna(foto.id)"
                />
              </label>
              <button
                type="button"
                (click)="borra.emit(foto.id)"
                [attr.aria-label]="etiquetaDeBorrar(i)"
                class="btn btn-xs btn-circle btn-error absolute top-1 right-1 shadow"
              >
                <fa-icon [icon]="iconos.papelera" class="text-xs" />
              </button>
            }
          </div>
        }
      </div>

      <!--
        La barra de lote va DEBAJO y en horizontal. En el carrusel es una columna dentro de la tira
        vertical, y copiarla aquí tal cual la dejaba con el ancho de una miniatura: los tres rótulos se
        montaban unos sobre otros y no se entendía nada.
      -->
      @if (puedeEditar() && cuantasMarcadas() > 0) {
        <div
          class="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2"
        >
          <span class="text-xs font-medium">{{ textoDeMarcadas() }}</span>
          <button type="button" class="btn btn-error btn-xs" (click)="borraLasMarcadas()">
            <fa-icon [icon]="iconos.papelera" /> {{ t('admin.catalog.images.delete_selected') }}
          </button>
          <button type="button" class="btn btn-ghost btn-xs" (click)="limpiaSeleccion()">
            {{ t('admin.catalog.images.clear_sel') }}
          </button>
        </div>
      }
    </div>

    @if (ampliada() !== null) {
      <nx-visor-galeria
        [src]="fotoAmpliada()"
        [titulo]="titulo()"
        [indice]="ampliada()!"
        [total]="fotos().length"
        (cierra)="ampliada.set(null)"
        (anterior)="pasa(-1)"
        (siguiente)="pasa(1)"
      />
    }

  `,
})
export class GaleriaDeDetalle {
  readonly fotos = input.required<readonly ImagenDeProducto[]>();
  readonly titulo = input('');
  readonly puedeEditar = input(false);

  readonly borra = output<string>();
  /** El nuevo orden de las fotos de la DESCRIPCIÓN, solo con sus identificadores. */
  readonly reordena = output<readonly string[]>();
  /** Las marcadas, para quitarlas de una con UNA sola pregunta en vez de una por foto. */
  readonly borraSeleccion = output<readonly string[]>();

  /** Índice de la foto abierta en grande, o `null` si no hay ninguna. */
  protected readonly ampliada = signal<number | null>(null);

  /** Índice de la miniatura que se está arrastrando ahora mismo. */
  protected readonly arrastrada = signal<number | null>(null);

  protected readonly fotoAmpliada = computed(
    () => this.fotos()[this.ampliada() ?? 0]?.direccion ?? '',
  );

  protected readonly iconos = { papelera: faTrash };

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  private readonly marcadas = signal<ReadonlySet<string>>(new Set());
  protected readonly cuantasMarcadas = computed(() => this.marcadas().size);
  protected readonly textoDeMarcadas = computed(() =>
    this.traduccion.tCon('admin.catalog.images.selected', { n: this.cuantasMarcadas() }),
  );

  protected estaMarcada(id: string): boolean {
    return this.marcadas().has(id);
  }

  protected alterna(id: string): void {
    this.marcadas.update((actual) => {
      const copia = new Set(actual);
      if (!copia.delete(id)) {
        copia.add(id);
      }
      return copia;
    });
  }

  protected limpiaSeleccion(): void {
    this.marcadas.set(new Set());
  }

  protected borraLasMarcadas(): void {
    this.borraSeleccion.emit([...this.marcadas()]);
    this.limpiaSeleccion();
  }

  protected etiquetaDeMarcar(indice: number): string {
    return `Marcar la imagen ${indice + 1} del detalle`;
  }

  protected abre(indice: number): void {
    this.ampliada.set(indice);
  }

  /**
   * Pasa a la foto siguiente o anterior, dando la vuelta por los extremos.
   *
   * <p>Se da la vuelta a propósito: en una tira de cuatro carteles, llegar al último y encontrarse la
   * flecha muerta se lee como que la ventana se ha roto.
   */
  protected pasa(salto: number): void {
    const total = this.fotos().length;
    if (total === 0) {
      return;
    }
    const actual = this.ampliada() ?? 0;
    this.ampliada.set((actual + salto + total) % total);
  }

  protected etiquetaDeAmpliar(indice: number): string {
    return `${this.titulo()} — ver la imagen ${indice + 1} de ${this.fotos().length} en grande`;
  }

  protected etiquetaDeBorrar(indice: number): string {
    return `Quitar la imagen ${indice + 1} del detalle`;
  }

  /**
   * Sin esto el navegador NO deja soltar: por omisión rechaza la zona y el gesto acaba en nada, sin
   * ningún aviso de por qué.
   */
  protected permiteSoltar(evento: DragEvent): void {
    if (this.puedeEditar()) {
      evento.preventDefault();
    }
  }

  /**
   * Suelta la miniatura arrastrada en su nuevo sitio y avisa del orden resultante.
   *
   * <p>Solo se emiten los identificadores de ESTAS fotos, las de la descripción. El servidor las
   * reconoce por su papel y las permuta entre ellas, sin tocar el carrusel: mandar la lista completa
   * de la ficha sería el camino del carrusel, y ese convierte la primera en la imagen principal del
   * producto.
   */
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
