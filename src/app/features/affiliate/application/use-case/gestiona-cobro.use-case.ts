import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DatosDeCobro,
  MetodoDeCobro,
  PerfilDeCobro,
  datosDeCobroParaGuardar,
} from '../../domain/model/afiliado';
import { COBRO_DE_AFILIADO_PORT } from '../../domain/port/afiliado.port';

/**
 * Los datos de cobro y la solicitud de pago.
 *
 * <p>Solicitar NO paga: deja constancia. El pago lo aprueba un administrador y lo transfiere fuera de la
 * aplicación —transferencia, PayPal o abono en la cartera—, así que aquí no hay ningún camino que mueva
 * dinero. Esto es a propósito y no una carencia: el cobro de afiliados se ejecuta a mano.
 */
@Injectable({ providedIn: 'root' })
export class GestionaCobro {
  private readonly cobro = inject(COBRO_DE_AFILIADO_PORT);

  consultaPerfil(): Promise<Result<PerfilDeCobro, AppError>> {
    return this.cobro.consultaPerfil();
  }

  /** Guarda el perfil ENTERO; el IBAN vacío se omite para no borrar el que ya estaba. */
  guardaPerfil(
    formulario: Omit<DatosDeCobro, 'iban'> & { readonly iban: string },
  ): Promise<Result<PerfilDeCobro, AppError>> {
    return this.cobro.guardaPerfil(datosDeCobroParaGuardar(formulario));
  }

  solicita(metodo: MetodoDeCobro): Promise<Result<void, AppError>> {
    return this.cobro.solicita(metodo);
  }
}
