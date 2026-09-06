import {
  PAIS_COMODIN,
  canalesDe,
  claveDe,
  formateaGramos,
  limiteEnBlanco,
  limiteGuardable,
  medidasLegibles,
  type LimiteDeTransportista,
} from './limite-transportista';
import { almacenEnBlanco, almacenGuardable, datosDe, type Almacen } from './almacen';
import {
  aPuntosBasicos,
  datosDeImpuesto,
  datosDeRegion,
  impuestoEnBlanco,
  impuestoGuardable,
  regionEnBlanco,
  regionGuardable,
  tasaDeRegion,
} from './impuesto';
import { camposQueFaltan, operadorCompleto, operadorEnBlanco } from './cumplimiento';
import {
  formateaCny,
  nombreDeOperador,
  paginasDe,
  totalesDelReporte,
  ultimoMes,
} from './operador';

function limite(parcial: Partial<LimiteDeTransportista> = {}): LimiteDeTransportista {
  return { ...limiteEnBlanco(), canal: 'FZZXR', ...parcial };
}

describe('límites del transportista', () => {
  it('un canal nuevo arranca en el comodín: primero todos sus países, después las excepciones', () => {
    expect(limiteEnBlanco().pais).toBe(PAIS_COMODIN);
    expect(limiteEnBlanco().activo).toBe(true);
  });

  it('los gramos se leen en kilos a partir del millar', () => {
    expect(formateaGramos(500)).toBe('500 g');
    expect(formateaGramos(2000)).toBe('2 kg');
    expect(formateaGramos(2450)).toBe('2.45 kg');
  });

  it('sin ninguna medida no se pinta «0 × 0 × 0»', () => {
    expect(medidasLegibles(limite())).toBeUndefined();
    expect(medidasLegibles(limite({ largoMaximoMm: 400 }))).toBe('400 × 0 × 0 mm');
  });

  it('los canales salen sin repetir y ordenados', () => {
    const filas = [limite({ canal: 'ZZZ' }), limite({ canal: 'AAA' }), limite({ canal: 'ZZZ' })];
    expect(canalesDe(filas)).toEqual(['AAA', 'ZZZ']);
  });

  it('la clave es canal más país: es lo que decide si se sustituye o se crea otra fila', () => {
    expect(claveDe(limite({ canal: 'FZZXR', pais: 'ES' }))).toBe('FZZXR|ES');
  });

  it('sin canal o sin destino no hay clave, así que no se puede guardar', () => {
    expect(limiteGuardable(limite())).toBe(true);
    expect(limiteGuardable(limite({ canal: '  ' }))).toBe(false);
    expect(limiteGuardable(limite({ pais: '' }))).toBe(false);
  });
});

describe('almacenes', () => {
  const almacen: Almacen = {
    id: 'a1',
    codigo: 'ES-MAD',
    nombre: 'Madrid Central',
    activo: true,
  };

  it('sin código o sin nombre no se puede identificar en el albarán', () => {
    expect(almacenGuardable(almacenEnBlanco())).toBe(false);
    expect(almacenGuardable({ ...almacenEnBlanco(), codigo: 'ES', nombre: 'Madrid' })).toBe(true);
    expect(almacenGuardable({ ...almacenEnBlanco(), codigo: '  ', nombre: 'Madrid' })).toBe(false);
  });

  it('los datos de edición no llevan identificador y rellenan los huecos con vacío', () => {
    expect(datosDe(almacen)).toEqual({
      codigo: 'ES-MAD',
      nombre: 'Madrid Central',
      pais: '',
      ciudad: '',
      activo: true,
    });
  });
});

