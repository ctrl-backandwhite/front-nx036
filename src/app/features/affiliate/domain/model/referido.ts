/**
 * La captura de un referido: quién trajo a quién.
 *
 * <p>Funciona por «último clic»: la visita se marca con un testigo propio que sobrevive a la navegación,
 * y cuando esa visita acaba entrando en una cuenta, el testigo se ata al cliente para que un pedido
 * posterior se le pueda atribuir al afiliado.
 */
export interface ReferidoPendiente {
  readonly codigo: string;
  readonly tokenDeVisitante: string;
}

/**
 * ¿Se puede atribuir un referido a quien acaba de entrar?
 *
 * <p>El personal de la casa queda fuera: un administrador o un operador no puede traerse a sí mismo por
 * un enlace de referido, y dejarlo pasar convertía el programa en una vía para generar comisiones sin
 * ventas reales.
 */
export function seLePuedeAtribuir(rol: string | undefined): boolean {
  return !!rol && rol !== 'ADMIN' && rol !== 'OPERATOR';
}

/**
 * Quita el parámetro del referido de una dirección, dejando el resto intacto.
 *
 * <p>Se limpia porque, si se queda, cualquiera que copie y comparta esa dirección estaría repartiendo el
 * enlace de otro afiliado sin saberlo. Se conservan los demás parámetros y el ancla: son del sitio y
 * borrarlos rompería filtros y enlaces internos.
 */
export function direccionSinReferido(direccion: string, parametro = 'ref'): string {
  const [caminoYConsulta, ancla] = direccion.split('#');
  const [camino, consulta] = caminoYConsulta.split('?');
  const parametros = new URLSearchParams(consulta ?? '');
  parametros.delete(parametro);
  const restante = parametros.toString();
  return camino + (restante ? `?${restante}` : '') + (ancla ? `#${ancla}` : '');
}
