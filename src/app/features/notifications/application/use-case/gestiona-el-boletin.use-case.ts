import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BOLETIN_PORT, SuscripcionAlBoletin } from '../../domain/port/boletin.port';

/**
 * Apuntarse al boletín y darse de baja.
 *
 * <p>La baja va por TESTIGO y no por correo: el enlace del pie de cada envío lo trae. Pedir el correo
 * dejaría que cualquiera diera de baja a otro escribiendo su dirección.
 */
@Injectable({ providedIn: 'root' })
export class GestionaElBoletin {
  private readonly boletin = inject(BOLETIN_PORT);

  suscribe(email: string): Promise<Result<SuscripcionAlBoletin, AppError>> {
    return this.boletin.suscribe(email.trim());
  }

  daDeBaja(testigo: string): Promise<Result<boolean, AppError>> {
    return this.boletin.daDeBaja(testigo);
  }
}
