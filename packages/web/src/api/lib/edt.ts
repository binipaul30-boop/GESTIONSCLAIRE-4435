import { TOUS_CRENEAUX } from "./calc";

export interface MatiereCfg {
  nom: string;
  heures: number;
  enseignant: string;
  typeSalle: string;
}
export interface SalleCfg {
  code: string;
  type: string;
  statut: string;
}
export interface Seance {
  classe: string;
  jour: string;
  creneau: string;
  matiere: string;
  enseignant: string;
  salle: string;
}
export interface Manque {
  classe: string;
  matiere: string;
  manquant: number;
}

export const TYPES_SALLE = ["Classe", "Laboratoire", "Terrain", "Arts", "Informatique", "Polyvalente"] as const;

/** Type de salle déduit du nom de matière (règles du fichier). */
export function typeSalleParDefaut(matiere: string): string {
  const m = matiere.toLowerCase();
  if (m.includes("svt") || m.includes("physique")) return "Laboratoire";
  if (m.includes("eps") || m.includes("sport")) return "Terrain";
  if (m.includes("art") || m.includes("musique")) return "Arts";
  if (m.includes("informatique")) return "Informatique";
  return "Classe";
}

function pool(typeSalle: string, classe: string, salles: SalleCfg[]): string[] {
  const dispo = salles.filter((s) => s.statut === "Disponible");
  const has = (s: SalleCfg, ...k: string[]) =>
    k.some((x) => s.code.toLowerCase().includes(x) || s.type.toLowerCase().includes(x));
  switch (typeSalle) {
    case "Laboratoire":
      return dispo.filter((s) => has(s, "labo")).map((s) => s.code);
    case "Terrain":
      return dispo.filter((s) => has(s, "terrain", "sportive")).map((s) => s.code);
    case "Arts":
      return dispo.filter((s) => s.code.toLowerCase().includes("arts")).map((s) => s.code);
    case "Informatique":
      return dispo.filter((s) => s.code.toLowerCase().includes("informatique")).map((s) => s.code);
    case "Polyvalente":
      return dispo.filter((s) => has(s, "polyvalente", "commune")).map((s) => s.code);
    default: {
      const attitree = dispo.find((s) => s.code === `Salle ${classe}`);
      if (attitree) return [attitree.code];
      // Salle attitrée indisponible : repli sur une salle de classe non attitrée ou la salle polyvalente.
      return dispo.filter((s) => has(s, "commune", "polyvalente")).map((s) => s.code);
    }
  }
}

function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

interface Lesson {
  classe: string;
  m: MatiereCfg;
  pool: string[];
}

