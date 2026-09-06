import { Injectable, inject } from '@angular/core';
import { USUARIO_ACTUAL_PORT } from '../../domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { SesionStore } from '../state/sesion.store';

/**
 * Averigua quién está dentro al arrancar la aplicación.
 *
 * <p>Sin credencial guardada NO se pregunta al backend. Parece un detalle y no lo es: preguntarlo
 * provocaba un rechazo por sesión caducada, y con él un intento de renovación inútil, en cada arranque
 * en frío de cualquier visitante anónimo — que son la mayoría.
 */
@Injectable({ providedIn: 'root' })
export class RecuperaSesion {
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly sesion = inject(SesionStore);

  async ejecuta(): Promise<void> {
    if (!this.tokens.acceso()) {
      this.sesion.fija(null);
      return;
    }
    this.sesion.marcaCargando(true);
    try {
      const resultado = await this.usuarioActual.consulta();
      this.sesion.fija(resultado.ok ? resultado.valor : null);
    } finally {
      this.sesion.marcaCargando(false);
    }
  }
}
