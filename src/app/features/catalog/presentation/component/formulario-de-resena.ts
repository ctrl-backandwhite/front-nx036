import { Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FieldTree, FormField, form, readonly, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SesionActual } from '@core/auth/sesion-actual';
import { PublicaResena } from '../../application/use-case/publica-resena.use-case';
import { PreparaFotoDeResena } from '../../application/use-case/prepara-foto-de-resena.use-case';
import {
  FOTOS_MAXIMAS_POR_RESENA,
  FOTO_DEMASIADO_GRANDE,
  FOTO_TIPO_NO_ADMITIDO,
} from '../../domain/model/fotos-de-resena';

/**
 * Lo que se escribe en el formulario de reseña.
 *
 * <p>Todas las claves están SIEMPRE, aunque vayan vacías: Signal Forms construye un campo por cada
 * clave que existe en el objeto, y una que falte deja la plantilla sin nada a lo que atarse.
 */
interface BorradorDeResena {
  readonly nota: string;
  readonly autor: string;
  readonly titulo: string;
  readonly cuerpo: string;
}

/** Cinco estrellas de salida, como venía siendo: quien escribe suele hacerlo contento. */
const BORRADOR_VACIO: BorradorDeResena = { nota: '5', autor: '', titulo: '', cuerpo: '' };

/** Una foto elegida: el fichero ya reducido y su dirección temporal para la miniatura. */
interface FotoElegida {
  readonly fichero: File;
  readonly vista: string;
}

/** El mensaje que toca por cada código estable del backend (y por los de la comprobación local). */
const CLAVE_POR_CODIGO: Readonly<Record<string, string>> = {
  REVIEW_TOO_MANY_IMAGES: 'reviews.photos.error_too_many',
  REVIEW_IMAGE_INVALID: 'reviews.photos.error_invalid',
  REVIEW_IMAGE_TOO_LARGE: 'reviews.photos.error_too_large',
  REVIEW_IMAGES_UNAVAILABLE: 'reviews.photos.unavailable',
  REVIEW_ALREADY_EXISTS: 'reviews.error.already_exists',
  REVIEW_RATE_LIMITED: 'reviews.error.rate_limited',
  [FOTO_TIPO_NO_ADMITIDO]: 'reviews.photos.error_type',
  [FOTO_DEMASIADO_GRANDE]: 'reviews.photos.error_size',
};

/**
 * El formulario para escribir una reseña, con hasta cuatro fotos.
 *
 * <p>Las fotos se reducen en el navegador al elegirlas, así que la miniatura es ya lo que se sube. Las
 * direcciones temporales de las miniaturas se liberan al quitar la foto, al enviar y al destruirse.
 *
 * <p>Un 409 («ya reseñaste este producto») deja el formulario apagado: reintentar daría lo mismo. Un
 * 429 se cuenta y no se reintenta solo; el interceptor de reintentos actúa únicamente al prerenderizar.
 */
