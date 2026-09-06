import {
  ReglaDePrecio, huellaDeRegla, huellasDuplicadas, reglaEnBlanco, reglasSolapadas, tieneTramo,
  tramosSeSolapan,
} from './precios';

function regla(cambios: Partial<ReglaDePrecio> = {}): ReglaDePrecio {
  return {
    id: 'r1', ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 30, activa: true, posicion: 0, ...cambios,
  };
}

describe('reglaEnBlanco', () => {
  it('arranca como un porcentaje global activo, que es lo que se crea casi siempre', () => {
    const nueva = reglaEnBlanco();

    expect(nueva.ambito).toBe('GLOBAL');
    expect(nueva.tipo).toBe('PERCENTAGE');
    expect(nueva.activa).toBe(true);
    // Sin identificador: todavía no existe en el servidor.
    expect(nueva.id).toBeUndefined();
  });
});

describe('huellaDeRegla', () => {
  it('dos reglas que hacen lo mismo comparten huella', () => {
    expect(huellaDeRegla(regla())).toBe(huellaDeRegla(regla({ id: 'otro' })));
  });

  it('el país y el canal forman parte de la huella: el mismo margen en otro país es otra regla', () => {
    expect(huellaDeRegla(regla({ pais: 'ES' }))).not.toBe(huellaDeRegla(regla({ pais: 'FR' })));
  });
});

describe('huellasDuplicadas', () => {
  it('señala solo las huellas que aparecen más de una vez', () => {
    const duplicadas = huellasDuplicadas([
      regla({ id: 'a' }),
      regla({ id: 'b' }),
      regla({ id: 'c', valor: 45 }),
    ]);

    expect(duplicadas.size).toBe(1);
    expect(duplicadas.has(huellaDeRegla(regla()))).toBe(true);
    expect(duplicadas.has(huellaDeRegla(regla({ valor: 45 })))).toBe(false);
  });
});

describe('tramosSeSolapan', () => {
  it('un extremo sin valor es infinito por ese lado', () => {
    expect(tramosSeSolapan(null, 10, 5, null)).toBe(true);
    expect(tramosSeSolapan(null, null, 100, 200)).toBe(true);
  });

  it('dos tramos consecutivos que comparten el extremo SÍ se pisan', () => {
    expect(tramosSeSolapan(0, 10, 10, 20)).toBe(true);
  });

  it('dos tramos separados no se pisan', () => {
    expect(tramosSeSolapan(0, 9.99, 10, 20)).toBe(false);
  });
});

describe('reglasSolapadas', () => {
  const existentes: readonly ReglaDePrecio[] = [
    regla({ id: 'a', costeMinimoUsd: 0, costeMaximoUsd: 50 }),
    regla({ id: 'b', costeMinimoUsd: 100, costeMaximoUsd: 200 }),
    regla({ id: 'c', activa: false, costeMinimoUsd: 0, costeMaximoUsd: 500 }),
    regla({ id: 'd', ambito: 'CATEGORY', idAmbito: 'x', costeMinimoUsd: 0, costeMaximoUsd: 500 }),
  ];

  /**
   * Dos reglas activas del mismo ámbito con tramos que se pisan dejan sin determinar cuál gana: el
   * mismo producto puede salir a dos precios según el orden en que se evalúen.
   */
  it('avisa de las reglas activas del mismo ámbito cuyo tramo se pisa', () => {
    const solapadas = reglasSolapadas(
      { ambito: 'GLOBAL', costeMinimoUsd: 20, costeMaximoUsd: 120, activa: true },
      existentes,
    );

    expect(solapadas.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('no se cuenta a sí misma al editar', () => {
    const solapadas = reglasSolapadas(
      { id: 'a', ambito: 'GLOBAL', costeMinimoUsd: 0, costeMaximoUsd: 50, activa: true },
      existentes,
    );

    expect(solapadas.map((r) => r.id)).not.toContain('a');
  });

  it('una regla desactivada no puede solaparse con nada', () => {
    expect(reglasSolapadas({ ambito: 'GLOBAL', activa: false }, existentes)).toEqual([]);
  });

  it('ignora las reglas de otro ámbito, que no compiten entre sí', () => {
    const solapadas = reglasSolapadas(
      { ambito: 'CATEGORY', idAmbito: 'otra', costeMinimoUsd: 0, costeMaximoUsd: 500, activa: true },
      existentes,
    );

    expect(solapadas).toEqual([]);
  });
});

describe('tieneTramo', () => {
  it('basta con uno de los dos extremos', () => {
    expect(tieneTramo(regla({ costeMinimoUsd: 5 }))).toBe(true);
    expect(tieneTramo(regla({ costeMaximoUsd: 5 }))).toBe(true);
    expect(tieneTramo(regla())).toBe(false);
  });
});
