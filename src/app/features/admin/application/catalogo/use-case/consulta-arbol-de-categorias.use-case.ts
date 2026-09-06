import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  ARBOL_DE_CATEGORIAS_PORT,
  CategoriaParaElegir,
} from '../../../domain/catalogo/port/categorias-admin.port';

/** El árbol de categorías aplanado a «Padre › Hijo», para el selector de la ficha. */
@Injectable()
export class ConsultaArbolDeCategorias {
  private readonly arbol = inject(ARBOL_DE_CATEGORIAS_PORT);

  ejecuta(idioma: string): Promise<Result<readonly CategoriaParaElegir[], AppError>> {
    return this.arbol.consulta(idioma);
  }
}
