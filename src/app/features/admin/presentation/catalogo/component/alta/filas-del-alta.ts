import { CampoDelAlta } from './campos-del-alta';
import {
  AtributoTecleado,
  EJE_TECLEADO_VACIO,
  EspecificacionTecleada,
  RESENA_TECLEADA_VACIA,
  TRAMO_TECLEADO_VACIO,
  VARIANTE_TECLEADA_VACIA,
} from '../../../../domain/catalogo/model/alta-de-producto';

/**
 * Las seis listas del alta —tramos, ejes, variantes, atributos, ficha técnica y reseñas— descritas
 * como datos.
 *
 * <p>Todas se editan igual: una fila con sus campos, un botón para quitarla y otro para añadir. Escribir
 * seis veces la misma plantilla garantizaba que un día se corrigiera solo en una.
 */
export interface ListaDelAlta {
  readonly titulo: string;
  readonly respaldo: string;
  readonly anadir: string;
  readonly respaldoDeAnadir: string;
  readonly campos: readonly CampoDelAlta[];
  readonly filaVacia: Readonly<Record<string, string>>;
  /** Cierto si cada fila va en su propio bloque: las de muchos campos no caben en una línea. */
  readonly enBloque?: boolean;
}

const ATRIBUTO_VACIO: AtributoTecleado = { clave: '', valor: '', idioma: '' };
const ESPECIFICACION_VACIA: EspecificacionTecleada = {
  idioma: 'es',
  clave: '',
  valor: '',
  posicion: '',
};

export const LISTA_DE_TRAMOS: ListaDelAlta = {
  titulo: 'admin.catalog.detail.tiers.title',
  respaldo: 'Tramos de precio por cantidad',
  anadir: 'admin.create_product.add_tier',
  respaldoDeAnadir: 'Añadir tramo',
  filaVacia: TRAMO_TECLEADO_VACIO,
  campos: [
    { clave: 'cantidadMinima', etiqueta: 'admin.create_product.field.from', respaldo: 'Desde', clase: 'entero', marcador: '1', ancho: 'tercio' },
    { clave: 'cantidadMaxima', etiqueta: 'admin.create_product.field.to', respaldo: 'Hasta', clase: 'entero', marcador: '∞', ancho: 'tercio' },
    { clave: 'precioUnitario', etiqueta: 'admin.catalog.col.price', respaldo: 'Precio', clase: 'numero', ancho: 'tercio' },
    { clave: 'divisa', etiqueta: 'admin.catalog.fields.currency', respaldo: 'Moneda', clase: 'texto', marcador: 'CNY', ancho: 'tercio' },
  ],
};

export const LISTA_DE_EJES: ListaDelAlta = {
  titulo: 'admin.create_product.axes',
  respaldo: 'Ejes de variación (Color / Talla)',
  anadir: 'admin.create_product.add_axis',
  respaldoDeAnadir: 'Añadir eje',
  filaVacia: EJE_TECLEADO_VACIO,
  enBloque: true,
  campos: [
    { clave: 'nombre', etiqueta: 'admin.create_product.field.axis_name', respaldo: 'Nombre del eje', clase: 'texto', marcador: 'Color / Talla', ancho: 'completa' },
    { clave: 'valores', etiqueta: 'admin.create_product.field.axis_values', respaldo: 'Valores (separados por coma)', clase: 'texto', marcador: 'Rojo, Negro, Blanco', ancho: 'completa' },
    { clave: 'imagenesPorValor', etiqueta: 'admin.create_product.field.axis_images', respaldo: 'Imagen por valor (una por línea, valor=url)', clase: 'area', marcador: 'Rojo=https://…', ancho: 'completa' },
    { clave: 'traduccionesPorValor', etiqueta: 'admin.create_product.field.axis_translations', respaldo: 'Traducción por valor (valor=es:Rojo, en:Red)', clase: 'area', marcador: '红色=es:Rojo, en:Red', ancho: 'completa' },
  ],
};

