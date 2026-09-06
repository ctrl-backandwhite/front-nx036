import { Injectable, inject } from '@angular/core';
import { USUARIO_ACTUAL_PORT } from '../../domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { RecuperadorDeSesionPort } from '@core/auth/recuperador-de-sesion.port';
import { SesionStore } from '../state/sesion.store';

/**
 * Averigua quién está dentro al arrancar la aplicación.
 *
 * <p>Sin credencial guardada NO se pregunta al backend. Parece un detalle y no lo es: preguntarlo
 * provocaba un rechazo por sesión caducada, y con él un intento de renovación inútil, en cada arranque
 * en frío de cualquier visitante anónimo — que son la mayoría.
 *
 * <p>Cumple `RecuperadorDeSesionPort`, el contrato que declara el NÚCLEO para su guardián de rutas. El
 * guardián protege zonas de ocho contextos y por eso no puede vivir aquí dentro; lo que sí vive aquí es
 * la única implementación que sabe pedirle la cuenta al backend. El núcleo declara y «auth» cumple.
 */
@Injectable({ providedIn: 'root' })
export class RecuperaSesion implements RecuperadorDeSesionPort {
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly sesion = inject(SesionStore);

  /**
   * Lo que pide el puerto del núcleo: deja la sesión RESUELTA y no lanza.
   *
   * <p>Si ya se sabe quién mira, no vuelve a preguntar. Sin esa comprobación, navegar entre dos rutas
   * protegidas dispararía una consulta del perfil por cada salto.
   */
  async asegura(): Promise<void> {
    if (this.sesion.resuelta()) {
      return;
    }
    await this.ejecuta();
  }

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