function attempt(classes: string[], matieres: MatiereCfg[], salles: SalleCfg[], seed: number) {
  const rand = rng(seed);
  const slots = TOUS_CRENEAUX;
  const load = new Map<string, number>();
  for (const m of matieres) load.set(m.enseignant, (load.get(m.enseignant) ?? 0) + m.heures * classes.length);

  const lessons: Lesson[] = [];
  for (const classe of classes)
    for (const m of matieres) {
      const p = pool(m.typeSalle, classe, salles);
      for (let i = 0; i < Math.round(m.heures); i++) lessons.push({ classe, m, pool: p });
    }
  const keyed = lessons.map((l) => ({ l, k: (load.get(l.m.enseignant) ?? 0) * 10 - l.pool.length + rand() * 3 }));
  keyed.sort((a, b) => b.k - a.k);

  const placed: (Seance & { idx: number })[] = [];
  const cls = new Map<string, number>(); // classe|slot -> index in placed
  const tch = new Set<string>();
  const room = new Set<string>();
  const day = new Map<string, number>(); // classe|matiere|jour
  const unplaced: Lesson[] = [];

  const freeRoom = (l: Lesson, s: number) => l.pool.find((r) => !room.has(`${r}|${s}`));
  const can = (l: Lesson, s: number) =>
    !cls.has(`${l.classe}|${s}`) && (!l.m.enseignant || !tch.has(`${l.m.enseignant}|${s}`)) && freeRoom(l, s);
  const put = (l: Lesson, s: number, salle: string) => {
    const { jour, creneau } = slots[s];
    placed.push({ classe: l.classe, jour, creneau, matiere: l.m.nom, enseignant: l.m.enseignant, salle, idx: s });
    cls.set(`${l.classe}|${s}`, placed.length - 1);
    if (l.m.enseignant) tch.add(`${l.m.enseignant}|${s}`);
    room.add(`${salle}|${s}`);
    const dk = `${l.classe}|${l.m.nom}|${jour}`;
    day.set(dk, (day.get(dk) ?? 0) + 1);
  };
  const score = (l: Lesson, s: number) => {
    const c = day.get(`${l.classe}|${l.m.nom}|${slots[s].jour}`) ?? 0;
    return c * 10 + (c >= 2 ? 100 : 0) + rand();
  };

  const lessonOf = new Map<number, Lesson>();
  for (const { l } of keyed) {
    if (!l.pool.length) {
      unplaced.push(l);
      continue;
    }
    let best = -1;
    let bestScore = Infinity;
    for (let s = 0; s < slots.length; s++) {
      if (!can(l, s)) continue;
      const sc = score(l, s);
      if (sc < bestScore) {
        bestScore = sc;
        best = s;
      }
    }
    if (best >= 0) {
      put(l, best, freeRoom(l, best)!);
      lessonOf.set(placed.length - 1, l);
      continue;
    }
    // Réparation : libérer un créneau de la classe en déplaçant une séance déjà placée.
    let repaired = false;
    for (let s = 0; s < slots.length && !repaired; s++) {
      if (l.m.enseignant && tch.has(`${l.m.enseignant}|${s}`)) continue;
      const pi = cls.get(`${l.classe}|${s}`);
      if (pi === undefined) continue;
      const other = placed[pi];
      const ol = lessonOf.get(pi);
      if (!ol) continue;
      // retirer temporairement l'autre séance
      cls.delete(`${l.classe}|${s}`);
      if (other.enseignant) tch.delete(`${other.enseignant}|${s}`);
      room.delete(`${other.salle}|${s}`);
      const myRoom = freeRoom(l, s);
      let moved = -1;
      if (myRoom) {
        for (let s2 = 0; s2 < slots.length; s2++) {
          if (s2 === s || !can(ol, s2)) continue;
          if (ol.pool.includes(myRoom) && s2 === s) continue;
          moved = s2;
          break;
        }
      }
      if (myRoom && moved >= 0) {
        const dk = `${other.classe}|${other.matiere}|${other.jour}`;
        day.set(dk, (day.get(dk) ?? 1) - 1);
        placed[pi] = { ...other, idx: -1 }; // marqué supprimé
        lessonOf.delete(pi);
        put(ol, moved, freeRoom(ol, moved)!);
        lessonOf.set(placed.length - 1, ol);
        put(l, s, freeRoom(l, s)!);
        lessonOf.set(placed.length - 1, l);
        repaired = true;
      } else {
        cls.set(`${l.classe}|${s}`, pi);
        if (other.enseignant) tch.add(`${other.enseignant}|${s}`);
        room.add(`${other.salle}|${s}`);
      }
    }
    if (!repaired) unplaced.push(l);
  }

  const seances: Seance[] = placed.filter((p) => p.idx >= 0).map(({ idx: _i, ...s }) => s);
  return { seances, unplaced };
}

/** Génère un emploi du temps sans conflit de classe, d'enseignant ni de salle. */
export function genererEDT(classes: string[], matieres: MatiereCfg[], salles: SalleCfg[]) {
  const active = matieres.filter((m) => m.nom && m.heures > 0);
  let best: ReturnType<typeof attempt> | null = null;
  for (let i = 1; i <= 40; i++) {
    const r = attempt(classes, active, salles, i * 7919);
    if (!best || r.unplaced.length < best.unplaced.length) best = r;
    if (best.unplaced.length === 0) break;
  }
  const manques = new Map<string, Manque>();
  for (const u of best!.unplaced) {
    const k = `${u.classe}|${u.m.nom}`;
    const cur = manques.get(k) ?? { classe: u.classe, matiere: u.m.nom, manquant: 0 };
    cur.manquant++;
    manques.set(k, cur);
  }
  const order = (s: Seance) =>
    classes.indexOf(s.classe) * 1000 + TOUS_CRENEAUX.findIndex((c) => c.jour === s.jour && c.creneau === s.creneau);
  return { seances: best!.seances.sort((a, b) => order(a) - order(b)), manques: [...manques.values()] };
}

/** Détecte les conflits (même enseignant, salle ou classe sur un même créneau). */
export function detecterConflits(seances: (Seance & { id?: number })[]) {
  const out: { type: "Enseignant" | "Salle" | "Classe"; valeur: string; jour: string; creneau: string; ids: number[] }[] = [];
  const check = (type: "Enseignant" | "Salle" | "Classe", get: (s: Seance) => string) => {
    const m = new Map<string, (Seance & { id?: number })[]>();
    for (const s of seances) {
      const v = get(s);
      if (!v) continue;
      const k = `${v}|${s.jour}|${s.creneau}`;
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    for (const [k, list] of m)
      if (list.length > 1) {
        const [valeur, jour, creneau] = k.split("|");
        out.push({ type, valeur, jour, creneau, ids: list.map((x) => x.id ?? 0) });
      }
  };
  check("Enseignant", (s) => s.enseignant);
  check("Salle", (s) => s.salle);
  check("Classe", (s) => s.classe);
  return out;
}
