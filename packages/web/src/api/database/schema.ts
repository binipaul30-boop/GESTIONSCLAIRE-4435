import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

const id = () => integer("id").primaryKey({ autoIncrement: true });
const owner = () => text("user_id").notNull();
const created = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());
const t = (name: string) => text(name).notNull().default("");
const n = (name: string) => real(name).notNull().default(0);

/** Paramètres de l'établissement (un par compte). */
export const settings = sqliteTable("settings", {
  userId: text("user_id").primaryKey(),
  nom: t("nom"),
  annee: text("annee").notNull().default("2026-2027"),
  classes: text("classes").notNull().default("6ème,5ème,4ème,3ème,2nde,1ère,Terminale"),
  loyer: n("loyer"),
  fournitures: n("fournitures"),
  electricite: n("electricite"),
  autres: n("autres"),
  moisSalaires: integer("mois_salaires").notNull().default(1),
  seeded: integer("seeded", { mode: "boolean" }).notNull().default(false),
});

export const inscriptions = sqliteTable("inscriptions", {
  id: id(),
  userId: owner(),
  num: integer("num").notNull().default(0),
  matricule: t("matricule"),
  date: t("date"),
  nom: t("nom"),
  prenom: t("prenom"),
  sexe: t("sexe"),
  dateNaissance: t("date_naissance"),
  niveau: t("niveau"),
  classe: t("classe"),
  parent: t("parent"),
  telephone: t("telephone"),
  adresse: t("adresse"),
  frais: n("frais"),
  statut: text("statut").notNull().default("En attente"),
  photoRef: t("photo_ref"),
  converti: integer("converti", { mode: "boolean" }).notNull().default(false),
  createdAt: created(),
});

export const eleves = sqliteTable("eleves", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  prenom: t("prenom"),
  sexe: t("sexe"),
  classe: t("classe"),
  niveau: t("niveau"),
  parent: t("parent"),
  telephone: t("telephone"),
  fraisAnnuels: n("frais_annuels"),
  photoRef: t("photo_ref"),
  empreinte: text("empreinte").notNull().default("Non"),
  bioId: t("bio_id"),
  createdAt: created(),
});

export const paiements = sqliteTable("paiements", {
  id: id(),
  userId: owner(),
  eleveId: integer("eleve_id").notNull(),
  date: t("date"),
  montant: n("montant"),
  mode: t("mode"),
  note: t("note"),
  createdAt: created(),
});

export const enseignants = sqliteTable("enseignants", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  prenom: t("prenom"),
  sexe: t("sexe"),
  matieres: t("matieres"),
  classes: t("classes"),
  telephone: t("telephone"),
  email: t("email"),
  dateEmbauche: t("date_embauche"),
  salaire: n("salaire"),
  statut: text("statut").notNull().default("Actif"),
  photoRef: t("photo_ref"),
  empreinte: text("empreinte").notNull().default("Non"),
  bioId: t("bio_id"),
  dateNaissance: t("date_naissance"),
  adresse: t("adresse"),
  contrat: t("contrat"),
  diplome: t("diplome"),
  contactUrgence: t("contact_urgence"),
  createdAt: created(),
});

export const personnelAdmin = sqliteTable("personnel_admin", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  prenom: t("prenom"),
  sexe: t("sexe"),
  fonction: t("fonction"),
  telephone: t("telephone"),
  email: t("email"),
  dateEmbauche: t("date_embauche"),
  salaire: n("salaire"),
  statut: text("statut").notNull().default("Actif"),
  photoRef: t("photo_ref"),
  empreinte: text("empreinte").notNull().default("Non"),
  bioId: t("bio_id"),
  dateNaissance: t("date_naissance"),
  adresse: t("adresse"),
  contrat: t("contrat"),
  diplome: t("diplome"),
  contactUrgence: t("contact_urgence"),
  createdAt: created(),
});

export const bulletins = sqliteTable("bulletins", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  trimestre: text("trimestre").notNull().default("Trimestre 1"),
  note1: real("note1"),
  note2: real("note2"),
  note3: real("note3"),
  note4: real("note4"),
  createdAt: created(),
});

export const cantine = sqliteTable("cantine", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  mois: t("mois"),
  du: n("du"),
  paye: n("paye"),
  createdAt: created(),
});

export const transport = sqliteTable("transport", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  circuit: t("circuit"),
  mois: t("mois"),
  du: n("du"),
  paye: n("paye"),
  createdAt: created(),
});

export const salles = sqliteTable("salles", {
  id: id(),
  userId: owner(),
  code: t("code"),
  type: t("type"),
  capacite: n("capacite"),
  batiment: t("batiment"),
  equipements: t("equipements"),
  statut: text("statut").notNull().default("Disponible"),
  createdAt: created(),
});

/** Paramétrage EDT : matières, volume horaire hebdo par classe, enseignant, type de salle. */
export const matieres = sqliteTable("matieres", {
  id: id(),
  userId: owner(),
  nom: t("nom"),
  heures: n("heures"),
  enseignant: t("enseignant"),
  typeSalle: text("type_salle").notNull().default("Classe"),
  createdAt: created(),
});

