import { z } from "zod";
import { and, eq, inArray, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed, reader, writer, type Me } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { canRead } from "../lib/roles";
import { logAction } from "../lib/journal";
import { creerTache, fermerTaches } from "../lib/taches";

const cible = z.object({ classe: z.string().min(1), matiere: z.string().min(1), trimestre: z.string().min(1), evaluation: z.string().min(1) });
type Cible = z.infer<typeof cible>;

/** Matières de la personne : l'enseignant ne voit que celles où il est désigné dans le paramétrage EDT. */
async function matieresDe(etab: string, me: Me): Promise<string[]> {
  const rows = await db.select({ nom: s.matieres.nom, enseignant: s.matieres.enseignant }).from(s.matieres).where(eq(s.matieres.userId, etab));
  if (me.role !== "enseignant") return [...new Set(rows.map((r) => r.nom))];
  const moi = me.enseignant.trim().toLowerCase();
  return [...new Set(rows.filter((r) => moi && r.enseignant.trim().toLowerCase() === moi).map((r) => r.nom))];
}

const where = (etab: string, c: Cible) =>
  and(eq(s.notes.userId, etab), eq(s.notes.classe, c.classe), eq(s.notes.matiere, c.matiere), eq(s.notes.trimestre, c.trimestre), eq(s.notes.evaluation, c.evaluation));

const libelle = (c: Cible) => `${c.matiere} · ${c.classe} · ${c.trimestre} · ${c.evaluation}`;
const cleValidation = (c: Cible) => `valider-notes|${c.classe}|${c.matiere}|${c.trimestre}|${c.evaluation}`;

async function assertMatiere(etab: string, me: Me, matiere: string) {
  if (me.role === "directeur") return;
  const mine = await matieresDe(etab, me);
  if (!mine.includes(matiere)) throw new ORPCError("FORBIDDEN", { message: "Cette matière ne vous est pas attribuée." });
}

