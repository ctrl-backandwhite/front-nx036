import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAngleRight,
  faBolt,
  faBoxesStacked,
  faCircleNodes,
  faClockRotateLeft,
  faFolderTree,
  faGaugeHigh,
  faHandshake,
  faKey,
  faPlug,
  faRocket,
  faSatelliteDish,
  faShieldHalved,
  faShop,
  faSliders,
  faStore,
  faSwatchbook,
  faTriangleExclamation,
  faTruck,
  faTruckFast,
} from '@fortawesome/free-solid-svg-icons';

/**
 * De nombre de icono a icono.
 *
 * <p>El índice y los apartados de la referencia son DATOS, y un dato no puede llevar dentro un objeto
 * de una librería de iconos: eso ataría el contenido de la documentación a la biblioteca gráfica y
 * obligaría a importarla para poder leer una lista de endpoints. Los datos dicen «cohete» y esta tabla
 * —que sí es de presentación— decide con qué se dibuja.
 */
const ICONOS: Readonly<Record<string, IconDefinition>> = {
  cohete: faRocket,
  nodos: faCircleNodes,
  escudo: faShieldHalved,
  enchufe: faPlug,
  tienda: faStore,
  arbol: faFolderTree,
  cajas: faBoxesStacked,
  muestrario: faSwatchbook,
  ajustes: faSliders,
  camion: faTruck,
  comercio: faShop,
  rayo: faBolt,
  camionRapido: faTruckFast,
  antena: faSatelliteDish,
  aviso: faTriangleExclamation,
  llave: faKey,
  medidor: faGaugeHigh,
  reloj: faClockRotateLeft,
  apreton: faHandshake,
  flechaDerecha: faAngleRight,
};

/** El icono de un nombre. Uno desconocido cae en el ángulo: mejor un icono neutro que un hueco. */
export function iconoDeDocumentacion(nombre: string): IconDefinition {
  return ICONOS[nombre] ?? faAngleRight;
}
