import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/** Un producto real con el que la guía enseña a comprar. */
export interface EjemploDeGuia {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagen: string | null;
  readonly precioFormateado: string;
  readonly pesoGramos: number;
}

export interface EjemplosDeGuia {
  readonly ejemplos: readonly EjemploDeGuia[];
  /** Derecho por partida del país que mira; vacío donde no exista, y entonces ese paso no se enseña. */
  readonly derechoPorPartidaFormateado: string;
  readonly topeDePedidoFormateado: string;
}

/** El desglose de la cesta de ejemplo, calculado por el MISMO servicio que la vista previa del pago. */
export interface SimulacionDeGuia {
  readonly subtotalFormateado: string;
  readonly arancelFormateado: string;
  readonly partidas: number;
  readonly envioFormateado: string;
  readonly subsidioDeEnvioFormateado: string;
  readonly envioNetoFormateado: string;
  readonly subsidioDeArancelFormateado: string;
  readonly arancelNetoFormateado: string;
  readonly impuestoFormateado: string;
  readonly totalFormateado: string;
  readonly pesoGramos: number;
  readonly superaElTope: boolean;
  readonly topeFormateado: string;
}

/**
 * La guía de bienvenida: qué se paga al comprar fuera de la Unión, con números que se tocan.
 *
 * <p>El desglose lo calcula el SERVIDOR con el mismo servicio que el pago, así que la guía no puede
 * prometer una cifra y el pago cobrar otra. Además, la parte de la subvención que depende de la
 * ganancia del pedido no sale del servidor y el navegador no podría calcularla.
 *
 * <p>REGLA QUE NO SE CRUZA: aquí no se sugiere jamás repartir un pedido en varios. Además de no
 * ahorrar arancel —son las mismas líneas declaradas—, la Unión agrega los envíos de un mismo remitente
 * a un mismo destinatario, así que proponerlo sería dejar por escrito la intención de fraccionar. El
 * consejo de la guía es el contrario: agrupar.
 */
export interface GuiaDeBienvenidaPort {
  ejemplos(): Promise<Result<EjemplosDeGuia, AppError>>;
  simula(
    lineas: readonly { readonly productId: string; readonly quantity: number }[],
  ): Promise<Result<SimulacionDeGuia, AppError>>;
}

export const GUIA_DE_BIENVENIDA_PORT = new InjectionToken<GuiaDeBienvenidaPort>(
  'GuiaDeBienvenidaPort',
);
