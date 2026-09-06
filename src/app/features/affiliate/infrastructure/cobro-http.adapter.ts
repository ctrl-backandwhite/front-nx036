import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DatosDeCobro, MetodoDeCobro, PerfilDeCobro } from '../domain/model/afiliado';
import { CobroDeAfiliadoPort } from '../domain/port/afiliado.port';

interface PerfilDto {
  payoutMethod: string;
  bankHolder?: string;
  bankIbanMasked?: string;
  bankBic?: string;
  paypalEmail?: string;
  hasBank: boolean;
  hasPaypal: boolean;
}

function aPerfil(dto: PerfilDto): PerfilDeCobro {
  return {
    metodoPreferido: ((dto.payoutMethod || 'WALLET').toUpperCase() as MetodoDeCobro) ?? 'WALLET',
    titular: dto.bankHolder,
    ibanEnmascarado: dto.bankIbanMasked,
    bic: dto.bankBic,
    correoPaypal: dto.paypalEmail,
    tieneBanco: !!dto.hasBank,
    tienePaypal: !!dto.hasPaypal,
  };
}

/**
 * Los datos de cobro del afiliado.
 *
 * <p>El guardado es un REEMPLAZO completo: se manda el perfil entero. El IBAN se omite si no se ha
 * tecleado uno nuevo, porque enviarlo vacío borraría el que hay guardado —el servidor solo lo devuelve
 * enmascarado, así que el navegador nunca puede reenviar el real.
 */
@Injectable()
export class CobroHttpAdapter implements CobroDeAfiliadoPort {
  private readonly api = inject(ApiService);

  async consultaPerfil(): Promise<Result<PerfilDeCobro, AppError>> {
    return mapea(await this.api.get<PerfilDto>('/me/affiliate/payout-profile'), aPerfil);
  }

  async guardaPerfil(datos: DatosDeCobro): Promise<Result<PerfilDeCobro, AppError>> {
    const cuerpo: Record<string, unknown> = {
      bankHolder: datos.titular,
      bic: datos.bic,
      paypalEmail: datos.correoPaypal,
      preferredMethod: datos.metodoPreferido,
      password: datos.contrasena,
    };
    if (datos.iban) {
      cuerpo['iban'] = datos.iban;
    }
    return mapea(await this.api.put<PerfilDto>('/me/affiliate/payout-profile', cuerpo), aPerfil);
  }

  async solicita(metodo: MetodoDeCobro): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<unknown>('/me/affiliate/payout-request', { method: metodo }),
      () => undefined,
    );
  }
}
