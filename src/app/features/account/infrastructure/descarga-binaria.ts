import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { mapeaError } from '@core/http/mapea-error';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Pide al backend una respuesta BINARIA (un PDF, un volcado de datos).
 *
 * <p>`ApiService` todavía no sabe pedirlas: solo habla JSON, y pasar un PDF por `JSON.parse` falla. Se
 * usa el cliente HTTP directamente —y no `fetch`— para que sigan aplicándose los interceptores del
 * proyecto: credencial, idioma, divisa y renovación del testigo. Con `fetch` habría que rehacer a mano
 * todas esas cabeceras y la primera que se olvidara fallaría en silencio.
 *
 * <p>Está en una función suelta y no repetida en cada adaptador para que, el día que `core` ofrezca una
 * lectura binaria, se cambie en un sitio. Es la única pieza de infraestructura del contexto que toca el
 * cliente HTTP.
 */
export async function descargaBinaria(
  http: HttpClient,
  apiBase: string,
  camino: string,
): Promise<Result<Blob, AppError>> {
  try {
    return exito(
      await firstValueFrom(http.get(`${apiBase}/api${camino}`, { responseType: 'blob' })),
    );
  } catch (error) {
    return fallo(mapeaError(error));
  }
}
