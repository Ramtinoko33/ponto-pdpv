/**
 * pontoDB.ts
 * Helpers de base de dados para o sistema de picagem de ponto
 */

import { eq, desc, and, sql } from "drizzle-orm";
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

// Perfil completo de um colaborador: resumo por mês + totais
export async function getPerfilColaborador(numero: string) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Todos os registos do colaborador com info do mês
  const registos = await db
    .select({
      mesId: registosDiarios.mesId,
      mesLabel: meses.label,
      mesAno: meses.ano,
      mesMes: meses.mes,
      data: registosDiarios.data,
      diaSemana: registosDiarios.diaSemana,
      horario: registosDiarios.horario,
      en1: registosDiarios.en1,
      sa1: registosDiarios.sa1,
      en2: registosDiarios.en2,
      sa2: registosDiarios.sa2,
      en1Auto: registosDiarios.en1Auto,
      sa1Auto: registosDiarios.sa1Auto,
      en2Auto: registosDiarios.en2Auto,
      sa2Auto: registosDiarios.sa2Auto,
      cenario: registosDiarios.cenario,
      saldo: registosDiarios.saldo,
      atrasoEn: registosDiarios.atrasoEn,
      excessoAlm: registosDiarios.excessoAlm,
      saidaCedo: registosDiarios.saidaCedo,
      extraSa: registosDiarios.extraSa,
      justificacao: registosDiarios.justificacao,
      detalhe: registosDiarios.detalhe,
      nome: registosDiarios.nome,
      numero: registosDiarios.numero,
    })
    .from(registosDiarios)
    .innerJoin(meses, eq(registosDiarios.mesId, meses.id))
    .where(and(eq(registosDiarios.numero, numero), eq(registosDiarios.ignorada, 0)))
    .orderBy(desc(meses.ano), desc(meses.mes), registosDiarios.data);

  if (registos.length === 0) return null;

  const nome = registos[0].nome;

  // Agrupar por mês
  const mesesMap = new Map<number, {
    mesId: number; label: string; ano: number; mes: number;
    diasTrab: number; diasJust: number; celulasAuto: number;
    atrasoEn: number; excessoAlm: number; saidaCedo: number; extraSa: number;
    saldoTotal: number; registos: typeof registos;
  }>();

  for (const r of registos) {
    if (!mesesMap.has(r.mesId)) {
      mesesMap.set(r.mesId, {
        mesId: r.mesId, label: r.mesLabel, ano: r.mesAno, mes: r.mesMes,
        diasTrab: 0, diasJust: 0, celulasAuto: 0,
        atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0,
        saldoTotal: 0, registos: [],
      });
    }
    const m = mesesMap.get(r.mesId)!;
    m.registos.push(r);
    if (r.justificacao && !r.saldo) { m.diasJust++; }
    else if (r.saldo !== null) {
      m.diasTrab++;
      m.saldoTotal += r.saldo;
      m.atrasoEn   += r.atrasoEn;
      m.excessoAlm += r.excessoAlm;
      m.saidaCedo  += r.saidaCedo;
      m.extraSa    += r.extraSa;
      m.celulasAuto += (r.en1Auto ? 1 : 0) + (r.sa1Auto ? 1 : 0) + (r.en2Auto ? 1 : 0) + (r.sa2Auto ? 1 : 0);
    }
  }

  const historico = Array.from(mesesMap.values()).sort((a, b) =>
    a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
  );

  // Totais globais
  const totais = historico.reduce((acc, m) => ({
    diasTrab: acc.diasTrab + m.diasTrab,
    diasJust: acc.diasJust + m.diasJust,
    atrasoEn: acc.atrasoEn + m.atrasoEn,
    excessoAlm: acc.excessoAlm + m.excessoAlm,
    saidaCedo: acc.saidaCedo + m.saidaCedo,
    extraSa: acc.extraSa + m.extraSa,
    saldoTotal: acc.saldoTotal + m.saldoTotal,
  }), { diasTrab: 0, diasJust: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, saldoTotal: 0 });

  return { numero, nome, historico, totais };
}

// Listar todos os colaboradores distintos
export async function listarColaboradores() {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db
    .selectDistinct({ numero: registosDiarios.numero, nome: registosDiarios.nome })
    .from(registosDiarios)
    .orderBy(registosDiarios.nome);
  return result;
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
