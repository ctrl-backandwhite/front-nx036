import { Component, computed, inject, input, resource, signal } from '@angular/core';
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
            <div class="flex items-center gap-2">
              <label for="resena-nota" class="text-[12px]">{{ t('reviews.your_rating') }}:</label>
              <select
                id="resena-nota"
                class="select select-bordered select-sm w-20"
                [value]="nota()"
                (change)="nota.set(+$any($event.target).value)"
              >
                @for (n of [5, 4, 3, 2, 1]; track n) {
                  <option [value]="n">{{ n }} ★</option>
                }
              </select>
              <span class="ml-auto badge badge-sm badge-outline">{{ idiomaEnMayusculas() }}</span>
            </div>
            <label class="sr-only" for="resena-autor">{{ t('reviews.name') }}</label>
            <input
              id="resena-autor"
              class="input input-bordered input-sm w-full"
              [class]="nombreDeLaSesion() ? 'bg-base-200 cursor-not-allowed opacity-80' : ''"
              [placeholder]="t('reviews.name')"
              [value]="nombreDeLaSesion() || autor()"
              [readOnly]="!!nombreDeLaSesion()"
              [title]="nombreDeLaSesion() ? t('reviews.name_locked') : ''"
              (input)="autor.set($any($event.target).value)"
            />
            <label class="sr-only" for="resena-titulo">{{ t('reviews.title_field') }}</label>
            <input
              id="resena-titulo"
              class="input input-bordered input-sm w-full"
              [placeholder]="t('reviews.title_field')"
              [value]="titulo()"
              (input)="titulo.set($any($event.target).value)"
            />
            <label class="sr-only" for="resena-cuerpo">{{ t('reviews.body') }}</label>
            <textarea
              id="resena-cuerpo"
              class="textarea textarea-bordered textarea-sm w-full h-20"
              [placeholder]="t('reviews.body')"
              [value]="cuerpo()"
              (input)="cuerpo.set($any($event.target).value)"
            ></textarea>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="formularioAbierto.set(false)" class="btn btn-ghost btn-sm">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" [disabled]="!hayTexto() || enviando()" class="btn btn-primary btn-sm">
                {{ t('reviews.submit') }}
              </button>
            </div>
          </form>
        }

        @if (idiomas().length > 1) {
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
                      @if (resena.idioma) {
                        <span class="badge badge-xs badge-ghost">{{ resena.idioma.toUpperCase() }}</span>
                      }
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
  protected readonly nota = signal(5);
  protected readonly titulo = signal('');
  protected readonly cuerpo = signal('');
  protected readonly autor = signal('');
  protected readonly filtroDeIdioma = signal<string | null>(null);

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
  protected readonly nombreDeLaSesion = computed(() => this.sesion.datos()?.nombreVisible ?? '');
  protected readonly idiomaEnMayusculas = computed(() => this.preferencias.idioma().toUpperCase());
  protected readonly hayTexto = computed(() => !!this.titulo().trim() || !!this.cuerpo().trim());

  protected readonly visibles = computed(() => {
    const filtro = this.filtroDeIdioma();
    return filtro ? this.items().filter((r) => (r.idioma ?? '') === filtro) : this.items();
  });

  protected estrellas(valoracion: number): string {
    return '★'.repeat(valoracion).padEnd(5, '☆');
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.hayTexto() || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    try {
      const resultado = await this.publica.ejecuta(this.idDelProducto(), {
        valoracion: this.nota(),
        titulo: this.titulo(),
        cuerpo: this.cuerpo(),
        autor: this.autor(),
      });
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.formularioAbierto.set(false);
      this.titulo.set('');
      this.cuerpo.set('');
      this.nota.set(5);
      this.datos.reload();
    } finally {
      this.enviando.set(false);
    }
  }
}
