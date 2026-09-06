import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  DisenoPod,
  MaquetaGenerada,
  NuevoDiseno,
  ProductoEnBlanco,
} from '../../domain/model/diseno-pod';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import {
  DISENOS_PORT,
  DisenosPort,
  GENERACION_DE_DISENO_PORT,
  GeneracionDeDisenoPort,
  PRODUCTOS_EN_BLANCO_PORT,
  ProductosEnBlancoPort,
} from '../../domain/port/pod.port';
import { TASAS_DE_CAMBIO_PORT, TasasDeCambioPort } from '../../domain/port/tasas-de-cambio.port';
import { PodPage } from './pod.page';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las pruebas consultan por el TEXTO, no por la clave técnica: es lo que ve quien abre la pantalla,
 * y es lo que se rompe si alguien cambia una clave por otra que no existe —el servicio devolvería la
 * clave escrita en crudo y la prueba lo delata—. Se resuelve con la misma cadena de respaldo que el
 * servicio: idioma activo, inglés, y si no, la clave.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/**
 * El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor.
 *
 * <p>Se ESCAPA antes: hay textos con paréntesis, puntos suspensivos o interrogaciones, y esos
 * caracteres significan otra cosa dentro de una expresión regular. Sin escaparlos, la prueba pasaría
 * o fallaría por motivos que no tienen nada que ver con lo que se está comprobando.
 */
