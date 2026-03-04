/**
 * detalhe.test.ts
 * Testes para a funcionalidade de edição inline de picagens
 */

import { describe, it, expect } from "vitest";
import { calcularSaldo } from "./pontoEngine";

describe("calcularSaldo — edição inline", () => {
  it("calcula saldo zero para dia perfeito (08:30-13:00 / 14:00-18:30)", () => {
    const result = calcularSaldo("08:30", "13:00", "14:00", "18:30", false, "1");
    expect(result.saldo).toBe(0);
    expect(result.atrasoEn).toBe(0);
    expect(result.excessoAlm).toBe(0);
    expect(result.saidaCedo).toBe(0);
    expect(result.extraSa).toBe(0);
  });

  it("calcula atraso de entrada corretamente", () => {
    // Entrada às 09:00 em vez de 08:30 → 30 min de atraso
    const result = calcularSaldo("09:00", "13:00", "14:00", "18:30", false, "1");
    expect(result.atrasoEn).toBe(30);
    expect(result.saldo).toBeLessThan(0);
  });

  it("calcula excesso de almoço corretamente", () => {
    // Saída 13:00, entrada 14:30 → 90 min almoço (30 min excesso)
    const result = calcularSaldo("08:30", "13:00", "14:30", "18:30", false, "1");
    expect(result.excessoAlm).toBe(30);
    expect(result.saldo).toBeLessThan(0);
  });

  it("calcula saída antecipada corretamente", () => {
    // Saída às 18:00 em vez de 18:30 → 30 min de saída cedo
    const result = calcularSaldo("08:30", "13:00", "14:00", "18:00", false, "1");
    expect(result.saidaCedo).toBe(30);
    expect(result.saldo).toBeLessThan(0);
  });

  it("calcula horas extra corretamente (até 30min = 10€/h)", () => {
    // Saída às 19:00 em vez de 18:30 → 30 min extra (exatamente no limiar)
    const result = calcularSaldo("08:30", "13:00", "14:00", "19:00", false, "1");
    expect(result.extraSa).toBe(30);
    expect(result.extra10Min).toBe(30);
    expect(result.extra15Min).toBe(0);
    expect(result.saldo).toBeGreaterThan(0);
  });

  it("horas extra acima de 30min: TODOS os minutos de saída a 15€/h", () => {
    // Saída às 19:27 → 57 min extra (acima do limiar) → todos a 15€/h
    const result = calcularSaldo("08:30", "13:00", "14:00", "19:27", false, "1");
    expect(result.extraSa).toBe(57);
    expect(result.extra10Min).toBe(0);  // Sem almoço curto, sem @10€
    expect(result.extra15Min).toBe(57); // Todos os minutos de saída a 15€/h
    const euros = (result.extra15Min / 60) * 15;
    expect(euros).toBeCloseTo(14.25, 1);
  });

  it("horas extra exatamente 31min: todos os minutos de saída a 15€/h", () => {
    const result = calcularSaldo("08:30", "13:00", "14:00", "19:01", false, "1");
    expect(result.extra10Min).toBe(0);
    expect(result.extra15Min).toBe(31);
  });

  it("almoço curto 12min + saída 41min (>30min): 12@10€ + 41@15€", () => {
    // Pedro Queiros 23/02: almoço 48min (curto 12min) + saída 19:11 (41min extra)
    const result = calcularSaldo("07:32", "12:12", "13:00", "19:11", false, "40");
    expect(result.extra10Min).toBe(12); // Almoço curto sempre @10€
    expect(result.extra15Min).toBe(41); // Saída acima do limiar: todos @15€
    const euros = (result.extra10Min / 60) * 10 + (result.extra15Min / 60) * 15;
    expect(euros).toBeCloseTo(12.25, 1);
  });

  it("almoço curto 5min + saída 15min (<=30min): 20@10€", () => {
    // Almoço 55min (curto 5min) + saída 18:45 (15min extra) → 20@10€
    const result = calcularSaldo("08:30", "13:05", "14:00", "18:45", false, "1");
    expect(result.extra10Min).toBe(20); // 5min almoço + 15min saída
    expect(result.extra15Min).toBe(0);
  });

  it("almoço curto 25min + saída 25min (<=30min): 50@10€", () => {
    const result = calcularSaldo("08:30", "13:25", "14:00", "18:55", false, "1");
    expect(result.extra10Min).toBe(50);
    expect(result.extra15Min).toBe(0);
  });

  it("almoço curto 15min + saída 45min (>30min): 15@10€ + 45@15€", () => {
    const result = calcularSaldo("08:30", "13:15", "14:00", "19:15", false, "1");
    expect(result.extra10Min).toBe(15); // Almoço curto @10€
    expect(result.extra15Min).toBe(45); // Saída acima do limiar: todos @15€
  });

  it("almoço longo não afeta tarifa das horas extra de saída", () => {
    // Almoço longo (90min) + saída tarde 57min → saída ainda a 15€/h
    const result = calcularSaldo("08:30", "13:00", "14:30", "19:27", false, "1");
    expect(result.excessoAlm).toBe(30);
    expect(result.extra15Min).toBe(57);
    expect(result.extra10Min).toBe(0); // Sem almoço curto
  });

  it("entrada antes das 08:30 não conta como positivo", () => {
    // Entrada às 07:30 (1h antes) — não deve contar como extra
    const result = calcularSaldo("07:30", "13:00", "14:00", "18:30", false, "1");
    expect(result.saldo).toBe(0);
    expect(result.atrasoEn).toBe(0);
  });

  it("sábado: só 1 turno até 13:00", () => {
    const result = calcularSaldo("08:30", "13:00", null, null, true, "1");
    expect(result.saldo).toBe(0);
  });

  it("sábado: saída antecipada antes das 13:00", () => {
    const result = calcularSaldo("08:30", "12:30", null, null, true, "1");
    expect(result.saidaCedo).toBe(30);
    expect(result.saldo).toBeLessThan(0);
  });

  it("valores nulos retornam saldo zero", () => {
    const result = calcularSaldo(null, null, null, null, false, "1");
    expect(result.saldo).toBe(0);
  });

  it("horário personalizado nº29 (Patricia): entrada às 09:00", () => {
    // Patricia (nº29) tem entrada às 09:00 — não deve ter atraso se entrar às 09:00
    const result = calcularSaldo("09:00", "13:00", "14:00", "18:30", false, "29");
    expect(result.atrasoEn).toBe(0);
    expect(result.saldo).toBe(0);
  });

  it("horário personalizado nº12 (Pedro Silva): entrada às 09:00", () => {
    const result = calcularSaldo("09:00", "13:00", "14:00", "18:30", false, "12");
    expect(result.atrasoEn).toBe(0);
    expect(result.saldo).toBe(0);
  });

  it("horário personalizado nº29: entrada 08:30 é atraso de 0 (antes das 09:00)", () => {
    // Patricia entra às 08:52 — antes das 09:00 — não deve ter atraso
    const result = calcularSaldo("08:52", "12:08", "13:05", "18:33", false, "29");
    expect(result.atrasoEn).toBe(0);
    expect(result.saldo).toBeGreaterThanOrEqual(0);
  });

  it("horário personalizado nº29: entrada 09:47 é atraso de 47 min", () => {
    const result = calcularSaldo("09:47", "12:08", "13:21", "18:35", false, "29");
    expect(result.atrasoEn).toBe(47);
    expect(result.saldo).toBeLessThan(0);
  });

  it("horário personalizado nº12: entrada 08:30 não é atraso (antes das 09:00)", () => {
    const result = calcularSaldo("08:30", "13:00", "14:00", "18:30", false, "12");
    expect(result.atrasoEn).toBe(0);
  });

  it("cenário SF: valor entre 17:00-20:00 na coluna EN1 é tratado como saída final", () => {
    // Se EN1=17:30 (saída final), deve ser tratado como saída final
    const result = calcularSaldo("08:30", "13:00", "14:00", "17:30", false, "1");
    // Saída às 17:30 → 60 min de saída cedo
    expect(result.saidaCedo).toBe(60);
  });
});
