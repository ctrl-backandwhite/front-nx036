import { Service, inject } from '@angular/core';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { QuienMiraStore } from '../state/quien-mira.store';

/**
 * Averigua quién está mirando el panel.
 *
 * <p>Se apoya en el PUERTO de «auth», que es contrato público entre contextos, y no en su almacén de
 * sesión, que es de su capa de aplicación y por tanto privado.
 *
 * <p>Sin credencial guardada NO se pregunta al backend: preguntarlo provocaba un rechazo por sesión
 * caducada y un intento de renovación inútil en cada arranque en frío.
 *
 * <p>Se resuelve UNA vez por sesión de aplicación. Las diez pantallas del panel navegan entre sí, y
 * pedir el perfil en cada salto añadía una ida y vuelta al servidor a cada clic.
 *
 * <p>Va en la RAÍZ, como el almacén: lo usa el guardián, que corre antes de que exista el ámbito de la
 * ruta. Sus dos dependencias son transversales —la credencial y el puerto de «auth»—, así que ahí las
 * encuentra igual.
 */
@Service()
export class AveriguaQuienMira {
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly quienMira = inject(QuienMiraStore);

  async ejecuta(): Promise<void> {
    if (this.quienMira.resuelto()) {
      return;
    }
    if (!this.tokens.acceso()) {
      this.quienMira.fija(null);
      return;
    }
    const resultado = await this.usuarioActual.consulta();
    this.quienMira.fija(resultado.ok ? resultado.valor : null);
  }
}
