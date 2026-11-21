import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Button, Card, PageHeader, Spinner, Stat } from "../components/ui";
import { useBilan, useUpdateSettings } from "../queries/school";
import { formatFdj } from "../../api/lib/calc";
import { cn } from "../lib/utils";

type Editable = "loyer" | "fournitures" | "electricite" | "autres";

export default function BilanPage() {
  const { data: b, isLoading } = useBilan();
  const upd = useUpdateSettings();
  const [v, setV] = useState({ loyer: 0, fournitures: 0, electricite: 0, autres: 0, moisSalaires: 1 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (b)
      setV({
        loyer: b.charges.loyer,
        fournitures: b.charges.fournitures,
        electricite: b.charges.electricite,
        autres: b.charges.autres,
        moisSalaires: b.moisSalaires,
      });
  }, [b]);

  if (isLoading || !b) return <Spinner />;

  const save = async () => {
    await upd.mutateAsync(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const recettes = [
    ["Frais d'inscription", b.recettes.inscriptions],
    ["Scolarité encaissée", b.recettes.scolarite],
    ["Cantine encaissée", b.recettes.cantine],
    ["Transport encaissé", b.recettes.transport],
  ] as const;
  const editable: [Editable, string][] = [
    ["loyer", "Loyer"],
    ["fournitures", "Fournitures"],
    ["electricite", "Électricité / eau"],
    ["autres", "Autres charges"],
  ];
  const soldeOk = b.solde >= 0;

  return (
    <div>
      <PageHeader title="Bilan financier" subtitle="Recettes encaissées et charges de l'établissement, en Fdj" icon={<Scale className="size-5" />} />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total recettes" value={formatFdj(b.totalRecettes)} tone="ok" />
        <Stat label="Total charges" value={formatFdj(b.totalCharges)} tone="bad" />
        <Stat label="Solde" value={formatFdj(b.solde)} tone={soldeOk ? "ok" : "bad"} hint={soldeOk ? "Excédent" : "Déficit"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="border-b border-line px-5 py-4 font-semibold">Recettes</div>
          {recettes.map(([l, n]) => (
            <Row key={l} label={l} value={formatFdj(n)} />
          ))}
          <Row label="Total recettes" value={formatFdj(b.totalRecettes)} strong />
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4 font-semibold">Charges</div>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm">
            <span>Mois de salaires comptés</span>
            <input
              aria-label="Mois de salaires"
              type="number"
              min={1}
              max={12}
              className="field !h-9 !w-24 shrink-0 text-right"
              value={v.moisSalaires}
              onChange={(e) => setV((o) => ({ ...o, moisSalaires: Math.min(12, Math.max(1, Number(e.target.value) || 1)) }))}
            />
          </div>
          <Row label={`Salaires enseignants (× ${b.moisSalaires} mois)`} value={formatFdj(b.charges.salairesEnseignants)} />
          <Row label={`Salaires administratifs (× ${b.moisSalaires} mois)`} value={formatFdj(b.charges.salairesAdmin)} />
          {editable.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-sm">
              <span>{l}</span>
              <input
                aria-label={l}
                type="number"
                min={0}
                className="field !h-9 !w-40 shrink-0 text-right"
                value={v[k]}
                onChange={(e) => setV((o) => ({ ...o, [k]: Number(e.target.value) || 0 }))}
              />
            </div>
          ))}
          <Row label="Total charges" value={formatFdj(b.totalCharges)} strong />
          <div className="flex items-center justify-end gap-3 px-5 py-4">
            {saved && <span className="text-sm text-ok">Enregistré</span>}
            {upd.error && <span className="text-sm text-bad">{upd.error.message}</span>}
            <Button onClick={save} loading={upd.isPending}>Enregistrer les charges</Button>
          </div>
        </Card>
      </div>

      <Card className={cn("mt-5 flex items-center justify-between px-5 py-5", soldeOk ? "bg-ok/5" : "bg-bad/5")}>
        <span className="font-semibold">Solde (recettes − charges)</span>
        <span className={cn("text-xl font-semibold", soldeOk ? "text-ok" : "text-bad")}>{formatFdj(b.solde)}</span>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-0", strong && "bg-paper font-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
