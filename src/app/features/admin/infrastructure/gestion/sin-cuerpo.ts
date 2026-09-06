import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Convierte una respuesta cuyo cuerpo no interesa en un `Result<void>`.
 *
 * <p>Muchas escrituras del panel devuelven la fila recién guardada, pero quien llama vuelve a leer el
 * listado de todos modos. Tipar esos métodos como `void` deja escrito que ese cuerpo no se usa, en vez
 * de arrastrar un DTO que nadie mira y que tendría que mantenerse al día para nada.
 */
export async function sinCuerpo(
  promesa: Promise<Result<unknown, AppError>>,
): Promise<Result<void, AppError>> {
  const respuesta = await promesa;
  return respuesta.ok ? { ok: true, valor: undefined } : respuesta;
}
