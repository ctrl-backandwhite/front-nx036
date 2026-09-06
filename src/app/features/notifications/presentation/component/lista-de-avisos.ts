import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxArchive,
  faCircle,
  faEnvelopeOpen,
  faInbox,
  faRotateLeft,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  Aviso,
  Carpeta,
  categoriaDe,
  correoDeRespuesta,
  esAccionable,
  sinLeer,
} from '../../domain/model/aviso';
import { Movimiento } from '../../application/use-case/mueve-avisos.use-case';
import { COLOR_DE_CATEGORIA, COLOR_DE_ESTADO, claveDeEstado } from './colores-del-buzon';

/**
 * La columna de mensajes del buzón.
 *
 * <p>Solo PINTA y avisa de lo que se pulsa: no marca leído, no archiva y no llama a nadie. Quien
 * provoca efectos es la página, que es la que tiene los casos de uso. Así esta lista se prueba con un
 * array de objetos y sin montar media aplicación.
 *
 * <p>MOBILE FIRST: en el móvil ocupa el ancho entero y desaparece cuando hay un mensaje abierto —no
 * caben las dos cosas—; a partir de `sm` convive con el panel de lectura en una columna fija.
 */
@Component({
  selector: 'nx-lista-de-avisos',
  imports: [FaIconComponent],
  template: `
    <aside
      class="w-full sm:w-[340px] lg:w-[400px] shrink-0 sm:border-r border-base-200 overflow-y-auto"
      [class.hidden]="hayAbierto()"
      [class.sm:block]="true"
    >
      @if (avisos().length === 0) {
        <div class="p-10 text-center opacity-60">
          <fa-icon [icon]="iconos.bandeja" class="text-3xl opacity-40 mb-2" />
          <p class="text-sm">{{ t('notif.empty') }}</p>
        </div>
      } @else {
        <label class="flex items-center gap-2 px-4 py-2 border-b border-base-200 text-[11px] opacity-70
                      cursor-pointer sticky top-0 bg-base-100 z-10">
          <input type="checkbox" class="checkbox checkbox-xs" [checked]="todosMarcados()"
                 (change)="alternaTodos.emit()" />
          {{ t('notif.select_all') }}
        </label>

        @for (aviso of avisos(); track aviso.id) {
          <div class="group relative w-full text-left px-4 py-3 border-b border-base-200 flex gap-2.5
                      cursor-pointer transition-colors"
               [attr.data-notif-id]="aviso.id"
               [class.bg-primary/10]="aviso.id === abiertoId()"
               [class.hover:bg-base-200/50]="aviso.id !== abiertoId()"
               role="button" tabindex="0"
               (click)="abre.emit(aviso)"
               (keydown.enter)="abre.emit(aviso)"
               (keydown.space)="abre.emit(aviso)">
            <input type="checkbox" class="checkbox checkbox-xs mt-1 shrink-0"
                   [attr.aria-label]="aviso.titulo"
                   [checked]="marcados().has(aviso.id)"
                   (click)="$event.stopPropagation()"
                   (change)="alterna.emit(aviso.id)" />

            <span class="mt-1 shrink-0" aria-hidden="true">
              <fa-icon [icon]="aviso.leidoEl ? iconos.abierto : iconos.punto"
                       class="text-[9px]"
                       [class.opacity-40]="!!aviso.leidoEl"
                       [class.text-primary]="!aviso.leidoEl" />
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex items-baseline justify-between gap-2">
                <span class="truncate text-[13px]" [class.font-semibold]="noLeido(aviso)">{{ aviso.titulo }}</span>
                <span class="text-[11px] opacity-50 whitespace-nowrap shrink-0 group-hover:opacity-0 transition-opacity">
                  {{ cuandoCorto(aviso.creadoEl) }}
                </span>
              </span>
              <span class="flex items-center gap-1.5 mt-1">
                <span class="badge badge-xs" [class]="colorDeCategoria(aviso)">
                  {{ t('notif.cat.' + categoria(aviso)) }}
                </span>
                @if (accionable(aviso)) {
                  <span class="badge badge-xs" [class]="colorDeEstado(aviso)">{{ t(estado(aviso)) }}</span>
                }
              </span>
              @if (remitente(aviso); as correo) {
                <span class="block truncate text-[11px] opacity-70 mt-0.5">{{ correo }}</span>
              }
              @if (aviso.cuerpo) {
                <span class="block truncate text-[12px] opacity-70 mt-0.5">{{ aviso.cuerpo }}</span>
              }
            </span>

            <!-- Acciones rápidas: archivar o tirar sin tener que abrirlo. -->
            <span class="absolute top-2 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100
                         focus-within:opacity-100 transition-opacity">
              @if (carpeta() === 'inbox') {
                <button type="button" class="btn btn-ghost btn-xs btn-square"
                        [title]="t('notif.action.archive')" [attr.aria-label]="t('notif.action.archive')"
                        (click)="$event.stopPropagation(); mueve.emit({ id: aviso.id, movimiento: 'archiva' })">
                  <fa-icon [icon]="iconos.archivar" class="opacity-70" />
                </button>
              }
              @if (carpeta() === 'archived') {
                <button type="button" class="btn btn-ghost btn-xs btn-square"
                        [title]="t('notif.action.unarchive')" [attr.aria-label]="t('notif.action.unarchive')"
                        (click)="$event.stopPropagation(); mueve.emit({ id: aviso.id, movimiento: 'desarchiva' })">
                  <fa-icon [icon]="iconos.bandeja" class="opacity-70" />
                </button>
              }
              @if (carpeta() === 'trash') {
                <button type="button" class="btn btn-ghost btn-xs btn-square"
                        [title]="t('notif.action.restore')" [attr.aria-label]="t('notif.action.restore')"
                        (click)="$event.stopPropagation(); mueve.emit({ id: aviso.id, movimiento: 'restaura' })">
                  <fa-icon [icon]="iconos.restaurar" class="opacity-70" />
                </button>
                <button type="button" class="btn btn-ghost btn-xs btn-square"
                        [title]="t('notif.action.delete_forever')"
                        [attr.aria-label]="t('notif.action.delete_forever')"
                        (click)="$event.stopPropagation(); mueve.emit({ id: aviso.id, movimiento: 'borraParaSiempre' })">
                  <fa-icon [icon]="iconos.papelera" class="text-error" />
                </button>
              } @else {
                <button type="button" class="btn btn-ghost btn-xs btn-square"
                        [title]="t('notif.action.trash')" [attr.aria-label]="t('notif.action.trash')"
                        (click)="$event.stopPropagation(); mueve.emit({ id: aviso.id, movimiento: 'aLaPapelera' })">
                  <fa-icon [icon]="iconos.papelera" class="text-error" />
                </button>
              }
            </span>
          </div>
        }
      }
    </aside>
  `,
})
export class ListaDeAvisos {
  protected readonly t = inject(TraduccionService).t;

