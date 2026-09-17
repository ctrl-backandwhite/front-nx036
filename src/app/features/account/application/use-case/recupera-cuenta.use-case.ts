import { Injectable, inject } from '@angular/core';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { CuentaStore } from '../state/cuenta.store';

/**
 * Averigua quién es el titular de la cuenta.
 *
 * <p>Pregunta por el puerto de DOMINIO de «auth», que es contrato público, en vez de leer su almacén de
 * sesión: eso son sus tripas y el lint —con razón— no las deja tocar. La contrapartida es que este
 * contexto tiene su propia copia del titular, y por eso se resuelve una sola vez.
 *
 * <p>Sin credencial guardada NO se pregunta al backend: preguntarlo provocaba un rechazo por sesión
 * caducada, y con él un intento de renovación inútil, en cada arranque en frío de un visitante anónimo.
 */
@Injectable()
export class RecuperaCuenta {
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly cuenta = inject(CuentaStore);

  /**
   * «Que esté cargada», para las PANTALLAS que necesitan al titular.
   *
   * <p>Es lo que piden perfil y direcciones al abrirse, y se navega entre ellas: preguntar en cada
   * salto añadiría una ida y vuelta al servidor a cada clic.
   *
   * <p>Separado de `ejecuta` a propósito. `GuardaPerfil` llama a aquel porque necesita RELEER —el
   * servidor normaliza el teléfono, recorta el nombre y decide el idioma—, y hacer idempotente el
   * único método habría dejado la pantalla enseñando lo tecleado en vez de lo guardado.
   */
  async aseguraCargada(): Promise<void> {
    if (this.cuenta.resuelta()) {
      return;
    }
    await this.ejecuta();
  }

  async ejecuta(): Promise<void> {
    if (!this.tokens.acceso()) {
      this.cuenta.fija(null);
      return;
    }
    const resultado = await this.usuarioActual.consulta();
    this.cuenta.fija(resultado.ok ? resultado.valor : null);
  }
}
