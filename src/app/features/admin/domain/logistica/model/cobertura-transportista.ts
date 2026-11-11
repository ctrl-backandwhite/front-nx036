/**
 * A qué países llega cada transportista.
 *
 * <p>Es la tabla que decide si un destino se puede elegir en el checkout. Hasta el 9-nov-2026 solo se
 * cambiaba con migraciones SQL, y con un solo transportista se podía vivir con eso; con dos, no: el
 * segundo llega a 17 destinos que el primero no cubre y encender cada uno no puede costar un despliegue.
 *
 * <p>Lo que se edita aquí surte efecto de inmediato: el desplegable de países del escaparate sale de la
 * UNIÓN de las coberturas, y esa consulta no se cachea.
 */

export interface CoberturaDeTransportista {
  /** Transportista dueño de la cobertura (`YUNEXPRESS`, `FOURPX`). Entra en la clave con el país. */
  readonly carrier: string;
  /** Destino ISO-2. Aquí NO hay comodín: la cobertura se declara país a país. */
  readonly pais: string;
  /** Nombre del destino tal como se enseña. */
  readonly nombre: string;
  /** Zona tarifaria del transportista, como él la nombra. */
  readonly zona: string;
  /** Tarifa de RESERVA: base en céntimos USD. Solo se usa si no hay tarifa medida. */
  readonly baseCents: number;
  /** Tarifa de RESERVA: céntimos USD por kilo. */
  readonly porKgCents: number;
  readonly diasMin: number;
  readonly diasMax: number;
  /** El interruptor que decide si el destino se ofrece. Apagar conserva tarifa y plazo. */
  readonly habilitado: boolean;
}

/**
 * Fila en blanco. Nace <b>habilitada</b> porque dar de alta un destino es justo para servirlo: crearlo
 * apagado obligaría a dos gestos para la acción que se venía a hacer.
 */
export function coberturaEnBlanco(carrier = ''): CoberturaDeTransportista {
  return {
    carrier,
    pais: '',
    nombre: '',
    zona: '',
    baseCents: 0,
    porKgCents: 0,
    diasMin: 0,
    diasMax: 0,
    habilitado: true,
  };
}

/**
 * La pareja transportista+país ES la clave del registro. Guardar una fila que ya existe la sustituye;
 * por eso al editar esos dos campos quedan bloqueados, o en vez de cambiar la fila se crearía otra.
 */
export function claveDeCobertura(cobertura: CoberturaDeTransportista): string {
  return `${cobertura.carrier}|${cobertura.pais}`;
}

/**
 * ¿Se puede guardar?
 *
 * <p>El país se exige de DOS letras y no solo «no vacío»: el backend lo rechaza, y dejar que el intento
 * llegue hasta allí convierte un error evidente en un 422 que el administrador tiene que interpretar.
 */
export function coberturaGuardable(cobertura: CoberturaDeTransportista): boolean {
  return (
    cobertura.carrier.trim().length > 0 &&
    /^[A-Za-z]{2}$/.test(cobertura.pais.trim()) &&
    cobertura.nombre.trim().length > 0 &&
    cobertura.zona.trim().length > 0
  );
}

/** Los transportistas presentes en la tabla, sin repetir y en orden, para poder filtrar por uno. */
export function transportistasDeCobertura(
  coberturas: readonly CoberturaDeTransportista[],
): readonly string[] {
  return [...new Set(coberturas.map((c) => c.carrier))].sort((a, b) => a.localeCompare(b));
}

/**
 * El plazo en una línea. Un cero no se enseña como «0 días» —que prometería la entrega hoy— sino como
 * sin dato, que es lo que significa en el resto de la plataforma.
 */
export function plazoLegible(cobertura: CoberturaDeTransportista): string | undefined {
  if (cobertura.diasMin <= 0 && cobertura.diasMax <= 0) {
    return undefined;
  }
  if (cobertura.diasMin > 0 && cobertura.diasMax > cobertura.diasMin) {
    return `${cobertura.diasMin}–${cobertura.diasMax}`;
  }
  return `${Math.max(cobertura.diasMin, cobertura.diasMax)}`;
}

/** Céntimos a importe legible con dos decimales. La tarifa de reserva se guarda en céntimos USD. */
export function importeLegible(cents: number): string {
  return (cents / 100).toFixed(2);
}
