import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  ClaseDeDocumento, CuerpoLegal, DocumentoLegal, serializaCuerpo,
} from '../../../domain/gestion/model/legal';
import { LEGAL_PORT } from '../../../domain/gestion/port/legal.port';

@Injectable()
export class ConsultaDocumentosLegales {
  private readonly legal = inject(LEGAL_PORT);

  ejecuta(): Promise<Result<readonly DocumentoLegal[], AppError>> {
    return this.legal.lista();
  }
}

@Injectable()
export class ConsultaElDocumento {
  private readonly legal = inject(LEGAL_PORT);

  ejecuta(clase: ClaseDeDocumento, idioma: string): Promise<Result<DocumentoLegal, AppError>> {
    return this.legal.documento(clase, idioma);
  }
}

/**
 * Guarda el BORRADOR.
 *
 * <p>No publica nada y no avisa a nadie: el texto queda escrito para seguir trabajando en él. Es la
 * mitad segura de esta pantalla, y por eso está separada de publicar.
 */
@Injectable()
export class GuardaElBorradorLegal {
  private readonly legal = inject(LEGAL_PORT);

  ejecuta(
    clase: ClaseDeDocumento,
    idioma: string,
    titulo: string,
    cuerpo: CuerpoLegal,
  ): Promise<Result<void, AppError>> {
    return this.legal.guarda(clase, idioma, titulo, serializaCuerpo(cuerpo));
  }
}

/**
 * PUBLICA los textos legales.
 *
 * <p>Hace visible el documento Y manda un correo a todas las cuentas activas, y eso no se puede
 * retirar. Publica lo último GUARDADO: lo que esté a medio escribir en pantalla no viaja, así que la
 * pantalla avisa antes si quedan cambios sin guardar.
 */
@Injectable()
export class PublicaLosTextosLegales {
  private readonly legal = inject(LEGAL_PORT);

  ejecuta(version: string): Promise<Result<{ version: string; avisados: number }, AppError>> {
    return this.legal.publica(version);
  }
}
