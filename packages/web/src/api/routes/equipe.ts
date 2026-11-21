import { z } from "zod";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed, reader, writer } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ROLE_IDS } from "../lib/roles";
import { logAction } from "../lib/journal";

const roleInvite = z.enum(ROLE_IDS).refine((r) => r !== "directeur", "Rôle invalide");

/** La personne connectée : rôle, établissement. */
export const me = {
  get: authed.handler(async ({ context }) => {
    const [cfg] = await db.select({ nom: s.settings.nom }).from(s.settings).where(eq(s.settings.userId, context.user.id));
    return { ...context.me, etablissement: cfg?.nom ?? "", estProprietaire: context.me.membreId === 0 };
  }),
};

export const membres = {
  /** Liste des membres : visible par tous (pour assigner des tâches). */
  list: authed.handler(async ({ context }) => {
    const rows = await db.select().from(s.membres).where(eq(s.membres.userId, context.user.id)).orderBy(asc(s.membres.role), asc(s.membres.nom));
    return rows.map((m) => ({ ...m, connecte: !!m.memberUserId }));
  }),
  create: writer("equipe")
    .input(z.object({ email: z.string().email(), nom: z.string().min(1), role: roleInvite, enseignant: z.string().optional() }))
    .handler(async ({ context, input }) => {
      const email = input.email.trim().toLowerCase();
      if (email === context.me.email.toLowerCase())
        throw new ORPCError("BAD_REQUEST", { message: "C'est votre propre adresse (directeur)." });
      const [dup] = await db.select({ id: s.membres.id, userId: s.membres.userId }).from(s.membres).where(sql`lower(${s.membres.email}) = ${email}`);
      if (dup) throw new ORPCError("BAD_REQUEST", { message: dup.userId === context.user.id ? "Ce membre est déjà invité." : "Cette adresse appartient déjà à un autre établissement." });
      const [row] = await db
        .insert(s.membres)
        .values({ userId: context.user.id, email, nom: input.nom.trim(), role: input.role, enseignant: input.enseignant?.trim() ?? "" })
        .returning();
      await logAction(context.user.id, context.me, "Invitation", "equipe", `${row.nom} (${row.role})`);
      return row;
    }),
  update: writer("equipe")
    .input(z.object({ id: z.number(), data: z.object({ nom: z.string().optional(), role: roleInvite.optional(), enseignant: z.string().optional(), actif: z.boolean().optional() }) }))
    .handler(async ({ context, input }) => {
      const [row] = await db.update(s.membres).set(input.data).where(and(eq(s.membres.id, input.id), eq(s.membres.userId, context.user.id))).returning();
      await logAction(context.user.id, context.me, "Modification membre", "equipe", row ? `${row.nom} (${row.role})` : "");
      return row;
    }),
  remove: writer("equipe").input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [row] = await db.delete(s.membres).where(and(eq(s.membres.id, input.id), eq(s.membres.userId, context.user.id))).returning();
    if (row) {
      // Les tâches du membre retournent à son rôle.
      await db.update(s.taches).set({ assigneMembreId: 0 }).where(and(eq(s.taches.userId, context.user.id), eq(s.taches.assigneMembreId, row.id)));
      await logAction(context.user.id, context.me, "Retrait membre", "equipe", row.nom);
    }
    return { ok: true };
  }),
};

export const journal = {
  list: reader("equipe")
    .input(z.object({ limit: z.number().int().min(1).max(500).default(150) }).optional())
    .handler(({ context, input }) =>
      db.select().from(s.journal).where(eq(s.journal.userId, context.user.id)).orderBy(desc(s.journal.id)).limit(input?.limit ?? 150),
    ),
};

/** Liste légère des élèves (matricule, nom, classe) — utile à tous les rôles pour les formulaires. */
export const eleves = {
  list: authed.handler(({ context }) =>
    db
      .select({ id: s.eleves.id, matricule: s.eleves.matricule, nom: s.eleves.nom, prenom: s.eleves.prenom, classe: s.eleves.classe })
      .from(s.eleves)
      .where(and(eq(s.eleves.userId, context.user.id), ne(s.eleves.matricule, "")))
      .orderBy(asc(s.eleves.classe), asc(s.eleves.nom)),
  ),
};
