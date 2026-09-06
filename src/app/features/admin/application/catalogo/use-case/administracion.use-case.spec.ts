import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { BORRADOR_DE_CATEGORIA_VACIO } from '../../../domain/catalogo/model/categoria-admin';
import { BORRADOR_DE_GRUPO_VACIO } from '../../../domain/catalogo/model/grupo-de-productos';
import { BORRADOR_DE_PROVEEDOR_VACIO } from '../../../domain/catalogo/model/proveedor-admin';
import { CATEGORIAS_ADMIN_PORT } from '../../../domain/catalogo/port/categorias-admin.port';
import { GRUPOS_DE_DECLARACION_PORT } from '../../../domain/catalogo/port/grupos-de-declaracion.port';
import {
  GRUPOS_DE_PRODUCTOS_PORT,
  MIEMBROS_DE_GRUPO_PORT,
} from '../../../domain/catalogo/port/grupos-de-productos.port';
import {
  PROVEEDORES_ADMIN_PORT,
  PROVEEDORES_MASIVOS_PORT,
} from '../../../domain/catalogo/port/proveedores-admin.port';
import { EliminaCategorias, GuardaCategoria } from './administra-categorias.use-case';
import { CambiaAprobacionDeGrupo } from './administra-grupos-de-declaracion.use-case';
import {
  CambiaMiembrosDelGrupo,
  GuardaGrupoDeProductos,
} from './administra-grupos-de-productos.use-case';
import {
  CambiaVerificacionDeProveedores,
  EliminaProveedores,
  GuardaProveedor,
} from './administra-proveedores.use-case';

const categorias = {
  listaPaginada: vi.fn(),
  listaTodas: vi.fn(),
  crea: vi.fn(),
  actualiza: vi.fn(),
  elimina: vi.fn(),
  alterna: vi.fn(),
  activaEnLote: vi.fn(),
  reindexa: vi.fn(),
};
const proveedores = {
  lista: vi.fn(),
  crea: vi.fn(),
  actualiza: vi.fn(),
  elimina: vi.fn(),
  alternaVerificado: vi.fn(),
  reindexa: vi.fn(),
};
const proveedoresMasivos = { verifica: vi.fn(), eliminaEnLote: vi.fn() };
const grupos = { lista: vi.fn(), crea: vi.fn(), actualiza: vi.fn(), elimina: vi.fn() };
const miembros = { lista: vi.fn(), anade: vi.fn(), quita: vi.fn(), busca: vi.fn() };
const declaracion = {
  lista: vi.fn(),
  actualiza: vi.fn(),
  aprueba: vi.fn(),
  retiraAprobacion: vi.fn(),
  siembra: vi.fn(),
};

