import { esRenombradoValido, sePuedeCrear } from './diseno-pod';

describe('sePuedeCrear', () => {
  it('exige un nombre con contenido', () => {
    expect(sePuedeCrear('Camiseta montaña')).toBe(true);
  });

  it('rechaza el vacío y los espacios: una miniatura sin nombre no se distingue de las demás', () => {
    expect(sePuedeCrear('')).toBe(false);
    expect(sePuedeCrear('   ')).toBe(false);
  });
});

describe('esRenombradoValido', () => {
  it('acepta un nombre nuevo con contenido', () => {
    expect(esRenombradoValido('Otro nombre', 'Nombre viejo')).toBe(true);
  });

  it('rechaza el vacío, la cancelación y el mismo nombre de antes', () => {
    // Guardar lo que ya estaba guardado gasta una llamada y confirma algo que no ha pasado.
    expect(esRenombradoValido('', 'Nombre')).toBe(false);
    expect(esRenombradoValido(null, 'Nombre')).toBe(false);
    expect(esRenombradoValido('  Nombre  ', 'Nombre')).toBe(false);
  });
});
