import { Redirect, Route, Switch } from "wouter";
import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { authClient } from "./lib/auth";
import { Layout } from "./components/layout";
import Connexion from "./pages/connexion";
import Index from "./pages/index";
import Inscriptions from "./pages/inscriptions";
import Scolarite from "./pages/scolarite";
import Bulletins from "./pages/bulletins";
import Examens from "./pages/examens";
import Absences from "./pages/absences";
import Enseignants from "./pages/enseignants";
import PersonnelAdmin from "./pages/personnel-admin";
import Annuaire from "./pages/annuaire";
import EmploiDuTemps from "./pages/emploi-du-temps";
import Salles from "./pages/salles";
import Cantine from "./pages/cantine";
import Transport from "./pages/transport";
import Bibliotheque from "./pages/bibliotheque";
import Documents from "./pages/documents";
import Relances from "./pages/relances";
import Bilan from "./pages/bilan";
import Parametres from "./pages/parametres";

const PAGES: [string, ComponentType][] = [
  ["/", Index],
  ["/inscriptions", Inscriptions],
  ["/scolarite", Scolarite],
  ["/bulletins", Bulletins],
  ["/examens", Examens],
  ["/absences", Absences],
  ["/enseignants", Enseignants],
  ["/personnel-admin", PersonnelAdmin],
  ["/annuaire", Annuaire],
  ["/emploi-du-temps", EmploiDuTemps],
  ["/salles", Salles],
  ["/cantine", Cantine],
  ["/transport", Transport],
  ["/bibliotheque", Bibliotheque],
  ["/documents", Documents],
  ["/relances", Relances],
  ["/bilan", Bilan],
  ["/parametres", Parametres],
];

function Protected({ page: Page }: { page: ComponentType }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-5 animate-spin text-muted" />
      </div>
    );
  if (!session) return <Redirect to="/connexion" />;
  return (
    <Layout>
      <Page />
    </Layout>
  );
}

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/connexion" component={Connexion} />
        {PAGES.map(([path, page]) => (
          <Route key={path} path={path}>
            <Protected page={page} />
          </Route>
        ))}
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