describe('casos de uso de administración del catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CATEGORIAS_ADMIN_PORT, useValue: categorias },
        { provide: PROVEEDORES_ADMIN_PORT, useValue: proveedores },
        { provide: PROVEEDORES_MASIVOS_PORT, useValue: proveedoresMasivos },
        { provide: GRUPOS_DE_PRODUCTOS_PORT, useValue: grupos },
        { provide: MIEMBROS_DE_GRUPO_PORT, useValue: miembros },
        { provide: GRUPOS_DE_DECLARACION_PORT, useValue: declaracion },
        GuardaCategoria,
        EliminaCategorias,
        GuardaProveedor,
        EliminaProveedores,
        CambiaVerificacionDeProveedores,
        GuardaGrupoDeProductos,
        CambiaMiembrosDelGrupo,
        CambiaAprobacionDeGrupo,
      ],
    });
  });

  describe('GuardaCategoria', () => {
    it('no manda un borrador que el backend rechazaría', async () => {
      const resultado = await TestBed.inject(GuardaCategoria).ejecuta(BORRADOR_DE_CATEGORIA_VACIO);

      expect(resultado.ok).toBe(false);
      expect(categorias.crea).not.toHaveBeenCalled();
    });

    it('crea sin identificador y actualiza con él', async () => {
      categorias.crea.mockResolvedValue(exito(undefined));
      categorias.actualiza.mockResolvedValue(exito(undefined));
      const borrador = {
        ...BORRADOR_DE_CATEGORIA_VACIO,
        slug: 'ropa',
        nombreEs: 'Ropa',
        nombreEn: 'Clothes',
      };

      await TestBed.inject(GuardaCategoria).ejecuta(borrador);
      await TestBed.inject(GuardaCategoria).ejecuta(borrador, 'c1');

      expect(categorias.crea).toHaveBeenCalledTimes(1);
      expect(categorias.actualiza).toHaveBeenCalledWith('c1', borrador);
    });
  });

  /** No hay ruta de lote: se van una a una y el motivo de cada negativa viaja con su identificador. */
  it('el borrado de categorías cuenta las que entraron y por qué falló cada otra', async () => {
    categorias.elimina
      .mockResolvedValueOnce(exito(undefined))
      .mockResolvedValueOnce(fallo(creaError('conflicto', 'Tiene productos')));

    const resultado = await TestBed.inject(EliminaCategorias).ejecuta(['c1', 'c2']);

    expect(resultado.ok && resultado.valor.borradas).toBe(1);
    expect(resultado.ok && resultado.valor.fallos[0]).toBe('c2: Tiene productos');
  });

  describe('GuardaProveedor', () => {
    it('sin nombre no llega al servidor', async () => {
      const resultado = await TestBed.inject(GuardaProveedor).ejecuta(BORRADOR_DE_PROVEEDOR_VACIO);

      expect(resultado.ok).toBe(false);
      expect(proveedores.crea).not.toHaveBeenCalled();
    });

    it('con nombre se convierte a los tipos del negocio antes de mandarlo', async () => {
      proveedores.crea.mockResolvedValue(exito(undefined));

      await TestBed.inject(GuardaProveedor).ejecuta({
        ...BORRADOR_DE_PROVEEDOR_VACIO,
        nombre: 'Acme',
        valoracion: '4.5',
      });

      expect(proveedores.crea).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Acme', valoracion: 4.5, anosActivo: null }),
      );
    });
  });

  describe('CambiaVerificacionDeProveedores', () => {
    /** En lote hay que FIJAR el valor: alternar dejaría la mitad verificados y la otra mitad no. */
    it('sin valor alterna el de uno; con valor lo fija para todos', async () => {
      proveedores.alternaVerificado.mockResolvedValue(exito(undefined));
      proveedoresMasivos.verifica.mockResolvedValue(
        exito({ correctos: 2, fallidos: 0, errores: [] }),
      );

      await TestBed.inject(CambiaVerificacionDeProveedores).ejecuta(['s1']);
      await TestBed.inject(CambiaVerificacionDeProveedores).ejecuta(['s1', 's2'], true);

      expect(proveedores.alternaVerificado).toHaveBeenCalledWith('s1');
      expect(proveedoresMasivos.verifica).toHaveBeenCalledWith(['s1', 's2'], true);
    });

    it('sin proveedores no llama a nadie', async () => {
      const resultado = await TestBed.inject(CambiaVerificacionDeProveedores).ejecuta([]);
      expect(resultado).toEqual(exito({ correctos: 0, fallidos: 0, errores: [] }));
    });
  });

  it('el borrado de proveedores usa la ruta individual con uno y la de lote con varios', async () => {
    proveedores.elimina.mockResolvedValue(exito(undefined));
    proveedoresMasivos.eliminaEnLote.mockResolvedValue(
      exito({ correctos: 1, fallidos: 1, errores: ['tiene productos'] }),
    );

    await TestBed.inject(EliminaProveedores).ejecuta(['s1']);
    await TestBed.inject(EliminaProveedores).ejecuta(['s1', 's2']);

    expect(proveedores.elimina).toHaveBeenCalledWith('s1');
    expect(proveedoresMasivos.eliminaEnLote).toHaveBeenCalledWith(['s1', 's2']);
  });

  describe('GuardaGrupoDeProductos', () => {
    it('sin nombre no se guarda', async () => {
      const resultado = await TestBed.inject(GuardaGrupoDeProductos).ejecuta(BORRADOR_DE_GRUPO_VACIO);
      expect(resultado.ok).toBe(false);
    });

    it('crea o actualiza según lleve identificador', async () => {
      grupos.crea.mockResolvedValue(exito(undefined));
      grupos.actualiza.mockResolvedValue(exito(undefined));

      await TestBed.inject(GuardaGrupoDeProductos).ejecuta({ ...BORRADOR_DE_GRUPO_VACIO, nombre: 'A' });
      await TestBed.inject(GuardaGrupoDeProductos).ejecuta({
        ...BORRADOR_DE_GRUPO_VACIO,
        id: 'g1',
        nombre: 'A',
      });

      expect(grupos.crea).toHaveBeenCalledTimes(1);
      expect(grupos.actualiza).toHaveBeenCalledTimes(1);
    });
  });

  it('meter y sacar del grupo usan cada uno su ruta', async () => {
    miembros.anade.mockResolvedValue(exito(1));
    miembros.quita.mockResolvedValue(exito(undefined));

    await TestBed.inject(CambiaMiembrosDelGrupo).ejecuta('g1', 'p1', true);
    await TestBed.inject(CambiaMiembrosDelGrupo).ejecuta('g1', 'p1', false);

    expect(miembros.anade).toHaveBeenCalledWith('g1', ['p1']);
    expect(miembros.quita).toHaveBeenCalledWith('g1', 'p1');
  });

  describe('CambiaAprobacionDeGrupo', () => {
    const grupo = {
      id: 'd1',
      hs6: '620342',
      material: 'algodón',
      codigoDeUso: 'ropa',
      nombreEn: '',
      nombreZh: '',
      numeroDeProductos: 3,
      aprobado: false,
    };

    /** Aprobar es firmar: sin descripción en inglés el transportista rechazaría la guía. */
    it('no deja firmar sin descripción en inglés', async () => {
      const resultado = await TestBed.inject(CambiaAprobacionDeGrupo).ejecuta(grupo, true);

      expect(resultado.ok).toBe(false);
      expect(declaracion.aprueba).not.toHaveBeenCalled();
    });

    it('con descripción firma, y retirar la firma nunca se bloquea', async () => {
      declaracion.aprueba.mockResolvedValue(exito(undefined));
      declaracion.retiraAprobacion.mockResolvedValue(exito(undefined));

      await TestBed.inject(CambiaAprobacionDeGrupo).ejecuta({ ...grupo, nombreEn: 'Trousers' }, true);
      await TestBed.inject(CambiaAprobacionDeGrupo).ejecuta(grupo, false);

      expect(declaracion.aprueba).toHaveBeenCalledWith('d1');
      expect(declaracion.retiraAprobacion).toHaveBeenCalledWith('d1');
    });
  });
});
