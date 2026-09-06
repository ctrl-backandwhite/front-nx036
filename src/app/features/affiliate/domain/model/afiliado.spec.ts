import { describe, expect, it } from 'vitest';
import {
  PanelDeAfiliado,
  PerfilDeCobro,
  datosDeCobroParaGuardar,
  metodoDisponible,
  vistaDelAfiliado,
} from './afiliado';

const panel = (parcial: Partial<PanelDeAfiliado>): PanelDeAfiliado => ({
  estado: 'ACTIVE',
  porcentajeDeComision: 10,
  inscrito: true,
  puedePedirCobro: false,
  minimoDeCobroFormateado: '50,00 €',
  cobroSolicitado: false,
  codigos: [],
  estadisticas: {
    clics: 0,
    conversiones: 0,
    pendienteFormateado: '0,00 €',
    aprobadoFormateado: '0,00 €',
    pagadoFormateado: '0,00 €',
  },
  comisiones: [],
  ...parcial,
});

const perfil = (parcial: Partial<PerfilDeCobro>): PerfilDeCobro => ({
  metodoPreferido: 'WALLET',
  tieneBanco: false,
  tienePaypal: false,
  ...parcial,
});

describe('reglas del afiliado', () => {
  describe('vistaDelAfiliado', () => {
    /** Sin el alta explícita no hay panel: hay una invitación con lo que se gana y lo que se acepta. */
    it('sin inscribir toca la invitación', () => {
      expect(vistaDelAfiliado(panel({ inscrito: false }))).toBe('alta');
    });

    it('inscrito pero sin aprobar toca la espera', () => {
      expect(vistaDelAfiliado(panel({ estado: 'PENDING' }))).toBe('pendiente');
    });

    it('suspendida se dice sin más', () => {
      expect(vistaDelAfiliado(panel({ estado: 'SUSPENDED' }))).toBe('suspendida');
    });

    it('activa es el panel', () => {
      expect(vistaDelAfiliado(panel({}))).toBe('panel');
    });

    /** El alta manda: una cuenta sin inscribir no puede caer en «pendiente» ni en «suspendida». */
    it('el alta se comprueba antes que el estado', () => {
      expect(vistaDelAfiliado(panel({ inscrito: false, estado: 'SUSPENDED' }))).toBe('alta');
    });
  });

  describe('metodoDisponible', () => {
    it('la cartera siempre está disponible, incluso sin perfil', () => {
      expect(metodoDisponible('WALLET', null)).toBe(true);
    });

    /** Ofrecer un método sin datos acababa en una solicitud que el administrador rechazaba a mano. */
    it('el banco y PayPal solo si sus datos están guardados', () => {
      expect(metodoDisponible('BANK', perfil({ tieneBanco: true }))).toBe(true);
      expect(metodoDisponible('BANK', perfil({}))).toBe(false);
      expect(metodoDisponible('PAYPAL', perfil({ tienePaypal: true }))).toBe(true);
      expect(metodoDisponible('PAYPAL', perfil({}))).toBe(false);
    });

    it('sin perfil cargado no se ofrece nada más que la cartera', () => {
      expect(metodoDisponible('BANK', null)).toBe(false);
      expect(metodoDisponible('PAYPAL', null)).toBe(false);
    });
  });

  describe('datosDeCobroParaGuardar', () => {
    const formulario = {
      titular: 'Ana',
      bic: 'BIC',
      correoPaypal: 'a@b.c',
      metodoPreferido: 'BANK' as const,
      contrasena: 'secreta',
      iban: '',
    };

    /**
     * El servidor solo devuelve el IBAN enmascarado, así que el navegador nunca tiene el real: si el
     * campo va vacío hay que OMITIR la clave o se borraría el guardado.
     */
    it('omite el IBAN cuando no se ha tecleado uno nuevo', () => {
      expect(datosDeCobroParaGuardar(formulario)).not.toHaveProperty('iban');
    });

    it('lo manda, sin espacios sobrantes, cuando se teclea', () => {
      expect(datosDeCobroParaGuardar({ ...formulario, iban: '  ES91 2100  ' })).toMatchObject({
        iban: 'ES91 2100',
      });
    });

    /** El guardado REEMPLAZA el perfil entero: hay que reenviar todos los campos, no solo el tocado. */
    it('reenvía el resto de campos tal cual', () => {
      expect(datosDeCobroParaGuardar(formulario)).toMatchObject({
        titular: 'Ana',
        bic: 'BIC',
        correoPaypal: 'a@b.c',
        metodoPreferido: 'BANK',
        contrasena: 'secreta',
      });
    });
  });
});
