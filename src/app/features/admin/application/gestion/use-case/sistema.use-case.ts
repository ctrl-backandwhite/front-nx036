import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { Divisa } from '../../../domain/gestion/model/dinero';
import {
  BorradorDeIdioma, IdiomaDeTienda, bloqueanLaActivacion,
} from '../../../domain/gestion/model/sistema';
import { ResultadoMasivo } from '../../../domain/gestion/model/pagina';
import { IDIOMAS_PORT, MONEDAS_PORT } from '../../../domain/gestion/port/sistema.port';

@Injectable()
export class ConsultaIdiomas {
  private readonly idiomas = inject(IDIOMAS_PORT);

  ejecuta(): Promise<Result<readonly IdiomaDeTienda[], AppError>> {
    return this.idiomas.lista();
  }
}

@Injectable()
export class GuardaElIdioma {
  private readonly idiomas = inject(IDIOMAS_PORT);

  ejecuta(idioma: BorradorDeIdioma): Promise<Result<void, AppError>> {
    const codigo = idioma.codigo.trim().toLowerCase();
    if (!codigo) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.idiomas.guarda({
      ...idioma,
      codigo,
      // Sin nombre se usa el código en mayúsculas: un idioma sin rótulo aparecería en blanco en el
      // selector de la tienda y nadie sabría qué está eligiendo.
      etiqueta: idioma.etiqueta?.trim() || codigo.toUpperCase(),
    });
  }
}

@Injectable()
export class BorraElIdioma {
  private readonly idiomas = inject(IDIOMAS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.idiomas.borra(id);
  }
}

/**
 * Activa o desactiva varios idiomas a la vez.
 *
 * <p>NO hay endpoint masivo: se repite el guardado por idioma y se cuentan aciertos y fallos, igual que
 * haría el backend. Un fallo suelto no aborta el resto — el resumen dice cuántos quedaron sin cambiar
 * y con qué motivo.
 */
@Injectable()
export class ActivaIdiomasEnLote {
  private readonly idiomas = inject(IDIOMAS_PORT);

  async ejecuta(
    seleccionados: readonly IdiomaDeTienda[],
    activo: boolean,
  ): Promise<ResultadoMasivo> {
    let correctos = 0;
    const errores: string[] = [];
    for (const idioma of seleccionados) {
      const resultado = await this.idiomas.guarda({ ...idioma, activo });
      if (resultado.ok) {
        correctos++;
      } else {
        errores.push(`${idioma.codigo}: ${resultado.error.mensaje}`);
      }
    }
    return { correctos, fallidos: errores.length, errores };
  }
}

@Injectable()
export class ConsultaDivisas {
  private readonly monedas = inject(MONEDAS_PORT);

  ejecuta(): Promise<Result<readonly Divisa[], AppError>> {
    return this.monedas.lista();
  }
}

@Injectable()
export class SincronizaLasTasas {
  private readonly monedas = inject(MONEDAS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.monedas.sincroniza();
  }
}

/**
 * Publica o retira divisas de la tienda.
 *
 * <p>ACTIVAR está bloqueado si alguna no tiene tipo de cambio: sin tasa, el escaparate enseñaría el
 * precio en dólares con el símbolo de otra moneda y estaría anunciando un importe que no es el que se
 * cobra. DESACTIVAR nunca se bloquea: es la salida de emergencia si alguna llegó a publicarse.
 */
@Injectable()
export class PublicaDivisas {
  private readonly monedas = inject(MONEDAS_PORT);

  ejecuta(
    codigos: readonly string[],
    activa: boolean,
    registro: readonly Divisa[],
  ): Promise<Result<void, AppError>> {
    if (activa) {
      const rotas = bloqueanLaActivacion(codigos, registro);
      if (rotas.length) {
        return Promise.resolve(
          fallo(creaError('peticion-invalida', '', { porCampo: { divisas: rotas.join(', ') } })),
        );
      }
    }
    return codigos.length === 1
      ? this.monedas.activa(codigos[0], activa)
      : this.monedas.activaEnLote(codigos, activa);
  }
}
