/**
 * monetario.test.ts
 * Testes unitários para os helpers de cálculo monetário.
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
} from './monetario';

describe('calcularValorHorasExtraCentimos', () => {
  it('retorna 0 se não há minutos extra', () => {
    expect(calcularValorHorasExtraCentimos(0, 0)).toBe(0);
  });

  it('calcula corretamente 60min @10€/h = 1000 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(60, 0)).toBe(1000);
  });

  it('calcula corretamente 60min @15€/h = 1500 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(0, 60)).toBe(1500);
  });

  it('calcula corretamente 30min @10€/h = 500 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(30, 0)).toBe(500);
  });

  it('calcula corretamente 30min @15€/h = 750 cêntimos', () => {
    expect(calcularValorHorasExtraCentimos(0, 30)).toBe(750);
  });

  it('combina corretamente 12min @10€/h + 41min @15€/h (caso Pedro Queiros 23/02)', () => {
    // 12min @10€/h = round(12*1000/60) = round(200) = 200 cêntimos
    // 41min @15€/h = round(41*1500/60) = round(1025) = 1025 cêntimos
    // Total = 1225 cêntimos = 12.25€
    expect(calcularValorHorasExtraCentimos(12, 41)).toBe(1225);
  });

  it('arredonda corretamente frações de cêntimos', () => {
    // 1min @10€/h = round(1*1000/60) = round(16.67) = 17 cêntimos
    expect(calcularValorHorasExtraCentimos(1, 0)).toBe(17);
    // 1min @15€/h = round(1*1500/60) = round(25) = 25 cêntimos
    expect(calcularValorHorasExtraCentimos(0, 1)).toBe(25);
  });
});

describe('calcularTotalCentimos', () => {
  it('retorna 0 se tudo é 0', () => {
    expect(calcularTotalCentimos(0, 0, 0)).toBe(0);
  });

  it('soma corretamente horas extra + extra manual', () => {
    // 60min @10€/h = 1000 cêntimos + 500 cêntimos extra manual = 1500 cêntimos
    expect(calcularTotalCentimos(60, 0, 500)).toBe(1500);
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

  it('calcula corretamente o caso Pedro Queiros 23/02 (12min @10€ + 41min @15€)', () => {
    const r = calcularResumoMonetario(12, 41, 0);
    expect(r.minutosExtra).toBe(53);
    expect(r.valorHorasExtra).toBe(12.25);
    expect(r.totalDinheiroPagar).toBe(12.25);
  });

  it('inclui extra manual no total a pagar', () => {
    const r = calcularResumoMonetario(60, 0, 1500); // 10€ horas extra + 15€ manual = 25€
    expect(r.valorHorasExtra).toBe(10);
    expect(r.extraManualEuros).toBe(15);
    expect(r.totalDinheiroPagar).toBe(25);
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
});

describe('calcularResumoMonetarioRegraEspecial', () => {
  // Exemplos exatos do enunciado
  it('Exemplo 1: almoço 5min + tarde 10min = 15min ≤ 30 → 15/60*10 = 2.50€', () => {
    const r = calcularResumoMonetarioRegraEspecial(5, 10, 0);
    expect(r.minutosExtra).toBe(15);
    expect(r.valorHorasExtra).toBe(2.50);
    expect(r.totalDinheiroPagar).toBe(2.50);
  });

  it('Exemplo 2: almoço 10min + tarde 20min = 30min ≤ 30 → 30/60*10 = 5.00€', () => {
    const r = calcularResumoMonetarioRegraEspecial(10, 20, 0);
    expect(r.minutosExtra).toBe(30);
    expect(r.valorHorasExtra).toBe(5.00);
    expect(r.totalDinheiroPagar).toBe(5.00);
  });

  it('Exemplo 3: almoço 12min + tarde 19min = 31min ≥ 31 → 31/60*15 = 7.75€', () => {
    const r = calcularResumoMonetarioRegraEspecial(12, 19, 0);
    expect(r.minutosExtra).toBe(31);
    // 31 * 1500 / 60 = 775 cêntimos = 7.75€
    expect(r.valorHorasExtra).toBe(7.75);
    expect(r.totalDinheiroPagar).toBe(7.75);
  });

  it('Exemplo 4: almoço 15min + tarde 30min = 45min ≥ 31 → 45/60*15 = 11.25€', () => {
    const r = calcularResumoMonetarioRegraEspecial(15, 30, 0);
    expect(r.minutosExtra).toBe(45);
    // 45 * 1500 / 60 = 1125 cêntimos = 11.25€
    expect(r.valorHorasExtra).toBe(11.25);
    expect(r.totalDinheiroPagar).toBe(11.25);
  });

  it('Exemplo 5: almoço -15min + tarde 30min = 15min ≤ 30 → 15/60*10 = 2.50€', () => {
    // almoço negativo = almoço longo (demorou mais do que o esperado)
    const r = calcularResumoMonetarioRegraEspecial(-15, 30, 0);
    expect(r.minutosExtra).toBe(15);
    expect(r.valorHorasExtra).toBe(2.50);
    expect(r.totalDinheiroPagar).toBe(2.50);
  });

  // Edge cases
  it('total negativo (almoço longo sem saída tarde) → 0 minutos, 0€', () => {
    const r = calcularResumoMonetarioRegraEspecial(-30, 0, 0);
    expect(r.minutosExtra).toBe(0);
    expect(r.valorHorasExtra).toBe(0);
  });

  it('exatamente 30min → @10€/h (limiar inferior)', () => {
    const r = calcularResumoMonetarioRegraEspecial(0, 30, 0);
    expect(r.minutosExtra).toBe(30);
    expect(r.valorHorasExtra).toBe(5.00); // 30/60*10 = 5€
  });

  it('exatamente 31min → @15€/h (limiar superior)', () => {
    const r = calcularResumoMonetarioRegraEspecial(0, 31, 0);
    expect(r.minutosExtra).toBe(31);
    expect(r.valorHorasExtra).toBe(7.75); // 31/60*15 = 7.75€
  });

  it('inclui extra manual no total a pagar', () => {
    const r = calcularResumoMonetarioRegraEspecial(10, 20, 1000); // 5€ horas + 10€ manual = 15€
    expect(r.valorHorasExtra).toBe(5.00);
    expect(r.extraManualEuros).toBe(10.00);
    expect(r.totalDinheiroPagar).toBe(15.00);
  });

  it('retorna zeros para inputs zero', () => {
    const r = calcularResumoMonetarioRegraEspecial(0, 0, 0);
    expect(r.minutosExtra).toBe(0);
    expect(r.valorHorasExtra).toBe(0);
    expect(r.totalDinheiroPagar).toBe(0);
  });
});
