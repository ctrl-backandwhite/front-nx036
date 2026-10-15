/**
 * El producto «vuela» hasta el carrito al añadirlo.
 *
 * <p>Qué resuelve: entre pulsar «Añadir» y que el contador suba hay una respuesta del backend, y sin
 * nada que mire el ojo el cambio ocurre en una esquina de la pantalla donde nadie está mirando. El
 * vuelo lleva la mirada del producto al contador, que es donde está el cambio.
 *
 * <p>Es DOM puro a propósito: no es estado de la aplicación ni cambia nada que se pueda consultar
 * después, así que no tiene por qué pasar por signals ni repintar un componente. Usa la API de
 * animaciones del navegador en vez de CSS porque el recorrido se calcula en el momento —depende de
 * dónde esté la tarjeta y de qué carrito esté visible—, y eso no cabe en una hoja de estilos.
 *
 * <p>Nunca falla hacia fuera: si no encuentra la imagen, si no hay carrito visible o si el navegador
 * no trae la API, no hace nada. Un adorno no puede impedir que se añada un producto.
 */

/** Cuánto dura el vuelo. Más corto se pierde de vista; más largo estorba al siguiente clic. */
const DURACION_MS = 650;

/** A cuánto se encoge al llegar. No a cero: desaparecer del todo se lee como que se perdió. */
const ESCALA_FINAL = 0.18;

/** Por encima de la cabecera pegajosa (z-50) y por debajo de los diálogos (z-[1000]). */
const CAPA = '80';

/**
 * El carrito que de verdad se ve. En el móvil el de la cabecera está oculto y manda el de la barra
 * inferior; volar hacia un elemento con `display: none` deja la imagen yendo a la esquina superior
 * izquierda, que es donde el navegador dice que está lo que no se pinta.
 */
function cestaVisible(): HTMLElement | null {
  for (const id of ['nx-cart-icon', 'nx-cart-icon-movil']) {
    const candidato = document.getElementById(id);
    if (candidato && candidato.getBoundingClientRect().width > 0) {
      return candidato;
    }
  }
  return null;
}

/** La imagen del producto: el propio elemento si lo es, o la primera que lleve dentro. */
function imagenDe(origen: Element): HTMLImageElement | null {
  return origen instanceof HTMLImageElement ? origen : origen.querySelector('img');
}

export function vuelaALaCesta(origen: Element | null | undefined): void {
  // En el prerenderizado no hay ventana, y aquí no hay nada que prerenderizar.
  if (!origen || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  // Quien pide menos movimiento lo pide para todo, no solo para lo que molesta mucho.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const imagen = imagenDe(origen);
  const destino = cestaVisible();
  if (!imagen || !destino || typeof imagen.animate !== 'function') {
    return;
  }

  const desde = imagen.getBoundingClientRect();
  const hasta = destino.getBoundingClientRect();
  if (desde.width === 0 || desde.height === 0) {
    return;
  }

  const copia = imagen.cloneNode(false) as HTMLImageElement;
  // `fixed` y no `absolute`: las coordenadas que acabamos de medir son de la ventana, y dentro de un
  // contenedor con `transform` —la tarjeta tiene uno al pasar por encima— `absolute` se referiría a
  // ese contenedor y la copia saldría descolocada.
  copia.style.cssText = [
    'position:fixed',
    `top:${desde.top}px`,
    `left:${desde.left}px`,
    `width:${desde.width}px`,
    `height:${desde.height}px`,
    'object-fit:cover',
    'border-radius:12px',
    'pointer-events:none',
    `z-index:${CAPA}`,
    'will-change:transform,opacity',
  ].join(';');
  // Es decoración: quien navega con lector de pantalla ya tiene el aviso de que se añadió.
  copia.setAttribute('aria-hidden', 'true');
  copia.alt = '';
  document.body.appendChild(copia);

  const avanceX = hasta.left + hasta.width / 2 - (desde.left + desde.width / 2);
  const avanceY = hasta.top + hasta.height / 2 - (desde.top + desde.height / 2);

  const vuelo = copia.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      // A mitad de camino sube un poco: una recta se lee como un deslizamiento y una curva, como
      // algo que se lanza. Es lo que hace que se entienda sin explicarlo.
      {
        transform: `translate(${avanceX * 0.5}px, ${avanceY * 0.5 - 60}px) scale(0.6)`,
        opacity: 0.9,
        offset: 0.5,
      },
      { transform: `translate(${avanceX}px, ${avanceY}px) scale(${ESCALA_FINAL})`, opacity: 0.2 },
    ],
    { duration: DURACION_MS, easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)', fill: 'forwards' },
  );

  // Se retira pase lo que pase: si la animación se cancela —porque se navega a otra página a media
  // animación— el `finished` rechaza, y sin esto la copia se quedaría pegada sobre la pantalla nueva.
  const retira = () => copia.remove();
  vuelo.finished.then(retira, retira);
}
