import { and, eq } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";
import { DEFAULT_CLASSES, MOIS } from "./calc";
import { genererEDT, typeSalleParDefaut } from "./edt";

export const SALLES_FICHIER = [
  ...DEFAULT_CLASSES.map((c) => ({ code: `Salle ${c}`, type: "Salle de classe (attitrée)", capacite: 35, batiment: "Bâtiment principal", equipements: "Tableau, bureaux" })),
  { code: "Labo Sciences 1", type: "Laboratoire", capacite: 30, batiment: "Bâtiment principal - RDC", equipements: "Paillasses, matériel expérimental" },
  { code: "Labo Sciences 2", type: "Laboratoire", capacite: 30, batiment: "Bâtiment principal - RDC", equipements: "Paillasses, matériel expérimental" },
  { code: "Salle Informatique", type: "Salle spécialisée", capacite: 20, batiment: "Bâtiment principal - 1er étage", equipements: "20 postes informatiques" },
  { code: "Salle Arts", type: "Salle spécialisée", capacite: 25, batiment: "Bâtiment principal - 1er étage", equipements: "Matériel arts plastiques/musique" },
  { code: "Terrain A", type: "Installation sportive", capacite: 40, batiment: "Extérieur", equipements: "Terrain multisport" },
  { code: "Terrain B", type: "Installation sportive", capacite: 40, batiment: "Extérieur", equipements: "Terrain multisport" },
  { code: "Bibliothèque", type: "Salle spécialisée", capacite: 40, batiment: "Bâtiment principal - RDC", equipements: "Espace lecture, ouvrages" },
  { code: "Salle Polyvalente", type: "Salle commune", capacite: 100, batiment: "Bâtiment principal - RDC", equipements: "Réunions, examens, événements" },
].map((x) => ({ ...x, statut: "Disponible" }));

export const MATIERES_FICHIER: [string, number, string][] = [
  ["Français", 5, "Prof. Français"],
  ["Mathématiques", 5, "Prof. Mathématiques"],
  ["Anglais", 3, "Prof. Anglais"],
  ["Histoire-Géographie", 3, "Prof. Histoire-Géo"],
  ["SVT", 2, "Prof. SVT"],
  ["Physique-Chimie", 3, "Prof. Physique-Chimie"],
  ["EPS", 2, "Prof. EPS"],
  ["Arabe", 2, "Prof. Arabe"],
  ["Éducation civique", 1, "Prof. Éducation civique"],
  ["Arts / Musique", 1, "Prof. Arts"],
];

const enCours = new Map<string, Promise<typeof s.settings.$inferSelect | undefined>>();

/** Premier accès d'un compte : paramètres, salles et paramétrage EDT du fichier + EDT généré.
 * Protégé contre les appels simultanés (verrou mémoire + réservation atomique en base). */
export async function ensureSeed(userId: string) {
  const [cur] = await db.select().from(s.settings).where(eq(s.settings.userId, userId));
  if (cur?.seeded) return cur;
  const running = enCours.get(userId);
  if (running) return running;
  const p = (async () => {
    if (!cur) await db.insert(s.settings).values({ userId }).onConflictDoNothing();
    const claimed = await db
      .update(s.settings)
      .set({ seeded: true })
      .where(and(eq(s.settings.userId, userId), eq(s.settings.seeded, false)))
      .returning();
    if (claimed.length) {
      const salles = SALLES_FICHIER.map((x) => ({ ...x, userId }));
      const matieres = MATIERES_FICHIER.map(([nom, heures, enseignant]) => ({ userId, nom, heures, enseignant, typeSalle: typeSalleParDefaut(nom) }));
      await db.insert(s.salles).values(salles);
      await db.insert(s.matieres).values(matieres);
      const { seances } = genererEDT(DEFAULT_CLASSES, matieres, salles);
      for (let i = 0; i < seances.length; i += 50)
        await db.insert(s.seances).values(seances.slice(i, i + 50).map((x) => ({ ...x, userId })));
    }
    const [row] = await db.select().from(s.settings).where(eq(s.settings.userId, userId));
    return row;
  })().finally(() => enCours.delete(userId));
  enCours.set(userId, p);
  return p;
}

const NOMS = ["Ali", "Hassan", "Omar", "Moussa", "Ahmed", "Ibrahim", "Abdi", "Youssouf", "Daher", "Robleh", "Houssein", "Farah"];
const PRENOMS_F = ["Fatouma", "Amina", "Hodan", "Safia", "Asma", "Kadra", "Ifrah", "Nasra"];
const PRENOMS_G = ["Abdourahman", "Mohamed", "Idriss", "Samatar", "Yacin", "Elmi", "Djama", "Aden"];
const CIRCUITS = ["Balbala", "Héron", "Plateau du Serpent", "Quartier 7", "Gabode"];

