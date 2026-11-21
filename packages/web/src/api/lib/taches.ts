import { and, eq, like, ne } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";
import type { Me } from "../middleware/auth";

type NouvelleTache = {
  titre: string;
  description?: string;
  module?: string;
  assigneRole: string;
  assigneMembreId?: number;
  priorite?: string;
  echeance?: string;
  cle?: string;
};

/** Crée une tâche ; si `cle` est fournie, ne crée rien tant qu'une tâche ouverte porte la même clé. */
export async function creerTache(etab: string, me: Pick<Me, "nom" | "userId">, t: NouvelleTache) {
  if (t.cle) {
    const [ex] = await db
      .select({ id: s.taches.id })
      .from(s.taches)
      .where(and(eq(s.taches.userId, etab), eq(s.taches.cle, t.cle), ne(s.taches.statut, "Terminée")));
    if (ex) return null;
  }
  const [row] = await db
    .insert(s.taches)
    .values({
      userId: etab,
      titre: t.titre,
      description: t.description ?? "",
      module: t.module ?? "",
      assigneRole: t.assigneRole,
      assigneMembreId: t.assigneMembreId ?? 0,
      priorite: t.priorite ?? "Normale",
      echeance: t.echeance ?? "",
      cle: t.cle ?? "",
      creePar: me.nom,
      creeParId: me.userId,
    })
    .returning();
  return row;
}

/** Termine les tâches ouvertes dont la clé commence par `prefixe`. */
export async function fermerTaches(etab: string, prefixe: string) {
  await db
    .update(s.taches)
    .set({ statut: "Terminée", termineeLe: new Date().toISOString().slice(0, 10) })
    .where(and(eq(s.taches.userId, etab), like(s.taches.cle, `${prefixe}%`), ne(s.taches.statut, "Terminée")));
}
