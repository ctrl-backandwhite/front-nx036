import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BAJA_DE_CUENTA_PORT, FIN_DE_SESION_PORT } from '../../domain/port/perfil.port';
import { CuentaStore } from '../state/cuenta.store';

/**
 * Paso 1 de la baja: pedir el código.
 *
 * <p>«Baja» y no «borrado». El backend ANONIMIZA los datos y apunta la fecha; los pedidos, las facturas
 * y los apuntes contables siguen ahí porque hay que conservarlos por ley. Lo que desaparece es la
 * persona, no el rastro — y quien pregunte por el catálogo de datos borrados se llevará una sorpresa si
 * esto se cuenta de otra manera.
 */
@Injectable({ providedIn: 'root' })
export class SolicitaBajaDeCuenta {
  private readonly baja = inject(BAJA_DE_CUENTA_PORT);

  async ejecuta(): Promise<Result<void, AppError>> {
    return this.baja.solicita();
  }
}

/**
 * Paso 2: confirmar con el código recibido y salir.
 *
 * <p>Salir es parte de la operación, no una consecuencia que la pantalla deba recordar: la cuenta que
 * acaba de desactivarse no puede quedarse con la sesión abierta. El cierre va por un puerto propio de
 * este contexto porque la maquinaria de sesión pertenece a «auth» y de otro contexto solo se ve su
 * contrato público.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmaBajaDeCuenta {
  private readonly baja = inject(BAJA_DE_CUENTA_PORT);
  private readonly finDeSesion = inject(FIN_DE_SESION_PORT);
  private readonly cuenta = inject(CuentaStore);

  async ejecuta(codigo: string): Promise<Result<void, AppError>> {
    const resultado = await this.baja.confirma(codigo.trim());
    if (!resultado.ok) {
      return resultado;
    }
    await this.finDeSesion.termina();
    this.cuenta.fija(null);
    return exito(undefined);
  }
}
