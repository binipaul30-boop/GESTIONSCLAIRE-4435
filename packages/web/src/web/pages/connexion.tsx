import { useState } from "react";
import { Redirect } from "wouter";
import { School, Loader2 } from "lucide-react";
import { authClient, captureToken } from "../lib/auth";
import { Button, Field } from "../components/ui";

export default function ConnexionPage() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"" | "google" | "email">("");

  if (isPending) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted" /></div>;
  if (session) return <Redirect to="/" />;

  const google = async () => {
    setErr("");
    setBusy("google");
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    if (r.error && r.error.code !== "POPUP_CLOSED") setErr(r.error.message ?? "Connexion Google impossible");
    setBusy("");
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy("email");
    const opts = { onSuccess: captureToken };
    const r =
      mode === "in"
        ? await authClient.signIn.email({ email, password }, opts)
        : await authClient.signUp.email({ email, password, name: name || email.split("@")[0] }, opts);
    if (r.error) setErr(r.error.message === "Invalid email or password" ? "Email ou mot de passe incorrect" : r.error.message ?? "Erreur");
    else await refetch();
    setBusy("");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[520px] rounded-full bg-sky/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-ok/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-sky/20 text-sky"><School className="size-5" /></div>
          <span className="text-lg font-semibold">Gestion scolaire</span>
        </div>
        <div className="relative max-w-lg">
          <h1 className="text-[40px] font-semibold leading-[1.1]">Tout votre établissement, au même endroit.</h1>
          <p className="mt-4 text-white/60">Inscriptions, scolarité, bulletins, emploi du temps sans conflit, cantine, transport et bilan financier en francs djiboutiens.</p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
            {["15 modules", "EDT automatique", "Montants en Fdj"].map((t) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white/80">{t}</div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-white/40">Année scolaire 2026-2027</div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-ink text-sky"><School className="size-5" /></div>
            <span className="font-semibold">Gestion scolaire</span>
          </div>
          <h2 className="text-2xl font-semibold">{mode === "in" ? "Connexion" : "Créer un compte"}</h2>
          <p className="mt-1 text-sm text-muted">{mode === "in" ? "Accédez à la gestion de votre établissement." : "Un compte = un établissement."}</p>
          <Button variant="outline" className="mt-6 w-full !h-11" onClick={google} loading={busy === "google"}>
            <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-line" />ou<div className="h-px flex-1 bg-line" /></div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "up" && (
              <Field label="Nom"><input aria-label="Nom" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" /></Field>
            )}
            <Field label="Email"><input aria-label="Email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="direction@ecole.dj" /></Field>
            <Field label="Mot de passe"><input aria-label="Mot de passe" className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" /></Field>
            {err && <div className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</div>}
            <Button type="submit" variant="dark" className="!h-11" loading={busy === "email"}>{mode === "in" ? "Se connecter" : "Créer mon compte"}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            {mode === "in" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
            <button className="font-medium text-primary cursor-pointer" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>
              {mode === "in" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
