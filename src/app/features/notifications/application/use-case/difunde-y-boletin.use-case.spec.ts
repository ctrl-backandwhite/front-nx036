import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DIFUSION_DE_AVISOS_PORT, DifusionDeAvisosPort } from '../../domain/port/avisos.port';
import { BOLETIN_PORT, BoletinPort } from '../../domain/port/boletin.port';
import { DifundeUnAviso } from './difunde-un-aviso.use-case';
import { GestionaElBoletin } from './gestiona-el-boletin.use-case';

describe('DifundeUnAviso y GestionaElBoletin', () => {
  let difusion: DifusionDeAvisosPort;
  let boletin: BoletinPort;

  beforeEach(() => {
    difusion = {
      envia: vi.fn().mockResolvedValue(exito(12)),
      responde: vi.fn().mockResolvedValue(exito(undefined)),
    };
    boletin = {
      suscribe: vi.fn().mockResolvedValue(exito({ yaEstaba: false })),
      daDeBaja: vi.fn().mockResolvedValue(exito(true)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DIFUSION_DE_AVISOS_PORT, useValue: difusion },
        { provide: BOLETIN_PORT, useValue: boletin },
      ],
    });
  });

  it('recorta el aviso y dice a cuánta gente llegó', async () => {
    const resultado = await TestBed.inject(DifundeUnAviso).ejecuta({
      destino: '  ',
      titulo: '  Corte de servicio  ',
      cuerpo: '  Mañana a las 8  ',
    });

    // Un destino en blanco significa «a todo el mundo», que es el valor que espera el backend.
    expect(difusion.envia).toHaveBeenCalledWith({
      destino: 'all',
      titulo: 'Corte de servicio',
      cuerpo: 'Mañana a las 8',
    });
    expect(resultado).toEqual({ ok: true, valor: 12 });
  });

  it('devuelve el fallo de la difusión para que la pantalla lo cuente', async () => {
    vi.mocked(difusion.envia).mockResolvedValue(fallo(creaError('sin-permiso', 'No puedes')));

    const resultado = await TestBed.inject(DifundeUnAviso).ejecuta({
      destino: 'all',
      titulo: 'x',
      cuerpo: 'y',
    });

    expect(resultado.ok).toBe(false);
  });

  it('la respuesta por correo viaja recortada', async () => {
    await TestBed.inject(DifundeUnAviso).responde({
      email: 'quien@ejemplo.com',
      asunto: '  Re: Hola  ',
      mensaje: '  Ya está  ',
    });

    expect(difusion.responde).toHaveBeenCalledWith({
      email: 'quien@ejemplo.com',
      asunto: 'Re: Hola',
      mensaje: 'Ya está',
    });
  });

  it('la suscripción recorta el correo', async () => {
    await TestBed.inject(GestionaElBoletin).suscribe('  hola@ejemplo.com  ');

    expect(boletin.suscribe).toHaveBeenCalledWith('hola@ejemplo.com');
  });

  /** Por testigo y no por correo: si aceptara un correo, cualquiera daría de baja a otro. */
  it('la baja va con el testigo del enlace, tal cual', async () => {
    const resultado = await TestBed.inject(GestionaElBoletin).daDeBaja('t-123');

    expect(boletin.daDeBaja).toHaveBeenCalledWith('t-123');
    expect(resultado).toEqual({ ok: true, valor: true });
  });
});
