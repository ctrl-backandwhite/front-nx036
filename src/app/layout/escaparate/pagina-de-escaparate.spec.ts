import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { exito } from '@shared/result/result';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { ALTA_EN_EL_BOLETIN } from '@core/newsletter/alta-en-el-boletin.port';
import { ConsentimientoDeCookiesStore } from '@core/cookies/consentimiento-de-cookies.store';
import { DecideSobreCookies } from '@core/cookies/decide-sobre-cookies';
import { PAIS_DEL_DISPOSITIVO_PORT } from '@core/cookies/pais-del-dispositivo.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { AUTENTICACION_PORT } from '@features/auth/domain/port/autenticacion.port';
import { BUZON_PORT } from '@features/notifications/domain/port/avisos.port';
import { Aviso } from '@features/notifications/domain/model/aviso';
import { CATALOGO_PORT } from '@features/catalog/domain/port/catalogo.port';
import { GUIA_DE_BIENVENIDA_PORT } from '@features/catalog/domain/port/guia-de-bienvenida.port';
import { AnadeALaCesta } from '@features/catalog/application/use-case/anade-a-la-cesta.use-case';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { PaginaDeEscaparate } from './pagina-de-escaparate';

@Component({ selector: 'nx-vacia', template: '<p>Una pantalla</p>' })
class Vacia {}

const CESTA_COMPARTIDA = {
  unidades: () => 0,
  anade: async () => ({ estado: 'anadido' as const, sugiereAhorroDeEnvio: false }),
  abreElCajon: () => undefined,
};

async function monta() {
  return render(PaginaDeEscaparate, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: AUTENTICACION_PORT, useValue: { entra: async () => exito(null), sal: async () => exito(undefined) } },
      { provide: ALTA_EN_EL_BOLETIN, useValue: { suscribe: async () => exito({ yaEstaba: false }) } },
      { provide: PAIS_DEL_DISPOSITIVO_PORT, useValue: { codigo: () => 'ES' } },
      ConsentimientoDeCookiesStore,
      DecideSobreCookies,
      { provide: BUZON_PORT, useValue: { lista: async () => exito<readonly Aviso[]>([]), sinLeer: async () => exito(3), marcaLeido: async () => exito(undefined), marcaTodosLeidos: async () => exito(undefined) } },
      { provide: ANADIR_AL_CARRITO_PORT, useValue: CESTA_COMPARTIDA },
      { provide: CATALOGO_PORT, useValue: { ficha: async () => exito(null) } },
      { provide: GUIA_DE_BIENVENIDA_PORT, useValue: { ejemplos: async () => exito({ ejemplos: [], derechoPorPartidaFormateado: '', topeDePedidoFormateado: '' }) } },
      AnadeALaCesta,
    ],
  });
}

/**
 * El anfitrión del marco del escaparate LLENA los huecos del marco.
 *
 * <p>El marco declara dos `ng-content` —la campana de avisos y los acompañantes— y se montaba
 * autocerrado, con lo que los dos quedaban vacíos. La campana, la guía de bienvenida, el asistente y la
 * ficha rápida existían, estaban probados y no los pintaba nadie.
 *
 * <p>Además del montaje se comprueba el ENVOLTORIO: si los acompañantes se marcaran desde un bloque de
 * control en vez de desde un elemento con el atributo del hueco, el contenido saldría del hueco y
 * volvería a no pintarse, esta vez sin nada que lo delatara. Por eso se mira que están DENTRO de la
 * cabecera y del marco, no solo que existen.
 */
describe('PaginaDeEscaparate', () => {
  it('con sesión, la campana de avisos se pinta dentro de la cabecera', async () => {
    const { container, detectChanges } = await monta();
    TestBed.inject(SesionActual).publica({
      id: 'u1',
      nombreVisible: 'Ana',
      rol: 'USER',
      pais: 'ES',
    });
    detectChanges();

    expect(container.querySelector('header nx-campana-de-avisos')).not.toBeNull();
  });

  it('sin sesión no hay campana: el buzón responde 401 y preguntaría en balde', async () => {
    const { container } = await monta();

    expect(container.querySelector('nx-campana-de-avisos')).toBeNull();
  });

  it('pinta la guía de bienvenida y la ficha rápida como acompañantes del marco', async () => {
    const { container } = await monta();

    expect(container.querySelector('nx-guia-de-bienvenida')).not.toBeNull();
    expect(container.querySelector('nx-vista-rapida')).not.toBeNull();
  });

  /**
   * El asistente flotante SOLO con sesión, igual que en el front anterior.
   *
   * <p>Esta prueba nació al revés: daba por hecho que el asistente estaba siempre y por eso se quedó en
   * verde mientras, sin sesión, su capa se plantaba encima de la página y tapaba los botones a quien
   * acababa de llegar. Se descubrió con las pruebas de acciones, que empezaron a agotar el tiempo
   * pulsando controles que estaban a la vista y no se dejaban pulsar.
   */
  it('el asistente flotante no aparece sin sesión, y sí aparece con ella', async () => {
    const { container, detectChanges } = await monta();

    expect(
      container.querySelector('nx-asistencia-flotante'),
      'sin sesión el asistente tapa la página a quien acaba de llegar',
    ).toBeNull();

    TestBed.inject(SesionActual).publica({
      id: 'u1',
      nombreVisible: 'Ana',
      rol: 'USER',
      pais: 'ES',
    });
    detectChanges();

    expect(container.querySelector('nx-asistencia-flotante')).not.toBeNull();
  });

  /**
   * El icono de la cesta ABRE EL CAJÓN. Antes navegaba a `/cart`, que es otra pantalla: llevaba al
   * sitio correcto, así que no se leía como un fallo, pero sacaba de donde se estaba.
   */
  it('el icono de la cesta abre el cajón en vez de navegar', async () => {
    const { container } = await monta();
    const carrito = TestBed.inject(CarritoStore);
    expect(carrito.cajonAbierto()).toBe(false);

    container.querySelector<HTMLButtonElement>('#nx-cart-icon button')!.click();

    expect(carrito.cajonAbierto()).toBe(true);
  });
});
