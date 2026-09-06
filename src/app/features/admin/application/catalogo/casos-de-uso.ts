import { Provider } from '@angular/core';
import { ActualizaFicha } from './use-case/actualiza-ficha.use-case';
import { ActualizaPrecioDeVariante } from './use-case/actualiza-precio-de-variante.use-case';
import {
  ActivaCategoriasEnLote,
  AlternaCategoria,
  EliminaCategorias,
  GuardaCategoria,
  ListaCategorias,
  ListaTodasLasCategorias,
  ReindexaCategorias,
} from './use-case/administra-categorias.use-case';
import {
  CambiaAprobacionDeGrupo,
  GuardaDescripcionDeGrupo,
  ListaGruposDeDeclaracion,
  SiembraGruposDeDeclaracion,
} from './use-case/administra-grupos-de-declaracion.use-case';
import {
  BuscaProductosParaGrupo,
  CambiaMiembrosDelGrupo,
  EliminaGrupoDeProductos,
  GuardaGrupoDeProductos,
  ListaGruposDeProductos,
  ListaMiembrosDelGrupo,
} from './use-case/administra-grupos-de-productos.use-case';
import {
  CambiaVerificacionDeProveedores,
  EliminaProveedores,
  GuardaProveedor,
  ListaProveedores,
  ReindexaProveedores,
} from './use-case/administra-proveedores.use-case';
import { AnadeImagenes } from './use-case/anade-imagenes.use-case';
import { AplicaRecargo } from './use-case/aplica-recargo.use-case';
import { AplicaSubvencion } from './use-case/aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from './use-case/cambia-estado-de-productos.use-case';
import { ComprimeImagenesHistoricas } from './use-case/comprime-imagenes-historicas.use-case';
import { ConsultaArbolDeCategorias } from './use-case/consulta-arbol-de-categorias.use-case';
import { ConsultaFicha } from './use-case/consulta-ficha.use-case';
import { ConsultaIdiomas } from './use-case/consulta-idiomas.use-case';
import { ConsultaTasasDeCambio } from './use-case/consulta-tasas-de-cambio.use-case';
import { CreaProducto } from './use-case/crea-producto.use-case';
import { DuplicaProducto } from './use-case/duplica-producto.use-case';
import {
  EliminaValoresDeVariacion,
  FijaImagenDeValor,
  RenombraValorDeVariacion,
} from './use-case/edita-valores-de-variacion.use-case';
import { EliminaImagenes } from './use-case/elimina-imagenes.use-case';
import { EliminaProductos } from './use-case/elimina-productos.use-case';
import { EliminaTramoDePrecio } from './use-case/elimina-tramo-de-precio.use-case';
import { EliminaVariante } from './use-case/elimina-variante.use-case';
import { ExportaCategorias } from './use-case/exporta-categorias.use-case';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from './use-case/exporta-productos.use-case';
import { GuardaVariante } from './use-case/guarda-variante.use-case';
import { GuardaVariantesEnLote } from './use-case/guarda-variantes-en-lote.use-case';
import { ImportaFilas } from './use-case/importa-filas.use-case';
import { LeeArchivoDeImportacion } from './use-case/lee-archivo-de-importacion.use-case';
import { ImportaNdjson } from './use-case/importa-ndjson.use-case';
import { ListaProductos } from './use-case/lista-productos.use-case';
import { ListaVariantes } from './use-case/lista-variantes.use-case';
import { MarcaProductoVerificado } from './use-case/marca-producto-verificado.use-case';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from './use-case/reemplaza-producto-con-json.use-case';
import { ReindexaCatalogo } from './use-case/reindexa-catalogo.use-case';
import { ReintentaAnunciosAlBus } from './use-case/reintenta-anuncios-al-bus.use-case';
import { ReordenaImagenes } from './use-case/reordena-imagenes.use-case';
import { ConsultaAnunciosFallidos } from './use-case/revisa-anuncios-al-bus.use-case';

/**
 * Los casos de uso del área de catálogo, para colgarlos del mismo sitio que sus puertos.
 *
 * <p>NO llevan `providedIn: 'root'` a propósito: sus puertos se registran en las rutas del área, y el
 * inyector raíz no ve lo que se declara en una ruta. Un caso de uso en la raíz que pidiera un puerto de
 * ruta fallaría al inyectarlo, y solo al abrir la pantalla.
 */
export const CASOS_DE_USO_DE_CATALOGO: readonly Provider[] = [
  ListaProductos,
  CambiaEstadoDeProductos,
  MarcaProductoVerificado,
  DuplicaProducto,
  EliminaProductos,
  AplicaRecargo,
  AplicaSubvencion,
  ComprimeImagenesHistoricas,
  ConsultaAnunciosFallidos,
  ReintentaAnunciosAlBus,
  ConsultaFicha,
  ActualizaFicha,
  EliminaTramoDePrecio,
  AnadeImagenes,
  EliminaImagenes,
  ReordenaImagenes,
  ListaVariantes,
  GuardaVariante,
  GuardaVariantesEnLote,
  EliminaVariante,
  ActualizaPrecioDeVariante,
  RenombraValorDeVariacion,
  FijaImagenDeValor,
  EliminaValoresDeVariacion,
  ListaCategorias,
  ListaTodasLasCategorias,
  GuardaCategoria,
  EliminaCategorias,
  AlternaCategoria,
  ActivaCategoriasEnLote,
  ReindexaCategorias,
  ExportaCategorias,
  ListaProveedores,
  GuardaProveedor,
  EliminaProveedores,
  CambiaVerificacionDeProveedores,
  ReindexaProveedores,
  ListaGruposDeProductos,
  GuardaGrupoDeProductos,
  EliminaGrupoDeProductos,
  ListaMiembrosDelGrupo,
  CambiaMiembrosDelGrupo,
  BuscaProductosParaGrupo,
  ListaGruposDeDeclaracion,
  GuardaDescripcionDeGrupo,
  CambiaAprobacionDeGrupo,
  SiembraGruposDeDeclaracion,
  ImportaFilas,
  ImportaNdjson,
  LeeArchivoDeImportacion,
  ReindexaCatalogo,
  CuentaExportables,
  ExportaSegmento,
  ExportaCatalogoCompleto,
  ExportaProducto,
  ReemplazaProductoConJson,
  CreaProducto,
  ConsultaIdiomas,
  ConsultaTasasDeCambio,
  ConsultaArbolDeCategorias,
];
