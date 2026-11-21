// Rôles et permissions — partagés entre le serveur (contrôle d'accès) et le client (menus, pages).

export const MODULES = [
  "dashboard", "bilan", "inscriptions", "scolarite", "bulletins", "notes", "examens", "absences",
  "enseignants", "personnelAdmin", "annuaire", "edt", "salles", "cantine", "transport",
  "bibliotheque", "documents", "relances", "parametres", "equipe",
] as const;
export type Module = (typeof MODULES)[number];

export const ROLE_IDS = ["directeur", "secretariat", "comptable", "enseignant", "surveillant", "bibliothecaire", "intendant"] as const;
export type Role = (typeof ROLE_IDS)[number];

type RoleDef = { label: string; description: string; write: Module[]; read: Module[] };

export const ROLES: Record<Role, RoleDef> = {
  directeur: {
    label: "Directeur",
    description: "Pilote l'établissement, valide les notes, répartit le travail et gère l'équipe.",
    write: [...MODULES],
    read: [],
  },
  secretariat: {
    label: "Secrétariat",
    description: "Inscriptions, dossiers élèves, documents administratifs et relances.",
    write: ["inscriptions", "scolarite", "documents", "relances"],
    read: ["annuaire", "absences", "bulletins", "edt", "salles", "enseignants", "personnelAdmin", "cantine", "transport"],
  },
  comptable: {
    label: "Comptable",
    description: "Encaissements (scolarité, cantine, transport), impayés et bilan financier.",
    write: ["scolarite", "cantine", "transport", "relances"],
    read: ["bilan", "enseignants", "personnelAdmin", "inscriptions", "edt"],
  },
  enseignant: {
    label: "Enseignant",
    description: "Saisit les notes de ses matières, les examens et l'appel (absences).",
    write: ["notes", "examens", "absences"],
    read: ["bulletins", "edt", "annuaire", "bibliotheque"],
  },
  surveillant: {
    label: "Surveillant",
    description: "Absences, retards, sanctions et suivi de la discipline.",
    write: ["absences"],
    read: ["edt", "annuaire"],
  },
  bibliothecaire: {
    label: "Bibliothécaire",
    description: "Catalogue, prêts et retours de livres.",
    write: ["bibliotheque"],
    read: ["documents"],
  },
  intendant: {
    label: "Intendant",
    description: "Cantine, transport, salles et matériel.",
    write: ["cantine", "transport", "salles", "documents"],
    read: ["edt"],
  },
};

export const ROLE_OPTIONS = ROLE_IDS.filter((r) => r !== "directeur").map((r) => ({ value: r, label: ROLES[r].label }));

export function isRole(r: string | null | undefined): r is Role {
  return !!r && (ROLE_IDS as readonly string[]).includes(r);
}
export function roleLabel(r: string | null | undefined) {
  return isRole(r) ? ROLES[r].label : r || "—";
}

/** Lectures implicites : l'annuaire lit enseignants + personnel ; l'EDT lit les salles. */
const IMPLIED: Partial<Record<Module, Module[]>> = {
  annuaire: ["enseignants", "personnelAdmin"],
  edt: ["salles"],
};

export function canWrite(role: Role, mod: Module): boolean {
  return ROLES[role].write.includes(mod);
}
export function canRead(role: Role, mod: Module): boolean {
  const r = ROLES[role];
  const direct = [...r.write, ...r.read];
  if (direct.includes(mod)) return true;
  return direct.some((m) => IMPLIED[m]?.includes(mod));
}

/** Modules visibles dans le menu (lecture ou écriture). */
export function visibleModules(role: Role): Module[] {
  return MODULES.filter((m) => {
    const r = ROLES[role];
    return r.write.includes(m) || r.read.includes(m);
  });
}

export const PRIORITES = ["Basse", "Normale", "Haute", "Urgente"] as const;
export const STATUTS_TACHE = ["À faire", "En cours", "En attente", "Terminée"] as const;
export const STATUTS_NOTE = ["Brouillon", "Soumis", "Validé"] as const;
