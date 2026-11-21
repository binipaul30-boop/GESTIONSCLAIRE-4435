// Entry point referenced by index.html — composition only, real bootstrap
// lives in __main.tsx (template-managed).
import { authClient } from "./lib/auth";
import "./__main";

// Finalise une connexion Google revenant d'une redirection ; la session se met à jour d'elle-même.
void authClient.managedAuth.handleRedirect();
