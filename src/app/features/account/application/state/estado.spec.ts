import { TestBed } from '@angular/core/testing';
import { Usuario } from '@features/auth/domain/model/usuario';
import { CuentaStore } from './cuenta.store';
import { DireccionesStore } from './direcciones.store';
import { CobrosStore } from './cobros.store';
import { PlanesStore } from './planes.store';
import { Direccion } from '../../domain/model/direccion';
import { Plan } from '../../domain/model/plan';

function usuario(cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u-1',
    email: 'ana@nx036.test',
    rol: 'USER',
    activo: true,
    creadoEl: '2026-01-01T00:00:00Z',
    permisos: [],
    ...cambios,
  };
}

function direccion(id: string): Direccion {
  return {
    id,
    nombreCompleto: 'Ana',
    linea1: 'Calle',
    ciudad: 'Madrid',
    pais: 'ES',
    porDefecto: false,
    creadaEl: '2026-01-01T00:00:00Z',
  };
}

describe('CuentaStore', () => {
  let almacen: CuentaStore;

  beforeEach(() => {
    almacen = TestBed.configureTestingModule({}).inject(CuentaStore);
  });

  it('al arrancar no se sabe todavía quién mira', () => {
    expect(almacen.resuelta()).toBe(false);
    expect(almacen.hayTitular()).toBe(false);
  });

  it('queda resuelta aunque no haya nadie: «anónimo» también es una respuesta', () => {
    almacen.fija(null);

    expect(almacen.resuelta()).toBe(true);
    expect(almacen.hayTitular()).toBe(false);
  });

  /**
   * El país es el de REGISTRO y fija el margen: si el cliente pudiera cambiarlo, cambiaría su precio.
   */
  it('solo quien administra puede cambiar el país', () => {
    almacen.fija(usuario({ rol: 'USER' }));
    expect(almacen.puedeCambiarElPais()).toBe(false);

    almacen.fija(usuario({ rol: 'ADMIN' }));
    expect(almacen.puedeCambiarElPais()).toBe(true);
  });

  it('siembra el formulario con los datos del titular', () => {
    almacen.fija(usuario({ nombre: 'Ana', primerApellido: 'Pérez', pais: 'ES', idioma: 'en' }));

    expect(almacen.datosDelFormulario()).toEqual({
      nombre: 'Ana',
      primerApellido: 'Pérez',
      segundoApellido: '',
      empresa: '',
      pais: 'ES',
      idioma: 'en',
      telefono: '',
    });
  });

  it('sin titular el formulario sale vacío y en español, no con nulos', () => {
    expect(almacen.datosDelFormulario().nombre).toBe('');
    expect(almacen.datosDelFormulario().idioma).toBe('es');
  });
});

describe('DireccionesStore', () => {
  let almacen: DireccionesStore;

  beforeEach(() => {
    almacen = TestBed.configureTestingModule({}).inject(DireccionesStore);
  });

  it('mientras no se hayan cargado no se dice que estén vacías', () => {
    expect(almacen.vacio()).toBe(false);
  });

  it('una vez cargadas y sin ninguna, sí', () => {
    almacen.fija([]);

    expect(almacen.vacio()).toBe(true);
    expect(almacen.seraLaPrimera()).toBe(true);
  });

  it('el perfil enseña cuatro y cuenta las que sobran', () => {
    almacen.fija(['a', 'b', 'c', 'd', 'e', 'f'].map(direccion));

    expect(almacen.primeras()).toHaveLength(4);
    expect(almacen.cuantasSobran()).toBe(2);
  });

  it('con cuatro o menos no sobra ninguna', () => {
    almacen.fija(['a', 'b'].map(direccion));

    expect(almacen.cuantasSobran()).toBe(0);
    expect(almacen.seraLaPrimera()).toBe(false);
  });

  it('apunta cuándo está cargando', () => {
    almacen.marcaCargando(true);
    expect(almacen.cargando()).toBe(true);

    almacen.marcaCargando(false);
    expect(almacen.cargando()).toBe(false);
  });
});

describe('CobrosStore', () => {
  let almacen: CobrosStore;

  beforeEach(() => {
    almacen = TestBed.configureTestingModule({}).inject(CobrosStore);
  });

  it('sin configuración no hay cobro con tarjeta ni clave que dar a la pasarela', () => {
    expect(almacen.conTarjeta()).toBe(false);
    expect(almacen.activo()).toBe(false);
    expect(almacen.clavePublicable()).toBe('');
    expect(almacen.sinMetodos()).toBe(true);
  });

  it('con la pasarela activa expone la clave y el estado de la prueba', () => {
    almacen.fijaConfiguracion({ clavePublicable: 'pk_test', activo: true, pruebaGratisGastada: true });

    expect(almacen.conTarjeta()).toBe(true);
    expect(almacen.clavePublicable()).toBe('pk_test');
    expect(almacen.pruebaGratisGastada()).toBe(true);
  });

  it('guarda los métodos que le den', () => {
    almacen.fijaMetodos([{ referencia: 'pm_1', tipo: 'TARJETA', porDefecto: true }]);

    expect(almacen.sinMetodos()).toBe(false);
  });
});

describe('PlanesStore', () => {
  let almacen: PlanesStore;

  const gratis: Plan = {
    id: 'plan-free',
    codigo: 'FREE',
    nombre: 'Gratis',
    centimosMensuales: 0,
    centimosAnuales: 0,
    posicion: 1,
    limites: {},
  };

  beforeEach(() => {
    almacen = TestBed.configureTestingModule({}).inject(PlanesStore);
  });

  it('empieza en mensual', () => {
    expect(almacen.periodo()).toBe('MENSUAL');
  });

  it('cambia de periodicidad sin volver a pedir nada', () => {
    almacen.cambiaPeriodo('ANUAL');

    expect(almacen.periodo()).toBe('ANUAL');
  });

  it('sin suscripción ni facturas, la sección no se enseña', () => {
    expect(almacen.haySuscripcionOFacturas()).toBe(false);
  });

  it('con facturas pero sin suscripción, sí se enseña', () => {
    almacen.fijaFacturas([{ numero: 'F-1' }]);

    expect(almacen.haySuscripcionOFacturas()).toBe(true);
  });

  it('reconoce que la suscripción vigente es una prueba', () => {
    almacen.fijaPlanes([gratis]);
    almacen.fijaSuscripcion({ idPlan: 'plan-free', estado: 'ACTIVE', periodoDeFacturacion: 'MONTHLY' });

    expect(almacen.planContratado()).toBe(gratis);
    expect(almacen.enPrueba()).toBe(true);
  });

  it('sin suscripción no hay plan contratado ni prueba', () => {
    almacen.fijaPlanes([gratis]);

    expect(almacen.planContratado()).toBeUndefined();
    expect(almacen.enPrueba()).toBe(false);
  });
});
