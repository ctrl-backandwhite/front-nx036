import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PerfilDatos } from '../component/perfil-datos';
import { PerfilSegundoFactor } from '../component/perfil-segundo-factor';
import { PerfilSesiones } from '../component/perfil-sesiones';
import { PerfilContrasena } from '../component/perfil-contrasena';

/**
 * El perfil de quien administra: sus datos, su seguridad y su contraseña.
 *
 * <p>La pantalla solo COMPONE. Cada bloque —datos, segundo factor, sesiones, contraseña— tiene su propio
 * componente porque son cuatro conversaciones distintas con el backend, y juntarlas en una clase daba
 * justo el fichero de cuatrocientas líneas que nadie se atreve a tocar.
 *
 * <p>RENDIMIENTO: solo la ficha de la cuenta se pinta de entrada. Los otros tres bloques —segundo
 * factor, sesiones y contraseña— van en `@defer (on viewport)`. A quien entra solo a mirar sus datos y
 * no baja, eso le ahorra DOS peticiones al montar (`GET /me/2fa/status` y `GET /me/sessions`) y, sobre
 * todo, la biblioteca que dibuja el código QR: son unos 100 kB de JavaScript que solo hacen falta si se
 * llega a dar de alta un segundo factor, y que antes viajaban con la pantalla siempre.
 *
 * <p>MOBILE FIRST: una sola columna con ancho máximo centrado; no hay nada que reorganizar al ampliar.
 */
@Component({
  selector: 'nx-perfil-admin',
  imports: [FaIconComponent, PerfilDatos, PerfilSegundoFactor, PerfilSesiones, PerfilContrasena],
  template: `
    <div class="space-y-6 max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold">{{ t('admin.profile.title') }}</h1>

      <nx-perfil-datos />

      <!-- Seguridad y contraseña quedan por debajo del pliegue: al entrar solo se ve la ficha de la
           cuenta. Se descargan cuando su hueco entra en pantalla, y el hueco reserva la altura para
           que lo de arriba no dé un salto al llegar el contenido. -->
      @defer (on viewport) {
        <div class="card p-6">
          <h2 class="font-medium mb-4">
            <fa-icon [icon]="iconoDeSeguridad" /> {{ t('admin.profile.security.title') }}
          </h2>
          <nx-perfil-segundo-factor />
          <nx-perfil-sesiones />
        </div>
      } @placeholder {
        <div class="card p-6 min-h-[230px]"></div>
      }

      @defer (on viewport) {
        <nx-perfil-contrasena />
      } @placeholder {
        <div class="card p-6 min-h-[300px]"></div>
      }
    </div>
  `,
})
export class PerfilPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoDeSeguridad = faShieldHalved;
}
