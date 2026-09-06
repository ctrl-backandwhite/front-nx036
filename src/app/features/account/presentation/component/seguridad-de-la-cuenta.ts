import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CambioDeContrasena } from './cambio-de-contrasena';
import { DobleFactor } from './doble-factor';
import { SesionesActivas } from './sesiones-activas';

/**
 * La pestaña de seguridad: segundo factor, contraseña y dispositivos conectados.
 *
 * <p>Es solo el marco. Las tres piezas se separaron porque cada una tiene su propio estado y su propio
 * ciclo de vida; juntas pasaban de trescientas líneas y ya no se leían.
 */
@Component({
  selector: 'nx-seguridad-de-la-cuenta',
  imports: [FaIconComponent, DobleFactor, CambioDeContrasena, SesionesActivas],
  template: `
    <section class="card p-5">
      <h3 class="flex items-center gap-2">
        <fa-icon [icon]="iconoEscudo" class="text-brand-600" /> {{ t('profile.section.security') }}
      </h3>
      <nx-doble-factor />
      <nx-cambio-de-contrasena />
      <nx-sesiones-activas />
    </section>
  `,
})
export class SeguridadDeLaCuenta {
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoEscudo = faShieldHalved;
}
