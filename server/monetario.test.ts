/**
 * monetario.test.ts
 * Testes unitários para os helpers de cálculo monetário.
 *
 * NOVA REGRA: todos os minutos extra pagos a 15€/h (sem distinção de limiar).
 * Desconto por minutos negativos também a 15€/h.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularValorHorasExtraCentimos,
  calcularTotalCentimos,
  centimosPaEuros,
  eurosPaCentimos,
  parseEurosInput,
  calcularResumoMonetario,
  calcularResumoMonetarioRegraEspecial,
  calcularResumoMonetarioRegraEspecialDiaDia,
} from './monetario';

describe('calcularValorHorasExtraCentimos', () => {
  it('retorna 0 se não há minutos extra', () => {
    expect(calcularValorHorasExtraCentimos(0, 0)).toBe(0);
  });

  it('calcula corretamente 60min (extra10) @15€/h = 1500 cêntimos', () => {
    // Todos os minutos pagos a 15€/h independentemente do campo
    expect(calcularValorHorasExtraCentimos(60, 0)).toBe(1500);
  });

  it('calcula corretamente 60min (extra15) @15€/h = 1500 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(0, 60)).toBe(1500);
  });

  it('calcula corretamente 30min (extra10) @15€/h = 750 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(30, 0)).toBe(750);
  });

  it('calcula corretamente 30min (extra15) @15€/h = 750 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(0, 30)).toBe(750);
  });

  it('combina corretamente 12min + 41min = 53min @15€/h', () => {
    // 53 * 1500 / 60 = round(1325) = 1325 cêntimos = 13.25€
    expect(calcularValorHorasExtraCentimos(12, 41)).toBe(1325);
  });

  it('arredonda corretamente frações de cêntimos', () => {
    // 1min @15€/h = round(1*1500/60) = round(25) = 25 cêntimos
    expect(calcularValorHorasExtraCentimos(1, 0)).toBe(25);
    expect(calcularValorHorasExtraCentimos(0, 1)).toBe(25);
  });
});

describe('calcularTotalCentimos', () => {
  it('retorna 0 se tudo é 0', () => {
    expect(calcularTotalCentimos(0, 0, 0)).toBe(0);
  });

  it('soma corretamente horas extra + extra manual', () => {
    // 60min @15€/h = 1500 cêntimos + 500 cêntimos extra manual = 2000 cêntimos
    expect(calcularTotalCentimos(60, 0, 500)).toBe(2000);
  });

  it('funciona com apenas extra manual', () => {
    expect(calcularTotalCentimos(0, 0, 1250)).toBe(1250);
  });
});

describe('centimosPaEuros', () => {
  it('converte 1250 cêntimos para 12.50€', () => {
    expect(centimosPaEuros(1250)).toBe(12.5);
  });

  it('converte 0 para 0€', () => {
    expect(centimosPaEuros(0)).toBe(0);
  });

  it('converte 1 cêntimo para 0.01€', () => {
    expect(centimosPaEuros(1)).toBe(0.01);
  });
});

describe('eurosPaCentimos', () => {
  it('converte 12.50€ para 1250 cêntimos', () => {
    expect(eurosPaCentimos(12.5)).toBe(1250);
  });

  it('converte 0€ para 0 cêntimos', () => {
    expect(eurosPaCentimos(0)).toBe(0);
  });

  it('converte 0.01€ para 1 cêntimo', () => {
    expect(eurosPaCentimos(0.01)).toBe(1);
  });

  it('arredonda corretamente floating-point (ex: 0.1 + 0.2 = 0.3)', () => {
    expect(eurosPaCentimos(0.1 + 0.2)).toBe(30);
  });

  it('lança erro para valor negativo', () => {
    expect(() => eurosPaCentimos(-1)).toThrow();
  });

  it('lança erro para NaN', () => {
    expect(() => eurosPaCentimos(NaN)).toThrow();
  });

  it('lança erro para Infinity', () => {
    expect(() => eurosPaCentimos(Infinity)).toThrow();
  });
});

describe('parseEurosInput', () => {
  it('retorna 0 para input vazio', () => {
    expect(parseEurosInput('')).toBe(0);
    expect(parseEurosInput(null)).toBe(0);
    expect(parseEurosInput(undefined)).toBe(0);
  });

  it('converte string "12.50" para 1250 cêntimos', () => {
    expect(parseEurosInput('12.50')).toBe(1250);
  });

  it('converte número 12.5 para 1250 cêntimos', () => {
    expect(parseEurosInput(12.5)).toBe(1250);
  });

  it('retorna null para string inválida', () => {
    expect(parseEurosInput('abc')).toBeNull();
  });

  it('retorna null para valor negativo', () => {
    expect(parseEurosInput(-5)).toBeNull();
  });

  it('retorna null para Infinity', () => {
    expect(parseEurosInput(Infinity)).toBeNull();
  });
});

describe('calcularResumoMonetario', () => {
  it('retorna zeros para inputs zero', () => {
    const r = calcularResumoMonetario(0, 0, 0);
    expect(r.minutosExtra).toBe(0);
    expect(r.valorHorasExtra).toBe(0);
    expect(r.extraManualEuros).toBe(0);
    expect(r.totalDinheiroPagar).toBe(0);
  });

  it('calcula 12min + 41min = 53min @15€/h = 13.25€', () => {
    const r = calcularResumoMonetario(12, 41, 0);
    expect(r.minutosExtra).toBe(53);
    // 53 * 1500 / 60 = round(1325) = 1325 cêntimos = 13.25€
    expect(r.valorHorasExtra).toBe(13.25);
    expect(r.totalDinheiroPagar).toBe(13.25);
  });

  it('inclui extra manual no total a pagar', () => {
    // 60min @15€/h = 1500 cêntimos = 15€ + 15€ manual = 30€
    const r = calcularResumoMonetario(60, 0, 1500);
    expect(r.valorHorasExtra).toBe(15);
    expect(r.extraManualEuros).toBe(15);
    expect(r.totalDinheiroPagar).toBe(30);
  });

  it('formata horas corretamente', () => {
    const r = calcularResumoMonetario(75, 0, 0); // 1h15min
    expect(r.horasExtraFormatadas).toBe('01:15');
  });

  it('funciona com apenas extra manual (sem horas extra)', () => {
    const r = calcularResumoMonetario(0, 0, 2000); // 20€ manual
    expect(r.valorHorasExtra).toBe(0);
    expect(r.extraManualEuros).toBe(20);
    expect(r.totalDinheiroPagar).toBe(20);
  });

  it('desconta minutos negativos a 15€/h (ex: 30min extra - 10min neg)', () => {
    // valorExtra = 30*1500/60 = 750 cêntimos = 7.50€
    // desconto = 10*1500/60 = 250 cêntimos = 2.50€
    // total = 750 - 250 = 500 cêntimos = 5.00€
    const r = calcularResumoMonetario(30, 0, 0, 10);
    expect(r.valorHorasExtra).toBe(7.50);
    expect(r.descontoNegativoEuros).toBe(2.50);
    expect(r.totalDinheiroPagar).toBe(5.00);
  });

  it('desconto sem horas extra resulta em total negativo', () => {
    // 60min neg @15€/h = 1500 cêntimos = -15.00€
    const r = calcularResumoMonetario(0, 0, 0, 60);
    expect(r.valorHorasExtra).toBe(0);
    expect(r.descontoNegativoEuros).toBe(15.00);
    expect(r.totalDinheiroPagar).toBe(-15.00);
  });
});

describe('calcularResumoMonetarioRegraEspecial', () => {
  // Nova regra: todos os minutos @15€/h, sem limiar de 30min

  it('Saldo 15min → 15/60*15 = 3.75€', () => {
    const r = calcularResumoMonetarioRegraEspecial(15, 0);
    expect(r.minutosExtra).toBe(15);
    // 15 * 1500 / 60 = 375 cêntimos = 3.75€
    expect(r.valorHorasExtra).toBe(3.75);
    expect(r.totalDinheiroPagar).toBe(3.75);
  });

  it('Saldo 22min → 22/60*15 = 5.50€', () => {
    const r = calcularResumoMonetarioRegraEspecial(22, 0);
    expect(r.minutosExtra).toBe(22);
    // 22 * 1500 / 60 = round(550) = 550 cêntimos = 5.50€
    expect(r.valorHorasExtra).toBe(5.50);
    expect(r.totalDinheiroPagar).toBe(5.50);
  });

  it('Saldo 30min → 30/60*15 = 7.50€', () => {
    const r = calcularResumoMonetarioRegraEspecial(30, 0);
    expect(r.minutosExtra).toBe(30);
    expect(r.valorHorasExtra).toBe(7.50);
    expect(r.totalDinheiroPagar).toBe(7.50);
  });

  it('Saldo 31min → 31/60*15 = 7.75€', () => {
    const r = calcularResumoMonetarioRegraEspecial(31, 0);
    expect(r.minutosExtra).toBe(31);
    // 31 * 1500 / 60 = 775 cêntimos = 7.75€
    expect(r.valorHorasExtra).toBe(7.75);
    expect(r.totalDinheiroPagar).toBe(7.75);
  });

  it('Saldo 45min → 45/60*15 = 11.25€', () => {
    const r = calcularResumoMonetarioRegraEspecial(45, 0);
    expect(r.minutosExtra).toBe(45);
    expect(r.valorHorasExtra).toBe(11.25);
    expect(r.totalDinheiroPagar).toBe(11.25);
  });

  it('saldo negativo → desconto a 15€/h (ex: -10min = -2.50€)', () => {
    const r = calcularResumoMonetarioRegraEspecial(-10, 0);
    expect(r.minutosExtra).toBe(0);
    expect(r.valorHorasExtra).toBe(0);
    // 10 * 1500 / 60 = 250 cêntimos = 2.50€
    expect(r.descontoNegativoEuros).toBe(2.50);
    expect(r.totalDinheiroPagar).toBe(-2.50);
  });

  it('saldo negativo -60min → desconto -15.00€', () => {
    const r = calcularResumoMonetarioRegraEspecial(-60, 0);
    expect(r.descontoNegativoEuros).toBe(15.00);
    expect(r.totalDinheiroPagar).toBe(-15.00);
  });

  it('saldo zero → 0€', () => {
    const r = calcularResumoMonetarioRegraEspecial(0, 0);
    expect(r.minutosExtra).toBe(0);
    expect(r.valorHorasExtra).toBe(0);
    expect(r.totalDinheiroPagar).toBe(0);
  });

  it('inclui extra manual no total a pagar', () => {
    // 30min @15€/h = 7.50€ + 10€ manual = 17.50€
    const r = calcularResumoMonetarioRegraEspecial(30, 1000);
    expect(r.valorHorasExtra).toBe(7.50);
    expect(r.extraManualEuros).toBe(10.00);
    expect(r.totalDinheiroPagar).toBe(17.50);
  });
});

describe('calcularResumoMonetarioRegraEspecialDiaDia', () => {
  // Regra: aplica 15€/h a cada dia individualmente e soma os resultados

  it('array vazio → 0€', () => {
    const r = calcularResumoMonetarioRegraEspecialDiaDia([], 0);
    expect(r.valorHorasExtra).toBe(0);
    expect(r.totalDinheiroPagar).toBe(0);
  });

  it('um dia com 22min → 22/60*15 = 5.50€', () => {
    const r = calcularResumoMonetarioRegraEspecialDiaDia([22], 0);
    expect(r.valorHorasExtra).toBe(5.50);
    expect(r.totalDinheiroPagar).toBe(5.50);
  });

  it('dois dias com 22min cada → 2×5.50 = 11.00€', () => {
    // Cada dia: 22min @15€/h = 550 cêntimos = 5.50€
    // Total: 11.00€
    const r = calcularResumoMonetarioRegraEspecialDiaDia([22, 22], 0);
    expect(r.minutosExtra).toBe(44);
    expect(r.valorHorasExtra).toBe(11.00);
  });

  it('um dia +45min e um dia -10min → 11.25 - 2.50 = 8.75€', () => {
    const r = calcularResumoMonetarioRegraEspecialDiaDia([45, -10], 0);
    // 45min @15€/h = 1125 cêntimos = 11.25€
    // -10min @15€/h = 250 cêntimos = 2.50€
    expect(r.valorHorasExtra).toBe(11.25);
    expect(r.descontoNegativoEuros).toBe(2.50);
    expect(r.totalDinheiroPagar).toBe(8.75);
  });

  it('dias mistos: 30min + 31min → ambos @15€/h', () => {
    // Dia 1: 30min @15€/h = 750 cêntimos = 7.50€
    // Dia 2: 31min @15€/h = 775 cêntimos = 7.75€
    // Total: 15.25€
    const r = calcularResumoMonetarioRegraEspecialDiaDia([30, 31], 0);
    expect(r.valorHorasExtra).toBe(15.25);
    expect(r.minutosExtra).toBe(61);
  });

  it('inclui extra manual no total a pagar', () => {
    // 30min @15€/h = 7.50€ + 10€ manual = 17.50€
    const r = calcularResumoMonetarioRegraEspecialDiaDia([30], 1000);
    expect(r.valorHorasExtra).toBe(7.50);
    expect(r.extraManualEuros).toBe(10.00);
    expect(r.totalDinheiroPagar).toBe(17.50);
  });
});
