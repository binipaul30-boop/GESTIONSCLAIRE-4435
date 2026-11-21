import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { auth } from "./auth";
import { ping } from "./routes/ping";
import * as m from "./routes/modules";
import { settings, scolarite, finance, stats } from "./routes/school";
import { edt } from "./routes/edt";

export const router = {
  ping,
  settings,
  stats,
  finance,
  scolarite,
  inscriptions: m.inscriptions,
  enseignants: m.enseignants,
  personnelAdmin: m.personnelAdmin,
  bulletins: m.bulletins,
  cantine: m.cantine,
  transport: m.transport,
  salles: m.salles,
  matieres: m.matieres,
  edt,
  absences: m.absences,
  examens: m.examens,
  livres: m.livres,
  emprunts: m.emprunts,
  documents: m.documents,
  relances: m.relances,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app;