/** Données de démonstration pour essayer l'application. */
export async function seedDemo(userId: string) {
  const r = (n: number) => Math.floor(Math.random() * n);
  const pick = <T,>(a: T[]) => a[r(a.length)];
  const eleves: (typeof s.eleves.$inferInsert)[] = [];
  const inscriptions: (typeof s.inscriptions.$inferInsert)[] = [];
  let k = 0;
  for (const classe of DEFAULT_CLASSES) {
    for (let i = 0; i < 3; i++) {
      k++;
      const fille = r(2) === 0;
      const nom = pick(NOMS);
      const prenom = pick(fille ? PRENOMS_F : PRENOMS_G);
      const matricule = `INS-${String(k).padStart(3, "0")}`;
      inscriptions.push({ userId, num: k, matricule, date: "2026-09-0" + (1 + r(8)), nom, prenom, sexe: fille ? "F" : "M", niveau: classe, classe, parent: `${pick(NOMS)} ${nom}`, telephone: `77 ${10 + r(89)} ${10 + r(89)} ${10 + r(89)}`, adresse: pick(CIRCUITS), frais: 10000, statut: "Inscrit", converti: true });
      eleves.push({ userId, matricule, nom, prenom, sexe: fille ? "F" : "M", classe, niveau: classe, parent: `${pick(NOMS)} ${nom}`, telephone: `77 ${10 + r(89)} ${10 + r(89)} ${10 + r(89)}`, fraisAnnuels: 150000, empreinte: r(2) ? "Oui" : "Non", bioId: r(2) ? `BIO-${1000 + k}` : "" });
    }
  }
  await db.insert(s.inscriptions).values(inscriptions);
  const inserted = await db.insert(s.eleves).values(eleves).returning();
  const pay = inserted.flatMap((e, i) => {
    const m = i % 3 === 0 ? 150000 : i % 3 === 1 ? 75000 : 0;
    return m ? [{ userId, eleveId: e.id, date: "2026-10-05", montant: m, mode: "Espèces", note: "" }] : [];
  });
  if (pay.length) await db.insert(s.paiements).values(pay);
  await db.insert(s.bulletins).values(inserted.map((e) => ({ userId, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, trimestre: "Trimestre 1", note1: 6 + r(14), note2: 6 + r(14), note3: 6 + r(14), note4: 6 + r(14) })));
  await db.insert(s.cantine).values(inserted.slice(0, 10).map((e, i) => ({ userId, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, mois: MOIS[1], du: 8000, paye: i % 2 ? 8000 : 4000 })));
  await db.insert(s.transport).values(inserted.slice(5, 14).map((e, i) => ({ userId, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, circuit: pick(CIRCUITS), mois: MOIS[1], du: 6000, paye: i % 3 ? 6000 : 0 })));
  await db.insert(s.enseignants).values(MATIERES_FICHIER.map(([mat], i) => ({ userId, matricule: `ENS-${String(i + 1).padStart(3, "0")}`, nom: pick(NOMS), prenom: pick(PRENOMS_G), sexe: "M", matieres: mat, classes: "Toutes", telephone: `77 ${20 + i} 00 00`, email: "", dateEmbauche: "2022-09-01", salaire: 120000 + r(5) * 10000, statut: i === 9 ? "Congé" : "Actif", contrat: "CDI", diplome: "Licence" })));
  await db.insert(s.personnelAdmin).values(["Directeur", "Comptable", "Secrétaire", "Surveillant", "Gardien"].map((f, i) => ({ userId, matricule: `ADM-${String(i + 1).padStart(3, "0")}`, nom: pick(NOMS), prenom: pick(PRENOMS_F), sexe: "F", fonction: f, telephone: `77 30 0${i} 00`, dateEmbauche: "2021-09-01", salaire: [250000, 150000, 90000, 70000, 60000][i], statut: "Actif", contrat: "CDI" })));
  await db.insert(s.absences).values(inserted.slice(0, 6).map((e, i) => ({ userId, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, date: `2026-10-1${i}`, type: ["Absence", "Retard", "Sanction"][i % 3], motif: ["Maladie", "Transport", "Comportement"][i % 3], justifie: i % 2 ? "Oui" : "Non", sanction: i % 3 === 2 ? "Avertissement" : "" })));
  await db.insert(s.examens).values(inserted.map((e) => ({ userId, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, type: "Examen blanc", matiere: "Mathématiques", date: "2026-11-10", note: 5 + r(15) })));
  await db.insert(s.livres).values([["LIV-001", "Le Petit Prince", "A. de Saint-Exupéry", "Roman", 5], ["LIV-002", "Mathématiques 3ème", "Collectif", "Manuel", 20], ["LIV-003", "L'Étranger", "A. Camus", "Roman", 3]].map(([code, titre, auteur, categorie, exemplaires]) => ({ userId, code: code as string, titre: titre as string, auteur: auteur as string, categorie: categorie as string, exemplaires: exemplaires as number })));
  await db.insert(s.documents).values([{ userId, type: "Autorisation d'ouverture", concerne: "Établissement", categorie: "Établissement", dateEmission: "2020-06-01", dateExpiration: "2030-06-01", lieu: "Armoire A - Classeur 1", statut: "Valide" }]);
  await db.update(s.settings).set({ loyer: 300000, fournitures: 80000, electricite: 120000, autres: 40000 }).where(eq(s.settings.userId, userId));
}
