/**
 * Formateo de importes CRUDOS.
 *
 * <p>PIEZA PROVISIONAL. Su sitio definitivo es el selector de divisa transversal (`core/`), que otro
 * equipo está portando ahora mismo: es quien conoce la divisa activa, el cambio del día y el símbolo.
 * Aquí solo hay lo mínimo para las dos pantallas que reciben NÚMEROS y no cadenas —el histórico de
 * precios y el estimado de margen—, y se anota para unificarlo después.
 *
 * <p>Todo lo demás del catálogo pinta `formateado` tal y como llega del backend, que es la norma del
 * proyecto: el front no calcula precios.
 */
export function formateaImporte(valor: number, divisa: string, idioma = 'es'): string {
  if (!Number.isFinite(valor)) {
    return '—';
  }
  try {
    return new Intl.NumberFormat(idioma, { style: 'currency', currency: divisa }).format(valor);
  } catch {
    // Una divisa que no existe hace que `Intl` lance. Se cae a algo legible: quedarse sin pantalla por
    // un código de tres letras mal escrito sería mucho peor que enseñar el número pelado.
    return `${valor.toFixed(2)} ${divisa}`;
  }
}