export const LISTA_DE_VARIANTES: ListaDelAlta = {
  titulo: 'admin.create_product.variants',
  respaldo: 'Variantes / SKU',
  anadir: 'admin.variants.add',
  respaldoDeAnadir: 'Añadir variante',
  filaVacia: VARIANTE_TECLEADA_VACIA,
  enBloque: true,
  campos: [
    { clave: 'sku', etiqueta: 'admin.catalog.detail.inv.sku', respaldo: 'SKU', clase: 'texto', ancho: 'completa' },
    { clave: 'opciones', etiqueta: 'admin.catalog.detail.inv.options', respaldo: 'Opciones (Eje:Valor, separadas por coma)', clase: 'texto', marcador: 'Color:Rojo, Talla:M', ancho: 'completa' },
    { clave: 'precio', etiqueta: 'admin.catalog.col.price', respaldo: 'Precio', clase: 'numero', ancho: 'tercio' },
    { clave: 'existencias', etiqueta: 'admin.catalog.detail.inv.stock', respaldo: 'Stock', clase: 'entero', ancho: 'tercio' },
    { clave: 'pesoDelPaqueteGramos', etiqueta: 'admin.create_product.field.package_weight', respaldo: 'Peso paquete (g)', clase: 'entero', ancho: 'tercio' },
    { clave: 'urlImagen', etiqueta: 'admin.variants.image_ph', respaldo: 'Imagen (URL)', clase: 'texto', ancho: 'completa' },
    { clave: 'pesoGramos', etiqueta: 'admin.create_product.field.weight', respaldo: 'Peso (g)', clase: 'entero', ancho: 'tercio' },
    { clave: 'largoMm', etiqueta: 'admin.create_product.field.length', respaldo: 'Largo (mm)', clase: 'entero', ancho: 'tercio' },
    { clave: 'anchoMm', etiqueta: 'admin.create_product.field.width', respaldo: 'Ancho (mm)', clase: 'entero', ancho: 'tercio' },
    { clave: 'altoMm', etiqueta: 'admin.create_product.field.height', respaldo: 'Alto (mm)', clase: 'entero', ancho: 'tercio' },
  ],
};

export const LISTA_DE_ATRIBUTOS: ListaDelAlta = {
  titulo: 'admin.create_product.attributes',
  respaldo: 'Atributos (facetas y filtros)',
  anadir: 'admin.create_product.add_attribute',
  respaldoDeAnadir: 'Añadir atributo',
  filaVacia: ATRIBUTO_VACIO,
  campos: [
    { clave: 'clave', etiqueta: 'admin.catalog.bulk.col_field', respaldo: 'Clave', clase: 'texto', marcador: 'material', ancho: 'tercio' },
    { clave: 'valor', etiqueta: 'admin.create_product.field.value', respaldo: 'Valor', clase: 'texto', marcador: 'algodón', ancho: 'tercio' },
    { clave: 'idioma', etiqueta: 'picker.language', respaldo: 'Idioma', clase: 'texto', ancho: 'tercio' },
  ],
};

export const LISTA_DE_ESPECIFICACIONES: ListaDelAlta = {
  titulo: 'admin.create_product.specifications',
  respaldo: 'Ficha técnica (por idioma)',
  anadir: 'admin.create_product.add_spec',
  respaldoDeAnadir: 'Añadir fila',
  filaVacia: ESPECIFICACION_VACIA,
  campos: [
    { clave: 'idioma', etiqueta: 'picker.language', respaldo: 'Idioma', clase: 'texto', marcador: 'es', ancho: 'tercio' },
    { clave: 'clave', etiqueta: 'admin.catalog.bulk.col_field', respaldo: 'Clave', clase: 'texto', marcador: 'Material', ancho: 'tercio' },
    { clave: 'valor', etiqueta: 'admin.create_product.field.value', respaldo: 'Valor', clase: 'texto', marcador: 'Algodón 100%', ancho: 'tercio' },
  ],
};

export const LISTA_DE_RESENAS: ListaDelAlta = {
  titulo: 'admin.create_product.reviews',
  respaldo: 'Reseñas de clientes (cada una con su idioma)',
  anadir: 'admin.create_product.add_review',
  respaldoDeAnadir: 'Añadir reseña',
  filaVacia: RESENA_TECLEADA_VACIA,
  enBloque: true,
  campos: [
    { clave: 'autor', etiqueta: 'admin.create_product.field.author', respaldo: 'Autor', clase: 'texto', ancho: 'tercio' },
    { clave: 'pais', etiqueta: 'admin.suppliers.col.country', respaldo: 'País', clase: 'texto', marcador: 'ES', ancho: 'tercio' },
    { clave: 'estrellas', etiqueta: 'admin.create_product.field.stars', respaldo: 'Estrellas', clase: 'entero', ancho: 'tercio' },
    { clave: 'titulo', etiqueta: 'admin.catalog.fields.title', respaldo: 'Título', clase: 'texto', ancho: 'media' },
    { clave: 'idioma', etiqueta: 'picker.language', respaldo: 'Idioma', clase: 'texto', ancho: 'media' },
    { clave: 'cuerpo', etiqueta: 'admin.create_product.field.review_body', respaldo: 'Reseña', clase: 'area', ancho: 'completa' },
  ],
};

export const LISTAS_DEL_ALTA: readonly ListaDelAlta[] = [
  LISTA_DE_TRAMOS,
  LISTA_DE_EJES,
  LISTA_DE_VARIANTES,
  LISTA_DE_ATRIBUTOS,
  LISTA_DE_ESPECIFICACIONES,
  LISTA_DE_RESENAS,
];
