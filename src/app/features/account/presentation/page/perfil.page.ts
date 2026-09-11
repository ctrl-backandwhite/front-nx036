import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCreditCard,
  faGem,
  faLocationDot,
  faShieldHalved,
  faTriangleExclamation,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CuentaStore } from '../../application/state/cuenta.store';
import { DatosPersonales } from '../component/datos-personales';
import { DireccionesDelPerfil } from '../component/direcciones-del-perfil';
import { MetodosDePago } from '../component/metodos-de-pago';
import { MiSuscripcion } from '../component/mi-suscripcion';
import { SeguridadDeLaCuenta } from '../component/seguridad-de-la-cuenta';
import { SelectorDePlan } from '../component/selector-de-plan';
import { ZonaDePeligro } from '../component/zona-de-peligro';

/** Las secciones del perfil, en orden lógico: identidad → seguridad → envío → pago → plan → baja. */
type Seccion = 'personal' | 'security' | 'addresses' | 'payment' | 'plan' | 'danger';

interface EntradaDeMenu {
  readonly clave: Seccion;
  readonly icono: IconDefinition;
  readonly etiqueta: string;
}

/**
 * ¿Se ofrecen ya los planes de suscripción?
 *
 * <p>Hoy NO: la contratación no está disponible todavía y se habilitará más adelante. Mientras tanto
 * la sección no se enseña, porque una pantalla que invita a elegir plan y cobrar con la tarjeta
 * guardada, en un producto que aún no vende planes, promete algo que no se puede cumplir.
 *
 * <p>Se apaga con una bandera y NO borrando el código: la pantalla está escrita y probada, y el día
 * que se abra basta con poner esto a `true`. Borrarla obligaría a rehacerla y a redescubrir sus
 * detalles. Con la entrada fuera del menú, un enlace guardado a `?section=plan` cae solo en «Datos
 * personales», porque la sección activa se valida contra este menú.
 */
const PLANES_DISPONIBLES = false;

const MENU_COMPLETO: readonly EntradaDeMenu[] = [
  { clave: 'personal', icono: faUser, etiqueta: 'profile.section.personal' },
  { clave: 'security', icono: faShieldHalved, etiqueta: 'profile.section.security' },
  { clave: 'addresses', icono: faLocationDot, etiqueta: 'profile.section.addresses' },
  { clave: 'payment', icono: faCreditCard, etiqueta: 'profile.section.payment' },
  { clave: 'plan', icono: faGem, etiqueta: 'profile.section.plan' },
  { clave: 'danger', icono: faTriangleExclamation, etiqueta: 'profile.danger.title' },
];

const MENU: readonly EntradaDeMenu[] = MENU_COMPLETO.filter(
  (entrada) => entrada.clave !== 'plan' || PLANES_DISPONIBLES,
);

/**
 * El perfil de la cuenta.
 *
 * <p>Es solo el MARCO: la navegación entre secciones y el hueco donde se pinta la que esté activa. Cada
 * sección es un componente con su propio estado, y por eso esta clase no crece cuando cambia ninguna.
 *
 * <p>La sección activa vive en la DIRECCIÓN (`?section=`) para que al recargar se mantenga la misma
 * vista; cuando era estado local, cualquier recarga devolvía a «Datos personales».
 *
 * <p>Mobile first: en el móvil el menú va arriba y el contenido debajo, en flujo normal. Desde `lg` se
 * convierte en dos columnas con el bloque de altura fija y desplazamiento interno a la derecha, para que
 * el tamaño de la página no fluctúe al cambiar de sección y el pie no salte.
 */
@Component({
  selector: 'nx-perfil',
  imports: [
    FaIconComponent,
    DatosPersonales,
    SeguridadDeLaCuenta,
    DireccionesDelPerfil,
    MetodosDePago,
    SelectorDePlan,
    MiSuscripcion,
    ZonaDePeligro,
  ],
  template: `
    <div class="max-w-6xl mx-auto">
      <header class="mb-6">
        <h1>{{ t('profile.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('profile.subtitle') }}</p>
      </header>

      @if (!cuenta.hayTitular()) {
        <p class="text-sm">{{ t('common.loading') }}</p>
      } @else {
        <div class="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-[240px_minmax(0,1fr)] lg:h-[calc(100vh-13rem)]">
          <!-- El menú se ajusta a su contenido y queda arriba: estirado a la altura fija quedaría enorme. -->
          <nav class="card p-2 lg:self-start lg:sticky lg:top-4" [attr.aria-label]="t('profile.title')">
            @for (entrada of menu; track entrada.clave) {
              <button
                type="button"
                [class]="clase(entrada)"
                [attr.aria-current]="entrada.clave === seccion() ? 'page' : null"
                (click)="cambia(entrada.clave)"
              >
                <fa-icon [icon]="entrada.icono" class="w-4" /> {{ t(entrada.etiqueta) }}
              </button>
            }
          </nav>

          <div class="space-y-6 min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            @switch (seccion()) {
              @case ('personal') { <nx-datos-personales /> }
              @case ('security') { <nx-seguridad-de-la-cuenta /> }
              @case ('addresses') { <nx-direcciones-del-perfil /> }
              @case ('payment') { <nx-metodos-de-pago /> }
              @case ('plan') {
                <nx-selector-de-plan />
                <nx-mi-suscripcion />
              }
              @case ('danger') { <nx-zona-de-peligro /> }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PerfilPage {
  /**
   * La sección pedida en la dirección (`?section=`).
   *
   * <p>Llega como ENTRADA gracias a `withComponentInputBinding`, así que no hay que inyectar el
   * enrutador ni suscribirse a nada para leerla, y se actualiza sola al navegar. Se llama en inglés
   * porque el nombre lo fija la dirección, que es contrato con quien tenga el enlace guardado.
   */
  readonly section = input<string>();

  private readonly router = inject(Router);
  private readonly traduccion = inject(TraduccionService);

  protected readonly cuenta = inject(CuentaStore);
  protected readonly t = this.traduccion.t;
  protected readonly menu = MENU;

  /** Se valida contra el menú: una sección inventada cae en la primera, no en una pantalla en blanco. */
  protected readonly seccion = computed<Seccion>(() => {
    const clave = this.section();
    return MENU.some((entrada) => entrada.clave === clave) ? (clave as Seccion) : 'personal';
  });

  protected cambia(seccion: Seccion): void {
    // `replaceUrl` para que ir y venir entre secciones no llene el historial: volver atrás desde el
    // perfil tiene que salir del perfil, no recorrer las seis pestañas.
    void this.router.navigate([], { queryParams: { section: seccion }, replaceUrl: true });
  }

  protected clase(entrada: EntradaDeMenu): string {
    const base =
      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors';
    const activa = entrada.clave === this.seccion();
    const peligro = entrada.clave === 'danger';
    if (activa) {
      return `${base} ${peligro ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'} font-medium`;
    }
    return `${base} ${peligro ? 'text-red-600 hover:bg-red-50' : 'text-ink-600 hover:bg-ink-50'}`;
  }
}
