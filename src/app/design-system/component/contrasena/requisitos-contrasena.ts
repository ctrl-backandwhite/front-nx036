import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircle, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { comprobacionesContrasena } from '@shared/validation/politica-contrasena';

/**
 * La lista de requisitos que se va marcando mientras se teclea.
 *
 * <p>Enseñar las reglas ANTES de fallar es lo que evita el ciclo de escribir, enviar y que te digan que
 * no. Dos columnas, y el último requisito centrado cuando el número de reglas es impar.
 */
@Component({
  selector: 'nx-requisitos-contrasena',
  imports: [FaIconComponent],
  template: `
    <div class="rounded-box border border-ink-100 bg-ink-50/50 p-3">
      <ul class="grid grid-cols-2 gap-x-5 gap-y-1.5">
        @for (requisito of requisitos(); track requisito.clave) {
          <li
            class="flex items-center gap-2 text-xs"
            [class.text-emerald-700]="requisito.cumple"
            [class.text-ink-400]="!requisito.cumple"
            [class.col-span-2]="requisito.centrado"
            [class.justify-center]="requisito.centrado"
          >
            <fa-icon [icon]="requisito.cumple ? iconoHecho : iconoPendiente" class="text-[11px]" />
            {{ t('profile.pwd_req_' + requisito.clave) }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class RequisitosContrasena {
  readonly contrasena = input('');

  protected readonly iconoHecho = faCircleCheck;
  protected readonly iconoPendiente = faCircle;
  protected readonly t = inject(TraduccionService).t;

  protected readonly requisitos = computed(() => {
    const lista = comprobacionesContrasena(this.contrasena());
    return lista.map((comprobacion, indice) => ({
      ...comprobacion,
      // Con un número impar de reglas la última quedaría sola y desalineada a la izquierda; centrarla
      // en las dos columnas es lo que cierra la rejilla.
      centrado: indice === lista.length - 1 && lista.length % 2 === 1,
    }));
  });
}
