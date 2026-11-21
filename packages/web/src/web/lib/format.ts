export const today = () => new Date().toISOString().slice(0, 10);
export const SEXES = ["M", "F"];
export const OUI_NON = ["Oui", "Non"];
export const STATUTS_PERSONNEL = ["Actif", "Congé", "Suspendu", "Parti"];
export const CONTRATS = ["CDI", "CDD", "Vacataire", "Stage"];
export const FONCTIONS_ADMIN = ["Directeur", "Censeur", "Secrétaire", "Comptable", "Surveillant", "Gardien", "Agent d'entretien", "Infirmier(ère)", "Bibliothécaire"];
export const TRIMESTRES = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];
export const fmtDate = (d?: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "");
export const fmtNote = (n: number | null | undefined) => (n === null || n === undefined ? "" : n.toFixed(2).replace(/\.00$/, ""));
