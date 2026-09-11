import { Component, computed, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { FieldTree, FormField, form, readonly, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import {
  hayResenasDelProveedor,
  idiomasDeLasResenas,
  repartoEnPorcentaje,
} from '../../domain/model/catalogo-auxiliar';
import { PublicaResena } from '../../application/use-case/publica-resena.use-case';
import { SesionActual } from '@core/auth/sesion-actual';

/** Cuántas se traen de una vez. Cincuenta cubre casi todas las fichas sin paginar. */
const CUANTAS = 50;

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

/**
 * Las reseñas del producto: nota media, reparto por estrellas, filtro por idioma y formulario.
 *
 * <p>El catálogo se importó del proveedor con SUS reseñas. Decir de dónde vienen no es cortesía:
 * presentarlas como si fueran de compradores de esta tienda es una práctica desleal de la lista negra
 * de la Directiva Ómnibus, sancionable sin necesidad de probar que engañó a nadie. El aviso sale solo
 * si de verdad hay alguna importada entre las que se están enseñando.
 *
 * <p>Sin reseñas reales NO se enseña una valoración inventada: cero coma cero estrellas se lee como un
 * producto mal valorado, no como uno sin valorar.
 */
@Component({
  selector: 'nx-seccion-resenas',
  imports: [FormField],
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body">
        <header class="flex items-center justify-between mb-2">
          <h2 class="card-title">{{ t('reviews.title') }}</h2>
          <button
            type="button"
            (click)="formularioAbierto.set(!formularioAbierto())"
            class="btn btn-outline btn-primary btn-sm"
          >
            {{ t('reviews.write') }}
          </button>
        </header>

        @if (hayImportadas()) {
          <p class="text-[12px] text-ink-500 bg-base-200 rounded-box px-3 py-2 mb-3 leading-relaxed">
            {{ t('reviews.supplier_origin') }}
          </p>
        }

        @if (total() === 0) {
          <div class="text-[13px] opacity-70 py-2">{{ t('reviews.none') }}</div>
        } @else {
          <div class="grid sm:grid-cols-[10rem_1fr] gap-6">
            <div class="text-center">
              <div class="text-4xl font-medium text-primary">{{ media() }}</div>
              <div class="text-[11px] opacity-70 mt-1">
                {{ total() }} {{ t('reviews.reviews') }}
              </div>
            </div>
            <div class="space-y-1.5">
              @for (fila of reparto(); track fila.estrellas) {
                <div class="flex items-center gap-2 text-[12px]">
                  <span class="w-4 opacity-70">{{ fila.estrellas }}</span>
                  <span class="text-warning">★</span>
                  <progress
                    class="progress progress-warning flex-1 h-2"
                    [value]="fila.porcentaje"
                    max="100"
                  ></progress>
                  <span class="w-8 text-right opacity-70">{{ fila.porcentaje }}%</span>
                </div>
              }
            </div>
          </div>
        }

        @if (formularioAbierto()) {
          <form
            (submit)="envia($event)"
            class="mt-4 rounded-box border border-base-200 p-3 space-y-2 bg-base-200/30"
          >
            <!--
              Cinco estrellas, no un desplegable.
              Puntuar es el gesto más frecuente de este formulario y con un desplegable costaba tres
              acciones —abrir, buscar la nota, elegir— para algo que en cualquier tienda es un solo
              toque. Además obligaba a leer «5 ★» para entender qué significa cada opción; con las
              estrellas a la vista, la escala se ve.

              No se pinta el IDIOMA al lado: la reseña se escribe en el idioma en el que se está
              navegando, no hay otra opción, y anunciarlo con una píldora hacía pensar que sí la había.
            -->
            <div class="flex items-center gap-2">
              <span id="resena-nota-etiqueta" class="text-[12px]">{{ t('reviews.your_rating') }}:</span>
              <div
                class="flex items-center gap-0.5"
                role="radiogroup"
                aria-labelledby="resena-nota-etiqueta"
              >
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="+borrador().nota === n"
                    [attr.aria-label]="n + ' ★'"
                    (click)="fijaNota(n)"
                    class="text-[22px] leading-none px-0.5 transition-colors hover:scale-110"
                    [class]="+borrador().nota >= n ? 'text-warning' : 'text-base-300'"
                  >
                    ★
                  </button>
                }
              </div>
            </div>
            <label class="sr-only" for="resena-autor">{{ t('reviews.name') }}</label>
            <!-- El bloqueo del nombre ya no va en el marcado: lo declara el esquema del formulario,
                 que es quien sabe si el campo se puede editar. -->
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
            <div class="flex justify-end gap-2">
              <button type="button" (click)="formularioAbierto.set(false)" class="btn btn-ghost btn-sm">
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                [disabled]="formulario().invalid() || enviando()"
                class="btn btn-primary btn-sm"
              >
                {{ t('reviews.submit') }}
              </button>
            </div>
          </form>
        }

        <!--
          El selector de idioma de las reseñas es SOLO para quien administra.
          Quien compra lee en el idioma con el que navega y ya está: ofrecerle saltar a las reseñas en
          neerlandés o en chino no le ayuda a decidir —no las entiende— y además ensucia la ficha con
          nueve píldoras. A quien administra sí le sirve, porque revisa que la traducción de cada
          mercado esté puesta.
        -->
        @if (esAdministrador() && idiomas().length > 1) {
          <div class="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              (click)="filtroDeIdioma.set(null)"
              class="badge"
              [class]="filtroDeIdioma() === null ? 'badge-primary' : 'badge-outline'"
            >
              {{ t('reviews.all_langs') }}
            </button>
            @for (idioma of idiomas(); track idioma) {
              <button
                type="button"
                (click)="filtroDeIdioma.set(idioma)"
                class="badge"
                [class]="filtroDeIdioma() === idioma ? 'badge-primary' : 'badge-outline'"
              >
                {{ idioma.toUpperCase() }}
              </button>
            }
          </div>
        }

        @if (visibles().length === 0) {
          <div class="mt-6 text-center text-[13px] opacity-60 py-6">{{ t('reviews.empty') }}</div>
        } @else {
          <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (resena of visibles(); track resena.id) {
              <article class="card card-border bg-base-100">
                <div class="card-body p-3">
                  <div class="flex items-center justify-between text-[12px]">
                    <span class="font-medium flex items-center gap-1.5">
                      {{ resena.autor || t('reviews.anon') }}
                      <!--
                        El idioma de la reseña NO se pinta. Quien compra solo ve las de su idioma —el
                        selector es de administración—, así que la píldora repetía en cada línea algo
                        que ya se sabe por estar leyéndolo.
                      -->
                    </span>
                    <span class="text-warning" [attr.aria-label]="resena.valoracion + ' / 5'">
                      {{ estrellas(resena.valoracion) }}
                    </span>
                  </div>
                  @if (resena.titulo) {
                    <div class="text-[12px] font-medium mt-1">{{ resena.titulo }}</div>
                  }
                  @if (resena.cuerpo) {
                    <p class="text-[12px] mt-1 leading-relaxed">{{ resena.cuerpo }}</p>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SeccionResenas {
  readonly idDelProducto = input.required<string>();

  private readonly puerto = inject(RESENAS_PORT);
  private readonly publica = inject(PublicaResena);
  private readonly avisos = inject(AvisosStore);
  private readonly preferencias = inject(PreferenciasService);
  private readonly sesion = inject(SesionActual);

  protected readonly t = inject(TraduccionService).t;

  protected readonly formularioAbierto = signal(false);
  protected readonly enviando = signal(false);
  /**
   * El idioma por el que se filtran las reseñas.
   *
   * <p>Arranca en el idioma de quien mira, no en «todas», que es lo que hace el front anterior. Con
   * ocho idiomas activos, una ficha con reseñas de todos los mercados enseñaba de entrada un muro en
   * neerlandés, alemán, italiano y chino a alguien que navega en español: el dato existe, pero no le
   * sirve. Ver todas sigue estando a un toque, y para quien administra es justo lo que quiere.
   *
   * <p>Se usa `linkedSignal` para que siga al idioma si se cambia el del sitio, PERO respetando lo que
   * haya elegido a mano: si ha tocado el filtro, su elección manda hasta que cambie el idioma. Un
   * `effect` que escribiera aquí le pisaría la elección en cuanto llegara cualquier otra señal.
   *
   * <p>Y solo se preselecciona si REALMENTE hay reseñas en ese idioma. Si no, se queda en «todas»:
   * arrancar con un filtro que deja la lista vacía parece que no hay reseñas cuando sí las hay.
   *
   * <p>Ese respaldo se mantiene también para quien compra, aunque él no vea el selector: esconderle
   * reseñas que EXISTEN, solo porque aún no están traducidas a su idioma, sería peor que enseñarle
   * unas pocas en otro. Lo que se le quita es la opción de andar cambiando de idioma, no el
   * contenido.
   */
  protected readonly filtroDeIdioma = linkedSignal<
    { idioma: string; disponibles: string },
    string | null
  >({
    /* La fuente lleva TAMBIÉN los idiomas disponibles, y no es un adorno: las reseñas llegan después de
     * montar, así que la primera vez que se evalúa esto la lista está vacía y no hay nada que
     * preseleccionar. Si la fuente fuera solo el idioma, no volvería a calcularse cuando por fin
     * llegan, y se quedaría en «todas» para siempre — que es exactamente lo que pasaba.
     * Se comparan como cadena porque la lista se recrea en cada cálculo y por referencia nunca
     * coincidiría. */
    source: () => ({
      idioma: this.preferencias.idioma(),
      disponibles: this.idiomas().join(','),
    }),
    computation: (fuente, previo) => {
      if (
        previo &&
        previo.source.idioma === fuente.idioma &&
        previo.source.disponibles === fuente.disponibles
      ) {
        return previo.value;
      }
      return fuente.disponibles.split(',').includes(fuente.idioma) ? fuente.idioma : null;
    },
  });

  /**
   * El borrador de la reseña.
   *
   * <p>La nota va como CADENA porque un desplegable nativo solo habla en cadenas; se convierte a número
   * al publicar, que es donde importa.
   *
   * <p>Se DERIVA del nombre de la sesión: en cuanto hay cuenta abierta, el autor es el suyo y deja de
   * ser editable. Se conserva lo ya escrito —título y texto— para no borrarle la reseña a quien entra
   * en su cuenta a mitad de redactarla.
   */
  protected readonly borrador = linkedSignal<string, BorradorDeResena>({
    source: () => this.nombreDeLaSesion(),
    computation: (nombre, previo) => ({
      ...(previo?.value ?? BORRADOR_VACIO),
      autor: nombre || previo?.value.autor || '',
    }),
  });

  /**
   * Las reglas de la reseña, en un solo sitio.
   *
   * <p>El nombre lo pone la sesión y no se toca: dejar teclearlo con la cuenta abierta permitiría
   * firmar con el nombre de otro. Antes era un `readOnly` suelto en el marcado.
   *
   * <p>Y una reseña sin título NI texto no dice nada. Es la misma regla que ya decidía si el botón se
   * podía pulsar, pero ahora está DICHA: antes el botón se quedaba apagado sin explicar por qué.
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

  private readonly datos = resource({
    params: () => ({ id: this.idDelProducto() }),
    loader: async ({ params }) => {
      const resultado = await this.puerto.lista(params.id, 0, CUANTAS);
      return resultado.ok ? resultado.valor : null;
    },
  });

  private readonly items = computed(() => this.datos.value()?.items ?? []);
  protected readonly total = computed(() => this.datos.value()?.total ?? 0);
  protected readonly media = computed(() => (this.datos.value()?.media ?? 0).toFixed(1));
  protected readonly reparto = computed(() => repartoEnPorcentaje(this.datos.value()?.reparto ?? {}));
  protected readonly idiomas = computed(() => idiomasDeLasResenas(this.items()));
  protected readonly hayImportadas = computed(() => hayResenasDelProveedor(this.visibles()));
  /**
   * Solo quien administra puede saltar entre idiomas de reseña.
   *
   * <p>Quien compra lee en el idioma con el que navega: enseñarle las reseñas en chino o en
   * neerlandés no le ayuda a decidir y le llena la ficha de píldoras. Quien administra sí lo
   * necesita, porque revisa que la traducción de cada mercado esté puesta.
   */
  protected readonly esAdministrador = this.sesion.esAdministrador;

  protected readonly nombreDeLaSesion = computed(() => this.sesion.datos()?.nombreVisible ?? '');
  protected readonly idiomaEnMayusculas = computed(() => this.preferencias.idioma().toUpperCase());
  /** El desplegable devuelve cadenas; la reseña viaja con la nota como número. */
  /**
   * Fija la nota al pulsar una estrella.
   *
   * <p>Escribe en el BORRADOR y no en el campo del formulario porque ése es quien manda: el esquema
   * valida sobre el borrador, así que tocar solo el control dejaría la validación mirando el valor
   * viejo. La nota viaja como cadena porque así la espera el formulario, que nació de un desplegable.
   */
  protected fijaNota(nota: number): void {
    this.borrador.update((previo) => ({ ...previo, nota: String(nota) }));
  }

  private readonly notaElegida = computed(() => Number(this.borrador().nota));

  protected readonly visibles = computed(() => {
    const filtro = this.filtroDeIdioma();
    return filtro ? this.items().filter((r) => (r.idioma ?? '') === filtro) : this.items();
  });

  protected estrellas(valoracion: number): string {
    return '★'.repeat(valoracion).padEnd(5, '☆');
  }

  /**
   * El mensaje que toca enseñar, o nulo. Se calla hasta que el campo se ha TOCADO: pintar de rojo un
   * formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    // Un único sitio al que preguntar si se puede enviar, en vez de repetir aquí la condición que ya
    // apaga el botón.
    if (this.formulario().invalid() || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    try {
      const borrador = this.borrador();
      const resultado = await this.publica.ejecuta(this.idDelProducto(), {
        valoracion: this.notaElegida(),
        titulo: borrador.titulo,
        cuerpo: borrador.cuerpo,
        autor: borrador.autor,
      });
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.formularioAbierto.set(false);
      // El autor se conserva: es el de la sesión, o el que un invitado ya ha escrito una vez.
      this.borrador.set({ ...BORRADOR_VACIO, autor: borrador.autor });
      this.datos.reload();
    } finally {
      this.enviando.set(false);
    }
  }
}
