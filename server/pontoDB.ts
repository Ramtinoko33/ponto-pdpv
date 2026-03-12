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
      extra10Min: r.extra10Min ?? 0,
      extra15Min: r.extra15Min ?? 0,
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
    atrasoEn: number; excessoAlm: number; saidaCedo: number; extraSa: number; extra10Min: number; extra15Min: number;
    saldoTotal: number; registos: typeof registos;
  }>();

  for (const r of registos) {
    if (!mesesMap.has(r.mesId)) {
      mesesMap.set(r.mesId, {
        mesId: r.mesId, label: r.mesLabel, ano: r.mesAno, mes: r.mesMes,
        diasTrab: 0, diasJust: 0, celulasAuto: 0,
        atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0,
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
      m.extra10Min  += (r as any).extra10Min ?? 0;
      m.extra15Min  += (r as any).extra15Min ?? 0;
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

// ─── ATUALIZAR REGISTO DIÁRIO ────────────────────────────────────────────────

export async function atualizarRegisto(
  id: number,
  campos: {
    en1?: string | null;
    sa1?: string | null;
    en2?: string | null;
    sa2?: string | null;
    saldo?: number | null;
    atrasoEn?: number;
    excessoAlm?: number;
    saidaCedo?: number;
    extraSa?: number;
    detalhe?: string | null;
    en1Auto?: number;
    sa1Auto?: number;
    en2Auto?: number;
    sa2Auto?: number;
    cenario?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.update(registosDiarios)
    .set(campos)
    .where(eq(registosDiarios.id, id));
}

export async function getRegistoPorId(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db.select().from(registosDiarios)
    .where(eq(registosDiarios.id, id))
    .limit(1);
  return result[0] ?? null;
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
    extra10Min: r.extra10Min ?? 0, extra15Min: r.extra15Min ?? 0,
    justificacao: r.justificacao, detalhe: r.detalhe ?? '',
    ignorada: false,
  }));

  return calcularResumos(registos);
}

// ─── HORÁRIOS PERSONALIZADOS ──────────────────────────────────────────────

import { horariosCustom } from "../drizzle/schema";
import type { HorarioCustom } from "../drizzle/schema";

export async function listarHorariosCustom(): Promise<HorarioCustom[]> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  return db.select().from(horariosCustom).orderBy(sql`CAST(numero AS UNSIGNED)`);
}

export async function getHorarioCustom(numero: string): Promise<HorarioCustom | null> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db.select().from(horariosCustom)
    .where(eq(horariosCustom.numero, numero))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertHorarioCustom(data: {
  numero: string;
  nome?: string;
  en1?: number | null;
  sa1?: number | null;
  en2?: number | null;
  sa2?: number | null;
  observacoes?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const existing = await getHorarioCustom(data.numero);
  if (existing) {
    await db.update(horariosCustom)
      .set({
        nome: data.nome ?? existing.nome,
        en1: data.en1 !== undefined ? data.en1 : existing.en1,
        sa1: data.sa1 !== undefined ? data.sa1 : existing.sa1,
        en2: data.en2 !== undefined ? data.en2 : existing.en2,
        sa2: data.sa2 !== undefined ? data.sa2 : existing.sa2,
        observacoes: data.observacoes !== undefined ? data.observacoes : existing.observacoes,
      })
      .where(eq(horariosCustom.numero, data.numero));
  } else {
    await db.insert(horariosCustom).values({
      numero: data.numero,
      nome: data.nome ?? null,
      en1: data.en1 ?? null,
      sa1: data.sa1 ?? null,
      en2: data.en2 ?? null,
      sa2: data.sa2 ?? null,
      observacoes: data.observacoes ?? null,
    });
  }
}

export async function apagarHorarioCustom(numero: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.delete(horariosCustom).where(eq(horariosCustom.numero, numero));
}

// Carregar todos os horários como mapa para uso no motor de cálculo
export async function getMapaHorariosCustom(): Promise<Record<string, { en1?: number; sa1?: number; en2?: number; sa2?: number }>> {
  const todos = await listarHorariosCustom();
  const mapa: Record<string, { en1?: number; sa1?: number; en2?: number; sa2?: number }> = {};
  for (const h of todos) {
    mapa[h.numero] = {
      ...(h.en1 !== null ? { en1: h.en1 } : {}),
      ...(h.sa1 !== null ? { sa1: h.sa1 } : {}),
      ...(h.en2 !== null ? { en2: h.en2 } : {}),
      ...(h.sa2 !== null ? { sa2: h.sa2 } : {}),
    };
  }
  return mapa;
}

// ─── COLABORADORES EXCLUÍDOS ──────────────────────────────────────────────

import { colaboradoresExcluidos } from "../drizzle/schema";
import type { ColaboradorExcluido } from "../drizzle/schema";

export async function listarExcluidos(): Promise<ColaboradorExcluido[]> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  return db.select().from(colaboradoresExcluidos).orderBy(sql`CAST(numero AS UNSIGNED)`);
}

export async function adicionarExcluido(data: {
  numero: string;
  nome?: string | null;
  motivo?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.insert(colaboradoresExcluidos).values({
    numero: data.numero,
    nome: data.nome ?? null,
    motivo: data.motivo ?? null,
  });
}

export async function removerExcluido(numero: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.delete(colaboradoresExcluidos).where(eq(colaboradoresExcluidos.numero, numero));
}

export async function getSetExcluidos(): Promise<Set<string>> {
  const todos = await listarExcluidos();
  return new Set(todos.map(e => e.numero));
}

// ─── EXTRA MANUAL POR COLABORADOR/MÊS ────────────────────────────────────────
// Valores armazenados em cêntimos (inteiros) para evitar floating-point issues.
// Ex: 1250 = 12.50€

import { extraManual } from "../drizzle/schema";

/**
 * Obtém o valor extra manual (em cêntimos) para um colaborador num mês.
 * Retorna 0 se não existir registo.
 */
export async function getExtraManual(numero: string, mesId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const rows = await db
    .select()
    .from(extraManual)
    .where(and(eq(extraManual.numero, numero), eq(extraManual.mesId, mesId)));
  return rows[0]?.extraManualCentimos ?? 0;
}

/**
 * Obtém um mapa de extra manual para todos os colaboradores de um mês.
 * Retorna Record<numero, centimos>
 */
export async function getMapaExtraManual(mesId: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const rows = await db
    .select()
    .from(extraManual)
    .where(eq(extraManual.mesId, mesId));
  const mapa: Record<string, number> = {};
  for (const r of rows) {
    mapa[r.numero] = r.extraManualCentimos;
  }
  return mapa;
}

/**
 * Guarda ou atualiza o valor extra manual (em cêntimos) para um colaborador num mês.
 */
export async function setExtraManual(
  numero: string,
  mesId: number,
  extraManualCentimos: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  // Verificar se já existe
  const existing = await db
    .select({ id: extraManual.id })
    .from(extraManual)
    .where(and(eq(extraManual.numero, numero), eq(extraManual.mesId, mesId)));
  if (existing.length > 0) {
    await db
      .update(extraManual)
      .set({ extraManualCentimos })
      .where(and(eq(extraManual.numero, numero), eq(extraManual.mesId, mesId)));
  } else {
    await db.insert(extraManual).values({ numero, mesId, extraManualCentimos });
  }
}
