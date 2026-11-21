import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed, reader, writer } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { ensureSeed, seedDemo } from "../lib/seed";
import { moyenneNotes, parseClasses, pctPaye, statutExamen, statutScolarite } from "../lib/calc";
import { elevesCrud, deletePaiementsOf } from "./modules";

const own = <T extends { userId: unknown }>(t: T, uid: string) => eq(t.userId as never, uid);

export const settings = {
  get: authed.handler(async ({ context }) => {
    const row = await ensureSeed(context.user.id);
    return row!;
  }),
  update: writer("parametres")
    .input(
      z.object({
        nom: z.string().optional(),
        annee: z.string().optional(),
        classes: z.string().optional(),
        loyer: z.coerce.number().optional(),
        fournitures: z.coerce.number().optional(),
        electricite: z.coerce.number().optional(),
        autres: z.coerce.number().optional(),
        moisSalaires: z.coerce.number().int().min(1).max(12).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await ensureSeed(context.user.id);
      const [row] = await db.update(s.settings).set(input).where(eq(s.settings.userId, context.user.id)).returning();
      return row;
    }),
  demo: writer("parametres").handler(async ({ context }) => {
    await ensureSeed(context.user.id);
    const [e] = await db.select({ id: s.eleves.id }).from(s.eleves).where(own(s.eleves, context.user.id)).limit(1);
    if (e) throw new ORPCError("BAD_REQUEST", { message: "Des élèves existent déjà : données de démo non chargées." });
    await seedDemo(context.user.id);
    return { ok: true };
  }),
};

/** Scolarité : élèves + total payé (somme des paiements), reste, % payé, statut. */
export const scolarite = {
  list: reader("scolarite").handler(async ({ context }) => {
    const uid = context.user.id;
    const [eleves, pays] = await Promise.all([
      db.select().from(s.eleves).where(own(s.eleves, uid)),
      db.select().from(s.paiements).where(own(s.paiements, uid)),
    ]);
    const tot = new Map<number, number>();
    for (const p of pays) tot.set(p.eleveId, (tot.get(p.eleveId) ?? 0) + p.montant);
    return eleves
      .map((e) => {
        const totalPaye = tot.get(e.id) ?? 0;
        return {
          ...e,
          totalPaye,
          reste: e.fraisAnnuels - totalPaye,
          pct: pctPaye(e.fraisAnnuels, totalPaye),
          statutPaiement: statutScolarite(e.fraisAnnuels, totalPaye),
        };
      })
      .sort((a, b) => a.matricule.localeCompare(b.matricule));
  }),
  create: elevesCrud.create,
  update: elevesCrud.update,
  remove: writer("scolarite").input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await deletePaiementsOf(context.user.id, input.id);
    await db.delete(s.eleves).where(and(eq(s.eleves.id, input.id), own(s.eleves, context.user.id)));
    return { ok: true };
  }),
  paiements: reader("scolarite").input(z.object({ eleveId: z.number() })).handler(({ context, input }) =>
    db
      .select()
      .from(s.paiements)
      .where(and(own(s.paiements, context.user.id), eq(s.paiements.eleveId, input.eleveId))),
  ),
  payer: writer("scolarite")
    .input(z.object({ eleveId: z.number(), montant: z.coerce.number().positive(), date: z.string(), mode: z.string(), note: z.string().optional() }))
    .handler(async ({ context, input }) => {
      const [row] = await db.insert(s.paiements).values({ ...input, note: input.note ?? "", userId: context.user.id }).returning();
      return row;
    }),
  supprimerPaiement: writer("scolarite").input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(s.paiements).where(and(eq(s.paiements.id, input.id), own(s.paiements, context.user.id)));
    return { ok: true };
  }),
  /** Inscription → élève (copie de l'identité, du matricule INS-xxx et de la classe). */
  convertir: writer("inscriptions")
    .input(z.object({ inscriptionId: z.number(), fraisAnnuels: z.coerce.number().default(0) }))
    .handler(async ({ context, input }) => {
      const uid = context.user.id;
      const [ins] = await db
        .select()
        .from(s.inscriptions)
        .where(and(eq(s.inscriptions.id, input.inscriptionId), own(s.inscriptions, uid)));
      if (!ins) throw new ORPCError("NOT_FOUND", { message: "Inscription introuvable" });
      if (ins.converti) throw new ORPCError("BAD_REQUEST", { message: "Déjà converti en élève" });
      const [eleve] = await db
        .insert(s.eleves)
        .values({
          userId: uid,
          matricule: ins.matricule,
          nom: ins.nom,
          prenom: ins.prenom,
          sexe: ins.sexe,
          classe: ins.classe,
          niveau: ins.niveau,
          parent: ins.parent,
          telephone: ins.telephone,
          fraisAnnuels: input.fraisAnnuels,
          photoRef: ins.photoRef,
        })
        .returning();
      await db.update(s.inscriptions).set({ converti: true, statut: "Inscrit" }).where(eq(s.inscriptions.id, ins.id));
      return eleve;
    }),
};

