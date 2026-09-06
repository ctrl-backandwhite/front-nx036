import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  BorradorDeCurso, Curso, NIVELES, cursoEnBlanco,
} from '../../../domain/gestion/model/contenido';
import {
  BorraElCurso, ConsultaCursos, GuardaElCurso,
} from '../../../application/gestion/use-case/contenido.use-case';
import { VentanaModal } from '../component/ventana-modal';

/**
 * DROP-691: administración de los cursos de la Academia.
 *
 * <p>Un curso con ALUMNOS MATRICULADOS no se borra: el backend se niega. Esa negativa se enseña siempre
 * —antes se perdía y la fila seguía en pantalla como si el borrado no se hubiera intentado, así que
 * quien administraba volvía a pulsar sin saber por qué—.
 *
 * <p>MOBILE FIRST: la tabla se desplaza dentro de su caja y los tres campos cortos del editor se apilan
 * en el móvil, pasando a tres columnas desde `sm`.
 */
@Component({
  selector: 'nx-academia-admin',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('admin.academy.title') }}</h1>
          <p class="text-ink-500 text-sm">{{ t('admin.academy.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" (click)="nuevo()">
          <fa-icon [icon]="iconos.mas" /> {{ t('admin.academy.new') }}
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2">{{ t('admin.academy.col.title') }}</th>
                <th class="px-3 py-2">{{ t('admin.academy.col.instructor') }}</th>
                <th class="px-3 py-2">{{ t('admin.academy.col.level') }}</th>
                <th class="px-3 py-2 text-center">{{ t('admin.academy.col.published') }}</th>
                <th class="px-3 py-2"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (curso of cursos(); track curso.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-3 py-2">{{ curso.titulo }}</td>
                  <td class="px-3 py-2">{{ curso.instructor || '—' }}</td>
                  <td class="px-3 py-2">{{ nivel(curso.nivel) }}</td>
                  <td class="px-3 py-2 text-center">
                    <fa-icon [icon]="curso.publicado ? iconos.si : iconos.no"
                             [class]="curso.publicado ? 'text-success' : 'text-ink-400'"
                             [attr.aria-label]="curso.publicado ? t('common.yes') : t('common.no')" />
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" class="btn btn-ghost btn-xs btn-square"
                            [attr.title]="t('actions.edit')" [attr.aria-label]="t('actions.edit')"
                            (click)="edita(curso)">
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-xs btn-square text-error"
                            [attr.title]="t('actions.delete')" [attr.aria-label]="t('actions.delete')"
                            (click)="borra(curso)">
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-3 py-6 text-center text-ink-400 text-[12px]">
                    {{ t('admin.academy.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (editando(); as curso) {
        <nx-ventana-modal [titulo]="curso.id ? t('actions.edit') : t('admin.academy.new')"
                          ancho="sm:max-w-lg" (cierra)="editando.set(null)">
          <!-- Cada etiqueta va atada a su campo con «for»: sin él el lector de pantalla anuncia
               «cuadro de texto» sin decir cuál, y pulsar sobre el texto no lleva el foco al campo. -->
          <div>
            <label for="curso-titulo" [class]="rotulo">{{ t('admin.academy.col.title') }} *</label>
            <input id="curso-titulo" [class]="campo" [value]="curso.titulo"
                   (input)="cambia({ titulo: escrito($event) })" />
          </div>
          <div>
            <label for="curso-instructor" [class]="rotulo">
              {{ t('admin.academy.col.instructor') }}
            </label>
            <input id="curso-instructor" [class]="campo" [value]="curso.instructor"
                   (input)="cambia({ instructor: escrito($event) })" />
          </div>
          <div>
            <label for="curso-descripcion" [class]="rotulo">{{ t('common.description') }}</label>
            <textarea id="curso-descripcion" class="textarea textarea-bordered textarea-sm w-full h-20"
                      [value]="curso.descripcion"
                      (input)="cambia({ descripcion: escrito($event) })"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label for="curso-duracion" [class]="rotulo">
                {{ t('cookies.table.duration') }} (min)
              </label>
              <input id="curso-duracion" type="number" [class]="campo"
                     [value]="duracion(curso)" (input)="cambiaDuracion($event)" />
            </div>
            <div>
              <label for="curso-nivel" [class]="rotulo">{{ t('admin.academy.col.level') }}</label>
              <select id="curso-nivel" class="select select-bordered select-sm w-full"
                      (change)="cambia({ nivel: escrito($event) })">
                @for (opcion of niveles; track opcion) {
                  <option [value]="opcion" [selected]="curso.nivel === opcion">
                    {{ nivel(opcion) }}
                  </option>
                }
              </select>
            </div>
            <div>
              <label for="curso-idioma" [class]="rotulo">{{ t('common.language') }}</label>
              <input id="curso-idioma" [class]="campo" [value]="curso.idioma"
                     (input)="cambia({ idioma: escrito($event) })" />
            </div>
          </div>
          <div>
            <label for="curso-portada" [class]="rotulo">{{ t('admin.variants.image') }} (URL)</label>
            <input id="curso-portada" [class]="campo" [value]="curso.portadaUrl"
                   (input)="cambia({ portadaUrl: escrito($event) })" />
          </div>
          <div>
            <label for="curso-video" [class]="rotulo">{{ t('catalog.product.video') }} (URL)</label>
            <input id="curso-video" [class]="campo" [value]="curso.videoUrl"
                   (input)="cambia({ videoUrl: escrito($event) })" />
          </div>
          <label class="flex items-center gap-2 text-[13px]">
            <input type="checkbox" class="checkbox checkbox-sm" [checked]="curso.publicado"
                   (change)="cambia({ publicado: marcado($event) })" />
            {{ t('admin.academy.col.published') }}
          </label>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" class="btn btn-ghost btn-sm" (click)="editando.set(null)">
              {{ t('common.cancel') }}
            </button>
            <button type="button" class="btn btn-primary btn-sm" [disabled]="guardando()"
                    (click)="guarda()">
              {{ t('actions.save') }}
            </button>
          </div>
        </nx-ventana-modal>
      }
    </div>
  `,
})
export class AcademiaPage {
  protected readonly t = inject(TraduccionService).t;
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaCursos);
  private readonly guardaElCurso = inject(GuardaElCurso);
  private readonly borraElCurso = inject(BorraElCurso);

  protected readonly iconos = {
    mas: faPlus, editar: faPen, borrar: faTrash, si: faCheck, no: faXmark,
  };
  protected readonly niveles = NIVELES;
  /** Las clases repetidas del editor, en una constante como en el React: mismo aspecto, un solo sitio. */
  protected readonly campo = 'input input-bordered input-sm w-full';
  protected readonly rotulo = 'text-[12px] font-medium text-ink-600 mb-1 block';

  protected readonly cursos = signal<readonly Curso[]>([]);
  protected readonly editando = signal<BorradorDeCurso | null>(null);
  protected readonly guardando = signal(false);

  constructor() {
    void this.carga();
  }

  protected escrito(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  /** El nivel sin traducción se enseña crudo: uno nuevo del backend tiene que verse en la tabla. */
  protected nivel(nivel: string): string {
    const clave = `academy.level.${nivel}`;
    const texto = this.t(clave);
    return texto === clave ? nivel : texto;
  }

  protected nuevo(): void {
    this.editando.set(cursoEnBlanco());
  }

  protected edita(curso: Curso): void {
    this.editando.set({ ...curso });
  }

  protected cambia(parte: Partial<BorradorDeCurso>): void {
    this.editando.update((actual) => (actual ? { ...actual, ...parte } : actual));
  }

  protected duracion(curso: BorradorDeCurso): string {
    return curso.duracionMinutos == null ? '' : String(curso.duracionMinutos);
  }

  /** Un campo vacío es «sin duración», no cero minutos: `Number('')` da 0 y mentiría en la ficha. */
  protected cambiaDuracion(evento: Event): void {
    const texto = this.escrito(evento).trim();
    this.cambia({ duracionMinutos: texto === '' ? undefined : Number(texto) });
  }

  protected async guarda(): Promise<void> {
    const curso = this.editando();
    if (!curso) {
      return;
    }
    if (!curso.titulo.trim()) {
      this.avisos.error(this.t('admin.academy.title_required'));
      return;
    }
    this.guardando.set(true);
    const resultado = await this.guardaElCurso.ejecuta(curso);
    this.guardando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.editando.set(null);
    void this.carga();
  }

  /**
   * Borra un curso.
   *
   * <p>El backend se NIEGA si tiene alumnos matriculados. Ese fallo se enseña tal cual llega: tragárselo
   * dejaba la fila en pantalla y nadie entendía por qué el borrado no hacía nada.
   */
  protected async borra(curso: Curso): Promise<void> {
    const confirmado = await this.dialogo.confirma(this.t('admin.academy.delete_confirm'));
    if (!confirmado) {
      return;
    }
    const resultado = await this.borraElCurso.ejecuta(curso.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    void this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (!resultado.ok) {
      this.cursos.set([]);
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.cursos.set(resultado.valor);
  }
}