export const notes = {
  mesMatieres: authed.handler(({ context }) => matieresDe(context.user.id, context.me)),

  /** Liste des notes. Directeur : tout. Enseignant : ses matières. Autres lecteurs des bulletins : notes validées. */
  list: authed
    .input(z.object({ trimestre: z.string().optional() }).optional())
    .handler(async ({ context, input }) => {
      const me = context.me;
      const etab = context.user.id;
      const conds = [eq(s.notes.userId, etab)];
      if (input?.trimestre) conds.push(eq(s.notes.trimestre, input.trimestre));
      if (me.role === "enseignant") {
        const mine = await matieresDe(etab, me);
        if (!mine.length) return [];
        conds.push(inArray(s.notes.matiere, mine));
      } else if (me.role !== "directeur") {
        if (!canRead(me.role, "bulletins")) throw new ORPCError("FORBIDDEN", { message: "Accès non autorisé." });
        conds.push(eq(s.notes.statut, "Validé"));
      }
      return db.select().from(s.notes).where(and(...conds));
    }),

  /** Grille de saisie : tous les élèves de la classe avec leur note existante pour l'évaluation. */
  grille: writer("notes")
    .input(cible)
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      await assertMatiere(etab, context.me, input.matiere);
      const [eleves, existantes] = await Promise.all([
        db.select().from(s.eleves).where(and(eq(s.eleves.userId, etab), eq(s.eleves.classe, input.classe))),
        db.select().from(s.notes).where(where(etab, input)),
      ]);
      const par = new Map(existantes.map((n) => [n.matricule, n]));
      return {
        lignes: eleves
          .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`))
          .map((e) => {
            const n = par.get(e.matricule);
            return { matricule: e.matricule, nom: `${e.nom} ${e.prenom}`.trim(), note: n?.note ?? null, statut: n?.statut ?? "" };
          }),
        coef: existantes[0]?.coef ?? 1,
        date: existantes[0]?.date ?? "",
        statut: existantes.some((n) => n.statut === "Validé") ? "Validé" : existantes.some((n) => n.statut === "Soumis") ? "Soumis" : existantes.length ? "Brouillon" : "",
      };
    }),

  /** Enregistre la grille (brouillon). Un enseignant ne peut plus modifier une évaluation validée. */
  enregistrer: writer("notes")
    .input(cible.extend({ coef: z.coerce.number().min(0.5).max(10).default(1), date: z.string().default(""), lignes: z.array(z.object({ matricule: z.string(), nom: z.string(), note: z.number().min(0).max(20).nullable() })) }))
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      const me = context.me;
      await assertMatiere(etab, me, input.matiere);
      const existantes = await db.select().from(s.notes).where(where(etab, input));
      if (me.role !== "directeur" && existantes.some((n) => n.statut === "Validé"))
        throw new ORPCError("BAD_REQUEST", { message: "Notes déjà validées par la direction : modification impossible." });
      const par = new Map(existantes.map((n) => [n.matricule, n]));
      const [mat] = await db.select({ enseignant: s.matieres.enseignant }).from(s.matieres).where(and(eq(s.matieres.userId, etab), eq(s.matieres.nom, input.matiere)));
      let saisies = 0;
      for (const l of input.lignes) {
        const ex = par.get(l.matricule);
        if (l.note === null) {
          if (ex) await db.delete(s.notes).where(eq(s.notes.id, ex.id));
          continue;
        }
        saisies++;
        const statut = me.role === "directeur" && ex?.statut === "Validé" ? "Validé" : "Brouillon";
        const vals = { note: l.note, coef: input.coef, date: input.date, saisiPar: me.nom, statut, nom: l.nom };
        if (ex) await db.update(s.notes).set(vals).where(eq(s.notes.id, ex.id));
        else
          await db.insert(s.notes).values({
            ...vals, userId: etab, matricule: l.matricule, classe: input.classe, matiere: input.matiere,
            trimestre: input.trimestre, evaluation: input.evaluation, enseignant: mat?.enseignant ?? me.enseignant,
          });
      }
      await logAction(etab, me, "Saisie des notes", "notes", `${libelle(input)} — ${saisies} note(s)`);
      return { saisies };
    }),

  /** L'enseignant soumet l'évaluation à la direction → tâche de validation pour le directeur. */
  soumettre: writer("notes")
    .input(cible)
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      await assertMatiere(etab, context.me, input.matiere);
      const rows = await db.update(s.notes).set({ statut: "Soumis" }).where(and(where(etab, input), eq(s.notes.statut, "Brouillon"))).returning();
      if (!rows.length) throw new ORPCError("BAD_REQUEST", { message: "Aucune note en brouillon à soumettre." });
      await creerTache(etab, context.me, {
        titre: `Valider les notes : ${libelle(input)}`,
        description: `${rows.length} note(s) soumise(s) par ${context.me.nom}.`,
        module: "notes", assigneRole: "directeur", priorite: "Haute", cle: cleValidation(input),
      });
      // La tâche « saisir les notes » de cette matière est considérée comme faite.
      await fermerTaches(etab, `notes|${input.classe}|${input.matiere}|${input.trimestre}`);
      await logAction(etab, context.me, "Soumission des notes", "notes", libelle(input));
      return { soumises: rows.length };
    }),

  /** Validation par la direction (verrouille les notes). */
  valider: writer("equipe")
    .input(cible)
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      const rows = await db.update(s.notes).set({ statut: "Validé" }).where(and(where(etab, input), ne(s.notes.statut, "Validé"))).returning();
      await fermerTaches(etab, cleValidation(input));
      await logAction(etab, context.me, "Validation des notes", "notes", `${libelle(input)} — ${rows.length} note(s)`);
      return { validees: rows.length };
    }),

  /** Renvoi à l'enseignant pour correction (repasse en brouillon + tâche pour l'enseignant). */
  renvoyer: writer("equipe")
    .input(cible.extend({ motif: z.string().default("") }))
    .handler(async ({ context, input }) => {
      const etab = context.user.id;
      const rows = await db.update(s.notes).set({ statut: "Brouillon" }).where(where(etab, input)).returning();
      await fermerTaches(etab, cleValidation(input));
      const ens = rows[0]?.enseignant ?? "";
      const [m] = ens
        ? await db.select({ id: s.membres.id }).from(s.membres).where(and(eq(s.membres.userId, etab), eq(s.membres.enseignant, ens)))
        : [];
      await creerTache(etab, context.me, {
        titre: `Corriger les notes : ${libelle(input)}`,
        description: input.motif || "Notes renvoyées par la direction pour correction.",
        module: "notes", assigneRole: "enseignant", assigneMembreId: m?.id ?? 0, priorite: "Haute", cle: `corriger|${cleValidation(input)}`,
      });
      await logAction(etab, context.me, "Renvoi des notes", "notes", libelle(input));
      return { renvoyees: rows.length };
    }),

  /** Évaluations soumises en attente de validation (vue directeur). */
  aValider: reader("equipe").handler(async ({ context }) => {
    const rows = await db.select().from(s.notes).where(and(eq(s.notes.userId, context.user.id), eq(s.notes.statut, "Soumis")));
    const groupes = new Map<string, { classe: string; matiere: string; trimestre: string; evaluation: string; enseignant: string; saisiPar: string; nb: number; somme: number }>();
    for (const n of rows) {
      const k = `${n.classe}|${n.matiere}|${n.trimestre}|${n.evaluation}`;
      const g = groupes.get(k) ?? { classe: n.classe, matiere: n.matiere, trimestre: n.trimestre, evaluation: n.evaluation, enseignant: n.enseignant, saisiPar: n.saisiPar, nb: 0, somme: 0 };
      g.nb++;
      g.somme += n.note ?? 0;
      groupes.set(k, g);
    }
    return [...groupes.values()].map((g) => ({ ...g, moyenne: g.nb ? g.somme / g.nb : 0 }));
  }),
};
