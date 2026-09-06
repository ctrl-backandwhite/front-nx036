import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { PaginaDeProductos } from '../../domain/model/producto';

/** Cuántos productos por página en las dos listas cortas de la cuenta. */
export const TAMANO_DE_LISTA_GUARDADA = 24;

/**
 * Los productos marcados con el corazón.
 *
 * <p>Aunque solo reenvíe al puerto, la pantalla habla con un caso de uso y no con la infraestructura:
 * el día que haya que mezclar la lista con algo más —una promoción, un aviso de bajada de precio— se
 * añade aquí y ninguna plantilla cambia.
 */
@Injectable()
export class ListaFavoritos {
  private readonly puerto = inject(FAVORITOS_PORT);

  ejecuta(pagina: number): Promise<Result<PaginaDeProductos, AppError>> {
    return this.puerto.lista(pagina, TAMANO_DE_LISTA_GUARDADA);
  }
}

/** Las fichas por las que se ha pasado, de la visita más reciente a la más antigua. */
@Injectable()
export class ListaHistorial {
  private readonly puerto = inject(HISTORIAL_PORT);

  ejecuta(pagina: number): Promise<Result<PaginaDeProductos, AppError>> {
    return this.puerto.lista(pagina, TAMANO_DE_LISTA_GUARDADA);
  }
}
