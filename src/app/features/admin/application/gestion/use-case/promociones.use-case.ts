import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  BorradorDePromocion, Promocion, paraElBackend,
} from '../../../domain/gestion/model/promociones';
import { PROMOCIONES_PORT } from '../../../domain/gestion/port/promociones.port';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';

@Injectable()
export class ConsultaPromociones {
  private readonly promociones = inject(PROMOCIONES_PORT);

  ejecuta(): Promise<Result<readonly Promocion[], AppError>> {
    return this.promociones.lista();
  }
}

/**
 * Guarda una promoción, nueva o existente.
 *
 * <p>Las fechas se convierten AQUÍ de lo que teclea el navegador (hora local, sin zona) al instante con
 * zona que espera el backend. Hacerlo en la pantalla dejaría la conversión repetida en el alta y en la
 * edición, y basta con que una de las dos se olvide para que una rebaja empiece a otra hora.
 */
@Injectable()
export class GuardaLaPromocion {
  private readonly promociones = inject(PROMOCIONES_PORT);

  ejecuta(borrador: BorradorDePromocion, id?: string): Promise<Result<void, AppError>> {
    const cuerpo: BorradorDePromocion = {
      ...borrador,
      empiezaEl: paraElBackend(borrador.empiezaEl),
      terminaEl: paraElBackend(borrador.terminaEl),
    };
    return id ? this.promociones.actualiza(id, cuerpo) : this.promociones.crea(cuerpo);
  }
}

@Injectable()
export class AlternaLaPromocion {
  private readonly promociones = inject(PROMOCIONES_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.promociones.alterna(id);
  }
}

/**
 * Avisa a los usuarios de una promoción.
 *
 * <p>Manda una notificación a TODA la base de usuarios y no se puede retirar. Es una acción aparte de
 * guardar a propósito: si fuera una casilla del formulario, cada corrección de una errata volvería a
 * avisar a todo el mundo.
 */
@Injectable()
export class AnunciaLaPromocion {
  private readonly promociones = inject(PROMOCIONES_PORT);

  ejecuta(id: string): Promise<Result<number, AppError>> {
    return this.promociones.anuncia(id);
  }
}

@Injectable()
export class BorraLaPromocion {
  private readonly promociones = inject(PROMOCIONES_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.promociones.borra(id);
  }
}

@Injectable()
export class ConsultaCategoriasDePromocion {
  private readonly promociones = inject(PROMOCIONES_PORT);

  async ejecuta(): Promise<readonly OpcionDeAmbito[]> {
    // Sin categorías el formulario sigue sirviendo para una promoción de todo el catálogo, así que un
    // fallo aquí no puede impedir abrirlo.
    const resultado = await this.promociones.categorias();
    return resultado.ok ? resultado.valor : [];
  }
}
