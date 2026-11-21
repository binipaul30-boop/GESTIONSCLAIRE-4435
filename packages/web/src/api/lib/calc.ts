// Calculs partagés (serveur + client), repris des formules du classeur Excel.

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
export const CRENEAUX = ["08h-09h", "09h-10h", "10h-11h", "11h-12h", "13h-14h", "14h-15h", "15h-16h"] as const;
/** Lundi–vendredi : 7 créneaux ; samedi matin : 4 créneaux. */
export function creneauxDuJour(jour: string): readonly string[] {
  return jour === "Samedi" ? CRENEAUX.slice(0, 4) : CRENEAUX;
}
export const TOUS_CRENEAUX: { jour: string; creneau: string }[] = JOURS.flatMap((jour) =>
  creneauxDuJour(jour).map((creneau) => ({ jour, creneau })),
);

export const DEFAULT_CLASSES = ["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"];
export const MOIS = ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août"];

export function parseClasses(s: string | undefined | null): string[] {
  const list = (s ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_CLASSES;
}

/** Scolarité : Soldé si reste ≤ 0, Impayé si rien payé, sinon Partiel. */
export function statutScolarite(frais: number, paye: number): "Soldé" | "Partiel" | "Impayé" {
  if (frais - paye <= 0) return "Soldé";
  if (paye === 0) return "Impayé";
  return "Partiel";
}
export function pctPaye(frais: number, paye: number): number | null {
  if (!frais) return null;
  return paye / frais;
}
/** Cantine / transport (formule du fichier) : Payé si reste ≤ 0, sinon Impayé. */
export function statutMensuel(du: number, paye: number): "Payé" | "Impayé" {
  return du - paye <= 0 ? "Payé" : "Impayé";
}

export function moyenneNotes(notes: (number | null | undefined)[]): number | null {
  const v = notes.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}
export function appreciation(m: number | null): string {
  if (m === null) return "";
  if (m >= 16) return "Excellent";
  if (m >= 14) return "Très bien";
  if (m >= 12) return "Bien";
  if (m >= 10) return "Passable";
  return "Insuffisant";
}
/** Rang façon RANK() Excel : 1 + nombre de moyennes strictement supérieures. */
export function rang(m: number | null, toutes: (number | null)[]): number | null {
  if (m === null) return null;
  return 1 + toutes.filter((x) => x !== null && x > m).length;
}
export function statutExamen(note: number): "Admis" | "Ajourné" {
  return note >= 10 ? "Admis" : "Ajourné";
}

export function formatFdj(n: number | null | undefined): string {
  const v = Math.round(n ?? 0);
  return `${v.toLocaleString("fr-FR").replace(/ | /g, " ")} Fdj`;
}
