import { useEffect, useState } from "react";
import { Database, Settings } from "lucide-react";
import { Button, Card, Field, PageHeader, Spinner } from "../components/ui";
import { useDemo, useSettings, useUpdateSettings } from "../queries/school";

export default function ParametresPage() {
  const { data, isLoading, classes } = useSettings();
  const upd = useUpdateSettings();
  const demo = useDemo();
  const [v, setV] = useState({ nom: "", annee: "2026-2027", classes: "", moisSalaires: 1 });
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (data) setV({ nom: data.nom ?? "", annee: data.annee, classes: data.classes, moisSalaires: data.moisSalaires });
  }, [data]);

  if (isLoading) return <Spinner />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await upd.mutateAsync(v);
    setOk("Paramètres enregistrés.");
    setTimeout(() => setOk(""), 2500);
  };
  const chargerDemo = async () => {
    if (!confirm("Charger des élèves, enseignants, notes et paiements fictifs ?")) return;
    await demo.mutateAsync(undefined);
    setOk("Données de démonstration chargées.");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Paramètres" subtitle="Informations de l'établissement" icon={<Settings className="size-5" />} />
      <Card className="p-5">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'établissement" className="sm:col-span-2">
            <input aria-label="Nom de l'établissement" className="field" value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} placeholder="Ex. Collège-Lycée Al Nour" />
          </Field>
          <Field label="Année scolaire">
            <input aria-label="Année scolaire" className="field" value={v.annee} onChange={(e) => setV({ ...v, annee: e.target.value })} />
          </Field>
          <Field label="Mois de salaires (bilan)">
            <input
              aria-label="Mois de salaires"
              type="number"
              min={1}
              max={12}
              className="field"
              value={v.moisSalaires}
              onChange={(e) => setV({ ...v, moisSalaires: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })}
            />
          </Field>
          <Field label="Classes (séparées par des virgules)" className="sm:col-span-2">
            <input aria-label="Classes" className="field" value={v.classes} onChange={(e) => setV({ ...v, classes: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            {classes.map((c) => (
              <span key={c} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-medium text-primary">{c}</span>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            {ok && <span className="text-sm text-ok">{ok}</span>}
            {upd.error && <span className="text-sm text-bad">{upd.error.message}</span>}
            <Button type="submit" loading={upd.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold"><Database className="size-4" />Données de démonstration</div>
            <p className="mt-1 text-sm text-muted">Ajoute des élèves, enseignants, notes, paiements et absences fictifs pour explorer l'application. Disponible tant qu'aucun élève n'existe.</p>
            {demo.error && <p className="mt-2 text-sm text-bad">{demo.error.message}</p>}
          </div>
          <Button variant="outline" onClick={chargerDemo} loading={demo.isPending}>Charger la démo</Button>
        </div>
      </Card>
    </div>
  );
}
