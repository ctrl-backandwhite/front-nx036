import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CifrasDelSitio, CifrasDelSitioPort } from '../domain/port/cifras-del-sitio.port';

/**
 * Las tres cifras salen de tres listas del backend, y lo único que interesa de cada una es CUÁNTAS.
 *
 * <p>Son tres peticiones, igual que en el front anterior, porque el backend no ofrece nada que las
 * agrupe. Van en paralelo —no encadenadas— así que cuestan lo que la más lenta, no la suma.
 */

/** Lo mínimo que hace falta de cada lista: que sea una lista. */
type Lista = readonly unknown[];

/** Valores de respaldo. Son los mismos que usa el front anterior cuando una lista no llega. */
const RESPALDO: CifrasDelSitio = { idiomas: 8, divisas: 12, almacenes: 2 };

@Injectable()
export class CifrasDelSitioHttpAdapter implements CifrasDelSitioPort {
  private readonly api = inject(ApiService);

  /**
   * Nunca falla.
   *
   * <p>Es deliberado y por eso devuelve siempre `exito`: estas cifras adornan la portada, no la
   * sostienen. Si el backend no contesta a una de las tres, se enseña el respaldo y la persona ve una
   * portada completa en vez de tres huecos o una pantalla de error. Lo que NO se hace es callar una
   * lista vacía: si el backend responde con cero, se toma el respaldo, porque cero almacenes o cero
   * idiomas no es una cifra que este sitio pueda tener.
   */
  async consulta(): Promise<Result<CifrasDelSitio, AppError>> {
    const [idiomas, divisas, almacenes] = await Promise.all([
      this.cuantos('/languages'),
      this.cuantos('/currency/rates'),
      this.cuantos('/warehouses'),
    ]);
    return exito({
      idiomas: idiomas || RESPALDO.idiomas,
      divisas: divisas || RESPALDO.divisas,
      almacenes: almacenes || RESPALDO.almacenes,
    });
  }

  private async cuantos(ruta: string): Promise<number> {
    const respuesta = await this.api.get<Lista>(ruta);
    return respuesta.ok && Array.isArray(respuesta.valor) ? respuesta.valor.length : 0;
  }
}
