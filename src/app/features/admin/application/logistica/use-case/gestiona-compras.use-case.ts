import { Injectable, inject } from '@angular/core';
import { Result, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AvanceDeHoja, CompraAProveedor, nombreDeHoja } from '../../../domain/logistica/model/compra';
import {
  AVANCE_DE_COMPRA_PORT,
  COMPRAS_PORT,
  DatosDeCompraHecha,
  DatosDeEnvioDelProveedor,
  DatosDeReempaquetado,
  HOJA_DE_EMPAQUETADO_PORT,
} from '../../../domain/logistica/port/compras.port';
import {
  DESCARGA_DE_FICHEROS_PORT,
  PORTAPAPELES_PORT,
} from '../../../domain/logistica/port/navegador.port';

/** La cola de compras al proveedor y cuántas se pueden exportar ya. */
@Injectable()
export class ConsultaCompras {
  private readonly compras = inject(COMPRAS_PORT);
  private readonly hoja = inject(HOJA_DE_EMPAQUETADO_PORT);

  cola(): Promise<Result<readonly CompraAProveedor[], AppError>> {
    return this.compras.cola();
  }

  avanceDeLaHoja(): Promise<Result<AvanceDeHoja, AppError>> {
    return this.hoja.avance();
  }
}

/**
 * Marca que la compra ya se hizo en el proveedor.
 *
 * <p>Los importes son opcionales: a veces se registran después, y bloquear el paso por no tener la
 * factura del proveedor delante dejaba la cola atascada.
 */
@Injectable()
export class MarcaCompraHecha {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string, datos: DatosDeCompraHecha): Promise<Result<void, AppError>> {
    return this.avance.marcaComprada(id, datos);
  }
}

/** Registra el envío del proveedor al almacén chino. Sin seguimiento no hay guía internacional. */
@Injectable()
export class MarcaEnvioDelProveedor {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string, datos: DatosDeEnvioDelProveedor): Promise<Result<void, AppError>> {
    return this.avance.marcaEnviada(id, datos);
  }
}

/** El almacén confirma que el bulto llegó. Es lo que arranca la cuenta de días hasta la destrucción. */
@Injectable()
export class MarcaRecepcionEnAlmacen {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.avance.marcaRecibida(id);
  }
}

/** Registra el re-empaquetado. A partir de aquí la compra ya no corre peligro de destrucción. */
@Injectable()
export class MarcaReempaquetado {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string, datos: DatosDeReempaquetado): Promise<Result<void, AppError>> {
    return this.avance.marcaReempaquetada(id, datos);
  }
}

/** Anula una compra con su motivo. El motivo va junto a la confirmación: es una sola decisión. */
@Injectable()
export class AnulaCompra {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string, motivo?: string): Promise<Result<void, AppError>> {
    return this.avance.anula(id, motivo);
  }
}

/**
 * Devuelve una compra a la cola de exportación.
 *
 * <p>Se usa cuando la descarga anterior no llegó a subirse. Sin esto, el operador no sabía cuáles ya
 * había subido y volver a exportarlas provocaba el rechazo por guía duplicada que tumba el fichero.
 */
@Injectable()
export class ReexportaCompra {
  private readonly avance = inject(AVANCE_DE_COMPRA_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.avance.reexporta(id);
  }
}

/**
 * Descarga la hoja que se sube al sistema del almacén.
 *
 * <p>Descargarla es una ESCRITURA: marca las compras como exportadas, así que quien la llama tiene que
 * recargar la cola después. La marca de tiempo del nombre es la del operador y sirve para saber cuál es
 * la última que subió.
 */
@Injectable()
export class DescargaHojaDeEmpaquetado {
  private readonly hoja = inject(HOJA_DE_EMPAQUETADO_PORT);
  private readonly ficheros = inject(DESCARGA_DE_FICHEROS_PORT);

  async ejecuta(momento: Date = new Date()): Promise<Result<void, AppError>> {
    const respuesta = await this.hoja.descarga();
    if (!respuesta.ok) {
      return fallo(respuesta.error);
    }
    return mapea(respuesta, (blob) => {
      this.ficheros.guarda(nombreDeHoja(momento), blob);
    });
  }
}

/** Copia la dirección china del almacén, que es lo que se pega en el pedido al proveedor. */
@Injectable()
export class CopiaDireccionDeAlmacen {
  private readonly portapapeles = inject(PORTAPAPELES_PORT);

  async ejecuta(direccion: string | undefined): Promise<boolean> {
    return direccion ? this.portapapeles.copia(direccion) : false;
  }
}
