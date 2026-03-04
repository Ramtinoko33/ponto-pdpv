/**
 * Script para corrigir os EN1 automáticos que foram preenchidos com 08:30
 * para o Pedro Silva (nº12) e Patrícia (nº29) — devem ser 09:00
 * Recalcula também os saldos desses registos
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const EN1_ESP = 8 * 60 + 30;   // 08:30
const SA1_ESP = 13 * 60;
const EN2_ESP = 14 * 60;
const SA2_ESP = 18 * 60 + 30;
const ALMOCO  = 60;

const HORARIOS_CUSTOM = {
  '12': { en1: 9 * 60 },
  '29': { en1: 9 * 60 },
};

function toMin(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function fmtTime(m) {
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.abs(m) % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function calcularSaldo(en1, sa1, en2, sa2, isSabado, numStr) {
  const custom = HORARIOS_CUSTOM[numStr] || {};
  const en1Esp = custom.en1 ?? EN1_ESP;

  const en1m = toMin(en1);
  const sa1m = toMin(sa1);
  const en2m = toMin(en2);
  const sa2m = toMin(sa2);

  const detalhes = [];
  let saldo = 0;
  let atrasoEn = 0, excessoAlm = 0, saidaCedo = 0, extraSa = 0;

  if (isSabado) {
    if (en1m === null || sa1m === null) return { saldo: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, detalhe: '✓ Cumprido' };
    const tardeSa1 = sa1m - (13 * 60);
    if (tardeSa1 > 0) { extraSa = tardeSa1; detalhes.push(`Saída tarde +${fmtTime(tardeSa1)}`); }
    else if (tardeSa1 < 0) { saidaCedo = Math.abs(tardeSa1); detalhes.push(`Saída cedo ${fmtTime(tardeSa1)}`); }
    if (en1m > en1Esp) { atrasoEn = en1m - en1Esp; detalhes.push(`Entrada atrasada -${fmtTime(atrasoEn)}`); }
    saldo = tardeSa1 - (en1m > en1Esp ? en1m - en1Esp : 0);
    return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
  }

  if (en1m === null && sa1m === null && en2m === null && sa2m === null) {
    return { saldo: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, detalhe: '✓ Cumprido' };
  }

  if (en1m !== null && en1m > en1Esp) {
    atrasoEn = en1m - en1Esp;
    detalhes.push(`Entrada atrasada -${fmtTime(atrasoEn)}`);
  }

  if (sa1m !== null && en2m !== null) {
    const almReal = en2m - sa1m;
    const diffAlm = almReal - ALMOCO;
    if (diffAlm > 0) { excessoAlm = diffAlm; detalhes.push(`Almoço longo -${fmtTime(diffAlm)}`); }
    else if (diffAlm < 0) { detalhes.push(`Almoço curto +${fmtTime(Math.abs(diffAlm))}`); }
  }

  if (sa2m !== null) {
    const tardeSa2 = sa2m - SA2_ESP;
    if (tardeSa2 > 0) { extraSa = tardeSa2; detalhes.push(`Saída tarde +${fmtTime(tardeSa2)}`); }
    else if (tardeSa2 < 0) { saidaCedo = Math.abs(tardeSa2); detalhes.push(`Saída cedo ${fmtTime(tardeSa2)}`); }
  }

  const almReal = (sa1m !== null && en2m !== null) ? (en2m - sa1m) : ALMOCO;
  const diffAlm = almReal - ALMOCO;
  const tardeSa2 = sa2m !== null ? sa2m - SA2_ESP : 0;
  saldo = tardeSa2 - (en1m !== null && en1m > en1Esp ? en1m - en1Esp : 0) - diffAlm;

  return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar registos onde EN1 foi preenchido automaticamente com 08:30
const [registos] = await conn.execute(
  `SELECT id, numero, en1, sa1, en2, sa2, diaSemana
   FROM registos_diarios
   WHERE numero IN ('12', '29')
     AND ignorada = 0
     AND en1Auto = 1
     AND en1 IN ('08:30', '8:30')`
);

console.log(`Registos com EN1=08:30 automático a corrigir: ${registos.length}`);

let updated = 0;
for (const r of registos) {
  const isSabado = r.diaSemana === 'SÁB' || r.diaSemana === 'SAB';
  const numStr = String(r.numero).trim();
  const novoEn1 = '09:00';

  // Recalcular com EN1=09:00
  const calc = calcularSaldo(novoEn1, r.sa1, r.en2, r.sa2, isSabado, numStr);

  await conn.execute(
    `UPDATE registos_diarios SET
      en1 = ?, saldo = ?, atrasoEn = ?, excessoAlm = ?, saidaCedo = ?, extraSa = ?, detalhe = ?
     WHERE id = ?`,
    [novoEn1, calc.saldo, calc.atrasoEn, calc.excessoAlm, calc.saidaCedo, calc.extraSa, calc.detalhe, r.id]
  );
  updated++;
}

console.log(`Registos corrigidos: ${updated}`);

// Verificar resultado final
const [resumo] = await conn.execute(
  `SELECT numero, nome,
     SUM(CASE WHEN ignorada=0 AND justificacao IS NULL THEN saldo ELSE 0 END) as saldoTotal,
     SUM(CASE WHEN ignorada=0 THEN atrasoEn ELSE 0 END) as totalAtrasos
   FROM registos_diarios
   WHERE numero IN ('12', '29')
   GROUP BY numero, nome`
);

console.log('\nResumo final:');
for (const r of resumo) {
  const s = r.saldoTotal;
  const sign = s >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(s) / 60);
  const m = Math.abs(s) % 60;
  console.log(`  Nº${r.numero} ${r.nome}: saldo=${sign}${h}h${m}m, total atrasos=${r.totalAtrasos}min`);
}

await conn.end();
console.log('\nConcluído!');
