import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CobroConTarjetaGuardada, CobroIniciado, MetodoGuardado } from '../model/pago';
import { MetodoDePago } from '../model/pedido';

/**
 * Cobrar un pedido ya creado.
 *
 * <p>Son tres momentos distintos y por eso son tres métodos: iniciar el cobro, confirmarlo cuando vuelve
 * de la pasarela, y confirmarlo en el modo simulado que usan los entornos sin proveedor real. En el front
 * anterior los tres se escribían a mano en la pantalla, con la dirección del backend interpolada dentro
 * de un componente; aquí la pantalla no conoce ninguna dirección.
 */
export interface PagoPort {
  /** Arranca el cobro del pedido por el método elegido. */
  inicia(idDePedido: string, metodo: MetodoDePago): Promise<Result<CobroIniciado, AppError>>;

  /** Confirma contra el proveedor un cobro ya aprobado. Es lo que hace la pantalla de retorno. */
  confirma(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>>;

  /**
   * Confirma un cobro en cripto sin esperar a la cadena. Solo existe en los entornos donde el proveedor
   * está simulado; en producción lo marca su aviso automático.
   */
  confirmaSimulado(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>>;
}

export const PAGO_PORT = new InjectionToken<PagoPort>('PagoPort');

/**
 * Cobrar con una tarjeta que ya está guardada, sin salir del sitio.
 *
 * <p>Capacidad aparte de la anterior: quien solo confirma un retorno de pasarela no tiene por qué poder
 * cobrar una tarjeta guardada, y un doble de prueba de la primera no debería tener que fingir la segunda.
 */
export interface PagoConTarjetaGuardadaPort {
  cobra(idDePedido: string, idDeMetodo: string): Promise<Result<CobroConTarjetaGuardada, AppError>>;
  /** Cierra el cobro después de que el navegador haya resuelto la autenticación reforzada. */
  confirma(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>>;
}

export const PAGO_CON_TARJETA_GUARDADA_PORT = new InjectionToken<PagoConTarjetaGuardadaPort>(
  'PagoConTarjetaGuardadaPort',
);

/** Cómo está configurada la pasarela en este entorno. */
export interface ConfiguracionDePasarela {
  readonly clavePublica?: string;
  readonly habilitada: boolean;
}

/**
 * Los métodos de pago que ya tiene guardados quien compra, y la configuración de la pasarela.
 *
 * <p>Puerto propio de «checkout»: la pantalla de la cuenta administra los métodos —añadir, borrar, marcar
 * por defecto— y aquí solo se LISTAN para elegir uno.
 */
export interface MetodosDePagoPort {
  guardados(): Promise<Result<readonly MetodoGuardado[], AppError>>;
  configuracion(): Promise<Result<ConfiguracionDePasarela, AppError>>;
}

export const METODOS_DE_PAGO_PORT = new InjectionToken<MetodosDePagoPort>('MetodosDePagoPort');
