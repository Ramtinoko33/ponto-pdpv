/**
 * ponto.ts — Router tRPC para o sistema de picagem de ponto
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { processarFicheiro } from "../pontoEngine";
import {
  listarMeses,
  guardarMes,
  getRegistosPorMes,
  getResumoAcumulado,
  apagarMes,
  getRegistosPorColaborador,
  getPerfilColaborador,
  listarColaboradores,
  atualizarRegisto,
  getRegistoPorId,
  listarHorariosCustom,
  upsertHorarioCustom,
  apagarHorarioCustom,
  getMapaHorariosCustom,
  listarExcluidos,
  adicionarExcluido,
  removerExcluido,
  getSetExcluidos,
  getMapaExtraManual,
  setExtraManual as dbSetExtraManual,
} from "../pontoDB";
import { getDb } from "../db";
import { registosDiarios } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calcularSaldo } from "../pontoEngine";
import { calcularResumoMonetario, calcularResumoMonetarioRegraEspecial, eurosPaCentimos } from "../monetario";
import { meses as mesasTable } from "../../drizzle/schema";

const MESES_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const pontoRouter = router({

  // Listar todos os meses carregados
  listarMeses: publicProcedure.query(async () => {
    return listarMeses();
  }),

  // Upload e processamento de ficheiro
  uploadMes: publicProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      ano: z.number().int().min(2020).max(2100),
      mes: z.number().int().min(1).max(12),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, 'base64');
      // Carregar lista de excluídos da BD para usar no processamento
      const setExcluidos = await getSetExcluidos();
      const registos = processarFicheiro(buffer, setExcluidos);
      const label = `${MESES_PT[input.mes]} ${input.ano}`;
      const mesId = await guardarMes(input.ano, input.mes, label, registos);
      const resumos = registos.filter(r => !r.ignorada && r.saldo !== null);
      return {
        mesId,
        label,
        totalRegistos: registos.length,
        totalColaboradores: new Set(resumos.map(r => r.numero)).size,
        saldoGeral: resumos.reduce((acc, r) => acc + (r.saldo ?? 0), 0),
      };
    }),

  // Registos de um mês específico
  getRegistosMes: publicProcedure
    .input(z.object({ mesId: z.number().int() }))
    .query(async ({ input }) => {
      return getRegistosPorMes(input.mesId);
    }),

  // Resumo por colaborador num mês (inclui extraManualEuros e totalDinheiroPagar)
  getResumoMes: publicProcedure
    .input(z.object({ mesId: z.number().int() }))
    .query(async ({ input }) => {
      const registos = await getRegistosPorMes(input.mesId);
      const mapaExtra = await getMapaExtraManual(input.mesId);
      // Verificar se a regra especial está ativa para este mês
      const db = await getDb();
      let regraEspecialAtiva = false;
      if (db) {
        const mesList = await db.select().from(mesasTable).where(eq(mesasTable.id, input.mesId)).limit(1);
        regraEspecialAtiva = (mesList[0]?.regraEspecialAtiva ?? 0) === 1;
      }
      // Agrupar por colaborador
      const map = new Map<string, {
        numero: string; nome: string; diasTrab: number; diasJust: number;
        celulasAuto: number; atrasoEn: number; excessoAlm: number;
        saidaCedo: number; extraSa: number; extra10Min: number; extra15Min: number; saldoTotal: number;
      }>();
      for (const r of registos) {
        const key = `${r.numero}|${r.nome}`;
        if (!map.has(key)) {
          map.set(key, { numero: r.numero, nome: r.nome, diasTrab: 0, diasJust: 0, celulasAuto: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, saldoTotal: 0 });
        }
        const res = map.get(key)!;
        if (r.justificacao) { res.diasJust++; continue; }
        if (r.saldo !== null) {
          res.diasTrab++;
          res.saldoTotal += r.saldo;
          res.atrasoEn   += r.atrasoEn;
          res.excessoAlm += r.excessoAlm;
          res.saidaCedo  += r.saidaCedo;
          res.extraSa    += r.extraSa;
          res.extra10Min += r.extra10Min ?? 0;
          res.extra15Min += r.extra15Min ?? 0;
          res.celulasAuto += (r.en1Auto ? 1 : 0) + (r.sa1Auto ? 1 : 0) + (r.en2Auto ? 1 : 0) + (r.sa2Auto ? 1 : 0);
        }
      }
      // Enriquecer com extra manual e totais monetários
      return Array.from(map.values())
        .sort((a, b) => parseInt(a.numero) - parseInt(b.numero))
        .map(res => {
          const extraManualCentimos = mapaExtra[res.numero] ?? 0;
          const monetario = regraEspecialAtiva
            ? calcularResumoMonetarioRegraEspecial(res.saldoTotal, extraManualCentimos)
            : calcularResumoMonetario(res.extra10Min, res.extra15Min, extraManualCentimos);
          return { ...res, ...monetario, regraEspecialAtiva };
        });
    }),

  // Ativar/desativar regra especial de cálculo para um mês
  toggleRegraEspecial: publicProcedure
    .input(z.object({
      mesId: z.number().int(),
      ativa: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Sem ligação à base de dados');
      await db.update(mesasTable)
        .set({ regraEspecialAtiva: input.ativa ? 1 : 0 })
        .where(eq(mesasTable.id, input.mesId));
      return { success: true, ativa: input.ativa };
    }),

  // Resumo acumulado (todos os meses)
  getResumoAcumulado: publicProcedure.query(async () => {
    return getResumoAcumulado();
  }),

  // Detalhe de um colaborador num mês (inclui regraEspecialAtiva para cálculo correto no frontend)
  getDetalheColaborador: publicProcedure
    .input(z.object({ numero: z.string(), mesId: z.number().int() }))
    .query(async ({ input }) => {
      const registos = await getRegistosPorColaborador(input.numero, input.mesId);
      // Verificar se a regra especial está ativa para este mês
      const db = await getDb();
      let regraEspecialAtiva = false;
      if (db) {
        const mesList = await db.select().from(mesasTable).where(eq(mesasTable.id, input.mesId)).limit(1);
        regraEspecialAtiva = (mesList[0]?.regraEspecialAtiva ?? 0) === 1;
      }
      return { registos, regraEspecialAtiva };
    }),

  // Apagar um mês
  apagarMes: publicProcedure
    .input(z.object({ mesId: z.number().int() }))
    .mutation(async ({ input }) => {
      await apagarMes(input.mesId);
      return { success: true };
    }),

  // Listar todos os colaboradores distintos
  listarColaboradores: publicProcedure.query(async () => {
    return listarColaboradores();
  }),

  // Atualizar picagens de um registo e recalcular saldo
  atualizarPicagens: publicProcedure
    .input(z.object({
      id: z.number().int(),
      en1: z.string().nullable(),
      sa1: z.string().nullable(),
      en2: z.string().nullable(),
      sa2: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      // Obter o registo atual para saber se é sábado e o número do colaborador
      const registo = await getRegistoPorId(input.id);
      if (!registo) throw new Error('Registo não encontrado');

      const isSabado = registo.diaSemana === 'SÁB' || registo.diaSemana === 'SAB';
      const numStr = String(registo.numero).trim().replace(/^0+/, '') || '0';

      // Recalcular saldo com os novos valores
      const calc = calcularSaldo(input.en1, input.sa1, input.en2, input.sa2, isSabado, numStr);

      // Determinar quais campos foram editados manualmente (não são auto)
      // Se o utilizador editou, marca como não-auto (0)
      await atualizarRegisto(input.id, {
        en1: input.en1,
        sa1: input.sa1,
        en2: input.en2,
        sa2: input.sa2,
        en1Auto: input.en1 !== registo.en1 ? 0 : registo.en1Auto,
        sa1Auto: input.sa1 !== registo.sa1 ? 0 : registo.sa1Auto,
        en2Auto: input.en2 !== registo.en2 ? 0 : registo.en2Auto,
        sa2Auto: input.sa2 !== registo.sa2 ? 0 : registo.sa2Auto,
        cenario: 'EDIT',
        saldo: calc.saldo,
        atrasoEn: calc.atrasoEn,
        excessoAlm: calc.excessoAlm,
        saidaCedo: calc.saidaCedo,
        extraSa: calc.extraSa,
        detalhe: calc.detalhe,
      });

      return { success: true, saldo: calc.saldo, detalhe: calc.detalhe };
    }),

  // Perfil completo de um colaborador
  getPerfilColaborador: publicProcedure
    .input(z.object({ numero: z.string() }))
    .query(async ({ input }) => {
      return getPerfilColaborador(input.numero);
    }),

  // ─── HORÁRIOS PERSONALIZADOS ─────────────────────────────────────────────

  // Listar todos os horários personalizados
  listarHorariosCustom: publicProcedure.query(async () => {
    return listarHorariosCustom();
  }),

  // Criar ou atualizar horário personalizado
  upsertHorarioCustom: publicProcedure
    .input(z.object({
      numero: z.string().min(1),
      nome: z.string().optional(),
      en1: z.number().int().min(0).max(1439).nullable().optional(),
      sa1: z.number().int().min(0).max(1439).nullable().optional(),
      en2: z.number().int().min(0).max(1439).nullable().optional(),
      sa2: z.number().int().min(0).max(1439).nullable().optional(),
      observacoes: z.string().nullable().optional(),
      recalcular: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      await upsertHorarioCustom(input);

      // Recalcular saldos de todos os registos deste colaborador se pedido
      if (input.recalcular) {
        const db = await getDb();
        if (!db) throw new Error('DB não disponível');

        // PASSO 1: Primeiro corrigir EN1 automáticos para o novo valor
        // (deve ser feito ANTES do recálculo dos saldos)
        const novoEn1 = input.en1;
        if (novoEn1 !== undefined && novoEn1 !== null) {
          const h = Math.floor(novoEn1 / 60);
          const m = novoEn1 % 60;
          const novoEn1Str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          await db.update(registosDiarios)
            .set({ en1: novoEn1Str })
            .where(and(
              eq(registosDiarios.numero, input.numero),
              eq(registosDiarios.en1Auto, 1),
              eq(registosDiarios.ignorada, 0)
            ));
        }

        // PASSO 2: Agora recalcular saldos com os valores já atualizados
        const mapa = await getMapaHorariosCustom();
        const registos = await db.select().from(registosDiarios)
          .where(and(eq(registosDiarios.numero, input.numero), eq(registosDiarios.ignorada, 0)));

        for (const r of registos) {
          const isSabado = r.diaSemana === 'SÁB' || r.diaSemana === 'SAB';
          const calc = calcularSaldo(r.en1, r.sa1, r.en2, r.sa2, isSabado, r.numero, mapa);
          await db.update(registosDiarios)
            .set({
              saldo: calc.saldo,
              atrasoEn: calc.atrasoEn,
              excessoAlm: calc.excessoAlm,
              saidaCedo: calc.saidaCedo,
              extraSa: calc.extraSa,
              detalhe: calc.detalhe,
            })
            .where(eq(registosDiarios.id, r.id));
        }

        return { success: true, recalculados: registos.length };
      }

      return { success: true, recalculados: 0 };
    }),

  // Apagar horário personalizado
  apagarHorarioCustom: publicProcedure
    .input(z.object({ numero: z.string() }))
    .mutation(async ({ input }) => {
      await apagarHorarioCustom(input.numero);
      return { success: true };
    }),

  // ─── COLABORADORES EXCLUÍDOS ────────────────────────────────────────────────

  // Listar todos os excluídos
  listarExcluidos: publicProcedure.query(async () => {
    return listarExcluidos();
  }),

  // Adicionar colaborador à lista de excluídos
  adicionarExcluido: publicProcedure
    .input(z.object({
      numero: z.string().min(1),
      nome: z.string().nullable().optional(),
      motivo: z.string().nullable().optional(),
      apagarRegistos: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      await adicionarExcluido(input);

      let registosApagados = 0;
      if (input.apagarRegistos) {
        const db = await getDb();
        if (db) {
          const result = await db.delete(registosDiarios)
            .where(eq(registosDiarios.numero, input.numero));
          registosApagados = result[0]?.affectedRows ?? 0;
        }
      }

      return { success: true, registosApagados };
    }),

  // Remover colaborador da lista de excluídos
  removerExcluido: publicProcedure
    .input(z.object({ numero: z.string() }))
    .mutation(async ({ input }) => {
      await removerExcluido(input.numero);
      return { success: true };
    }),

  // Apagar registos de um colaborador já excluído
  apagarRegistosExcluido: publicProcedure
    .input(z.object({ numero: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Sem ligação à base de dados');
      const result = await db.delete(registosDiarios)
        .where(eq(registosDiarios.numero, input.numero));
      const registosApagados = result[0]?.affectedRows ?? 0;
      return { success: true, registosApagados };
    }),

  // ─── EXTRA MANUAL ────────────────────────────────────────────────────────────

  // Guardar extra manual (em euros) para um colaborador num mês
  setExtraManual: publicProcedure
    .input(z.object({
      numero: z.string().min(1),
      mesId: z.number().int(),
      extraManualEuros: z.number()
        .nonnegative('O valor não pode ser negativo')
        .finite('O valor deve ser finito')
        .refine(v => !isNaN(v), 'O valor não pode ser NaN'),
    }))
    .mutation(async ({ input }) => {
      const centimos = eurosPaCentimos(input.extraManualEuros);
      await dbSetExtraManual(input.numero, input.mesId, centimos);
      return { success: true, centimos };
    }),

  // Obter extra manual de todos os colaboradores de um mês (em euros)
  getExtraManualMes: publicProcedure
    .input(z.object({ mesId: z.number().int() }))
    .query(async ({ input }) => {
      const mapa = await getMapaExtraManual(input.mesId);
      // Converter cêntimos para euros
      const resultado: Record<string, number> = {};
      for (const [numero, centimos] of Object.entries(mapa)) {
        resultado[numero] = centimos / 100;
      }
      return resultado;
    }),
});
