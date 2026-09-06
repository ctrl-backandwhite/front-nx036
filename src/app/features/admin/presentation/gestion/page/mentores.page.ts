import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  FormField, email as validaCorreo, form, min, required,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  BorradorDeMentor, Mentor, mentorAFormulario, mentorEnBlanco,
} from '../../../domain/gestion/model/contenido';
import {
  BorraElMentor, ConsultaMentores, GuardaElMentor,
} from '../../../application/gestion/use-case/contenido.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { VentanaModal } from '../component/ventana-modal';

/**
 * El mentor mientras se edita.
 *
 * <p>Igual que `BorradorDeMentor` salvo la tarifa, que aquí es número: es lo que escribe un campo
 * numérico, y al salir se devuelve al texto que espera el dominio.
 */
interface MentorEditable extends Omit<BorradorDeMentor, 'id' | 'tarifaUsdHora'> {
  tarifaUsdHora: number | null;
}

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
  imports: [FaIconComponent, VentanaModal, FormField],
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
                     [formField]="formulario.emailUsuario" />
              @if (formulario.emailUsuario().touched() && formulario.emailUsuario().errors().length) {
                <p role="alert" class="text-[11px] text-error mt-0.5">
                  {{ formulario.emailUsuario().errors()[0].message }}
                </p>
              }
            </div>
          }
          <div>
            <label for="mentor-titular" [class]="rotulo">
              {{ t('admin.mentors.col.headline') }} *
            </label>
            <input id="mentor-titular" [class]="campo" [formField]="formulario.titular" />
            @if (formulario.titular().touched() && formulario.titular().errors().length) {
              <p role="alert" class="text-[11px] text-error mt-0.5">
                {{ formulario.titular().errors()[0].message }}
              </p>
            }
          </div>
          <div>
            <label for="mentor-biografia" [class]="rotulo">{{ t('common.description') }}</label>
            <textarea id="mentor-biografia"
                      class="textarea textarea-bordered textarea-sm w-full h-20"
                      [formField]="formulario.biografia"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label for="mentor-tarifa" [class]="rotulo">
                {{ t('admin.mentors.col.rate') }} (USD/h)
              </label>
              <input id="mentor-tarifa" type="number" step="0.01" [class]="campo"
                     [formField]="formulario.tarifaUsdHora" />
              @if (formulario.tarifaUsdHora().touched()
                   && formulario.tarifaUsdHora().errors().length) {
                <p role="alert" class="text-[11px] text-error mt-0.5">
                  {{ formulario.tarifaUsdHora().errors()[0].message }}
                </p>
              }
            </div>
            <div>
              <label for="mentor-zona" [class]="rotulo">{{ t('admin.profile.country') }}</label>
              <input id="mentor-zona" [class]="campo" placeholder="Europe/Madrid"
                     [formField]="formulario.zonaHoraria" />
            </div>
          </div>
          <div>
            <label for="mentor-especialidades" [class]="rotulo">{{ t('mentors.book.topic') }}</label>
            <input id="mentor-especialidades" [class]="campo" placeholder="paid-ads, branding"
                   [formField]="formulario.especialidades" />
          </div>
          <div>
            <label for="mentor-idiomas" [class]="rotulo">{{ t('sourcing.agent_languages') }}</label>
            <input id="mentor-idiomas" [class]="campo" placeholder="es, en"
                   [formField]="formulario.idiomas" />
          </div>
          <label class="flex items-center gap-2 text-[13px]">
            <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.activo" />
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

  /**
   * El mentor que se está editando, como formulario. Se rehace al abrir otro —o el alta— para no
   * arrastrar lo tecleado en el anterior.
   *
   * <p>La tarifa es `number | null` y ya no texto: un campo numérico vacío es nulo, y así el «0» que
   * salía de `Number('')` deja de poder colarse como una tarifa de cero dólares la hora.
   */
  protected readonly modelo = linkedSignal<MentorEditable>(() => {
    const mentor = this.editando() ?? mentorEnBlanco();
    return {
      emailUsuario: mentor.emailUsuario,
      titular: mentor.titular,
      biografia: mentor.biografia,
      zonaHoraria: mentor.zonaHoraria,
      tarifaUsdHora: mentor.tarifaUsdHora === '' ? null : Number(mentor.tarifaUsdHora),
      especialidades: mentor.especialidades,
      idiomas: mentor.idiomas,
      activo: mentor.activo,
    };
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    // La regla completa vive en el dominio (`mentorValido`); aquí se DECLARA campo a campo para poder
    // decir cuál de los dos falta, que es lo que el caso de uso no puede explicar.
    required(ruta.titular, { message: () => this.t('admin.mentors.required') });
    required(ruta.emailUsuario, {
      // Un mentor va atado a una cuenta y cambiarla después sería crear otro mentor: el correo solo se
      // pide al CREAR, y por eso la regla solo aplica mientras no haya identificador.
      when: () => !this.editando()?.id,
      message: () => this.t('admin.mentors.required'),
    });
    validaCorreo(ruta.emailUsuario, { message: () => this.t('login.error.bad_data') });
    // Una tarifa negativa le pagaría al alumno por venir.
    min(ruta.tarifaUsdHora, 0, { message: () => this.t('dialog.field.min') });
  });

  /** El mentor tal y como sale de la ventana, con la tarifa de vuelta al texto que espera el dominio. */
  protected readonly mentorEditado = computed<BorradorDeMentor>(() => {
    const borrador = this.modelo();
    return {
      ...(this.editando() ?? mentorEnBlanco()),
      ...borrador,
      tarifaUsdHora: borrador.tarifaUsdHora === null ? '' : String(borrador.tarifaUsdHora),
    };
  });

  constructor() {
    void this.importes.carga();
    void this.carga();
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

  /**
   * Guarda el mentor.
   *
   * <p>El botón sigue ENCENDIDO con el formulario incompleto a propósito: pulsarlo y que no pase nada no
   * dice qué falta. El motivo lo escribe el esquema y aquí solo se enseña.
   */
  protected async guarda(): Promise<void> {
    if (!this.editando()) {
      return;
    }
    if (this.formulario().invalid()) {
      this.avisos.error(this.formulario().errorSummary()[0]?.message ?? this.t('common.error'));
      return;
    }
    this.guardando.set(true);
    const resultado = await this.guardaElMentor.ejecuta(this.mentorEditado());
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
