import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  GrupoDeDeclaracion,
  descripcionCambiada,
  puedeAprobarse,
} from '../../../domain/catalogo/model/grupo-de-declaracion';

/**
 * Una terna aduanera con sus dos descripciones editables.
 *
 * <p>El texto vive en la FILA y no en la pantalla para que editar una no repinte las otras ciento y
 * pico. Se resincroniza cuando el servidor devuelve otro valor —al guardar, al sembrar o al recargar—,
 * y eso es lo que hace `linkedSignal`.
 *
 * <p>Sin descripción en inglés no hay nada que firmar: el transportista rechazaría la guía, así que el
 * botón de aprobar se queda apagado.
 *
 * <p>El componente ES la fila, maquetada con la utilidad `table-row`: así el selector cumple la norma
 * del proyecto sin dejar de comportarse como un `<tr>` dentro del `<tbody>`.
 */
@Component({
  selector: 'nx-fila-de-declaracion',
  imports: [FaIconComponent],
  template: `
    <td class="whitespace-nowrap text-[12px]">
      <div class="font-mono">{{ grupo().hs6 }}</div>
      <div class="text-ink-500">{{ grupo().material }} · {{ grupo().codigoDeUso }}</div>
    </td>
    <td class="text-right tabular-nums">{{ grupo().numeroDeProductos }}</td>
    <td>
      <input
        class="input input-sm input-bordered w-full min-w-[16rem]"
        [attr.aria-label]="t('admin.declgroups.ename')"
        [value]="ingles()"
        (input)="ingles.set($any($event.target).value)"
      />
    </td>
    <td>
      <input
        class="input input-sm input-bordered w-full min-w-[12rem]"
        [attr.aria-label]="t('admin.declgroups.cname')"
        [value]="chino()"
        (input)="chino.set($any($event.target).value)"
      />
    </td>
    <td class="whitespace-nowrap text-[12px]">
      @if (grupo().aprobado) {
        <span class="inline-flex items-center gap-1 text-emerald-700">
          <fa-icon [icon]="iconoAprobado" class="text-[11px]" />
          {{ t('admin.declgroups.approved') }}
        </span>
      } @else {
        <span class="text-ink-500">{{ t('admin.declgroups.pending') }}</span>
      }
      @if (grupo().aprobadoPor) {
        <div class="text-[11px] text-ink-400">{{ grupo().aprobadoPor }}</div>
      }
    </td>
    <td class="whitespace-nowrap text-right space-x-1">
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        [disabled]="!hayCambios()"
        (click)="guarda.emit({ ingles: ingles().trim(), chino: chino().trim() })"
      >
        {{ t('admin.declgroups.save') }}
      </button>
      @if (grupo().aprobado) {
        <button type="button" class="btn btn-xs btn-outline" (click)="cambiaAprobacion.emit(false)">
          {{ t('admin.declgroups.unapprove') }}
        </button>
      } @else {
        <button
          type="button"
          class="btn btn-xs btn-primary"
          [disabled]="!sePuedeAprobar()"
          (click)="cambiaAprobacion.emit(true)"
        >
          {{ t('admin.declgroups.approve') }}
        </button>
      }
    </td>
  `,
  host: { class: 'table-row align-top' },
})
export class FilaDeDeclaracion {
  readonly grupo = input.required<GrupoDeDeclaracion>();

  readonly guarda = output<{ ingles: string; chino: string }>();
  readonly cambiaAprobacion = output<boolean>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAprobado = faCircleCheck;

  protected readonly ingles = linkedSignal<GrupoDeDeclaracion, string>({
    source: () => this.grupo(),
    computation: (grupo) => grupo.nombreEn ?? '',
  });

  protected readonly chino = linkedSignal<GrupoDeDeclaracion, string>({
    source: () => this.grupo(),
    computation: (grupo) => grupo.nombreZh ?? '',
  });

  protected readonly hayCambios = computed(() =>
    descripcionCambiada(this.grupo(), this.ingles(), this.chino()),
  );

  protected readonly sePuedeAprobar = computed(() => puedeAprobarse(this.ingles()));
}
