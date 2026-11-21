import { useMemo, useState } from "react";
import { BellRing, Send } from "lucide-react";
import { DataModule, RecordForm, type FieldDef } from "../components/data-module";
import { Badge, Button, Card, Stat } from "../components/ui";
import { useCantine, useRelances, useTransport, type Relance } from "../queries/modules";
import { useScolarite, useSettings } from "../queries/school";
import { formatFdj } from "../../api/lib/calc";
import { fmtDate, today } from "../lib/format";

const TYPES = ["Scolarité", "Cantine", "Transport"];
const MOYENS = ["SMS", "Appel", "Courrier", "Email"];
const STATUTS = ["Envoyée", "Sans réponse", "Régularisé"];

const FIELDS: FieldDef[] = [
  { key: "matricule", label: "Élève", type: "eleve" },
  { key: "nom", label: "Nom" },
  { key: "classe", label: "Classe", type: "classe" },
  { key: "typeImpaye", label: "Type d'impayé", type: "select", options: TYPES },
  { key: "montant", label: "Montant dû (Fdj)", type: "number" },
  { key: "date", label: "Date de relance", type: "date" },
  { key: "moyen", label: "Moyen", type: "select", options: MOYENS },
  { key: "statut", label: "Statut", type: "select", options: STATUTS },
  { key: "message", label: "Message envoyé", type: "textarea" },
];

interface Impaye { key: string; matricule: string; nom: string; classe: string; type: string; montant: number; detail: string }

export default function RelancesPage() {
  const crud = useRelances();
  const sco = useScolarite();
  const cant = useCantine();
  const trans = useTransport();
  const { data: settings } = useSettings();
  const [prefill, setPrefill] = useState<Record<string, unknown> | null>(null);

  const impayes = useMemo<Impaye[]>(() => {
    const out: Impaye[] = [];
    for (const e of sco.data ?? []) if (e.reste > 0) out.push({ key: `s${e.id}`, matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, classe: e.classe, type: "Scolarité", montant: e.reste, detail: `${Math.round((e.pct ?? 0) * 100)} % payé` });
    for (const c of cant.list.data ?? []) if (c.du - c.paye > 0) out.push({ key: `c${c.id}`, matricule: c.matricule, nom: c.nom, classe: c.classe, type: "Cantine", montant: c.du - c.paye, detail: c.mois });
    for (const t of trans.list.data ?? []) if (t.du - t.paye > 0) out.push({ key: `t${t.id}`, matricule: t.matricule, nom: t.nom, classe: t.classe, type: "Transport", montant: t.du - t.paye, detail: `${t.mois}${t.circuit ? " · " + t.circuit : ""}` });
    return out.sort((a, b) => b.montant - a.montant);
  }, [sco.data, cant.list.data, trans.list.data]);

  const relancer = (i: Impaye) =>
    setPrefill({
      matricule: i.matricule, nom: i.nom, classe: i.classe, typeImpaye: i.type, montant: i.montant, date: today(), moyen: "SMS", statut: "Envoyée",
      message: `Bonjour, sauf erreur de notre part, un montant de ${formatFdj(i.montant)} reste dû au titre de : ${i.type.toLowerCase()} (${i.detail}) pour ${i.nom}, classe ${i.classe}. Merci de régulariser auprès du secrétariat. ${settings?.nom ?? ""}`.trim(),
    });

  return (
    <div>
      <DataModule<Relance>
        title="Relances des impayés"
        subtitle="Suivi des relances (SMS, appel, courrier, email) pour la scolarité, la cantine et le transport."
        icon={<BellRing className="size-5" />}
        crud={crud}
        addLabel="Nouvelle relance"
        defaults={{ date: today(), moyen: "SMS", statut: "Envoyée", typeImpaye: "Scolarité" }}
        fields={FIELDS}
        filters={[
          { key: "typeImpaye", label: "Type", options: TYPES },
          { key: "moyen", label: "Moyen", options: MOYENS },
          { key: "statut", label: "Statut", options: STATUTS },
        ]}
        searchKeys={["matricule", "nom", "message"]}
        columns={[
          { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
          { key: "matricule", label: "Matricule", className: "font-medium" },
          { key: "nom", label: "Nom" },
          { key: "classe", label: "Classe" },
          { key: "typeImpaye", label: "Type" },
          { key: "montant", label: "Montant dû", align: "right", render: (r) => formatFdj(r.montant) },
          { key: "moyen", label: "Moyen" },
          { key: "message", label: "Message", className: "max-w-[280px] truncate", render: (r) => <span title={r.message}>{r.message}</span> },
          { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
        ]}
        summary={(rs) => (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Relances" value={rs.length} />
            <Stat label="Sans réponse" value={rs.filter((r) => r.statut === "Sans réponse").length} tone="warn" />
            <Stat label="Régularisées" value={rs.filter((r) => r.statut === "Régularisé").length} tone="ok" />
            <Stat label="Impayés à relancer" value={impayes.length} tone="bad" />
          </div>
        )}
      />

      <Card className="mt-6 overflow-hidden rise">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold">Impayés en cours</h2>
            <p className="text-[13px] text-muted">Scolarité, cantine et transport avec un reste &gt; 0. Cliquez sur « Relancer » pour pré-remplir la relance.</p>
          </div>
          <div className="num text-sm font-semibold text-bad">{formatFdj(impayes.reduce((a, i) => a + i.montant, 0))}</div>
        </div>
        {!impayes.length ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Aucun impayé. </p>
        ) : (
          <div className="max-h-[420px] divide-y divide-line overflow-auto scrollbar-thin">
            {impayes.map((i) => (
              <div key={i.key} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Badge tone={i.type === "Scolarité" ? "info" : i.type === "Cantine" ? "warn" : "muted"}>{i.type}</Badge>
                <div className="min-w-[180px] flex-1">
                  <div className="font-medium">{i.nom}</div>
                  <div className="text-xs text-muted">{i.matricule} · {i.classe} · {i.detail}</div>
                </div>
                <div className="num font-semibold text-bad">{formatFdj(i.montant)}</div>
                <Button size="sm" variant="outline" onClick={() => relancer(i)}><Send className="size-3.5" /> Relancer</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {prefill && (
        <RecordForm
          title="Nouvelle relance"
          fields={FIELDS}
          initial={prefill}
          pending={crud.create.isPending}
          onClose={() => setPrefill(null)}
          onSave={async (d) => {
            await crud.create.mutateAsync(d);
            setPrefill(null);
          }}
        />
      )}
    </div>
  );
}
