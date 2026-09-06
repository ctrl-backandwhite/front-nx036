import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResultadoMasivo } from '../model/pagina';
import { AjusteDeMoq, BorradorDeRegla, ReglaDePrecio } from '../model/precios';

/**
 * Las reglas de margen.
 *
 * <p>Nada de esto CALCULA un precio: solo mantiene las reglas con las que el backend los calcula. Si
 * algún día una pantalla quisiera «previsualizar» un precio, ese cálculo lo haría el servidor y entraría
 * por otro método, nunca replicando la fórmula aquí.
 */
export interface PreciosPort {
  reglas(): Promise<Result<readonly ReglaDePrecio[], AppError>>;
  crea(regla: BorradorDeRegla): Promise<Result<void, AppError>>;
  actualiza(id: string, regla: BorradorDeRegla): Promise<Result<void, AppError>>;
  alterna(id: string): Promise<Result<void, AppError>>;
  borra(id: string): Promise<Result<void, AppError>>;
  alternaEnLote(ids: readonly string[], activa: boolean): Promise<Result<ResultadoMasivo, AppError>>;
  borraEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
  ajusteDeMoq(): Promise<Result<AjusteDeMoq, AppError>>;
  guardaAjusteDeMoq(ajuste: AjusteDeMoq): Promise<Result<AjusteDeMoq, AppError>>;
}

export const PRECIOS_PORT = new InjectionToken<PreciosPort>('PreciosPort');

/**
 * Una opción para elegir el ámbito de una regla por su nombre, en vez de teclear un identificador.
 *
 * <p>El `nombre` viene YA compuesto para leerse tal cual: en los grupos de producto incluye cuántos
 * miembros tiene («Invierno (12)»), porque elegir un grupo vacío por error es el fallo típico de esta
 * pantalla y comprobarlo obligaría a abrir otra. Quien pinta el desplegable no tiene que juntar campos.
 */
export interface OpcionDeAmbito {
  readonly id: string;
  readonly nombre: string;
}

/**
 * Los nombres con los que se elige el ámbito de una regla.
 *
 * <p>Es un puerto propio y estrecho —cuatro listas de pares— en vez de importar el catálogo entero: lo
 * que necesita esta pantalla es un desplegable, no el modelo de producto. Así el contexto de catálogo
 * puede cambiar sin arrastrar al panel de precios.
 */
export interface AmbitosDeReglaPort {
  categorias(): Promise<Result<readonly OpcionDeAmbito[], AppError>>;
  proveedores(): Promise<Result<readonly OpcionDeAmbito[], AppError>>;
  productos(): Promise<Result<readonly OpcionDeAmbito[], AppError>>;
  grupos(): Promise<Result<readonly OpcionDeAmbito[], AppError>>;
}

export const AMBITOS_DE_REGLA_PORT = new InjectionToken<AmbitosDeReglaPort>('AmbitosDeReglaPort');
