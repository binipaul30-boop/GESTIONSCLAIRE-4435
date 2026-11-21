import { z } from "zod";
import { and, desc, eq, or } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { PRIORITES, ROLE_IDS, STATUTS_TACHE } from "../lib/roles";
import { logAction } from "../lib/journal";
import { creerTache } from "../lib/taches";
import { parseClasses, statutScolarite, formatFdj } from "../lib/calc";

const champs = z.object({
  titre: z.string().min(1),
  description: z.string().optional(),
  module: z.string().optional(),
  assigneRole: z.enum(ROLE_IDS),
  assigneMembreId: z.number().int().default(0),
  echeance: z.string().optional(),
  priorite: z.enum(PRIORITES).default("Normale"),
  statut: z.enum(STATUTS_TACHE).optional(),
  commentaire: z.string().optional(),
  fichierUrl: z.string().optional(),
  fichierNom: z.string().optional(),
});

const today = () => new Date().toISOString().slice(0, 10);
const plusJours = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const taches = {
  /** Directeur : toutes les tâches. Autres : les miennes, celles de mon rôle, celles que j'ai créées. */
  list: authed.handler(({ context }) => {
    const me = context.me;
    const etab = context.user.id;
    const base = eq(s.taches.userId, etab);
    if (me.role === "directeur") return db.select().from(s.taches).where(base).orderBy(desc(s.taches.id));
    const visibles = or(
      me.membreId ? eq(s.taches.assigneMembreId, me.membreId) : undefined,
      and(eq(s.taches.assigneRole, me.role), eq(s.taches.assigneMembreId, 0)),
      eq(s.taches.creeParId, me.userId),
    );
    return db.select().from(s.taches).where(and(base, visibles)).orderBy(desc(s.taches.id));
  }),

  create: authed.input(champs).handler(async ({ context, input }) => {
    const [row] = await db
      .insert(s.taches)
      .values({
        ...input,
        description: input.description ?? "",
        module: input.module ?? "",
        echeance: input.echeance ?? "",
        userId: context.user.id,
        creePar: context.me.nom,
        creeParId: context.me.userId,
      })
      .returning();
    await logAction(context.user.id, context.me, "Nouvelle tâche", "taches", `${row.titre} → ${row.assigneRole}`);
    return row;
  }),

  /** Directeur / créateur : tout modifier. Assigné : statut, commentaire, pièce jointe. */
  update: authed
    .input(z.object({ id: z.number(), data: champs.partial() }))
    .handler(async ({ context, input }) => {
      const me = context.me;
      const [t] = await db.select().from(s.taches).where(and(eq(s.taches.id, input.id), eq(s.taches.userId, context.user.id)));
      if (!t) throw new ORPCError("NOT_FOUND", { message: "Tâche introuvable" });
      const gestion = me.role === "directeur" || t.creeParId === me.userId;
      const assigne = (me.membreId && t.assigneMembreId === me.membreId) || (t.assigneMembreId === 0 && t.assigneRole === me.role);
      if (!gestion && !assigne) throw new ORPCError("FORBIDDEN", { message: "Cette tâche ne vous est pas attribuée." });
      let data: Record<string, unknown> = input.data;
      if (!gestion) {
        const { statut, commentaire, fichierUrl, fichierNom } = input.data;
        data = Object.fromEntries(Object.entries({ statut, commentaire, fichierUrl, fichierNom }).filter(([, v]) => v !== undefined));
        // Prendre en charge une tâche de rôle : elle devient la mienne.
        if (t.assigneMembreId === 0 && me.membreId && statut && statut !== "À faire") data.assigneMembreId = me.membreId;
      }
      if (data.statut === "Terminée" && t.statut !== "Terminée") data.termineeLe = today();
      if (data.statut && data.statut !== "Terminée") data.termineeLe = "";
      const [row] = await db.update(s.taches).set(data).where(eq(s.taches.id, t.id)).returning();
      const quoi = data.statut && data.statut !== t.statut ? `${t.statut} → ${data.statut}` : data.assigneRole || data.assigneMembreId !== undefined ? "réattribution" : "mise à jour";
      await logAction(context.user.id, me, "Tâche", "taches", `${t.titre} (${quoi})`);
      return row;
    }),

  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [t] = await db.select().from(s.taches).where(and(eq(s.taches.id, input.id), eq(s.taches.userId, context.user.id)));
    if (!t) return { ok: true };
    if (context.me.role !== "directeur" && t.creeParId !== context.me.userId)
      throw new ORPCError("FORBIDDEN", { message: "Seul le créateur ou le directeur peut supprimer cette tâche." });
    await db.delete(s.taches).where(eq(s.taches.id, t.id));
    await logAction(context.user.id, context.me, "Suppression tâche", "taches", t.titre);
    return { ok: true };
  }),

  /** Analyse les données et crée les tâches de chaque acteur (sans doublon tant qu'une tâche est ouverte). */
  generer: authed
    .input(z.object({ trimestre: z.string().default("Trimestre 1") }).optional())
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      const me = context.me;
      const trimestre = input?.trimestre ?? "Trimestre 1";
      const own = <T extends { userId: unknown }>(t: T) => eq(t.userId as never, etab);
      const [cfg] = await db.select().from(s.settings).where(eq(s.settings.userId, etab));
      const [eleves, pays, docs, emprunts, absences, mats, notes, salles, membres] = await Promise.all([
        db.select().from(s.eleves).where(own(s.eleves)),
        db.select().from(s.paiements).where(own(s.paiements)),
        db.select().from(s.documents).where(own(s.documents)),
        db.select().from(s.emprunts).where(own(s.emprunts)),
        db.select().from(s.absences).where(own(s.absences)),
        db.select().from(s.matieres).where(own(s.matieres)),
        db.select().from(s.notes).where(and(own(s.notes), eq(s.notes.trimestre, trimestre))),
        db.select().from(s.salles).where(own(s.salles)),
        db.select().from(s.membres).where(and(own(s.membres), eq(s.membres.actif, true))),
      ]);
      const crees: string[] = [];
      const add = async (t: Parameters<typeof creerTache>[2]) => {
        const r = await creerTache(etab, me, t);
        if (r) crees.push(`${r.titre} → ${r.assigneRole}`);
      };

      // 1. Impayés de scolarité → comptable
      const tot = new Map<number, number>();
      for (const p of pays) tot.set(p.eleveId, (tot.get(p.eleveId) ?? 0) + p.montant);
      const imp = eleves.filter((e) => statutScolarite(e.fraisAnnuels, tot.get(e.id) ?? 0) !== "Soldé");
      if (imp.length) {
        const reste = imp.reduce((a, e) => a + Math.max(0, e.fraisAnnuels - (tot.get(e.id) ?? 0)), 0);
        await add({
          titre: `Relancer ${imp.length} famille(s) avec un solde de scolarité`,
          description: `Reste à encaisser : ${formatFdj(reste)}. ${imp.slice(0, 8).map((e) => `${e.nom} ${e.prenom} (${e.classe})`).join(", ")}${imp.length > 8 ? "…" : ""}`,
          module: "relances", assigneRole: "comptable", priorite: imp.length > 10 ? "Haute" : "Normale", echeance: plusJours(7), cle: "auto|impayes",
        });
      }

      // 2. Documents expirés / expirant sous 30 jours → rôle responsable (secrétariat par défaut)
      for (const d of docs) {
        if (!d.dateExpiration || d.statut === "Archivé" || d.dateExpiration > plusJours(30)) continue;
        const expire = d.dateExpiration < today();
        await add({
          titre: `${expire ? "Renouveler (expiré)" : "Renouveler avant expiration"} : ${d.type} — ${d.concerne}`,
          description: `Expiration le ${d.dateExpiration}. Classement : ${d.lieu || "—"}.`,
          module: "documents", assigneRole: (ROLE_IDS as readonly string[]).includes(d.roleResponsable) ? d.roleResponsable : "secretariat",
          priorite: expire ? "Urgente" : "Haute", echeance: d.dateExpiration < today() ? plusJours(3) : d.dateExpiration, cle: `auto|doc|${d.id}`,
        });
      }

      // 3. Livres en retard → bibliothécaire
      const retards = emprunts.filter((e) => e.statut !== "Rendu" && !e.dateRetour && e.dateRetourPrevue && e.dateRetourPrevue < today());
      if (retards.length)
        await add({
          titre: `Récupérer ${retards.length} livre(s) en retard`,
          description: retards.slice(0, 8).map((e) => `${e.titre} — ${e.nom} (prévu ${e.dateRetourPrevue})`).join(" · "),
          module: "bibliotheque", assigneRole: "bibliothecaire", echeance: plusJours(5), cle: "auto|retards-livres",
        });

      // 4. Absences non justifiées → surveillant
      const nj = absences.filter((a) => a.type === "Absence" && a.justifie !== "Oui");
      if (nj.length)
        await add({
          titre: `Obtenir la justification de ${nj.length} absence(s)`,
          description: nj.slice(0, 8).map((a) => `${a.nom} (${a.classe}, ${a.date})`).join(" · "),
          module: "absences", assigneRole: "surveillant", echeance: plusJours(3), cle: "auto|absences-nj",
        });

      // 5. Notes manquantes → enseignant concerné (une tâche par matière et classe)
      const classes = parseClasses(cfg?.classes).filter((c) => eleves.some((e) => e.classe === c));
      const faites = new Set(notes.map((n) => `${n.classe}|${n.matiere}`));
      for (const m of mats) {
        if (!m.nom || m.heures <= 0) continue;
        const membre = membres.find((x) => x.role === "enseignant" && x.enseignant && x.enseignant.trim().toLowerCase() === m.enseignant.trim().toLowerCase());
        for (const c of classes) {
          if (faites.has(`${c}|${m.nom}`)) continue;
          await add({
            titre: `Saisir les notes : ${m.nom} · ${c} · ${trimestre}`,
            description: `Aucune note saisie pour cette classe ce trimestre. Enseignant : ${m.enseignant || "non désigné"}.`,
            module: "notes", assigneRole: "enseignant", assigneMembreId: membre?.id ?? 0, echeance: plusJours(14), cle: `notes|${c}|${m.nom}|${trimestre}`,
          });
        }
      }

      // 6. Salles en travaux / hors service → intendant
      for (const x of salles.filter((x) => x.statut === "En travaux" || x.statut === "Hors service"))
        await add({
          titre: `Suivre la remise en service : ${x.code} (${x.statut})`,
          description: `${x.batiment} — ${x.equipements}`,
          module: "salles", assigneRole: "intendant", cle: `auto|salle|${x.id}`,
        });

      if (crees.length) await logAction(etab, me, "Génération des tâches", "taches", `${crees.length} tâche(s) créée(s)`);
      return { crees: crees.length, details: crees };
    }),
};
