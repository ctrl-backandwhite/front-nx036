import { EjeDeVariacion, esEjeDeColor, fotoDelValor, tieneEtiquetaGuardada } from './eje-de-variacion';
import { etiquetaDeTramo, normalizaSlug, tituloEnIdioma } from './ficha-de-producto';
import type { FichaDeProducto } from './ficha-de-producto';
import { traduceOpciones } from './glosario-de-variantes';
import { descripcionCambiada, puedeAprobarse } from './grupo-de-declaracion';
import { candidatosAMiembro, grupoGuardable } from './grupo-de-productos';
import {
  BORRADOR_DE_PROVEEDOR_VACIO,
  aBorradorDeProveedor,
  desdeBorradorDeProveedor,
  proveedorGuardable,
  ubicacionDeProveedor,
} from './proveedor-admin';
import { huboFallos, primerosErrores } from './resultado-masivo';

describe('eje-de-variacion', () => {
  const eje = (nombre: string, nombreZh = ''): EjeDeVariacion => ({
    id: '1',
    nombre,
    nombreZh,
    posicion: 0,
    valores: [],
  });

  /** De esto depende que se ofrezca el campo de foto: solo el color exige imagen real. */
  it('reconoce el eje de color en los dos idiomas', () => {
    expect(esEjeDeColor(eje('Color'))).toBe(true);
    expect(esEjeDeColor(eje('', '颜色'))).toBe(true);
    expect(esEjeDeColor(eje('Colour'))).toBe(true);
    expect(esEjeDeColor(eje('Talla'))).toBe(false);
  });

  it('distingue una etiqueta guardada de un hueco', () => {
    expect(tieneEtiquetaGuardada({ valor: 'Blanco roto' })).toBe(true);
    expect(tieneEtiquetaGuardada({ valor: '   ' })).toBe(false);
    expect(tieneEtiquetaGuardada({})).toBe(false);
  });

  it('la foto del valor sale del CDN o del origen', () => {
    expect(
      fotoDelValor({ id: '1', valorZh: '红', urlImagenOrigen: ' https://o.jpg ', posicion: 0 }),
    ).toBe('https://o.jpg');
    expect(fotoDelValor({ id: '1', valorZh: '红', posicion: 0 })).toBe('');
  });
});

describe('ficha-de-producto', () => {
  const ficha = {
    titulo: 'Auricular',
    tituloZh: '耳机',
    titulosPorIdioma: { fr: 'Casque' },
  } as unknown as FichaDeProducto;

  it('el título cae del idioma pedido al canónico y al chino', () => {
    expect(tituloEnIdioma(ficha, 'fr')).toBe('Casque');
    expect(tituloEnIdioma(ficha, 'de')).toBe('Auricular');
    expect(tituloEnIdioma({ ...ficha, titulo: '' }, 'de')).toBe('耳机');
  });

  it('el tramo se lee como rango o como mínimo abierto', () => {
    expect(etiquetaDeTramo({ cantidadMinima: 1, cantidadMaxima: 9, precioUnitario: 0, divisa: '' })).toBe('1–9');
    expect(etiquetaDeTramo({ cantidadMinima: 10, precioUnitario: 0, divisa: '' })).toBe('≥10');
  });

  /** Los slugs importados llegan con guiones sueltos delante o detrás. */
  it('el slug se limpia de guiones sueltos', () => {
    expect(normalizaSlug('--auricular-x--')).toBe('auricular-x');
    expect(normalizaSlug(null)).toBe('—');
  });
});

describe('glosario-de-variantes', () => {
  it('traduce lo que conoce y deja pasar lo demás', () => {
    expect(traduceOpciones('颜色 白色', 'es')).toBe('Color Blanco');
    expect(traduceOpciones('颜色 XL', 'en')).toBe('Color XL');
  });

  it('en chino no se traduce nada: es el idioma de origen', () => {
    expect(traduceOpciones('颜色 白色', 'zh')).toBe('颜色 白色');
    expect(traduceOpciones('', 'es')).toBe('');
  });
});