  readonly avisos = input.required<readonly Aviso[]>();
  readonly carpeta = input.required<Carpeta>();
  readonly abiertoId = input<string | null>(null);
  readonly marcados = input.required<ReadonlySet<string>>();
  readonly todosMarcados = input(false);

  readonly abre = output<Aviso>();
  readonly alterna = output<string>();
  readonly alternaTodos = output<void>();
  readonly mueve = output<{ id: string; movimiento: Movimiento }>();

  protected readonly hayAbierto = computed(() => this.abiertoId() !== null);

  protected readonly iconos = {
    bandeja: faInbox,
    abierto: faEnvelopeOpen,
    punto: faCircle,
    archivar: faBoxArchive,
    papelera: faTrash,
    restaurar: faRotateLeft,
  };

  protected noLeido(aviso: Aviso): boolean {
    return sinLeer(aviso);
  }

  protected categoria(aviso: Aviso): string {
    return categoriaDe(aviso.tipoDeSuceso);
  }

  protected colorDeCategoria(aviso: Aviso): string {
    return COLOR_DE_CATEGORIA[categoriaDe(aviso.tipoDeSuceso)];
  }

  protected colorDeEstado(aviso: Aviso): string {
    return COLOR_DE_ESTADO[aviso.estado ?? 'NEW'] ?? COLOR_DE_ESTADO['NEW'];
  }

  protected estado(aviso: Aviso): string {
    return claveDeEstado(aviso.estado);
  }

  protected accionable(aviso: Aviso): boolean {
    return esAccionable(aviso);
  }

  protected remitente(aviso: Aviso): string | null {
    return correoDeRespuesta(aviso);
  }

  /** La hora si es de hoy y la fecha corta si no: en una bandeja larga, el año sobra. */
  protected cuandoCorto(iso: string): string {
    const fecha = new Date(iso);
    const hoy = fecha.toDateString() === new Date().toDateString();
    return hoy
      ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : fecha.toLocaleDateString();
  }
}