@Component({
  host: { class: 'block' },
  selector: 'nx-formulario-de-resena',
  imports: [FormField],
  template: `
    <form
      (submit)="envia($event)"
      class="mt-4 rounded-box border border-base-200 p-3 space-y-2 bg-base-200/30"
    >
      <!--
        Cinco estrellas, no un desplegable: puntuar es el gesto más frecuente de este formulario y con
        un desplegable costaba tres acciones para algo que en cualquier tienda es un solo toque.
        No se pinta el IDIOMA al lado: la reseña se escribe en el idioma en el que se navega.
      -->
      <div class="flex items-center gap-2">
        <span id="resena-nota-etiqueta" class="text-[12px]">{{ t('reviews.your_rating') }}:</span>
        <div class="flex items-center gap-0.5" role="radiogroup" aria-labelledby="resena-nota-etiqueta">
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="+borrador().nota === n"
              [attr.aria-label]="n + ' ★'"
              (click)="fijaNota(n)"
              class="grid min-h-11 min-w-9 place-items-center text-[22px] leading-none transition-colors hover:scale-110 md:min-h-9 md:min-w-7"
              [class]="+borrador().nota >= n ? 'text-warning' : 'text-base-300'"
            >
              ★
            </button>
          }
        </div>
      </div>
      <label class="sr-only" for="resena-autor">{{ t('reviews.name') }}</label>
      <!-- El bloqueo del nombre lo declara el esquema del formulario, que es quien sabe si se puede editar. -->
      <input
        id="resena-autor"
        class="input input-bordered input-sm w-full"
        [class]="nombreDeLaSesion() ? 'bg-base-200 cursor-not-allowed opacity-80' : ''"
        [placeholder]="t('reviews.name')"
        [title]="nombreDeLaSesion() ? t('reviews.name_locked') : ''"
        [formField]="formulario.autor"
      />
      <label class="sr-only" for="resena-titulo">{{ t('reviews.title_field') }}</label>
      <input
        id="resena-titulo"
        class="input input-bordered input-sm w-full"
        [placeholder]="t('reviews.title_field')"
        [formField]="formulario.titulo"
      />
      <label class="sr-only" for="resena-cuerpo">{{ t('reviews.body') }}</label>
      <textarea
        id="resena-cuerpo"
        class="textarea textarea-bordered textarea-sm w-full h-20"
        [placeholder]="t('reviews.body')"
        [formField]="formulario.cuerpo"
      ></textarea>
      @if (falloDe(formulario); as fallo) {
        <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
      }

      <!--
        Las fotos. El campo de archivos va con sr-only y no con hidden: oculto del todo no recibe el
        foco y el selector quedaría fuera del alcance del teclado. La etiqueta hace de botón y enseña
        el anillo de foco cuando lo recibe el campo de dentro.
      -->
      <div class="space-y-2">
        <div class="flex items-center gap-3 flex-wrap">
          <label
            for="resena-fotos"
            class="btn btn-outline min-h-11 cursor-pointer focus-within:ring-2 focus-within:ring-primary"
            [class.btn-disabled]="!puedeAnadir()"
          >
            {{ t('reviews.photos.add') }}
            <input
              id="resena-fotos"
              type="file"
              class="sr-only"
              accept="image/jpeg,image/png,image/webp"
              multiple
              [disabled]="!puedeAnadir()"
              (change)="elige($event)"
            />
          </label>
          <span class="text-[12px] text-ink-500" aria-live="polite">
            {{ fotos().length }} {{ t('reviews.photos.of') }} {{ maximo }}
          </span>
        </div>
        <p class="text-[12px] text-ink-500">{{ t('reviews.photos.hint') }}</p>
        @if (fotos().length > 0) {
          <ul class="flex flex-wrap gap-3 pt-1" role="list">
            @for (foto of fotos(); track foto.vista; let i = $index) {
              <li class="relative size-22">
                <img
                  [src]="foto.vista"
                  [alt]="t('reviews.photos.preview') + ' ' + (i + 1)"
                  class="size-22 rounded-box object-cover border border-base-300"
                />
                <button
                  type="button"
                  class="btn btn-circle btn-neutral size-11 min-h-11 absolute -top-3 -right-3"
                  [attr.aria-label]="t('reviews.photos.remove') + ' ' + (i + 1)"
                  (click)="quita(i)"
                >
                  ×
                </button>
              </li>
            }
          </ul>
        }
        <div aria-live="polite">
          @if (errorDeFotos(); as mensaje) {
            <p class="text-xs text-error">{{ mensaje }}</p>
          }
        </div>
      </div>

      <div aria-live="polite">
        @if (errorDeEnvio(); as mensaje) {
          <p role="alert" class="text-xs text-error">{{ mensaje }}</p>
        }
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" (click)="cierra.emit()" class="btn btn-ghost min-h-11">
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          [disabled]="formulario().invalid() || enviando() || preparando() || yaPublicada()"
          class="btn btn-primary min-h-11"
        >
          {{ t('reviews.submit') }}
        </button>
      </div>
    </form>
  `,
})
export class FormularioDeResena {
  readonly idDelProducto = input.required<string>();
  /** La reseña se publicó: quien la monta recarga la lista y cierra el formulario. */
  readonly publicada = output<void>();
  readonly cierra = output<void>();

  private readonly publica = inject(PublicaResena);
  private readonly preparaFoto = inject(PreparaFotoDeResena);
  private readonly sesion = inject(SesionActual);

  protected readonly t = inject(TraduccionService).t;
  protected readonly maximo = FOTOS_MAXIMAS_POR_RESENA;

  protected readonly enviando = signal(false);
  protected readonly preparando = signal(false);
  /** El backend dijo que este usuario ya reseñó el producto: se apaga el envío, sin reintentos. */
  protected readonly yaPublicada = signal(false);
  protected readonly fotos = signal<readonly FotoElegida[]>([]);
  protected readonly errorDeFotos = signal<string | null>(null);
  protected readonly errorDeEnvio = signal<string | null>(null);

