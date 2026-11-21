import { z } from "zod";
import { eq } from "drizzle-orm";
import { reader, writer } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { crud } from "../lib/crud";
import { genererEDT } from "../lib/edt";
import { parseClasses } from "../lib/calc";
import { ensureSeed } from "../lib/seed";

const base = crud(s.seances, { module: "edt" });

export const edt = {
  ...base,
  list: reader("edt").handler(async ({ context }) => {
    await ensureSeed(context.user.id);
    return db.select().from(s.seances).where(eq(s.seances.userId, context.user.id));
  }),
  /** Régénère tout l'emploi du temps à partir du paramétrage (matières, heures, enseignants, salles). */
  generer: writer("edt").handler(async ({ context }) => {
    const uid = context.user.id;
    const cfg = await ensureSeed(uid);
    const [mats, sal] = await Promise.all([
      db.select().from(s.matieres).where(eq(s.matieres.userId, uid)),
      db.select().from(s.salles).where(eq(s.salles.userId, uid)),
    ]);
    const { seances, manques } = genererEDT(parseClasses(cfg?.classes), mats, sal);
    await db.delete(s.seances).where(eq(s.seances.userId, uid));
    for (let i = 0; i < seances.length; i += 50)
      await db.insert(s.seances).values(seances.slice(i, i + 50).map((x) => ({ ...x, userId: uid })));
    return { total: seances.length, manques };
  }),
  vider: writer("edt").input(z.object({}).optional()).handler(async ({ context }) => {
    await db.delete(s.seances).where(eq(s.seances.userId, context.user.id));
    return { ok: true };
  }),
};
