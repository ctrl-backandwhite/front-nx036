import { describe, expect, it } from 'vitest';
import {
  Aviso,
  asuntoDeRespuesta,
  categoriaDe,
  categoriasPresentes,
  correoDeRespuesta,
  esAccionable,
  filtraPorCategoria,
  sinLeer,
} from './aviso';

function aviso(parcial: Partial<Aviso> = {}): Aviso {
  return {
    id: 'n-1',
    tipoDeSuceso: 'ORDER_SHIPPED',
    titulo: 'Pedido enviado',
    canal: 'INAPP',
    creadoEl: '2026-09-01T10:00:00Z',
    ...parcial,
  };
}

describe('sinLeer', () => {
  /**
   * El criterio importa: el backend NO manda un booleano. Cuando la interfaz esperaba uno que nunca
   * llegaba, «no leído» era siempre cierto y la campana contaba todo para siempre.
   */
  it('está sin leer mientras no haya fecha de lectura', () => {
    expect(sinLeer(aviso())).toBe(true);
    expect(sinLeer(aviso({ leidoEl: null }))).toBe(true);
  });

  /**
   * CAMBIO DE CRITERIO (11-sep-2026). Antes un aviso con el estado en NEW seguía contando como no
   * leído aunque tuviera fecha de lectura, a propósito: la idea era que lo pendiente no se perdiera de
   * vista. En la práctica hacía lo contrario de lo que promete una insignia: `estado` no habla de
   * lectura, habla del asunto —NEW, IN_PROGRESS, WAITING, RESOLVED son estados de un ticket—, y un
   * ticket puede quedarse en NEW indefinidamente mientras su aviso se ha leído diez veces. El titular
   * lo reportó así: «he leído todas las notificaciones y aún me aparece que tengo más de 9».
   *
   * <p>Si hace falta que lo pendiente destaque, eso pide su propio distintivo, no el contador de
   * no leídos: una insignia que no baja al leer deja de significar nada.
   */
  it('el estado del asunto NO decide la lectura: con fecha, está leído', () => {
    expect(sinLeer(aviso({ leidoEl: '2026-09-01T11:00:00Z', estado: 'NEW' }))).toBe(false);
    expect(sinLeer(aviso({ leidoEl: '2026-09-01T11:00:00Z', estado: 'RECEIVED' }))).toBe(false);
  });
});

describe('categoriaDe', () => {
  it('reconoce cada familia por el código del suceso', () => {
    expect(categoriaDe('CONTACT_RECEIVED')).toBe('support');
    expect(categoriaDe('AFFILIATE_COMMISSION')).toBe('affiliate');
    expect(categoriaDe('ORDER_DELIVERED')).toBe('order');
    expect(categoriaDe('WALLET_RECHARGE')).toBe('billing');
    expect(categoriaDe('NEWSLETTER_SENT')).toBe('newsletter');
    expect(categoriaDe('ADMIN_BROADCAST')).toBe('system');
  });

  it('cae en «general» ante un suceso que no conoce, en vez de romperse', () => {
    // El backend añade sucesos nuevos sin avisar al front: con una tabla cerrada se quedarían mudos.
    expect(categoriaDe('ALGO_QUE_NO_EXISTIA')).toBe('general');
    expect(categoriaDe('')).toBe('general');
  });
});

describe('correoDeRespuesta y esAccionable', () => {
  it('saca el correo de quien escribió, si viene', () => {
    expect(correoDeRespuesta(aviso({ datos: { email: 'quien@ejemplo.com' } }))).toBe(
      'quien@ejemplo.com',
    );
  });

  it('descarta lo que no parece un correo', () => {
    expect(correoDeRespuesta(aviso({ datos: { email: 'sin-arroba' } }))).toBeNull();
    expect(correoDeRespuesta(aviso({ datos: { email: 42 } }))).toBeNull();
    expect(correoDeRespuesta(aviso())).toBeNull();
  });

  it('solo es accionable lo de soporte o lo que trae un correo al que contestar', () => {
    expect(esAccionable(aviso({ tipoDeSuceso: 'SUPPORT_TICKET' }))).toBe(true);
    expect(esAccionable(aviso({ datos: { email: 'quien@ejemplo.com' } }))).toBe(true);
    // Un «pedido enviado» no se resuelve: ofrecerle un selector de estado sería una acción sin sentido.
    expect(esAccionable(aviso())).toBe(false);
  });
});

describe('asuntoDeRespuesta', () => {
  it('usa el asunto original cuando lo hay', () => {
    expect(asuntoDeRespuesta(aviso({ datos: { subject: 'No me llega' } }))).toBe('Re: No me llega');
  });

  it('se conforma con el título cuando no lo hay', () => {
    expect(asuntoDeRespuesta(aviso())).toBe('Re: Pedido enviado');
  });
});

describe('filtraPorCategoria y categoriasPresentes', () => {
  const bandeja = [
    aviso({ id: 'a', tipoDeSuceso: 'ORDER_SHIPPED' }),
    aviso({ id: 'b', tipoDeSuceso: 'CONTACT_RECEIVED' }),
    aviso({ id: 'c', tipoDeSuceso: 'ORDER_DELIVERED' }),
  ];

  it('sin filtro devuelve la bandeja entera, tal cual', () => {
    expect(filtraPorCategoria(bandeja, '')).toBe(bandeja);
  });

  it('con filtro deja solo los de esa familia', () => {
    expect(filtraPorCategoria(bandeja, 'order').map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('solo ofrece los tipos que hay de verdad, sin repetir', () => {
    expect(categoriasPresentes(bandeja)).toEqual(['order', 'support']);
  });
});