  protected readonly puedeAnadir = computed(
    () => this.fotos().length < FOTOS_MAXIMAS_POR_RESENA && !this.enviando() && !this.preparando(),
  );

  protected readonly nombreDeLaSesion = computed(() => this.sesion.datos()?.nombreVisible ?? '');

  /**
   * Se DERIVA del nombre de la sesión: en cuanto hay cuenta abierta, el autor es el suyo y deja de ser
   * editable. Se conserva lo ya escrito para no borrarle la reseña a quien entra a mitad.
   */
  protected readonly borrador = linkedSignal<string, BorradorDeResena>({
    source: () => this.nombreDeLaSesion(),
    computation: (nombre, previo) => ({
      ...(previo?.value ?? BORRADOR_VACIO),
      autor: nombre || previo?.value.autor || '',
    }),
  });

  /**
   * El nombre lo pone la sesión y no se toca. Y una reseña sin título NI texto no dice nada: la regla
   * está DICHA, no solo apaga el botón.
   */
  protected readonly formulario = form(this.borrador, (ruta) => {
    readonly(ruta.autor, () => !!this.nombreDeLaSesion());
    validate(ruta, ({ value }) => {
      const { titulo, cuerpo } = value();
      return titulo.trim() || cuerpo.trim()
        ? null
        : { kind: 'sin-texto', message: this.t('dialog.field.required') };
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.fotos().forEach((f) => URL.revokeObjectURL(f.vista)));
  }

  protected fijaNota(nota: number): void {
    this.borrador.update((previo) => ({ ...previo, nota: String(nota) }));
  }

  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /** Elegir fotos: cada una se comprueba y se reduce; las que sobran del tope se rechazan con aviso. */
  protected async elige(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const elegidas = [...(campo.files ?? [])];
    // Se vacía para poder volver a elegir la misma foto tras quitarla.
    campo.value = '';
    this.errorDeFotos.set(null);
    this.preparando.set(true);
    try {
      for (const fichero of elegidas) {
        if (this.fotos().length >= FOTOS_MAXIMAS_POR_RESENA) {
          this.errorDeFotos.set(this.t('reviews.photos.error_max'));
          break;
        }
        const resultado = await this.preparaFoto.ejecuta(fichero);
        if (!resultado.ok) {
          this.errorDeFotos.set(this.mensajeDe(resultado.error.codigo, resultado.error.mensaje));
          continue;
        }
        this.fotos.update((previas) => [
          ...previas,
          { fichero: resultado.valor, vista: URL.createObjectURL(resultado.valor) },
        ]);
      }
    } finally {
      this.preparando.set(false);
    }
  }

  protected quita(indice: number): void {
    const foto = this.fotos()[indice];
    if (!foto) {
      return;
    }
    URL.revokeObjectURL(foto.vista);
    this.fotos.update((previas) => previas.filter((_, i) => i !== indice));
    this.errorDeFotos.set(null);
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    // El cerrojo se echa ANTES de esperar nada: un doble clic no manda dos peticiones.
    if (this.formulario().invalid() || this.enviando() || this.preparando() || this.yaPublicada()) {
      return;
    }
    this.enviando.set(true);
    this.errorDeEnvio.set(null);
    try {
      const borrador = this.borrador();
      const resultado = await this.publica.ejecuta(this.idDelProducto(), {
        valoracion: Number(borrador.nota),
        titulo: borrador.titulo,
        cuerpo: borrador.cuerpo,
        autor: borrador.autor,
        fotos: this.fotos().map((f) => f.fichero),
      });
      if (!resultado.ok) {
        const { codigo, mensaje } = resultado.error;
        if (codigo === 'REVIEW_ALREADY_EXISTS') {
          this.yaPublicada.set(true);
        }
        this.errorDeEnvio.set(this.mensajeDe(codigo, mensaje));
        return;
      }
      this.fotos().forEach((f) => URL.revokeObjectURL(f.vista));
      this.fotos.set([]);
      this.borrador.set({ ...BORRADOR_VACIO, autor: borrador.autor });
      this.publicada.emit();
    } finally {
      this.enviando.set(false);
    }
  }

  private mensajeDe(codigo: string | undefined, mensaje: string): string {
    const clave = codigo ? CLAVE_POR_CODIGO[codigo] : undefined;
    return clave ? this.t(clave) : mensaje || this.t('common.error');
  }
}
