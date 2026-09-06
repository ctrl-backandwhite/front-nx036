import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CestaPort } from '../domain/port/cesta.port';
import { LineaDeCesta } from '../domain/model/linea-de-cesta';

interface LineaDto {
  productId: string;
  variantId?: string;
  quantity: number;
}

/**
 * Lo mínimo que el catálogo necesita de la cesta de la CUENTA.
 *
 * <p>La cesta completa —la de invitado en el almacenamiento del navegador, su fusión al iniciar sesión,
 * «guardar para más tarde»— es del contexto «cart» y se porta aparte. Aquí solo se añade una línea y se
 * pregunta qué lleva, que es lo que hacen falta para el botón de compra rápida y para el distintivo de
 * arancel.
 *
 * <p>Sin sesión el backend responde 401. No es un fallo que enseñar: quien no ha entrado sencillamente
 * no tiene cesta en el servidor, así que se devuelve la lista vacía y el distintivo no se pinta.
 */
@Injectable()
export class CestaHttpAdapter implements CestaPort {
  private readonly api = inject(ApiService);

  async productosQueLleva(): Promise<Result<readonly string[], AppError>> {
    const respuesta = await this.api.get<LineaDto[]>('/me/cart');
    if (!respuesta.ok) {
      return respuesta.error.tipo === 'no-autenticado' ? exito([]) : respuesta;
    }
    // Ordenados y sin repetir: la lista entra en la clave de la consulta del listado, y dos órdenes
    // distintos del mismo carrito tirarían la caché y devolverían al comprador al principio.
    return exito([...new Set(respuesta.valor.map((l) => l.productId).filter(Boolean))].sort());
  }

  /**
   * `PUT` FIJA la cantidad de la línea, no la suma: por eso hay que mandar el total resultante. Se
   * consulta antes lo que ya hay para no pisar unidades que el comprador ya había metido.
   */
  async anade(linea: LineaDeCesta): Promise<Result<void, AppError>> {
    const actual = await this.api.get<LineaDto[]>('/me/cart');
    const yaHabia = actual.ok
      ? (actual.valor.find(
          (l) => l.productId === linea.productId && (l.variantId ?? '') === (linea.variantId ?? ''),
        )?.quantity ?? 0)
      : 0;
    return mapea(
      await this.api.put<LineaDto[]>('/me/cart', {
        ...linea,
        // «Sin variante» viaja siempre como ausencia del campo: la cadena vacía que persistieron
        // carritos antiguos no parsea como UUID y el backend respondería 400.
        variantId: linea.variantId || undefined,
        quantity: yaHabia + linea.quantity,
      }),
      () => undefined,
    );
  }
}