async function computeBilan(uid: string) {
  const [cfg] = await db.select().from(s.settings).where(eq(s.settings.userId, uid));
  const [ins, pays, cant, trans, ens, adm] = await Promise.all([
    db.select().from(s.inscriptions).where(own(s.inscriptions, uid)),
    db.select().from(s.paiements).where(own(s.paiements, uid)),
    db.select().from(s.cantine).where(own(s.cantine, uid)),
    db.select().from(s.transport).where(own(s.transport, uid)),
    db.select().from(s.enseignants).where(own(s.enseignants, uid)),
    db.select().from(s.personnelAdmin).where(own(s.personnelAdmin, uid)),
  ]);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const mois = cfg?.moisSalaires ?? 1;
  const recettes = {
    inscriptions: sum(ins.filter((i) => i.statut === "Inscrit").map((i) => i.frais)),
    scolarite: sum(pays.map((p) => p.montant)),
    cantine: sum(cant.map((c) => c.paye)),
    transport: sum(trans.map((t) => t.paye)),
  };
  const charges = {
    salairesEnseignants: sum(ens.filter((e) => e.statut !== "Parti").map((e) => e.salaire)) * mois,
    salairesAdmin: sum(adm.filter((e) => e.statut !== "Parti").map((e) => e.salaire)) * mois,
    loyer: cfg?.loyer ?? 0,
    fournitures: cfg?.fournitures ?? 0,
    electricite: cfg?.electricite ?? 0,
    autres: cfg?.autres ?? 0,
  };
  const totalRecettes = sum(Object.values(recettes));
  const totalCharges = sum(Object.values(charges));
  return { recettes, charges, totalRecettes, totalCharges, solde: totalRecettes - totalCharges, moisSalaires: mois, settings: cfg };
}

export const finance = {
  bilan: reader("bilan").handler(({ context }) => computeBilan(context.user.id)),
};

export const stats = {
  overview: reader("dashboard").handler(async ({ context }) => {
    const uid = context.user.id;
    await ensureSeed(uid);
    const [bilan, eleves, pays, ens, adm, bul, abs, exa, sal] = await Promise.all([
      computeBilan(uid),
      db.select().from(s.eleves).where(own(s.eleves, uid)),
      db.select().from(s.paiements).where(own(s.paiements, uid)),
      db.select().from(s.enseignants).where(own(s.enseignants, uid)),
      db.select().from(s.personnelAdmin).where(own(s.personnelAdmin, uid)),
      db.select().from(s.bulletins).where(own(s.bulletins, uid)),
      db.select().from(s.absences).where(own(s.absences, uid)),
      db.select().from(s.examens).where(own(s.examens, uid)),
      db.select().from(s.salles).where(own(s.salles, uid)),
    ]);
    const tot = new Map<number, number>();
    for (const p of pays) tot.set(p.eleveId, (tot.get(p.eleveId) ?? 0) + p.montant);
    const statuts = eleves.map((e) => statutScolarite(e.fraisAnnuels, tot.get(e.id) ?? 0));
    const moyennes = bul.map((b) => moyenneNotes([b.note1, b.note2, b.note3, b.note4])).filter((m): m is number => m !== null);
    const admis = exa.filter((e) => statutExamen(e.note) === "Admis").length;
    const classes = parseClasses(bilan.settings?.classes);
    const reste = eleves.reduce((a, e) => a + Math.max(0, e.fraisAnnuels - (tot.get(e.id) ?? 0)), 0);
    return {
      eleves: eleves.length,
      filles: eleves.filter((e) => e.sexe === "F").length,
      garcons: eleves.filter((e) => e.sexe === "M").length,
      enseignantsActifs: ens.filter((e) => e.statut === "Actif").length,
      enseignants: ens.length,
      personnelAdmin: adm.length,
      soldes: statuts.filter((x) => x === "Soldé").length,
      partiels: statuts.filter((x) => x === "Partiel").length,
      impayes: statuts.filter((x) => x === "Impayé").length,
      resteScolarite: reste,
      totalRecettes: bilan.totalRecettes,
      totalCharges: bilan.totalCharges,
      solde: bilan.solde,
      recettes: bilan.recettes,
      moyenneGenerale: moyennes.length ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length : 0,
      absences: abs.filter((a) => a.type === "Absence").length,
      retards: abs.filter((a) => a.type === "Retard").length,
      sanctions: abs.filter((a) => a.type === "Sanction").length,
      tauxReussite: exa.length ? admis / exa.length : 0,
      examens: exa.length,
      sallesDisponibles: sal.filter((x) => x.statut === "Disponible").length,
      sallesIndisponibles: sal.filter((x) => x.statut === "En travaux" || x.statut === "Hors service").length,
      salles: sal.length,
      effectifs: classes.map((c) => ({ classe: c, effectif: eleves.filter((e) => e.classe === c).length })),
    };
  }),
};

export const school = { settings, scolarite, finance, stats };
