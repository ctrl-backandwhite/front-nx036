import { Injectable, inject } from '@angular/core';
import { SaludDelServicio, saludSegun } from '../../domain/model/estado-del-servicio';
import { ESTADO_DEL_SERVICIO_PORT } from '../../domain/port/estado-del-servicio.port';

/**
 * ¿Cómo está el servicio?
 *
 * <p>Traduce «el backend contestó o no» a los tres estados que la página sabe pintar. La traducción es
 * del dominio; lo que aporta el caso de uso es el ORDEN: se pregunta una vez, y hasta que llega la
 * respuesta el estado es «comprobando» y no «degradado». Un parpadeo de alarma en cada visita es peor
 * que no tener página de estado.
 */
@Injectable()
export class CompruebaEstadoDelServicio {
  private readonly servicio = inject(ESTADO_DEL_SERVICIO_PORT);

  async ejecuta(): Promise<SaludDelServicio> {
    const resultado = await this.servicio.comprueba();
    return saludSegun(false, resultado.ok);
  }
}
