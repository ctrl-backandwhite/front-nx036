import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CestaPort } from '../domain/port/cesta.port';

interface LineaDto {
  productId: string;
}

/**
 * Lo mínimo que el catálogo necesita de la cesta de la CUENTA: qué productos lleva.
 *
 * <p>La cesta completa —la de invitado en el almacenamiento del navegador, su fusión al iniciar sesión,
 * «guardar para más tarde», añadir— es del contexto «cart». Aquí solo se pregunta qué lleva, que es la
 * referencia del distintivo de arancel.
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
}
