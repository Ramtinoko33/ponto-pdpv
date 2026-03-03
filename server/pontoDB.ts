/**
 * pontoDB.ts
 * Helpers de base de dados para o sistema de picagem de ponto
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { meses, registosDiarios } from "../drizzle/schema";
import type { RegistoProcessado, ResumoColaborador } from "./pontoEngine";
import { calcularResumos } from "./pontoEngine";

// ─── MESES ────────────────────────────────────────────────────────────────

export async function listarMeses() {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  return db.select().from(meses).orderBy(desc(meses.ano), desc(meses.mes));
}

export async function getMesPorAnoMes(ano: number, mes: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db.select().from(meses)
    .where(and(eq(meses.ano, ano), eq(meses.mes, mes)))
    .limit(1);
  return result[0] ?? null;
}

export async function apagarMes(mesId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.delete(registosDiarios).where(eq(registosDiarios.mesId, mesId));
  await db.delete(meses).where(eq(meses.id, mesId));
}

// ─── GUARDAR MÊS COMPLETO ─────────────────────────────────────────────────

export async function guardarMes(
  ano: number,
  mes: number,
  label: string,
  registos: RegistoProcessado[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Apagar mês existente se já existir
  const existente = await getMesPorAnoMes(ano, mes);
  if (existente) {
    await apagarMes(existente.id);
  }

  // Calcular totais
  const registosValidos = registos.filter(r => !r.ignorada && r.saldo !== null);
  const colaboradoresUnicos = new Set(registosValidos.map(r => `${r.numero}|${r.nome}`));
  const saldoGeral = registosValidos.reduce((acc, r) => acc + (r.saldo ?? 0), 0);

  // Inserir mês
  await db.insert(meses).values({
    ano,
    mes,
    label,
    totalRegistos: registos.length,
    totalColaboradores: colaboradoresUnicos.size,
    saldoGeral,
  });

  // Obter o ID do mês inserido
  const mesCriado = await getMesPorAnoMes(ano, mes);
  if (!mesCriado) throw new Error("Falha ao criar mês");

  // Inserir registos em lotes de 100
  const BATCH = 100;
  for (let i = 0; i < registos.length; i += BATCH) {
    const lote = registos.slice(i, i + BATCH).map(r => ({
      mesId: mesCriado.id,
      numero: r.numero,
      nome: r.nome,
      data: r.data,
      diaSemana: r.diaSemana ?? null,
      horario: r.horario ?? null,
      en1: r.en1 ?? null,
      sa1: r.sa1 ?? null,
      en2: r.en2 ?? null,
      sa2: r.sa2 ?? null,
      en1Auto: r.en1Auto ? 1 : 0,
      sa1Auto: r.sa1Auto ? 1 : 0,
      en2Auto: r.en2Auto ? 1 : 0,
      sa2Auto: r.sa2Auto ? 1 : 0,
      cenario: r.cenario ?? null,
      saldo: r.saldo ?? null,
      atrasoEn: r.atrasoEn,
      excessoAlm: r.excessoAlm,
      saidaCedo: r.saidaCedo,
      extraSa: r.extraSa,
      justificacao: r.justificacao ?? null,
      detalhe: r.detalhe ?? null,
      ignorada: r.ignorada ? 1 : 0,
    }));
    await db.insert(registosDiarios).values(lote);
  }

  return mesCriado.id;
}

// ─── CONSULTAS ────────────────────────────────────────────────────────────

export async function getRegistosPorMes(mesId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  return db.select().from(registosDiarios)
    .where(and(eq(registosDiarios.mesId, mesId), eq(registosDiarios.ignorada, 0)))
    .orderBy(registosDiarios.numero, registosDiarios.data);
}

export async function getRegistosPorColaborador(numero: string, mesId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const conditions = mesId
    ? and(eq(registosDiarios.numero, numero), eq(registosDiarios.mesId, mesId), eq(registosDiarios.ignorada, 0))
    : and(eq(registosDiarios.numero, numero), eq(registosDiarios.ignorada, 0));
  return db.select().from(registosDiarios).where(conditions).orderBy(registosDiarios.data);
}

// Resumo acumulado por colaborador (todos os meses)
export async function getResumoAcumulado(): Promise<ResumoColaborador[]> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  const todos = await db.select().from(registosDiarios)
    .where(eq(registosDiarios.ignorada, 0));

  // Converter para RegistoProcessado para reutilizar calcularResumos
  const registos = todos.map(r => ({
    numero: r.numero,
    nome: r.nome,
    data: r.data,
    diaSemana: r.diaSemana ?? '',
    horario: r.horario ?? '',
    en1: r.en1, sa1: r.sa1, en2: r.en2, sa2: r.sa2,
    en1Auto: r.en1Auto === 1, sa1Auto: r.sa1Auto === 1,
    en2Auto: r.en2Auto === 1, sa2Auto: r.sa2Auto === 1,
    cenario: r.cenario ?? '',
    saldo: r.saldo,
    atrasoEn: r.atrasoEn, excessoAlm: r.excessoAlm,
    saidaCedo: r.saidaCedo, extraSa: r.extraSa,
    justificacao: r.justificacao, detalhe: r.detalhe ?? '',
    ignorada: false,
  }));

  return calcularResumos(registos);
}
