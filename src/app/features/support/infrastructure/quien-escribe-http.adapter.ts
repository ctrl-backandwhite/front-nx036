import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { TokenStore } from '@core/auth/token-store';
import { Result, exito, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { QuienEscribe, QuienEscribePort } from '../domain/port/quien-escribe.port';

/** La forma en que habla el backend. Solo se leen los tres campos que hacen falta. */
interface PerfilDto {
  email: string;
  displayName?: string;
  firstName?: string;
}

/**
 * Quién escribe, resuelto contra el perfil del backend.
 *
 * <p>Sin credencial guardada NO se pregunta. Parece un detalle y no lo es: preguntarlo provocaba un
 * rechazo por sesión caducada —y con él un intento de renovación inútil— en cada visita anónima al
 * formulario de contacto, que es justo donde más visitantes anónimos hay.
 */
@Injectable()
export class QuienEscribeHttpAdapter implements QuienEscribePort {
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);

  async consulta(): Promise<Result<QuienEscribe | null, AppError>> {
    if (!this.tokens.acceso()) {
      return exito(null);
    }
    const respuesta = await this.api.get<PerfilDto | null>('/me');
    return mapea(respuesta, (perfil) =>
      perfil
        ? { nombre: (perfil.displayName || perfil.firstName || '').trim(), email: perfil.email }
        : null,
    );
  }
}