describe('grupo-de-declaracion', () => {
  const grupo = {
    id: '1',
    hs6: '620342',
    material: 'algodón',
    codigoDeUso: 'ropa',
    nombreEn: 'Trousers',
    nombreZh: '裤子',
    numeroDeProductos: 12,
    aprobado: false,
    sinRedactar: false,
  };

  /** Sin descripción en inglés el transportista rechazaría la guía: no hay nada que firmar. */
  it('sin descripción en inglés no se puede aprobar', () => {
    expect(puedeAprobarse('   ')).toBe(false);
    expect(puedeAprobarse('Trousers')).toBe(true);
  });

  /**
   * «Goods of HS heading 620342» es el relleno con el que nace un grupo cuya partida no está en la
   * nomenclatura: describe un número, no una mercancía. Firmarlo lo pone así en la declaración.
   */
  it('el relleno de la partida no se puede firmar tal cual', () => {
    const relleno = { ...grupo, sinRedactar: true, nombreEn: 'Goods of HS heading 620342' };

    expect(puedeAprobarse('Goods of HS heading 620342', relleno)).toBe(false);
  });

  /** Escrita la descripción se firma sin recargar: se mira lo TECLEADO, no lo que trajo el servidor. */
  it('redactado a mano, se puede firmar aunque el servidor aún lo diera por relleno', () => {
    const relleno = { ...grupo, sinRedactar: true, nombreEn: 'Goods of HS heading 620342' };

    expect(puedeAprobarse("Men's or boys' trousers, of cotton", relleno)).toBe(true);
  });

  it('solo hay algo que guardar si el texto cambió', () => {
    expect(descripcionCambiada(grupo, 'Trousers', '裤子')).toBe(false);
    expect(descripcionCambiada(grupo, 'Pants', '裤子')).toBe(true);
    expect(descripcionCambiada(grupo, 'Trousers', '长裤')).toBe(true);
  });
});

describe('grupo-de-productos', () => {
  it('sin nombre no hay grupo', () => {
    expect(grupoGuardable({ nombre: '  ', descripcion: '', activo: true })).toBe(false);
    expect(grupoGuardable({ nombre: 'Ropa cara', descripcion: '', activo: true })).toBe(true);
  });

  it('los candidatos excluyen a los que ya están dentro', () => {
    const encontrados = [
      { id: '1', titulo: 'A', slug: 'a' },
      { id: '2', titulo: 'B', slug: 'b' },
    ];
    expect(candidatosAMiembro(encontrados, [{ id: '1', titulo: 'A', slug: 'a' }])).toEqual([
      encontrados[1],
    ]);
  });
});

describe('proveedor-admin', () => {
  /** Concatenar a ciegas dejaba filas que empezaban por coma: «, China». */
  it('la ubicación une solo lo que existe', () => {
    expect(ubicacionDeProveedor('Yiwu', 'China')).toBe('Yiwu, China');
    expect(ubicacionDeProveedor(undefined, 'China')).toBe('China');
    expect(ubicacionDeProveedor(undefined, undefined)).toBe('—');
  });

  it('sin nombre no se guarda: es lo único que identifica al proveedor', () => {
    expect(proveedorGuardable(BORRADOR_DE_PROVEEDOR_VACIO)).toBe(false);
    expect(proveedorGuardable({ ...BORRADOR_DE_PROVEEDOR_VACIO, nombre: 'Acme' })).toBe(true);
  });

  it('el borrador va y vuelve, y lo vacío se guarda como nulo', () => {
    const borrador = aBorradorDeProveedor({
      id: '1',
      idExterno: 'x',
      origen: '1688',
      nombre: 'Acme',
      pais: 'CN',
      verificado: true,
      trustPass: false,
      numeroDeProductos: 4,
      valoracion: 4.5,
    });
    expect(borrador.valoracion).toBe('4.5');
    const cambios = desdeBorradorDeProveedor({ ...borrador, valoracion: '', anosActivo: '' });
    expect(cambios.valoracion).toBeNull();
    expect(cambios.anosActivo).toBeNull();
    expect(cambios.nombre).toBe('Acme');
  });
});

describe('resultado-masivo', () => {
  it('un lote con fallos no es un éxito', () => {
    expect(huboFallos({ correctos: 3, fallidos: 1, errores: [] })).toBe(true);
    expect(huboFallos({ correctos: 3, fallidos: 0, errores: [] })).toBe(false);
  });

  it('solo se enseñan los primeros motivos, para no llenar la pantalla', () => {
    const errores = Array.from({ length: 20 }, (_, i) => `error ${i}`);
    expect(primerosErrores({ correctos: 0, fallidos: 20, errores }, 3)).toBe(
      'error 0\nerror 1\nerror 2',
    );
  });
});
