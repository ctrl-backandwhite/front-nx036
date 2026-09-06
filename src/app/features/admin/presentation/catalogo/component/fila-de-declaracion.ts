import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
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
  imports: [FaIconComponent, FormField],
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
        [formField]="formulario.ingles"
      />
    </td>
    <td>
      <input
        class="input input-sm input-bordered w-full min-w-[12rem]"
        [attr.aria-label]="t('admin.declgroups.cname')"
        [formField]="formulario.chino"
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
        [disabled]="!sePuedeGuardar()"
        (click)="guarda.emit({ ingles: modelo().ingles.trim(), chino: modelo().chino.trim() })"
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

  /** Lo tecleado en la fila. Vuelve a lo del servidor al guardar, al sembrar o al recargar. */
  protected readonly modelo = linkedSignal<GrupoDeDeclaracion, { ingles: string; chino: string }>({
    source: () => this.grupo(),
    computation: (grupo) => ({ ingles: grupo.nombreEn ?? '', chino: grupo.nombreZh ?? '' }),
  });

  /**
   * El formulario va SIN reglas de campo, y es a propósito.
   *
   * <p>Ninguna de las dos descripciones es obligatoria aquí: una terna recién sembrada nace sin ellas y
   * eso no es un error, es lo que queda por hacer. Quien exige la inglesa es la APROBACIÓN —firmar sin
   * descripción es lo que hace que el transportista rechace la guía—, y esa regla la sigue poniendo el
   * dominio (`puedeAprobarse`) sobre el botón que la necesita, no sobre el campo.
   *
   * <p>Tampoco se inventa un tope de longitud: el que tenga el backend no está escrito en ningún sitio
   * de este lado, y poner uno a ojo bloquearía descripciones que hoy se guardan.
   */
  protected readonly formulario = form(this.modelo);

  /** Se guarda cuando de verdad hay algo distinto de lo que ya tiene el servidor. */
  protected readonly sePuedeGuardar = computed(() =>
    descripcionCambiada(this.grupo(), this.modelo().ingles, this.modelo().chino),
  );

  protected readonly sePuedeAprobar = computed(() => puedeAprobarse(this.modelo().ingles));
}
