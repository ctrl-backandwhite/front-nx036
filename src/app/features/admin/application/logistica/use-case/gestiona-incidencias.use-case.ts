import { Injectable, inject } from '@angular/core';
import { Result, fallo, mapea } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  CriterioDeIncidencias,
  PaginaDeIncidencias,
} from '../../../domain/logistica/model/incidencia-de-envio';
import {
  GUIAS_DE_ENVIO_PORT,
  INCIDENCIAS_DE_ENVIO_PORT,
} from '../../../domain/logistica/port/incidencias-de-envio.port';
import { DESCARGA_DE_FICHEROS_PORT } from '../../../domain/logistica/port/navegador.port';
import { enlaceSeguro } from '../../../domain/logistica/model/seguimiento';

/** Pide una página de incidencias. El filtro viaja al servidor. */
@Injectable()
export class BuscaIncidencias {
  private readonly incidencias = inject(INCIDENCIAS_DE_ENVIO_PORT);

  ejecuta(criterio: CriterioDeIncidencias): Promise<Result<PaginaDeIncidencias, AppError>> {
    return this.incidencias.busca(criterio);
  }
}

/**
 * Cierra una incidencia. La nota es obligatoria: una incidencia cerrada sin decir qué se hizo es
 * exactamente lo que esta bandeja existe para evitar.
 */
@Injectable()
export class ResuelveIncidencia {
  private readonly incidencias = inject(INCIDENCIAS_DE_ENVIO_PORT);

  ejecuta(id: string, nota: string): Promise<Result<void, AppError>> {
    const limpia = nota.trim();
    if (!limpia) {
      return Promise.resolve(fallo(creaError('peticion-invalida', '')));
    }
    return this.incidencias.resuelve(id, limpia);
  }
}

/** Abre la etiqueta de un bulto en una pestaña nueva. Solo direcciones web normales. */
@Injectable()
export class DescargaEtiqueta {
  private readonly guias = inject(GUIAS_DE_ENVIO_PORT);
  private readonly navegador = inject(DESCARGA_DE_FICHEROS_PORT);

  async ejecuta(pedidoId: string, secuencia: number): Promise<Result<void, AppError>> {
    const respuesta = await this.guias.etiqueta(pedidoId, secuencia);
    if (!respuesta.ok) {
      return fallo(respuesta.error);
    }
    const url = enlaceSeguro(respuesta.valor);
    if (!url) {
      return fallo(creaError('no-encontrado', ''));
    }
    return mapea(respuesta, () => this.navegador.abre(url));
  }
}

/** Anula la guía de un bulto en el transportista. No tiene vuelta atrás: la pantalla lo confirma antes. */
@Injectable()
export class AnulaGuia {
  private readonly guias = inject(GUIAS_DE_ENVIO_PORT);

  ejecuta(pedidoId: string, secuencia: number): Promise<Result<void, AppError>> {
    return this.guias.anula(pedidoId, secuencia);
  }
}