const rx = (clave: string): RegExp => new RegExp(t(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const EN_BLANCO: ProductoEnBlanco = {
  id: 'b1',
  titulo: 'Camiseta de algodón',
  imagen: 'https://cdn/b1.webp',
  precio: 8.5,
  divisa: 'USD',
};

const DISENO: DisenoPod = {
  id: 'd1',
  idProducto: 'b1',
  tituloDelProducto: 'Camiseta de algodón',
  nombre: 'Montaña',
  maquetaUrl: 'https://cdn/d1.webp',
  estado: 'READY',
  creadoEl: '2026-09-01T00:00:00Z',
};

class BlancosFalsos implements ProductosEnBlancoPort {
  filas: readonly ProductoEnBlanco[] = [EN_BLANCO];
  idiomasPedidos: string[] = [];

  async lista(idioma: string): Promise<Result<readonly ProductoEnBlanco[], AppError>> {
    this.idiomasPedidos.push(idioma);
    return exito(this.filas);
  }
}

class DisenosFalsos implements DisenosPort {
  filas: readonly DisenoPod[] = [DISENO];
  creado: NuevoDiseno | null = null;
  eliminado: string | null = null;

  async mios(): Promise<Result<readonly DisenoPod[], AppError>> {
    return exito(this.filas);
  }

  async crea(diseno: NuevoDiseno): Promise<Result<DisenoPod, AppError>> {
    this.creado = diseno;
    return exito(DISENO);
  }

  async renombra(): Promise<Result<DisenoPod, AppError>> {
    return exito(DISENO);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    this.eliminado = id;
    return exito(undefined);
  }
}

class GeneradorFalso implements GeneracionDeDisenoPort {
  respuesta: Result<MaquetaGenerada, AppError> = exito({
    maquetaUrl: 'https://cdn/generada.webp',
    instruccion: 'x',
    proveedor: 'y',
  });

  async genera(): Promise<Result<MaquetaGenerada, AppError>> {
    return this.respuesta;
  }
}

class TasasFalsas implements TasasDeCambioPort {
  async consulta(): Promise<Result<readonly TasaDeCambio[], AppError>> {
    return exito([{ codigo: 'USD', porDolar: 1 }]);
  }
}

async function monta(
  blancos = new BlancosFalsos(),
  disenos = new DisenosFalsos(),
  generador = new GeneradorFalso(),
) {
  await render(PodPage, {
    providers: [
      { provide: PRODUCTOS_EN_BLANCO_PORT, useValue: blancos },
      { provide: DISENOS_PORT, useValue: disenos },
      { provide: GENERACION_DE_DISENO_PORT, useValue: generador },
      { provide: TASAS_DE_CAMBIO_PORT, useValue: new TasasFalsas() },
    ],
  });
  return { blancos, disenos, generador };
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Escribir SIN retardo entre teclas.
 *
 * <p>El valor por defecto simula a alguien tecleando, y un formulario de tres campos se come el plazo
 * de la prueba. Aquí no se está midiendo la mecanografía de nadie.
 */
const SIN_RETARDO = { delay: null };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('PodPage', () => {
  it('enseña el catálogo de prendas y los diseños propios', async () => {
    await monta();

    expect(await screen.findByText('Camiseta de algodón')).toBeInTheDocument();
    expect(screen.getByText('Montaña')).toBeInTheDocument();
  }, 20000);

  it('el catálogo se pide en el idioma activo: sus títulos vienen traducidos del backend', async () => {
    const { blancos } = await monta();

    expect(blancos.idiomasPedidos).toContain('es');
  }, 20000);

  it('sin prendas enseña el vacío del catálogo', async () => {
    const blancos = new BlancosFalsos();
    blancos.filas = [];

    await monta(blancos);

    expect(await screen.findByText(t('pod.empty.title'))).toBeInTheDocument();
  }, 20000);

  it('sin diseños enseña su propio vacío', async () => {
    const disenos = new DisenosFalsos();
    disenos.filas = [];

    await monta(new BlancosFalsos(), disenos);

    expect(await screen.findByText(t('pod.designs_empty.title'))).toBeInTheDocument();
  }, 20000);

  it('elegir una prenda abre el formulario con su nombre en el título', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Camiseta de algodón/ }));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      `${t('pod.create_for')} Camiseta de algodón`,
    );
  }, 20000);

  it('el botón de generar solo aparece cuando hay instrucción escrita', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Camiseta de algodón/ }));
    expect(screen.queryByRole('button', { name: rx('pod.ai_generate') })).toBeNull();

    await userEvent.type(screen.getByLabelText(t('pod.field.prompt')), 'Un atardecer', SIN_RETARDO);

    expect(await screen.findByRole('button', { name: rx('pod.ai_generate') })).toBeInTheDocument();
  }, 20000);

  it('un fallo del generador se AVISA: si no, es imposible distinguirlo de un servicio caído', async () => {
    const generador = new GeneradorFalso();
    generador.respuesta = fallo(creaError('peticion-invalida', 'Instrucción rechazada'));

    await monta(new BlancosFalsos(), new DisenosFalsos(), generador);
    const avisos = TestBed.inject(AvisosStore);

    await userEvent.click(await screen.findByRole('button', { name: /Camiseta de algodón/ }));
    await userEvent.type(await screen.findByLabelText(t('pod.field.prompt')), 'algo', SIN_RETARDO);
    await userEvent.click(screen.getByRole('button', { name: rx('pod.ai_generate') }));

    expect(avisos.avisos()[0]?.mensaje).toBe('Instrucción rechazada');
  }, 20000);

  it('no se crea un diseño sin nombre', async () => {
    const { disenos } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Camiseta de algodón/ }));
    await userEvent.click(await screen.findByRole('button', { name: rx('pod.create') }));

    expect(disenos.creado).toBeNull();
  }, 20000);

  it('crear un diseño manda el producto elegido y su nombre', async () => {
    const { disenos } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Camiseta de algodón/ }));
    await userEvent.type(await screen.findByLabelText(t('pod.field.name')), 'Montaña', SIN_RETARDO);
    await userEvent.click(screen.getByRole('button', { name: rx('pod.create') }));

    expect(disenos.creado).toEqual({
      idProducto: 'b1',
      nombre: 'Montaña',
      instruccionIa: undefined,
    });
  }, 20000);

  it('borrar un diseño PREGUNTA antes', async () => {
    const { disenos } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('pod.action.delete') }));

    expect(TestBed.inject(DialogoStore).actual()?.clase).toBe('confirm');
    expect(disenos.eliminado).toBeNull();
  }, 20000);

  it('las acciones sobre un diseño se alcanzan con el teclado, no solo pasando el ratón', async () => {
    await monta();

    expect(await screen.findByRole('button', { name: t('pod.action.rename') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('pod.action.delete') })).toBeInTheDocument();
  }, 20000);
});
