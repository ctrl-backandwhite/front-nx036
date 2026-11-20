import { Component, computed, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import {
  hayResenasDelProveedor,
  idiomasDeLasResenas,
  repartoEnPorcentaje,
} from '../../domain/model/catalogo-auxiliar';
import { ModeraResenas } from '../../application/use-case/modera-resenas.use-case';
import { SesionActual } from '@core/auth/sesion-actual';
import { FormularioDeResena } from './formulario-de-resena';
import { FotosDeResena } from './fotos-de-resena';

/** Cuántas se traen de una vez. Cincuenta cubre casi todas las fichas sin paginar. */
const CUANTAS = 50;

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
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
  selector: 'nx-seccion-resenas',
  imports: [FormularioDeResena, FotosDeResena],
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
              <div class="text-xs opacity-70 mt-1">
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
          <nx-formulario-de-resena
            [idDelProducto]="idDelProducto()"
            (publicada)="alPublicar()"
            (cierra)="formularioAbierto.set(false)"
          />
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
          <div class="mt-6 text-center text-[13px] opacity-70 py-6">{{ t('reviews.empty') }}</div>
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
                  <nx-fotos-de-resena
                    [fotos]="resena.fotos ?? []"
                    [autor]="resena.autor ?? ''"
                    [puedeQuitar]="esAdministrador()"
                    (quita)="quitaFoto(resena.id, $event)"
                  />
                  @if (esAdministrador()) {
                    <button
                      type="button"
                      class="btn btn-outline btn-error min-h-11 mt-2 self-start"
                      (click)="ocultaResena(resena.id)"
                    >
                      {{ t('reviews.moderation.hide') }}
                    </button>
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
  private readonly moderacion = inject(ModeraResenas);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly preferencias = inject(PreferenciasService);
  private readonly sesion = inject(SesionActual);

  protected readonly t = inject(TraduccionService).t;

  protected readonly formularioAbierto = signal(false);
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

  protected readonly visibles = computed(() => {
    const filtro = this.filtroDeIdioma();
    return filtro ? this.items().filter((r) => (r.idioma ?? '') === filtro) : this.items();
  });

  protected estrellas(valoracion: number): string {
    return '★'.repeat(valoracion).padEnd(5, '☆');
  }

  protected alPublicar(): void {
    this.formularioAbierto.set(false);
    this.datos.reload();
  }

  protected async ocultaResena(idDeResena: string): Promise<void> {
    if (!(await this.dialogo.confirma(this.t('reviews.moderation.hide_confirm')))) {
      return;
    }
    const resultado = await this.moderacion.ocultaResena(idDeResena);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.t('reviews.moderation.hidden'));
    this.datos.reload();
  }

  protected async quitaFoto(idDeResena: string, idDeFoto: string): Promise<void> {
    if (!(await this.dialogo.confirma(this.t('reviews.moderation.remove_photo_confirm')))) {
      return;
    }
    const resultado = await this.moderacion.quitaFoto(idDeResena, idDeFoto);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.t('reviews.moderation.photo_removed'));
    this.datos.reload();
  }
}
