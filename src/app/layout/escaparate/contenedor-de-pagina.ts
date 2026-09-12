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
export const CONTENEDOR_DE_PAGINA = 'w-full max-w-[1680px] mx-auto px-4 lg:px-6';
