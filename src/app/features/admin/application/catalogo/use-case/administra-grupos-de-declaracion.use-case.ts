import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import {
  GrupoDeDeclaracion,
  puedeAprobarse,
} from '../../../domain/catalogo/model/grupo-de-declaracion';
import { GRUPOS_DE_DECLARACION_PORT } from '../../../domain/catalogo/port/grupos-de-declaracion.port';

/** Las ternas aduaneras con su descripción y su estado de firma. */
@Injectable()
export class ListaGruposDeDeclaracion {
  private readonly grupos = inject(GRUPOS_DE_DECLARACION_PORT);

  ejecuta(): Promise<Result<readonly GrupoDeDeclaracion[], AppError>> {
    return this.grupos.lista();
  }
}

/**
 * Guarda la descripción de un grupo.
 *
 * <p>El backend DESAPRUEBA al editar, y eso hay que decirlo: cambiar el texto es cambiar lo que se
 * declara ante veintisiete aduanas, así que hasta que alguien vuelva a firmarlo cada producto es otra
 * vez su propia línea y paga su propio derecho.
 */
@Injectable()
export class GuardaDescripcionDeGrupo {
  private readonly grupos = inject(GRUPOS_DE_DECLARACION_PORT);

  ejecuta(id: string, nombreEn: string, nombreZh: string): Promise<Result<void, AppError>> {
    return this.grupos.actualiza(id, nombreEn.trim(), nombreZh.trim());
  }
}

/**
 * Firma o retira la firma de un grupo.
 *
 * <p>APROBAR ES FIRMAR: mientras esté sin aprobar se cobra de más, nunca de menos. Sin descripción en
 * inglés no hay nada que firmar —el transportista rechazaría la guía—, y por eso se comprueba aquí.
 */
@Injectable()
export class CambiaAprobacionDeGrupo {
  private readonly grupos = inject(GRUPOS_DE_DECLARACION_PORT);

  ejecuta(grupo: GrupoDeDeclaracion, aprobar: boolean): Promise<Result<void, AppError>> {
    if (aprobar && !puedeAprobarse(grupo.nombreEn)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return aprobar ? this.grupos.aprueba(grupo.id) : this.grupos.retiraAprobacion(grupo.id);
  }
}

/** Siembra los grupos que falten a partir del catálogo. Se lanza tras cada carga masiva. */
@Injectable()
export class SiembraGruposDeDeclaracion {
  private readonly grupos = inject(GRUPOS_DE_DECLARACION_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.grupos.siembra();
  }
}
