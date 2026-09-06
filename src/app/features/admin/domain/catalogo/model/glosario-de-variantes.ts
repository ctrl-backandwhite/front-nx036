/**
 * Un glosario mínimo para que las etiquetas chinas de variante se lean en el idioma activo.
 *
 * <p>No sustituye a la traducción real —esa la hace la carga, valor a valor, en los ocho idiomas—: es
 * el respaldo para las fichas antiguas que todavía traen el nombre de la combinación en chino. Sin él,
 * la tabla de precios de la ficha enseña ideogramas a quien administra en español.
 *
 * <p>En chino no se traduce nada: es el idioma de origen.
 */
const NOMBRES_DE_EJE: Record<string, Record<string, string>> = {
  es: { 颜色: 'Color', 尺码: 'Talla', 尺寸: 'Tamaño', 规格: 'Especificación', 套餐: 'Pack' },
  en: { 颜色: 'Color', 尺码: 'Size', 尺寸: 'Size', 规格: 'Spec', 套餐: 'Pack' },
  pt: { 颜色: 'Cor', 尺码: 'Tam.', 尺寸: 'Tamanho', 规格: 'Especificação', 套餐: 'Pack' },
};

const VALORES_DE_EJE: Record<string, Record<string, string>> = {
  es: { 驼色: 'Camel', 墨绿: 'Verde musgo', 炭黑: 'Negro carbón', 白色: 'Blanco', 黑色: 'Negro', 红色: 'Rojo', 蓝色: 'Azul' },
  en: { 驼色: 'Camel', 墨绿: 'Moss green', 炭黑: 'Charcoal', 白色: 'White', 黑色: 'Black', 红色: 'Red', 蓝色: 'Blue' },
  pt: { 驼色: 'Camel', 墨绿: 'Verde-musgo', 炭黑: 'Carvão', 白色: 'Branco', 黑色: 'Preto', 红色: 'Vermelho', 蓝色: 'Azul' },
};

/** Traduce palabra a palabra el título de una combinación; lo que no esté en el glosario pasa igual. */
export function traduceOpciones(titulo: string, idioma: string): string {
  if (idioma === 'zh' || !titulo) {
    return titulo;
  }
  return titulo
    .split(/[\s,;]/)
    .map((trozo) => VALORES_DE_EJE[idioma]?.[trozo] ?? NOMBRES_DE_EJE[idioma]?.[trozo] ?? trozo)
    .join(' ');
}
