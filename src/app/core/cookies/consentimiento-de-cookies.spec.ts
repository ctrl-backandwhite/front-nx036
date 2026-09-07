import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL, AlmacenPort } from '@core/storage/almacen.port';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';
import { CLAVE_DEL_CONSENTIMIENTO } from './regimen-de-cookies';
import {
  PAIS_DEL_DISPOSITIVO_PORT,
  PaisDelDispositivoPort,
} from './pais-del-dispositivo.port';
import { ConsentimientoDeCookiesStore } from './consentimiento-de-cookies.store';
import { DecideSobreCookies } from './decide-sobre-cookies';
import { ConsentimientoDeCookies } from './consentimiento-de-cookies';
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

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

class AlmacenEnMemoria implements AlmacenPort {
  readonly datos = new Map<string, string>();

  lee(clave: string): string | null {
    return this.datos.get(clave) ?? null;
  }

  guarda(clave: string, valor: string): void {
    this.datos.set(clave, valor);
  }

  borra(clave: string): void {
    this.datos.delete(clave);
  }
}

class PaisFalso implements PaisDelDispositivoPort {
  constructor(private readonly valor = 'ES') {}

  codigo(): string {
    return this.valor;
  }
}

async function monta(almacen = new AlmacenEnMemoria(), pais = new PaisFalso()) {
  const vista = await render(ConsentimientoDeCookies, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      ConsentimientoDeCookiesStore,
      DecideSobreCookies,
      { provide: ALMACEN_LOCAL, useValue: almacen },
      { provide: PAIS_DEL_DISPOSITIVO_PORT, useValue: pais },
    ],
  });
  return { vista, almacen };
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('ConsentimientoDeCookies', () => {
  it('enseña el aviso mientras no se haya decidido', async () => {
    await monta();

    expect(await screen.findByText(rx('cookies.banner.optin'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('cookies.accept_all') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('cookies.reject_all') })).toBeInTheDocument();
  }, 20000);

  it('el texto se adapta al régimen del país', async () => {
    await monta(new AlmacenEnMemoria(), new PaisFalso('US'));

    expect(await screen.findByText(rx('cookies.banner.ccpa'))).toBeInTheDocument();
  }, 20000);

  it('aceptar todo guarda la decisión y retira el aviso', async () => {
    const { almacen } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.accept_all') }));

    expect(almacen.lee(CLAVE_DEL_CONSENTIMIENTO)).toContain('"analytics":true');
    expect(screen.queryByRole('button', { name: t('cookies.accept_all') })).toBeNull();
  }, 20000);

  it('rechazar todo también se guarda: es una decisión, no la ausencia de una', async () => {
    const { almacen } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.reject_all') }));

    expect(almacen.lee(CLAVE_DEL_CONSENTIMIENTO)).toContain('"marketing":false');
  }, 20000);

  it('el panel de ajuste arranca con las dos categorías APAGADAS', async () => {
    // Encontrarse las casillas marcadas convierte la elección en un descuido, que es la forma de
    // consentimiento que la norma no admite.
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.customize') }));

    expect(screen.getByLabelText(t('cookies.analytics'))).not.toBeChecked();
    expect(screen.getByLabelText(t('cookies.marketing'))).not.toBeChecked();
  }, 20000);

  it('las cookies necesarias no se preguntan: no hay interruptor', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.customize') }));

    expect(screen.getByText(t('cookies.always_on'))).toBeInTheDocument();
    expect(screen.queryByLabelText(t('cookies.necessary'))).toBeNull();
  }, 20000);

  it('guardar una selección a medida respeta cada categoría', async () => {
    const { almacen } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.customize') }));
    await userEvent.click(screen.getByLabelText(t('cookies.analytics')));
    await userEvent.click(screen.getByRole('button', { name: t('cookies.save') }));

    const guardado = almacen.lee(CLAVE_DEL_CONSENTIMIENTO) ?? '';
    expect(guardado).toContain('"analytics":true');
    expect(guardado).toContain('"marketing":false');
  }, 20000);

  it('el país del PERFIL manda sobre el del equipo', async () => {
    const almacen = new AlmacenEnMemoria();
    await monta(almacen, new PaisFalso('US'));
    const estado = TestBed.inject(ConsentimientoDeCookiesStore);

    TestBed.inject(PaisDelUsuario).fija('BR');
    await Promise.resolve();
    TestBed.tick();

    expect(estado.regimen()).toBe('lgpd');
  }, 20000);

  it('el panel se anuncia como diálogo con su título', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('button', { name: t('cookies.customize') }));

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveAccessibleName(t('cookies.title'));
  }, 20000);
});
