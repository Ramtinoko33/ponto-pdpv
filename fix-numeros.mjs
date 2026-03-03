/**
 * Script para corrigir os números dos colaboradores na BD
 * usando o ficheiro Excel original como referência
 */
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const wb = XLSX.readFile('/home/ubuntu/upload/fevereiro.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

// Construir mapa nome → número
const nomeParaNumero = {};
for (const row of raw) {
  const num = row['Número'] ? String(row['Número']).trim() : '';
  const nome = row['Nome'] ? String(row['Nome']).trim() : '';
  if (num && nome && !nomeParaNumero[nome]) {
    nomeParaNumero[nome] = num;
  }
}

console.log('Mapa nome→número:', JSON.stringify(nomeParaNumero, null, 2));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Atualizar cada colaborador
let updated = 0;
for (const [nome, numero] of Object.entries(nomeParaNumero)) {
  const [result] = await conn.execute(
    'UPDATE registos_diarios SET numero = ? WHERE nome = ? AND (numero = "" OR numero IS NULL)',
    [numero, nome]
  );
  if (result.affectedRows > 0) {
    console.log(`Atualizado: ${nome} → ${numero} (${result.affectedRows} registos)`);
    updated += result.affectedRows;
  }
}

console.log(`\nTotal atualizado: ${updated} registos`);
await conn.end();
