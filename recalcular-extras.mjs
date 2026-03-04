/**
 * recalcular-extras.mjs
 * Recalcula extra10Min e extra15Min para todos os registos existentes na BD
 * Regras:
 *   - extraSa > 0 e extraSa <= 30 → extra10Min = extraSa, extra15Min = 0
 *   - extraSa > 30 → extra10Min = 30, extra15Min = extraSa - 30
 *   - extraSa <= 0 → extra10Min = 0, extra15Min = 0
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar todos os registos com extraSa > 0
const [rows] = await conn.execute(
  'SELECT id, extraSa FROM registos_diarios WHERE extraSa > 0'
);

console.log(`Total de registos com horas extra: ${rows.length}`);

let atualizados = 0;
for (const row of rows) {
  const extraSa = row.extraSa;
  let extra10Min = 0;
  let extra15Min = 0;

  if (extraSa <= 30) {
    extra10Min = extraSa;
    extra15Min = 0;
  } else {
    extra10Min = 30;
    extra15Min = extraSa - 30;
  }

  await conn.execute(
    'UPDATE registos_diarios SET extra10Min = ?, extra15Min = ? WHERE id = ?',
    [extra10Min, extra15Min, row.id]
  );
  atualizados++;
}

console.log(`✅ ${atualizados} registos atualizados com extra10Min e extra15Min`);

// Verificar alguns exemplos
const [exemplos] = await conn.execute(
  `SELECT nome, data, extraSa, extra10Min, extra15Min,
   ROUND((extra10Min / 60.0) * 10 + (extra15Min / 60.0) * 15, 2) AS valorEuros
   FROM registos_diarios WHERE extraSa > 0 ORDER BY extraSa DESC LIMIT 10`
);

console.log('\nTop 10 dias com mais horas extra:');
for (const r of exemplos) {
  console.log(`  ${r.nome} | ${r.data} | extraSa=${r.extraSa}min | 10€: ${r.extra10Min}min | 15€: ${r.extra15Min}min | Total: ${r.valorEuros}€`);
}

await conn.end();
