import { and, eq, sql } from "drizzle-orm";
import { crud } from "../lib/crud";
import { db } from "../database";
import * as s from "../database/schema";

// Modules « simples » : CRUD générique filtré par établissement (compte).
export const enseignants = crud(s.enseignants, { module: "enseignants" });
export const personnelAdmin = crud(s.personnelAdmin, { module: "personnelAdmin" });
export const bulletins = crud(s.bulletins, { module: "bulletins" });
export const cantine = crud(s.cantine, { module: "cantine" });
export const transport = crud(s.transport, { module: "transport" });
export const salles = crud(s.salles, { module: "salles" });
export const matieres = crud(s.matieres, { module: "edt" });
export const absences = crud(s.absences, { module: "absences" });
export const examens = crud(s.examens, { module: "examens" });
export const livres = crud(s.livres, { module: "bibliotheque" });
export const emprunts = crud(s.emprunts, { module: "bibliotheque" });
export const documents = crud(s.documents, { module: "documents" });
export const relances = crud(s.relances, { module: "relances" });

async function nextNum(userId: string) {
  const [r] = await db
    .select({ m: sql<number>`coalesce(max(${s.inscriptions.num}), 0)` })
    .from(s.inscriptions)
    .where(eq(s.inscriptions.userId, userId));
  return Number(r?.m ?? 0) + 1;
}

/** Inscriptions : N° et matricule INS-001 attribués automatiquement. */
export const inscriptions = crud(s.inscriptions, {
  module: "inscriptions",
  beforeCreate: async (userId, data) => {
    const num = await nextNum(userId);
    return { ...data, num, matricule: `INS-${String(num).padStart(3, "0")}` };
  },
});

/** Base élèves : matricule ELV-001 si non fourni. */
export const elevesCrud = crud(s.eleves, {
  module: "scolarite",
  beforeCreate: async (userId, data) => {
    if (data.matricule) return data;
    const [r] = await db.select({ c: sql<number>`count(*)` }).from(s.eleves).where(eq(s.eleves.userId, userId));
    return { ...data, matricule: `ELV-${String(Number(r?.c ?? 0) + 1).padStart(3, "0")}` };
  },
});

export const paiements = crud(s.paiements, { module: "scolarite" });

export async function deletePaiementsOf(userId: string, eleveId: number) {
  await db.delete(s.paiements).where(and(eq(s.paiements.userId, userId), eq(s.paiements.eleveId, eleveId)));
}

export const modules = {
  enseignants, personnelAdmin, bulletins, cantine, transport, salles, matieres,
  absences, examens, livres, emprunts, documents, relances, inscriptions,
};
