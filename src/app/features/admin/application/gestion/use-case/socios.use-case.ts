import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AltaDeClienteOauth, AplicacionDeSocio, ClienteOauth, EntregaDeWebhook, SecretoEmitido,
} from '../../../domain/gestion/model/socios';
import { SOCIOS_PORT } from '../../../domain/gestion/port/socios.port';

/** Las tres tablas de la pantalla, cargadas de una vez y sin que una tumbe a las otras. */
export interface PanoramaDeSocios {
  readonly clientes: readonly ClienteOauth[];
  readonly aplicaciones: readonly AplicacionDeSocio[];
  readonly entregas: readonly EntregaDeWebhook[];
}

@Injectable()
export class ConsultaSocios {
  private readonly socios = inject(SOCIOS_PORT);

  async ejecuta(): Promise<PanoramaDeSocios> {
    const [clientes, aplicaciones, entregas] = await Promise.all([
      this.socios.clientes(),
      this.socios.aplicaciones(),
      this.socios.entregas(),
    ]);
    return {
      clientes: clientes.ok ? clientes.valor : [],
      aplicaciones: aplicaciones.ok ? aplicaciones.valor : [],
      entregas: entregas.ok ? entregas.valor : [],
    };
  }
}

/**
 * Da de alta un cliente de integración.
 *
 * <p>Devuelve el SECRETO, y es la única vez que existe fuera del backend: quien llame tiene que
 * enseñarlo en ese mismo instante. No se guarda en ningún sitio a propósito.
 */
@Injectable()
export class CreaElCliente {
  private readonly socios = inject(SOCIOS_PORT);

  ejecuta(alta: AltaDeClienteOauth): Promise<Result<SecretoEmitido, AppError>> {
    return this.socios.crea(alta);
  }
}

/** Rotar INVALIDA el secreto anterior: la integración que lo use dejará de entrar hasta actualizarlo. */
@Injectable()
export class RotaElSecreto {
  private readonly socios = inject(SOCIOS_PORT);

  ejecuta(identificador: string): Promise<Result<SecretoEmitido, AppError>> {
    return this.socios.rotaSecreto(identificador);
  }
}

@Injectable()
export class BorraElCliente {
  private readonly socios = inject(SOCIOS_PORT);

  ejecuta(identificador: string): Promise<Result<void, AppError>> {
    return this.socios.borra(identificador);
  }
}

@Injectable()
export class PruebaLosWebhooks {
  private readonly socios = inject(SOCIOS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.socios.pruebaWebhooks();
  }
}
