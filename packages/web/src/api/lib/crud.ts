import { z } from "zod";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { reader, writer } from "../middleware/auth";
import type { Module } from "./roles";
import { logAction, resume } from "./journal";
import { db } from "../database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = SQLiteTableWithColumns<any>;
const SKIP = new Set(["id", "userId", "createdAt"]);

/** Construit un schéma zod partiel à partir des colonnes Drizzle (texte / nombre / booléen). */
export function shapeOf(table: AnyTable) {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (SKIP.has(key)) continue;
    const c = col as { dataType: string; notNull: boolean };
    let s: z.ZodType =
      c.dataType === "number"
        ? z.coerce.number()
        : c.dataType === "boolean"
          ? z.boolean()
          : z.string();
    if (!c.notNull) s = s.nullable();
    shape[key] = s.optional();
  }
  return z.object(shape);
}

/** CRUD générique, toujours filtré sur le compte connecté (un compte = un établissement). */
export function crud<T extends AnyTable>(
  table: T,
  hooks: {
    module: Module;
    beforeCreate?: (userId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  },
) {
  const input = shapeOf(table);
  const tbl = table as AnyTable;
  type Row = T["$inferSelect"];
  const mod = hooks.module;
  const r = reader(mod);
  const w = writer(mod);
  return {
    list: r.handler(async ({ context }) => {
      const rows = await db.select().from(tbl).where(eq(tbl.userId, context.user.id)).orderBy(desc(tbl.id));
      return rows as Row[];
    }),
    create: w.input(input).handler(async ({ context, input }) => {
      let data = input as Record<string, unknown>;
      if (hooks.beforeCreate) data = await hooks.beforeCreate(context.user.id, data);
      const [row] = await db.insert(tbl).values({ ...data, userId: context.user.id }).returning();
      await logAction(context.user.id, context.me, "Création", mod, resume(row));
      return row as Row;
    }),
    update: w
      .input(z.object({ id: z.number(), data: input }))
      .handler(async ({ context, input }) => {
        const [row] = await db
          .update(tbl)
          .set(input.data as Record<string, unknown>)
          .where(and(eq(tbl.id, input.id), eq(tbl.userId, context.user.id)))
          .returning();
        await logAction(context.user.id, context.me, "Modification", mod, resume(row));
        return row as Row;
      }),
    remove: w.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
      const [row] = await db
        .delete(tbl).where(and(eq(tbl.id, input.id), eq(tbl.userId, context.user.id)))
        .returning();
      await logAction(context.user.id, context.me, "Suppression", mod, resume(row));
      return { ok: true };
    }),
  };
}
