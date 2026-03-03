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
} from "../pontoDB";
import { calcularSaldo } from "../pontoEngine";

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
      const registos = processarFicheiro(buffer);
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

  // Resumo por colaborador num mês
  getResumoMes: publicProcedure
    .input(z.object({ mesId: z.number().int() }))
    .query(async ({ input }) => {
      const registos = await getRegistosPorMes(input.mesId);
      // Agrupar por colaborador
      const map = new Map<string, {
        numero: string; nome: string; diasTrab: number; diasJust: number;
        celulasAuto: number; atrasoEn: number; excessoAlm: number;
        saidaCedo: number; extraSa: number; saldoTotal: number;
      }>();
      for (const r of registos) {
        const key = `${r.numero}|${r.nome}`;
        if (!map.has(key)) {
          map.set(key, { numero: r.numero, nome: r.nome, diasTrab: 0, diasJust: 0, celulasAuto: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, saldoTotal: 0 });
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
          res.celulasAuto += (r.en1Auto ? 1 : 0) + (r.sa1Auto ? 1 : 0) + (r.en2Auto ? 1 : 0) + (r.sa2Auto ? 1 : 0);
        }
      }
      return Array.from(map.values()).sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
    }),

  // Resumo acumulado (todos os meses)
  getResumoAcumulado: publicProcedure.query(async () => {
    return getResumoAcumulado();
  }),

  // Detalhe de um colaborador num mês
  getDetalheColaborador: publicProcedure
    .input(z.object({ numero: z.string(), mesId: z.number().int() }))
    .query(async ({ input }) => {
      return getRegistosPorColaborador(input.numero, input.mesId);
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
});
