/**
 * Lo que el catálogo mete en la cesta.
 *
 * <p>Es el contrato MÍNIMO que necesita este contexto: identificar el producto y la variante, y
 * congelar el precio con su divisa. La cesta de verdad —fusión con la de la cuenta, «guardar para más
 * tarde», recotización— es de otro contexto y no se toca desde aquí.
 *
 * <p>El importe y la DIVISA van siempre emparejados. Etiquetar el importe con la divisa equivocada es
 * lo que una vez enseñó «117,26 €» por algo que valía 14,90 €.
 */
export interface LineaDeCesta {
  readonly productId: string;
  readonly variantId?: string;
  readonly sku?: string;
  readonly variantLabel?: string;
  readonly slug: string;
  readonly title: string;
  readonly image?: string;
  readonly unitPriceSource: number;
  readonly sourceCurrency: string;
  readonly quantity: number;
  readonly moq?: number;
}
