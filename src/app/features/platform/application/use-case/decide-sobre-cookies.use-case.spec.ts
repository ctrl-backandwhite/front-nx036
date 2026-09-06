import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL, AlmacenPort } from '@core/storage/almacen.port';
import {
  CLAVE_DEL_CONSENTIMIENTO,
  VERSION_DEL_CONSENTIMIENTO,
} from '../../domain/model/consentimiento-de-cookies';
import {
  PAIS_DEL_DISPOSITIVO_PORT,
  PaisDelDispositivoPort,
} from '../../domain/port/pais-del-dispositivo.port';
import { ConsentimientoDeCookiesStore } from '../state/consentimiento-de-cookies.store';
import { DecideSobreCookies } from './decide-sobre-cookies.use-case';

/** Un almacén en memoria: el contrato dice que NUNCA lanza, ni siquiera en modo privado. */
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
  valor = '';

  codigo(): string {
    return this.valor;
  }
}

describe('DecideSobreCookies', () => {
  let almacen: AlmacenEnMemoria;
  let pais: PaisFalso;
  let estado: ConsentimientoDeCookiesStore;
  let caso: DecideSobreCookies;

  beforeEach(() => {
    almacen = new AlmacenEnMemoria();
    pais = new PaisFalso();
    TestBed.configureTestingModule({
      providers: [
        ConsentimientoDeCookiesStore,
        DecideSobreCookies,
        { provide: ALMACEN_LOCAL, useValue: almacen },
        { provide: PAIS_DEL_DISPOSITIVO_PORT, useValue: pais },
      ],
    });
    estado = TestBed.inject(ConsentimientoDeCookiesStore);
    caso = TestBed.inject(DecideSobreCookies);
  });

  describe('al arrancar', () => {
    it('NO enciende nada mientras no se haya decidido, viva quien viva donde viva', () => {
      // Es el punto del que se aprendió: en los regímenes de oposición se encendían analítica y
      // publicidad de entrada, y una detección de país fallida —lo habitual— las cargaba sin
      // consentimiento a alguien en Europa.
      pais.valor = 'US';

      caso.arranca(null);

      expect(estado.regimen()).toBe('ccpa');
      expect(estado.decidido()).toBe(false);
      expect(estado.categorias()).toEqual({ analitica: false, publicidad: false });
      expect(estado.permite('analitica')).toBe(false);
    });

    it('el país del PERFIL manda sobre el del equipo', () => {
      pais.valor = 'US';

      caso.arranca('es');

      expect(estado.pais()).toBe('ES');
      expect(estado.regimen()).toBe('gdpr');
    });

    it('recupera una decisión guardada', () => {
      almacen.guarda(
        CLAVE_DEL_CONSENTIMIENTO,
        JSON.stringify({
          v: VERSION_DEL_CONSENTIMIENTO,
          ts: '2026-09-01T00:00:00.000Z',
          consent: { analytics: true, marketing: false },
        }),
      );

      caso.arranca('ES');

      expect(estado.decidido()).toBe(true);
      expect(estado.permite('analitica')).toBe(true);
      expect(estado.permite('publicidad')).toBe(false);
    });

    it('una decisión guardada con otra versión no vale: se vuelve a preguntar', () => {
      almacen.guarda(
        CLAVE_DEL_CONSENTIMIENTO,
        JSON.stringify({ v: 99, consent: { analytics: true, marketing: true } }),
      );

      caso.arranca('ES');

      expect(estado.decidido()).toBe(false);
      expect(estado.permite('analitica')).toBe(false);
    });
  });

  describe('al decidir', () => {
    beforeEach(() => caso.arranca('ES'));

    it('aceptar todo enciende las dos categorías y lo deja escrito', () => {
      caso.aceptaTodo();

      expect(estado.categorias()).toEqual({ analitica: true, publicidad: true });
      expect(estado.decidido()).toBe(true);
      expect(almacen.lee(CLAVE_DEL_CONSENTIMIENTO)).toContain('"analytics":true');
    });

    it('rechazar todo también se guarda: es una decisión, no la ausencia de una', () => {
      caso.rechazaTodo();

      expect(estado.decidido()).toBe(true);
      expect(almacen.lee(CLAVE_DEL_CONSENTIMIENTO)).toContain('"marketing":false');
    });

    it('guardar una selección a medida respeta cada categoría', () => {
      caso.guarda({ analitica: false, publicidad: true });

      expect(estado.permite('analitica')).toBe(false);
      expect(estado.permite('publicidad')).toBe(true);
    });
  });

  describe('al retirar el consentimiento', () => {
    it('BORRA lo guardado, no se limita a reabrir el aviso', () => {
      // Art. 7.3 del RGPD: retirarlo tiene que ser tan fácil como darlo. Si solo se reabriera el
      // panel, cerrarlo sin elegir dejaría en pie el «acepto todo» de antes.
      caso.arranca('ES');
      caso.aceptaTodo();

      caso.retira();

      expect(almacen.lee(CLAVE_DEL_CONSENTIMIENTO)).toBeNull();
      expect(estado.decidido()).toBe(false);
      expect(estado.permite('publicidad')).toBe(false);
    });
  });
});
