import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { iconoDeDocumentacion } from './iconos-de-documentacion';

/**
 * Un capítulo de la documentación.
 *
 * <p>El `scroll-mt-20` es lo que hace que un enlace con ancla no deje el título tapado por la cabecera
 * fija: sin él, al llegar desde el índice se veía el segundo párrafo y no el encabezado.
 */
@Component({
  selector: 'nx-seccion-de-documentacion',
  imports: [FaIconComponent],
  template: `
    <section [id]="id()" class="scroll-mt-20 mb-14">
      <h2 class="text-xl mb-3 flex items-center gap-2">
        <fa-icon [icon]="icono()" class="text-brand-500 text-[16px]" />
        {{ titulo() }}
      </h2>
      <div class="space-y-3 text-[14px] text-ink-700 leading-relaxed">
        <ng-content />
      </div>
    </section>
  `,
})
export class SeccionDeDocumentacion {
  readonly id = input.required<string>();
  readonly titulo = input.required<string>();
  readonly nombreDelIcono = input.required<string>();

  protected readonly icono = computed(() => iconoDeDocumentacion(this.nombreDelIcono()));
}

/**
 * Un apartado dentro de un capítulo.
 *
 * <p>Se distingue por la barra lateral y el título menor, no por la sangría: en el móvil una sangría
 * del ancho suficiente para notarse se come el espacio que necesitan las tablas.
 */
@Component({
  selector: 'nx-apartado-de-documentacion',
  imports: [FaIconComponent],
  template: `
    <section [id]="id()" class="scroll-mt-20 mb-10 pl-3 border-l-2 border-brand-100">
      <h3 class="text-[16px] mb-3 flex items-center gap-2 text-ink-900">
        <fa-icon [icon]="icono()" class="text-brand-500 text-[14px]" />
        {{ titulo() }}
      </h3>
      <div class="space-y-3 text-[14px] text-ink-700 leading-relaxed">
        <ng-content />
      </div>
    </section>
  `,
})
export class ApartadoDeDocumentacion {
  readonly id = input.required<string>();
  readonly titulo = input.required<string>();
  readonly nombreDelIcono = input.required<string>();

  protected readonly icono = computed(() => iconoDeDocumentacion(this.nombreDelIcono()));
}
