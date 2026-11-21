import type { FieldDef } from "./data-module";
import { CONTRATS, OUI_NON, SEXES, STATUTS_PERSONNEL } from "../lib/format";

export const identite: FieldDef[] = [
  { key: "matricule", label: "Matricule" },
  { key: "statut", label: "Statut", type: "select", options: STATUTS_PERSONNEL },
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
  { key: "sexe", label: "Sexe", type: "select", options: SEXES },
  { key: "dateNaissance", label: "Date de naissance", type: "date" },
];
export const contact: FieldDef[] = [
  { key: "telephone", label: "Téléphone", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "adresse", label: "Adresse", span: 2 },
  { key: "contactUrgence", label: "Contact d'urgence (nom & téléphone)", span: 2 },
];
export const contrat: FieldDef[] = [
  { key: "dateEmbauche", label: "Date d'embauche", type: "date" },
  { key: "contrat", label: "Type de contrat", type: "select", options: CONTRATS },
  { key: "salaire", label: "Salaire mensuel (Fdj)", type: "number" },
  { key: "diplome", label: "Diplôme / qualification" },
  { key: "photoRef", label: "Photo (réf. fichier)" },
  { key: "empreinte", label: "Empreinte digitale enregistrée", type: "select", options: OUI_NON },
  { key: "bioId", label: "N° ID biométrique (référence)", span: 2, help: "Référence uniquement — l'empreinte elle-même n'est jamais stockée." },
];
