import { ConsentimientoDeCookiesStore } from './consentimiento-de-cookies.store';

describe('ConsentimientoDeCookiesStore', () => {
  let estado: ConsentimientoDeCookiesStore;

  beforeEach(() => {
    // Sin `TestBed`: el almacén es una clase con signals y nada más. Que se pueda instanciar así es la
    // señal de que no llama a nadie —solo guarda—, que es justo lo que se le pide.
    estado = new ConsentimientoDeCookiesStore();
  });

  /**
   * ESTA PRUEBA PEDÍA QUE EL AVISO SALIERA AL ARRANCAR, y era el defecto.
   *
   * <p>Al arrancar no se sabe si hay decisión guardada: todavía no se ha mirado. Enseñar el aviso
   * mientras tanto lo hacía aparecer en TODAS las cargas para desaparecer un instante después, cuando
   * la lectura del navegador llegaba — quien ya lo había aceptado lo veía parpadear página tras
   * página. En las prerenderizadas es peor: su HTML se genera sin poder leer nada, así que el aviso
   * viene incrustado en el fichero.
   *
   * <p>«No ha decidido» y «no se ha mirado» son cosas distintas, y ahora el almacén las distingue.
   */
  it('arranca sin decidir, sin nada encendido y SIN enseñar nada', () => {
    expect(estado.decidido()).toBe(false);
    expect(estado.categorias()).toEqual({ analitica: false, publicidad: false });
    expect(estado.regimen()).toBe('default');
    expect(estado.resuelto()).toBe(false);
    expect(estado.visible()).toBe(false);
  });

  /** Mirado y sin nada guardado: ahí sí hay que preguntar. */
  it('tras mirar y no encontrar nada, el aviso sale', () => {
    estado.olvida();

    expect(estado.resuelto()).toBe(true);
    expect(estado.decidido()).toBe(false);
    expect(estado.visible()).toBe(true);
  });

  /** El panel lo abre quien navega a propósito: se enseña aunque no se haya mirado nada aún. */
  it('el panel abierto manda sobre todo lo demás', () => {
    estado.abrePanel();

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
