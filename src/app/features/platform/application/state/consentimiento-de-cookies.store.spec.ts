import { ConsentimientoDeCookiesStore } from './consentimiento-de-cookies.store';

describe('ConsentimientoDeCookiesStore', () => {
  let estado: ConsentimientoDeCookiesStore;

  beforeEach(() => {
    // Sin `TestBed`: el almacén es una clase con signals y nada más. Que se pueda instanciar así es la
    // señal de que no llama a nadie —solo guarda—, que es justo lo que se le pide.
    estado = new ConsentimientoDeCookiesStore();
  });

  it('arranca sin decidir y sin nada encendido', () => {
    expect(estado.decidido()).toBe(false);
    expect(estado.categorias()).toEqual({ analitica: false, publicidad: false });
    expect(estado.regimen()).toBe('default');
    expect(estado.visible()).toBe(true);
  });

  it('la clave del texto se deriva del régimen', () => {
    estado.fijaRegimen('ES', 'gdpr');
    expect(estado.claveDelTexto()).toBe('cookies.banner.optin');

    estado.fijaRegimen('US', 'ccpa');
    expect(estado.claveDelTexto()).toBe('cookies.banner.ccpa');
  });

  it('decidir cierra el panel y deja de enseñar nada', () => {
    estado.abrePanel();
    estado.decide({ analitica: true, publicidad: false });

    expect(estado.decidido()).toBe(true);
    expect(estado.panelAbierto()).toBe(false);
    expect(estado.visible()).toBe(false);
  });

  it('olvidar vuelve al estado de partida', () => {
    estado.decide({ analitica: true, publicidad: true });
    estado.olvida();

    expect(estado.decidido()).toBe(false);
    expect(estado.categorias()).toEqual({ analitica: false, publicidad: false });
  });

  it('el panel abierto vuelve a hacer visible el consentimiento aunque ya se hubiera decidido', () => {
    estado.decide({ analitica: false, publicidad: false });
    expect(estado.visible()).toBe(false);

    estado.abrePanel();
    expect(estado.visible()).toBe(true);

    estado.cierraPanel();
    expect(estado.visible()).toBe(false);
  });

  it('no permite nada mientras no se haya decidido, aunque las categorías dijeran que sí', () => {
    expect(estado.permite('analitica')).toBe(false);
    expect(estado.permite('publicidad')).toBe(false);

    estado.decide({ analitica: true, publicidad: false });

    expect(estado.permite('analitica')).toBe(true);
    expect(estado.permite('publicidad')).toBe(false);
  });
});
