import { db } from "../database";
import { journal } from "../database/schema";
import type { Me } from "../middleware/auth";

/** Trace une action dans le journal d'activité (ne bloque jamais l'action). */
export async function logAction(etab: string, me: Me, action: string, module: string, detail = "") {
  try {
    await db.insert(journal).values({ userId: etab, acteur: me.nom, role: me.role, action, module, detail: detail.slice(0, 300) });
  } catch {
    /* journal best-effort */
  }
}

/** Résumé lisible d'un enregistrement pour le journal. */
export function resume(row: Record<string, unknown> | undefined) {
  if (!row) return "";
  const keys = ["matricule", "nom", "prenom", "titre", "type", "code", "classe", "matiere", "concerne"];
  return keys.map((k) => row[k]).filter((v) => typeof v === "string" && v).slice(0, 3).join(" · ");
}
