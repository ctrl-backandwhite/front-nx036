import { Service, inject } from '@angular/core';
import { AUTENTICACION_PORT } from '../../domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { SesionStore } from '../state/sesion.store';

/**
 * Salir.
 *
 * <p>No devuelve `Result` a propósito: si el backend no contesta, la sesión se cierra IGUAL en este
 * equipo. Dejar a alguien dentro porque la red falló al avisar sería lo contrario de lo que pidió, y en
 * un ordenador compartido es un problema de verdad.
 */
@Service()
export class CierraSesion {
  private readonly autenticacion = inject(AUTENTICACION_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly sesion = inject(SesionStore);

  async ejecuta(): Promise<void> {
    await this.autenticacion.sal();
    this.tokens.limpia();
    this.sesion.limpia();
  }
}
