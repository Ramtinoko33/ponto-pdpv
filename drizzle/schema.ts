import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Meses carregados ──────────────────────────────────────────────────────
export const meses = mysqlTable("meses", {
  id: int("id").autoincrement().primaryKey(),
  ano: int("ano").notNull(),
  mes: int("mes").notNull(),
  label: varchar("label", { length: 20 }).notNull(),
  totalRegistos: int("totalRegistos").notNull().default(0),
  totalColaboradores: int("totalColaboradores").notNull().default(0),
  saldoGeral: int("saldoGeral").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mes = typeof meses.$inferSelect;

// ─── Registos diários ─────────────────────────────────────────────────────
export const registosDiarios = mysqlTable("registos_diarios", {
  id: int("id").autoincrement().primaryKey(),
  mesId: int("mesId").notNull(),
  numero: varchar("numero", { length: 10 }).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  data: varchar("data", { length: 20 }).notNull(),
  diaSemana: varchar("diaSemana", { length: 10 }),
  horario: varchar("horario", { length: 20 }),
  en1: varchar("en1", { length: 8 }),
  sa1: varchar("sa1", { length: 8 }),
  en2: varchar("en2", { length: 8 }),
  sa2: varchar("sa2", { length: 8 }),
  en1Auto: int("en1Auto").notNull().default(0),
  sa1Auto: int("sa1Auto").notNull().default(0),
  en2Auto: int("en2Auto").notNull().default(0),
  sa2Auto: int("sa2Auto").notNull().default(0),
  cenario: varchar("cenario", { length: 20 }),
  saldo: int("saldo"),
  atrasoEn: int("atrasoEn").notNull().default(0),
  excessoAlm: int("excessoAlm").notNull().default(0),
  saidaCedo: int("saidaCedo").notNull().default(0),
  extraSa: int("extraSa").notNull().default(0),
  justificacao: varchar("justificacao", { length: 100 }),
  detalhe: text("detalhe"),
  ignorada: int("ignorada").notNull().default(0),
});

export type RegistoDiario = typeof registosDiarios.$inferSelect;