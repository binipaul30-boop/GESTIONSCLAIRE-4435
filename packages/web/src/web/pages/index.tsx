import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, Spinner, Stat, ProgressBar } from "../components/ui";
import { useDemo, useSettings, useStats } from "../queries/school";
import { formatFdj } from "../../api/lib/calc";

export default function Dashboard() {
  const { data: s, isLoading } = useStats();
  const { data: settings } = useSettings();
  const demo = useDemo();

  if (isLoading || !s) return <Spinner />;
  const maxEff = Math.max(1, ...s.effectifs.map((e) => e.effectif));
  const recettes = [
    { label: "Inscriptions", v: s.recettes.inscriptions },
    { label: "Scolarité", v: s.recettes.scolarite },
    { label: "Cantine", v: s.recettes.cantine },
    { label: "Transport", v: s.recettes.transport },
  ];
  const maxFin = Math.max(1, s.totalRecettes, s.totalCharges);

  return (
    <div>
      <PageHeader
        title={settings?.nom ? `Bonjour, ${settings.nom}` : "Tableau de bord"}
        subtitle={`Vue d'ensemble de l'année scolaire ${settings?.annee ?? ""}`}
      />

      {s.eleves === 0 && (
        <Card className="mb-6 overflow-hidden rise">
          <div className="flex flex-col gap-4 bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">Votre établissement est prêt</div>
              <p className="mt-1 max-w-xl text-sm text-white/65">
                Les 15 salles, 10 matières et l'emploi du temps sont déjà en place. Commencez par une inscription, ou chargez des données de démonstration pour explorer.
              </p>
              {demo.error && <p className="mt-2 text-sm text-[#ffb4ad]">{demo.error.message}</p>}
            </div>
            <div className="flex gap-2">
              <Link to="/inscriptions">
                <Button variant="outline" className="!bg-transparent !text-white !border-white/25">Nouvelle inscription</Button>
              </Link>
              <Button onClick={() => demo.mutate({})} loading={demo.isPending} className="!bg-sky !text-ink">
                <Sparkles className="size-4" /> Données de démo
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Élèves" value={s.eleves} hint={`${s.filles} filles · ${s.garcons} garçons`} delay={0} />
        <Stat label="Enseignants actifs" value={s.enseignantsActifs} hint={`${s.enseignants} au total · ${s.personnelAdmin} admin.`} delay={40} />
        <Stat label="Moyenne générale" value={s.moyenneGenerale ? s.moyenneGenerale.toFixed(2) : "—"} hint="sur 20, tous bulletins" tone="info" delay={80} />
        <Stat label="Réussite aux examens" value={s.examens ? `${Math.round(s.tauxReussite * 100)} %` : "—"} hint={`${s.examens} note(s)`} tone="ok" delay={120} />
        <Stat label="Recettes" value={formatFdj(s.totalRecettes)} tone="ok" delay={160} />
        <Stat label="Charges" value={formatFdj(s.totalCharges)} tone="bad" delay={200} />
        <Stat label="Solde net" value={formatFdj(s.solde)} tone={s.solde >= 0 ? "ok" : "bad"} delay={240} />
        <Stat label="Reste à encaisser (scolarité)" value={formatFdj(s.resteScolarite)} tone="warn" delay={280} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3 rise">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Effectif par classe</h2>
            <Link to="/scolarite" className="flex items-center gap-1 text-[13px] text-primary">Scolarité <ArrowRight className="size-3.5" /></Link>
          </div>
          <div className="flex h-52 items-end gap-3">
            {s.effectifs.map((e) => (
              <div key={e.classe} className="flex flex-1 flex-col items-center gap-2">
                <div className="num text-xs font-medium">{e.effectif}</div>
                <div className="w-full rounded-t-md bg-primary/85 transition-all" style={{ height: `${(e.effectif / maxEff) * 150 + 4}px` }} />
                <div className="text-[11.5px] text-muted">{e.classe}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2 rise">
          <h2 className="mb-4 font-semibold">Paiements de scolarité</h2>
          {[
            { l: "Soldé", v: s.soldes, t: "ok" as const },
            { l: "Partiel", v: s.partiels, t: "warn" as const },
            { l: "Impayé", v: s.impayes, t: "bad" as const },
          ].map((x) => (
            <div key={x.l} className="mb-3">
              <div className="mb-1 flex justify-between text-[13px]"><span>{x.l}</span><span className="num font-medium">{x.v}</span></div>
              <ProgressBar value={s.eleves ? x.v / s.eleves : 0} tone={x.t} />
            </div>
          ))}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            <div><div className="num text-lg font-semibold text-bad">{s.absences}</div><div className="text-[11.5px] text-muted">Absences</div></div>
            <div><div className="num text-lg font-semibold text-warn">{s.retards}</div><div className="text-[11.5px] text-muted">Retards</div></div>
            <div><div className="num text-lg font-semibold">{s.sanctions}</div><div className="text-[11.5px] text-muted">Sanctions</div></div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3 rise">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recettes vs charges</h2>
            <Link to="/bilan" className="flex items-center gap-1 text-[13px] text-primary">Bilan <ArrowRight className="size-3.5" /></Link>
          </div>
          {[{ l: "Recettes", v: s.totalRecettes, c: "bg-ok" }, { l: "Charges", v: s.totalCharges, c: "bg-bad" }].map((x) => (
            <div key={x.l} className="mb-4">
              <div className="mb-1.5 flex justify-between text-[13px]"><span>{x.l}</span><span className="num font-medium">{formatFdj(x.v)}</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-black/5"><div className={`h-full rounded-full ${x.c}`} style={{ width: `${(x.v / maxFin) * 100}%` }} /></div>
            </div>
          ))}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recettes.map((r) => (
              <div key={r.label} className="rounded-xl bg-paper p-3">
                <div className="text-[11.5px] text-muted">{r.label}</div>
                <div className="num mt-0.5 text-[13.5px] font-semibold">{formatFdj(r.v)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2 rise">
          <h2 className="mb-4 font-semibold">Salles</h2>
          <div className="flex items-end gap-6">
            <div><div className="num text-4xl font-semibold text-ok">{s.sallesDisponibles}</div><div className="text-[12px] text-muted">disponibles</div></div>
            <div><div className="num text-4xl font-semibold text-bad">{s.sallesIndisponibles}</div><div className="text-[12px] text-muted">en travaux / hors service</div></div>
          </div>
          <div className="mt-4"><ProgressBar value={s.salles ? s.sallesDisponibles / s.salles : 0} tone="ok" /></div>
          <Link to="/emploi-du-temps" className="mt-5 flex items-center gap-1 text-[13px] text-primary">Voir l'emploi du temps <ArrowRight className="size-3.5" /></Link>
        </Card>
      </div>
    </div>
  );
}
