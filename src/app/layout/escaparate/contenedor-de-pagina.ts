/**
 * El ancho del contenido en el escaparate: el mismo para el cuerpo de la página y para el pie.
 *
 * <p>Existe porque estaba escrito dos veces y se separó. El cuerpo tenía tope de 1.680 px y el pie
 * `max-w-screen-2xl`, que resuelve a 1.440: el pie salía 195 px más estrecho que las tarjetas que
 * tenía justo encima, y la esquina del recuadro gris no coincidía con la de ninguna sección. Con dos
 * cadenas de utilidades separadas ese desajuste no lo señala nada; lo tiene que ver alguien.
 *
 * <p>Incluye el relleno lateral además del tope, porque los dos juntos son los que deciden dónde
 * empieza el contenido. Igualar solo el tope dejaba los bordes descuadrados otros 16 px.
 *
 * <p>Se aplica con `[class]`, no copiando la cadena: copiarla es exactamente lo que provocó la
 * separación. El tope se mantiene a propósito —sin él, en un monitor de 3.440 px una fila se estira
 * de lado a lado y el ojo pierde el renglón—.
 */
// FLUIDO (decisión del titular, 19-nov-2026): el contenido ocupa el ancho de la ventana y lo que
// crece con ella es el margen lateral —1rem en un móvil, hasta 3,5rem en un monitor—, no un tope en
// píxeles. Con el tope de 1.440 px un monitor de 1.840 dejaba 200 px vacíos a cada lado. El único
// límite que queda, 120rem, es el de arriba y solo actúa en pantallas ultrapanorámicas.
export const CONTENEDOR_DE_PAGINA = 'w-full max-w-[120rem] mx-auto px-[clamp(1rem,3vw,3.5rem)]';
