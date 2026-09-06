import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  BorradorDeMentor, Mentor, mentorAFormulario, mentorEnBlanco, mentorValido,
} from '../../../domain/gestion/model/contenido';
import {
  BorraElMentor, ConsultaMentores, GuardaElMentor,
} from '../../../application/gestion/use-case/contenido.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { VentanaModal } from '../component/ventana-modal';

/**
 * DROP-692: administración de los mentores. Cada mentor va atado a una cuenta por su correo.
 *
 * <p>Un mentor con SESIONES RESERVADAS no se borra: el backend se niega. Esa negativa se enseña siempre
 * —antes se perdía, la fila seguía en la tabla y quien administraba la volvía a pulsar sin saber por
 * qué—.
 *
 * <p>El correo solo se pide al CREAR: cambiar la cuenta de un mentor ya creado sería crear otro mentor,
 * y las sesiones ya reservadas se quedarían apuntando a la persona anterior.
 *
 * <p>MOBILE FIRST: la tabla se desplaza dentro de su caja y los campos cortos del editor se apilan en el
 * móvil, pasando a dos columnas desde `sm`.
 */
@Component({
  selector: 'nx-mentores-admin',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('admin.mentors.title') }}</h1>
          <p class="text-ink-500 text-sm">{{ t('admin.mentors.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" (click)="nuevo()">
          <fa-icon [icon]="iconos.mas" /> {{ t('admin.mentors.new') }}
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2">{{ t('admin.mentors.col.name') }}</th>
                <th class="px-3 py-2">{{ t('admin.mentors.col.headline') }}</th>
                <th class="px-3 py-2">{{ t('admin.mentors.col.rate') }}</th>
                <th class="px-3 py-2 text-center">{{ t('admin.mentors.col.active') }}</th>
                <th class="px-3 py-2"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (mentor of mentores(); track mentor.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-2">
                      @if (mentor.avatarUrl) {
                        <!-- El avatar es decorativo: el nombre va al lado, así que repetirlo en el
                             texto alternativo obligaría a oírlo dos veces. -->
                        <img [src]="mentor.avatarUrl" alt="" loading="lazy"
                             class="w-7 h-7 rounded-full object-cover" />
                      } @else {
                        <div class="w-7 h-7 rounded-full bg-ink-100"></div>
                      }
                      <div>
                        <div>{{ mentor.nombre }}</div>
                        <div class="text-[11px] text-ink-400">{{ mentor.emailUsuario }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-2">{{ mentor.titular }}</td>
                  <td class="px-3 py-2">{{ tarifa(mentor) }}</td>
                  <td class="px-3 py-2 text-center">
                    <fa-icon [icon]="mentor.activo ? iconos.si : iconos.no"
                             [class]="mentor.activo ? 'text-success' : 'text-ink-400'"
                             [attr.aria-label]="mentor.activo ? t('common.yes') : t('common.no')" />
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" class="btn btn-ghost btn-xs btn-square"
                            [attr.title]="t('actions.edit')" [attr.aria-label]="t('actions.edit')"
                            (click)="edita(mentor)">
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-xs btn-square text-error"
                            [attr.title]="t('actions.delete')" [attr.aria-label]="t('actions.delete')"
                            (click)="borra(mentor)">
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-3 py-6 text-center text-ink-400 text-[12px]">
                    {{ t('admin.mentors.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (editando(); as mentor) {
        <nx-ventana-modal [titulo]="mentor.id ? t('actions.edit') : t('admin.mentors.new')"
                          ancho="sm:max-w-lg" (cierra)="editando.set(null)">
          <!-- Cada etiqueta atada a su campo con «for»: sin él el lector de pantalla anuncia «cuadro
               de texto» sin decir cuál, y pulsar sobre el texto no lleva el foco al campo. -->
          @if (!mentor.id) {
            <div>
              <label for="mentor-email" [class]="rotulo">{{ t('admin.mentors.user_email') }} *</label>
              <input id="mentor-email" type="email" [class]="campo" placeholder="usuario@nx036.local"
                     [value]="mentor.emailUsuario" (input)="cambia({ emailUsuario: escrito($event) })" />
            </div>
          }
          <div>
            <label for="mentor-titular" [class]="rotulo">
              {{ t('admin.mentors.col.headline') }} *
            </label>
            <input id="mentor-titular" [class]="campo" [value]="mentor.titular"
                   (input)="cambia({ titular: escrito($event) })" />
          </div>
          <div>
            <label for="mentor-biografia" [class]="rotulo">{{ t('common.description') }}</label>
            <textarea id="mentor-biografia"
                      class="textarea textarea-bordered textarea-sm w-full h-20"
                      [value]="mentor.biografia"
                      (input)="cambia({ biografia: escrito($event) })"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label for="mentor-tarifa" [class]="rotulo">
                {{ t('admin.mentors.col.rate') }} (USD/h)
              </label>
              <input id="mentor-tarifa" type="number" step="0.01" [class]="campo"
                     [value]="mentor.tarifaUsdHora"
                     (input)="cambia({ tarifaUsdHora: escrito($event) })" />
            </div>
            <div>
              <label for="mentor-zona" [class]="rotulo">{{ t('admin.profile.country') }}</label>
              <input id="mentor-zona" [class]="campo" placeholder="Europe/Madrid"
                     [value]="mentor.zonaHoraria"
                     (input)="cambia({ zonaHoraria: escrito($event) })" />
            </div>
          </div>
          <div>
            <label for="mentor-especialidades" [class]="rotulo">{{ t('mentors.book.topic') }}</label>
            <input id="mentor-especialidades" [class]="campo" placeholder="paid-ads, branding"
                   [value]="mentor.especialidades"
                   (input)="cambia({ especialidades: escrito($event) })" />
          </div>
          <div>
            <label for="mentor-idiomas" [class]="rotulo">{{ t('sourcing.agent_languages') }}</label>
            <input id="mentor-idiomas" [class]="campo" placeholder="es, en"
                   [value]="mentor.idiomas" (input)="cambia({ idiomas: escrito($event) })" />
          </div>
          <label class="flex items-center gap-2 text-[13px]">
            <input type="checkbox" class="checkbox checkbox-sm" [checked]="mentor.activo"
                   (change)="cambia({ activo: marcado($event) })" />
            {{ t('admin.mentors.col.active') }}
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
export class MentoresPage {
  protected readonly t = inject(TraduccionService).t;
  private readonly importes = inject(ImportesStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaMentores);
  private readonly guardaElMentor = inject(GuardaElMentor);
  private readonly borraElMentor = inject(BorraElMentor);

  protected readonly iconos = {
    mas: faPlus, editar: faPen, borrar: faTrash, si: faCheck, no: faXmark,
  };
  protected readonly campo = 'input input-bordered input-sm w-full';
  protected readonly rotulo = 'text-[12px] font-medium text-ink-600 mb-1 block';

  protected readonly mentores = signal<readonly Mentor[]>([]);
  protected readonly editando = signal<BorradorDeMentor | null>(null);
  protected readonly guardando = signal(false);

  constructor() {
    void this.importes.carga();
    void this.carga();
  }

  protected escrito(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  /** La tarifa llega en DÓLARES: se escribe con el formateador del panel, que la pasa a la divisa activa. */
  protected tarifa(mentor: Mentor): string {
    return `${this.importes.escribe(mentor.tarifaUsdHora)}${this.t('mentors.rate_hour')}`;
  }

  protected nuevo(): void {
    this.editando.set(mentorEnBlanco());
  }

  protected edita(mentor: Mentor): void {
    // Especialidades e idiomas se teclean separados por comas: la conversión vive en el dominio para
    // que el alta y la edición no la repitan cada una a su manera.
    this.editando.set(mentorAFormulario(mentor));
  }

  protected cambia(parte: Partial<BorradorDeMentor>): void {
    this.editando.update((actual) => (actual ? { ...actual, ...parte } : actual));
  }

  protected async guarda(): Promise<void> {
    const borrador = this.editando();
    if (!borrador) {
      return;
    }
    // La regla completa vive en el dominio; aquí solo se dice qué falta, que es lo que el caso de uso
    // no puede explicar: devolvería «petición inválida» sin decir cuál de los dos campos era.
    if (!mentorValido(borrador)) {
      this.avisos.error(this.t('admin.mentors.required'));
      return;
    }
    this.guardando.set(true);
    const resultado = await this.guardaElMentor.ejecuta(borrador);
    this.guardando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.editando.set(null);
    void this.carga();
  }

  /**
   * Borra un mentor.
   *
   * <p>El backend se NIEGA si tiene sesiones reservadas. Ese fallo se enseña tal cual llega: tragárselo
   * dejaba la fila en la tabla y el borrado parecía no hacer nada.
   */
  protected async borra(mentor: Mentor): Promise<void> {
    const confirmado = await this.dialogo.confirma(this.t('admin.mentors.delete_confirm'));
    if (!confirmado) {
      return;
    }
    const resultado = await this.borraElMentor.ejecuta(mentor.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    void this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (!resultado.ok) {
      this.mentores.set([]);
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.mentores.set(resultado.valor);
  }
}
