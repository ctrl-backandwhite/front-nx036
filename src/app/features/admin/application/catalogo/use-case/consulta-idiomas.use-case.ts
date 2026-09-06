import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import {
  IDIOMAS_DE_TIENDA_PORT,
  IdiomaDeTienda,
} from '../../../domain/catalogo/port/catalogo-comun.port';

/**
 * Los idiomas de respaldo cuando el registro todavía no ha contestado.
 *
 * <p>Sin ellos, el selector de idioma de la ficha nace vacío y no se puede ni empezar a revisar. Son
 * los cuatro con los que se opera; los demás llegan del registro, que es ilimitado.
 */
const IDIOMAS_DE_RESPALDO: readonly IdiomaDeTienda[] = [
  { codigo: 'es', etiqueta: 'Español', activo: true, porDefecto: true },
  { codigo: 'en', etiqueta: 'English', activo: true, porDefecto: false },
  { codigo: 'pt', etiqueta: 'Português', activo: true, porDefecto: false },
  { codigo: 'zh', etiqueta: '中文', activo: true, porDefecto: false },
];

/**
 * Los idiomas ACTIVOS de la tienda.
 *
 * <p>Devuelve el respaldo si la lectura falla o vuelve vacía: quedarse sin selector de idioma impide
 * revisar la ficha entera, y eso es peor que trabajar con cuatro idiomas durante un rato.
 */
@Injectable()
export class ConsultaIdiomas {
  private readonly idiomas = inject(IDIOMAS_DE_TIENDA_PORT);

  async ejecuta(): Promise<Result<readonly IdiomaDeTienda[], AppError>> {
    const resultado = await this.idiomas.lista();
    if (!resultado.ok) {
      return exito(IDIOMAS_DE_RESPALDO);
    }
    const activos = resultado.valor.filter((idioma) => idioma.activo);
    return exito(activos.length ? activos : IDIOMAS_DE_RESPALDO);
  }
}
