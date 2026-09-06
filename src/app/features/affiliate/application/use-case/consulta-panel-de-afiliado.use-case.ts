import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CodigoDeReferido, PanelDeAfiliado } from '../../domain/model/afiliado';
import { PANEL_DE_AFILIADO_PORT } from '../../domain/port/afiliado.port';

/** El panel del afiliado: darse de alta, mirar cómo va y crear enlaces nuevos. */
@Injectable({ providedIn: 'root' })
export class ConsultaPanelDeAfiliado {
  private readonly panel = inject(PANEL_DE_AFILIADO_PORT);

  ejecuta(): Promise<Result<PanelDeAfiliado, AppError>> {
    return this.panel.consulta();
  }

  /**
   * Aceptar el programa. Es un acto explícito y con condiciones: hasta que ocurre no hay panel, hay una
   * invitación con lo que se gana y lo que se acepta.
   */
  inscribe(): Promise<Result<PanelDeAfiliado, AppError>> {
    return this.panel.inscribe();
  }

  /** Un enlace más. La etiqueta la pone quien lo crea; hoy todos nacen con el mismo nombre. */
  creaCodigo(etiqueta = 'Link'): Promise<Result<CodigoDeReferido, AppError>> {
    return this.panel.creaCodigo(etiqueta);
  }
}
