/**
 * Script para recalcular os saldos dos colaboradores com horário personalizado
 * Pedro Silva (nº12) e Patrícia (nº29) — entrada às 09:00
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuração (igual ao pontoEngine.ts) ───────────────────────────────
const EN1_ESP = 8 * 60 + 30;   // 08:30
const SA1_ESP = 13 * 60;        // 13:00
const EN2_ESP = 14 * 60;        // 14:00
const SA2_ESP = 18 * 60 + 30;   // 18:30
const ALMOCO  = 60;

const HORARIOS_CUSTOM = {
  '12': { en1: 9 * 60 },   // Pedro Silva — entrada 09:00
  '29': { en1: 9 * 60 },   // Patricia — entrada 09:00
};

function toMin(s) {
  if (!s) return null;
  const clean = String(s).trim();
  if (!clean) return null;
  const m = clean.match(/^(\d{1,2}):(\d{2})/);
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

// ─── Atualizar BD ─────────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar todos os registos do Pedro Silva (12) e Patrícia (29) que não estão ignorados
const [registos] = await conn.execute(
  `SELECT id, numero, en1, sa1, en2, sa2, diaSemana, en1Auto, saldo
   FROM registos_diarios
   WHERE numero IN ('12', '29') AND ignorada = 0`
);

console.log(`Total de registos a recalcular: ${registos.length}`);

let updated = 0;
let saldoAnteriorTotal = { '12': 0, '29': 0 };
let saldoNovoTotal = { '12': 0, '29': 0 };

for (const r of registos) {
  const isSabado = r.diaSemana === 'SÁB' || r.diaSemana === 'SAB';
  const numStr = String(r.numero).trim();
  const saldoAntigo = r.saldo ?? 0;

  // Recalcular com o novo horário
  const calc = calcularSaldo(r.en1, r.sa1, r.en2, r.sa2, isSabado, numStr);

  saldoAnteriorTotal[numStr] = (saldoAnteriorTotal[numStr] || 0) + saldoAntigo;
  saldoNovoTotal[numStr] = (saldoNovoTotal[numStr] || 0) + calc.saldo;

  // Atualizar apenas se o saldo mudou
  if (calc.saldo !== saldoAntigo || calc.atrasoEn !== r.atrasoEn) {
    await conn.execute(
      `UPDATE registos_diarios SET
        saldo = ?, atrasoEn = ?, excessoAlm = ?, saidaCedo = ?, extraSa = ?, detalhe = ?
       WHERE id = ?`,
      [calc.saldo, calc.atrasoEn, calc.excessoAlm, calc.saidaCedo, calc.extraSa, calc.detalhe, r.id]
    );
    updated++;
  }
}

console.log(`\nRegistos atualizados: ${updated}`);
console.log('\nResumo por colaborador:');
for (const num of ['12', '29']) {
  const ant = saldoAnteriorTotal[num] || 0;
  const novo = saldoNovoTotal[num] || 0;
  const diff = novo - ant;
  const hAnt = Math.floor(Math.abs(ant) / 60);
  const mAnt = Math.abs(ant) % 60;
  const hNovo = Math.floor(Math.abs(novo) / 60);
  const mNovo = Math.abs(novo) % 60;
  console.log(`  Nº${num}: saldo anterior ${ant >= 0 ? '+' : ''}${hAnt}h${mAnt}m → novo ${novo >= 0 ? '+' : ''}${hNovo}h${mNovo}m (diferença: ${diff >= 0 ? '+' : ''}${diff} min)`);
}

await conn.end();
console.log('\nConcluído!');