export const seances = sqliteTable("seances", {
  id: id(),
  userId: owner(),
  classe: t("classe"),
  jour: t("jour"),
  creneau: t("creneau"),
  matiere: t("matiere"),
  enseignant: t("enseignant"),
  salle: t("salle"),
  createdAt: created(),
});

export const absences = sqliteTable("absences", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  date: t("date"),
  type: text("type").notNull().default("Absence"),
  motif: t("motif"),
  justifie: text("justifie").notNull().default("Non"),
  sanction: t("sanction"),
  createdAt: created(),
});

export const examens = sqliteTable("examens", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  type: text("type").notNull().default("Devoir"),
  matiere: t("matiere"),
  date: t("date"),
  note: n("note"),
  createdAt: created(),
});

export const livres = sqliteTable("livres", {
  id: id(),
  userId: owner(),
  code: t("code"),
  titre: t("titre"),
  auteur: t("auteur"),
  categorie: t("categorie"),
  exemplaires: n("exemplaires"),
  etat: text("etat").notNull().default("Disponible"),
  createdAt: created(),
});

export const emprunts = sqliteTable("emprunts", {
  id: id(),
  userId: owner(),
  codeLivre: t("code_livre"),
  titre: t("titre"),
  matricule: t("matricule"),
  nom: t("nom"),
  dateEmprunt: t("date_emprunt"),
  dateRetourPrevue: t("date_retour_prevue"),
  dateRetour: t("date_retour"),
  statut: text("statut").notNull().default("Emprunté"),
  createdAt: created(),
});

export const documents = sqliteTable("documents", {
  id: id(),
  userId: owner(),
  type: t("type"),
  concerne: t("concerne"),
  categorie: t("categorie"),
  dateEmission: t("date_emission"),
  dateExpiration: t("date_expiration"),
  lieu: t("lieu"),
  statut: text("statut").notNull().default("Valide"),
  roleResponsable: text("role_responsable").notNull().default("secretariat"),
  fichierUrl: t("fichier_url"),
  fichierNom: t("fichier_nom"),
  createdAt: created(),
});

export const relances = sqliteTable("relances", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  typeImpaye: text("type_impaye").notNull().default("Scolarité"),
  montant: n("montant"),
  date: t("date"),
  moyen: text("moyen").notNull().default("SMS"),
  message: t("message"),
  statut: text("statut").notNull().default("Envoyée"),
  createdAt: created(),
});

/** Membres de l'équipe invités par le directeur (rattachés par email à la connexion). */
export const membres = sqliteTable("membres", {
  id: id(),
  userId: owner(),
  email: t("email"),
  nom: t("nom"),
  role: text("role").notNull().default("enseignant"),
  /** Nom tel qu'utilisé dans l'EDT / paramétrage des matières (ex. « Prof. Mathématiques »). */
  enseignant: t("enseignant"),
  memberUserId: text("member_user_id"),
  actif: integer("actif", { mode: "boolean" }).notNull().default(true),
  createdAt: created(),
});

/** Tâches réparties entre les acteurs. assigneMembreId = 0 → directeur / rôle entier. */
export const taches = sqliteTable("taches", {
  id: id(),
  userId: owner(),
  titre: t("titre"),
  description: t("description"),
  module: t("module"),
  assigneRole: text("assigne_role").notNull().default("directeur"),
  assigneMembreId: integer("assigne_membre_id").notNull().default(0),
  creePar: t("cree_par"),
  creeParId: t("cree_par_id"),
  echeance: t("echeance"),
  priorite: text("priorite").notNull().default("Normale"),
  statut: text("statut").notNull().default("À faire"),
  commentaire: t("commentaire"),
  fichierUrl: t("fichier_url"),
  fichierNom: t("fichier_nom"),
  /** Clé de dédoublonnage des tâches générées automatiquement. */
  cle: t("cle"),
  termineeLe: t("terminee_le"),
  createdAt: created(),
});

/** Notes saisies par les enseignants (une ligne par élève / matière / évaluation). */
export const notes = sqliteTable("notes", {
  id: id(),
  userId: owner(),
  matricule: t("matricule"),
  nom: t("nom"),
  classe: t("classe"),
  matiere: t("matiere"),
  trimestre: text("trimestre").notNull().default("Trimestre 1"),
  evaluation: text("evaluation").notNull().default("Devoir 1"),
  note: real("note"),
  coef: real("coef").notNull().default(1),
  enseignant: t("enseignant"),
  saisiPar: t("saisi_par"),
  date: t("date"),
  statut: text("statut").notNull().default("Brouillon"),
  createdAt: created(),
});

/** Journal d'activité : qui a fait quoi. */
export const journal = sqliteTable("journal", {
  id: id(),
  userId: owner(),
  acteur: t("acteur"),
  role: t("role"),
  action: t("action"),
  module: t("module"),
  detail: t("detail"),
  createdAt: created(),
});
