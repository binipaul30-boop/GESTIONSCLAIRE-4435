import { ORPCError } from "@orpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { base } from "../__core/app";
import { auth } from "../auth";
import { db } from "../database";
import { membres } from "../database/schema";
import { canRead, canWrite, isRole, type Module, type Role } from "../lib/roles";

export type Me = {
  userId: string;
  nom: string;
  email: string;
  role: Role;
  membreId: number;
  enseignant: string;
};

async function resolveMembre(userId: string, email: string) {
  const [byId] = await db.select().from(membres).where(and(eq(membres.memberUserId, userId), eq(membres.actif, true)));
  if (byId) return byId;
  if (!email) return undefined;
  const [byEmail] = await db
    .select()
    .from(membres)
    .where(and(sql`lower(${membres.email}) = ${email.toLowerCase()}`, isNull(membres.memberUserId), eq(membres.actif, true)));
  if (!byEmail) return undefined;
  const [linked] = await db.update(membres).set({ memberUserId: userId }).where(eq(membres.id, byEmail.id)).returning();
  return linked;
}

/** Procédures protégées.
 * `context.user.id` = identifiant de l'ÉTABLISSEMENT (compte du directeur) — toutes les données y sont rattachées.
 * `context.me` = la personne connectée et son rôle. */
export const authed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const u = session.user;
  const m = await resolveMembre(u.id, u.email);
  const role: Role = m && isRole(m.role) ? m.role : "directeur";
  const me: Me = {
    userId: u.id,
    nom: m?.nom || u.name || u.email,
    email: u.email,
    role,
    membreId: m?.id ?? 0,
    enseignant: m?.enseignant ?? "",
  };
  return next({
    context: { user: { ...u, id: m ? m.userId : u.id }, session: session.session, me },
  });
});

export function assertRead(me: Me, mod: Module) {
  if (!canRead(me.role, mod)) throw new ORPCError("FORBIDDEN", { message: "Accès non autorisé pour votre rôle." });
}
export function assertWrite(me: Me, mod: Module) {
  if (!canWrite(me.role, mod)) throw new ORPCError("FORBIDDEN", { message: "Action non autorisée pour votre rôle." });
}

/** Procédure réservée en lecture / écriture à un module. */
export const reader = (mod: Module) =>
  authed.use(({ context, next }) => {
    assertRead(context.me, mod);
    return next();
  });
export const writer = (mod: Module) =>
  authed.use(({ context, next }) => {
    assertWrite(context.me, mod);
    return next();
  });
