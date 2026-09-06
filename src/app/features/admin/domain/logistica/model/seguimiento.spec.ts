import { nombreDeclarado, pasosDelEnvio, valorDeclarado } from './seguimiento';

describe('pasos del envío', () => {
  it('los devuelve del más reciente al más antiguo', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'Recogido' },
      { estado: 'DELIVERED', descripcion: 'Entregado' },
    ]);
    expect(pasos.map((p) => p.descripcion)).toEqual(['Entregado', 'Recogido']);
  });

  /**
   * El transportista publica el mismo nodo con dos redacciones según por dónde entre el aviso. Sin
   * agruparlos, se veía «Recogido por el transportista» seguido de «Paquete recogido por el
   * transportista»: el mismo hecho contado dos veces.
   */
  it('agrupa dos redacciones del mismo hecho cuando una contiene a la otra', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'Recogido por el transportista' },
      { estado: 'SHIPPED', descripcion: 'Paquete recogido por el transportista.' },
    ]);
    expect(pasos).toHaveLength(1);
  });

  it('ignora mayúsculas, tildes y puntuación al comparar', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'En tránsito' },
      { estado: 'SHIPPED', descripcion: 'EN TRANSITO.' },
    ]);
    expect(pasos).toHaveLength(1);
  });

  /** Compara palabras enteras: «tránsito» no debe casar con «transitorio». */
  it('no agrupa dos palabras distintas que comparten prefijo', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'transito' },
      { estado: 'SHIPPED', descripcion: 'transitorio' },
    ]);
    expect(pasos).toHaveLength(2);
  });

  /**
   * Todo el trayecto internacional llega con el mismo estado: agrupar solo por estado dejaría el
   * seguimiento en un único paso.
   */
  it('con el mismo estado pero descripciones distintas NO agrupa', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'Salida del almacén' },
      { estado: 'SHIPPED', descripcion: 'Llegada a destino' },
    ]);
    expect(pasos).toHaveLength(2);
  });

  it('el mismo texto con estado distinto son dos hechos', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'Movimiento' },
      { estado: 'DELIVERED', descripcion: 'Movimiento' },
    ]);
    expect(pasos).toHaveLength(2);
  });

  it('dos pasos sin descripción y con el mismo estado se agrupan', () => {
    expect(pasosDelEnvio([{ estado: 'SHIPPED' }, { estado: 'SHIPPED' }])).toHaveLength(1);
  });

  /**
   * La hora que importa es la del HECHO, no la del reanuncio: es la que acaba en una reclamación. El
   * repetido solo sirve para rellenar los huecos.
   */
  it('conserva la hora del primero y completa con el repetido lo que le falte', () => {
    const pasos = pasosDelEnvio([
      { estado: 'SHIPPED', descripcion: 'Recogido', ocurridoEl: '2026-09-01T08:00:00Z' },
      { estado: 'SHIPPED', descripcion: 'Recogido', ocurridoEl: '2026-09-01T09:00:00Z', lugar: 'Yiwu' },
    ]);
    expect(pasos[0].ocurridoEl).toBe('2026-09-01T08:00:00Z');
    expect(pasos[0].lugar).toBe('Yiwu');
  });

  it('sin eventos devuelve una lista vacía', () => {
    expect(pasosDelEnvio([])).toEqual([]);
  });
});

describe('destinatario declarado', () => {
  it('junta nombre y apellidos, que viajan partidos como pide la API del transportista', () => {
    expect(nombreDeclarado({ nombre: 'Juan', apellidos: 'Pérez', lineas: [] })).toBe('Juan Pérez');
  });

  it('con solo una de las dos partes no deja un espacio colgando', () => {
    expect(nombreDeclarado({ nombre: 'Juan', lineas: [] })).toBe('Juan');
  });

  it('sin destinatario devuelve vacío en vez de reventar', () => {
    expect(nombreDeclarado(undefined)).toBe('');
  });
});

describe('valor declarado de una línea', () => {
  it('lleva su divisa pegada', () => {
    expect(valorDeclarado({ cantidad: 1, valorUnitario: 12.5, moneda: 'USD' })).toBe('12.5 USD');
  });

  it('sin importe no se inventa un cero: no es lo mismo que gratis', () => {
    expect(valorDeclarado({ cantidad: 1 })).toBeUndefined();
  });

  it('sin divisa no deja un espacio colgando', () => {
    expect(valorDeclarado({ cantidad: 1, valorUnitario: 8 })).toBe('8');
  });
});