describe('impuestos', () => {
  /** Un porcentaje con decimales en coma flotante acaba en tasas de 20,999999. */
  it('el porcentaje se guarda en puntos básicos redondeados', () => {
    expect(aPuntosBasicos(21)).toBe(2100);
    expect(aPuntosBasicos(8.25)).toBe(825);
    expect(aPuntosBasicos(0)).toBe(0);
  });

  /** El vacío SIGNIFICA algo: «usa la nacional». Un cero sería «exenta», que es otra configuración. */
  it('la tasa de una región distingue el vacío del cero', () => {
    expect(tasaDeRegion('')).toBeNull();
    expect(tasaDeRegion('   ')).toBeNull();
    expect(tasaDeRegion('0')).toBe(0);
    expect(tasaDeRegion('7.25')).toBe(725);
  });

  it('sin país no hay clave; un país a cero sí es configuración válida', () => {
    expect(impuestoGuardable(impuestoEnBlanco())).toBe(false);
    expect(impuestoGuardable({ ...impuestoEnBlanco(), pais: 'ES' })).toBe(true);
  });

  it('una región necesita código y nombre', () => {
    expect(regionGuardable(regionEnBlanco())).toBe(false);
    expect(regionGuardable({ ...regionEnBlanco(), codigo: 'CA', nombre: 'California' })).toBe(true);
    expect(regionGuardable({ ...regionEnBlanco(), codigo: 'CA', nombre: ' ' })).toBe(false);
  });

  it('al editar un país se recupera su etiqueta, con vacío si no la tenía', () => {
    expect(
      datosDeImpuesto({ pais: 'ES', puntosBasicos: 2100, porcentaje: 21, activo: true }),
    ).toEqual({ pais: 'ES', etiqueta: '', porcentaje: 21, activo: true });
  });

  it('al editar una región sin tasa propia el campo queda VACÍO, no a cero', () => {
    const editada = datosDeRegion({
      pais: 'US',
      codigo: 'CA',
      nombre: 'California',
      puntosBasicos: null,
      porcentaje: null,
      activo: true,
      posicion: 0,
    });
    expect(editada.porcentaje).toBe('');
  });
});

describe('operador económico de la UE', () => {
  it('en blanco falta todo lo del artículo 16.3 menos el país, que trae valor por defecto', () => {
    expect(camposQueFaltan(operadorEnBlanco())).toEqual([
      'compliance.field.name',
      'compliance.field.address',
      'compliance.field.postal_code',
      'compliance.field.city',
      'compliance.field.email',
    ]);
    expect(operadorCompleto(operadorEnBlanco())).toBe(false);
  });

  it('con los seis campos obligatorios ya se puede publicar', () => {
    const completo = {
      ...operadorEnBlanco(),
      nombre: 'NX036 SL',
      direccion: 'C/ Mayor 1',
      codigoPostal: '28001',
      ciudad: 'Madrid',
      email: 'legal@nx036.test',
    };
    expect(camposQueFaltan(completo)).toEqual([]);
    expect(operadorCompleto(completo)).toBe(true);
  });

  it('un campo con solo espacios cuenta como que falta', () => {
    const conHueco = { ...operadorEnBlanco(), nombre: '   ' };
    expect(camposQueFaltan(conHueco)).toContain('compliance.field.name');
  });
});

describe('ganancias del operador', () => {
  it('los céntimos de yuan se leen con su símbolo y dos decimales', () => {
    expect(formateaCny(1234)).toContain('¥');
    expect(formateaCny(1234)).toContain('12,34');
    expect(formateaCny(0)).toContain('0,00');
  });

  it('se prefiere el nombre, luego el correo y por último el identificador', () => {
    expect(nombreDeOperador({ operador: 's1', nombre: 'Ana', email: 'a@x.test' })).toBe('Ana');
    expect(nombreDeOperador({ operador: 's1', email: 'a@x.test' })).toBe('a@x.test');
    expect(nombreDeOperador({ operador: 's1' })).toBe('s1');
  });

  it('una tabla vacía sigue siendo la página 1 de 1', () => {
    expect(paginasDe(0, 20)).toBe(1);
    expect(paginasDe(41, 20)).toBe(3);
    expect(paginasDe(20, 0)).toBe(20);
  });

  it('el rango por defecto son los últimos treinta días hasta hoy', () => {
    const rango = ultimoMes(new Date('2026-09-06T12:00:00Z'));
    expect(rango.hasta).toBe('2026-09-06');
    expect(rango.desde).toBe('2026-08-07');
  });

  it('los totales del reporte suman operaciones y comisión', () => {
    expect(
      totalesDelReporte([
        { operador: 'a', operaciones: 3, comisionCentimosCny: 1000 },
        { operador: 'b', operaciones: 2, comisionCentimosCny: 500 },
      ]),
    ).toEqual({ operaciones: 5, comisionCentimosCny: 1500 });
  });

  it('sin filas los totales son cero, no indefinidos', () => {
    expect(totalesDelReporte([])).toEqual({ operaciones: 0, comisionCentimosCny: 0 });
  });
});
