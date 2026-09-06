import { HttpClient, HttpContext, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, Signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Recurso } from '@shared/resource/recurso';
import { APP_CONFIG } from '../config/app-config';
import { mapeaError } from './mapea-error';

/** Parámetros de consulta tal como los escribe quien llama: sin nulos ni indefinidos. */
export type Parametros = Readonly<Record<string, string | number | boolean | undefined | null>>;

function aHttpParams(parametros: Parametros | undefined): HttpParams {
  let p = new HttpParams();
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      p = p.set(clave, String(valor));
    }
  }
  return p;
}

/**
 * El acceso al backend, para uso EXCLUSIVO de los adaptadores de infraestructura.
 *
 * <p>Ninguna pantalla ni ningún caso de uso lo inyecta: el lint lo impide, porque saltarse el puerto es
 * justo lo que convierte una arquitectura hexagonal en decorado. Su trabajo es doble: montar la ruta
 * completa y, sobre todo, **traducir los fallos** — de aquí para dentro no circula un `HttpErrorResponse`,
 * circula un `AppError`.
 *
 * <p>Devuelve `Result` y no lanza. Que una operación pueda fallar queda escrito en el tipo, y quien la
 * llama no puede seguir sin decidir qué hace con el fallo.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  private ruta(camino: string): string {
    return `${this.config.apiBase}/api${camino}`;
  }

  async get<T>(camino: string, parametros?: Parametros): Promise<Result<T, AppError>> {
    return this.envuelve(
      firstValueFrom(this.http.get<T>(this.ruta(camino), { params: aHttpParams(parametros) })),
    );
  }

  async post<T>(camino: string, cuerpo?: unknown, contexto?: HttpContext): Promise<Result<T, AppError>> {
    return this.envuelve(
      firstValueFrom(this.http.post<T>(this.ruta(camino), cuerpo ?? {}, { context: contexto })),
    );
  }

  async put<T>(camino: string, cuerpo?: unknown): Promise<Result<T, AppError>> {
    return this.envuelve(firstValueFrom(this.http.put<T>(this.ruta(camino), cuerpo ?? {})));
  }

  async patch<T>(camino: string, cuerpo?: unknown): Promise<Result<T, AppError>> {
    return this.envuelve(firstValueFrom(this.http.patch<T>(this.ruta(camino), cuerpo ?? {})));
  }

  async delete<T>(camino: string, parametros?: Parametros): Promise<Result<T, AppError>> {
    return this.envuelve(
      firstValueFrom(this.http.delete<T>(this.ruta(camino), { params: aHttpParams(parametros) })),
    );
  }

  /**
   * Una lectura reactiva: se vuelve a pedir sola cuando cambian los parámetros de los que depende.
   *
   * <p>El argumento es una FUNCIÓN porque tiene que leer signals: en cuanto cambia el filtro, la página o
   * el idioma, la petición se repite sin que nadie la dispare a mano. Devolver `undefined` la cancela,
   * que es como se expresa «todavía no hay nada que pedir» — por ejemplo mientras no se sepa el
   * identificador.
   */
  recurso<T>(peticion: () => { camino: string; parametros?: Parametros } | undefined): Recurso<T> {
    const config = this.config;
    const fuente = httpResource<T>(() => {
      const p = peticion();
      return p ? { url: `${config.apiBase}/api${p.camino}`, params: aHttpParams(p.parametros) } : undefined;
    });

    return {
      valor: fuente.value as Signal<T | undefined>,
      cargando: fuente.isLoading,
      error: computed(() => (fuente.error() ? mapeaError(fuente.error()) : null)),
      recarga: () => fuente.reload(),
    };
  }

  /**
   * Pide un fichero, no un objeto: la factura en PDF, el volcado de datos personales, una exportación.
   *
   * <p>Va aquí y no en cada contexto porque tiene dos trampas que conviene resolver una sola vez. La
   * primera es que hay que pedir la respuesta como binario; con la configuración normal, el cliente
   * intenta interpretar el PDF como JSON y falla con un error que no dice nada de lo que pasa. La
   * segunda es que debe seguir pasando por los interceptores —hace falta la credencial, y el idioma
   * decide en qué lengua sale el documento—, así que no vale saltarse el cliente.
   *
   * <p>Devuelve el contenido y el nombre que propone el servidor en su cabecera, para no tener que
   * inventarse uno en cada pantalla.
   */
  async descarga(
    camino: string,
    parametros?: Parametros,
  ): Promise<Result<{ contenido: Blob; nombre: string | null }, AppError>> {
    try {
      const respuesta = await firstValueFrom(
        this.http.get(this.ruta(camino), {
          params: aHttpParams(parametros),
          responseType: 'blob',
          observe: 'response',
        }),
      );
      return exito({
        contenido: respuesta.body ?? new Blob(),
        nombre: nombreSugerido(respuesta.headers.get('Content-Disposition')),
      });
    } catch (error) {
      return fallo(mapeaError(error));
    }
  }

  private async envuelve<T>(promesa: Promise<T>): Promise<Result<T, AppError>> {
    try {
      return exito(await promesa);
    } catch (error) {
      return fallo(mapeaError(error));
    }
  }
}

/**
 * El nombre de fichero que propone el servidor.
 *
 * <p>Se lee primero la forma `filename*`, que es la que admite acentos y alfabetos no latinos: un
 * pedido a nombre de alguien con eñe o con caracteres chinos llega bien por ahí y destrozado por la
 * otra. Si no viene ninguna, decide la pantalla.
 */
function nombreSugerido(cabecera: string | null): string | null {
  if (!cabecera) {
    return null;
  }
  const codificado = /filename\*=UTF-8''([^;]+)/i.exec(cabecera);
  if (codificado) {
    try {
      return decodeURIComponent(codificado[1]);
    } catch {
      /* Cabecera mal formada: se prueba con la forma sencilla. */
    }
  }
  const sencillo = /filename="?([^";]+)"?/i.exec(cabecera);
  return sencillo ? sencillo[1] : null;
}
