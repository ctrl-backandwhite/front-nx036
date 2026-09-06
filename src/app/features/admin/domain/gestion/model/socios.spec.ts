import { ClienteOauth, nombreLegible, separaPermisos, traduceLista } from './socios';

const TEXTOS: Record<string, string> = {
  'admin.partners.grants.client_credentials': 'Credenciales de cliente',
  'admin.partners.scopes.catalog_read': 'Leer catálogo',
};
const t = (clave: string): string => TEXTOS[clave] ?? clave;

function cliente(cambios: Partial<ClienteOauth> = {}): ClienteOauth {
  return { id: '1', identificador: 'acme-prod', nombre: 'Acme', concesiones: '', permisos: '', ...cambios };
}

describe('nombreLegible', () => {
  it('enseña el nombre cuando es un nombre de verdad', () => {
    expect(nombreLegible(cliente())).toBe('Acme');
  });

  /** Sin nombre, el backend copia el identificador técnico: pintarlo dos veces ocupa sin informar. */
  it('cae al identificador cuando el nombre es en realidad un identificador', () => {
    expect(nombreLegible(cliente({ nombre: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })))
      .toBe('acme-prod');
  });
});

describe('traduceLista', () => {
  it('traduce cada pieza y las une con un separador legible', () => {
    expect(traduceLista('client_credentials', 'admin.partners.grants', t))
      .toBe('Credenciales de cliente');
  });

  it('normaliza puntos y guiones al buscar la clave', () => {
    expect(traduceLista('catalog.read', 'admin.partners.scopes', t)).toBe('Leer catálogo');
  });

  /** Un permiso nuevo del backend tiene que verse aunque no esté en el diccionario. */
  it('deja crudo lo que no tiene traducción', () => {
    expect(traduceLista('orders.write', 'admin.partners.scopes', t)).toBe('orders.write');
  });

  it('acepta comas y espacios como separadores', () => {
    expect(traduceLista('a, b  c', 'x', t)).toBe('a · b · c');
  });

  it('sin nada que traducir pinta un guion', () => {
    expect(traduceLista(null, 'x', t)).toBe('—');
    expect(traduceLista('  ', 'x', t)).toBe('—');
  });
});

describe('separaPermisos', () => {
  it('parte por comas y descarta los huecos', () => {
    expect(separaPermisos(' catalog.read , orders.write ,, ')).toEqual(['catalog.read', 'orders.write']);
  });
});
