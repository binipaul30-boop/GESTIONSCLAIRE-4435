import { useState } from "react";
import { Trash2, Wallet, Receipt } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Button, Field, ProgressBar, Sheet, Spinner, Stat } from "../components/ui";
import { useEleves, type Eleve } from "../queries/modules";
import { usePaiements, usePayer, useSettings, useSupprimerPaiement } from "../queries/school";
import { formatFdj } from "../../api/lib/calc";
import { OUI_NON, SEXES, fmtDate, today } from "../lib/format";

const MODES = ["Espèces", "Virement", "Chèque", "Mobile money (D-Money / Waafi)"];

export default function ScolaritePage() {
  const crud = useEleves();
  const { classes } = useSettings();
  const [sel, setSel] = useState<Eleve | null>(null);
  const current = sel ? crud.list.data?.find((e) => e.id === sel.id) ?? sel : null;
  return (
    <>
      <DataModule<Eleve>
        title="Scolarité"
        subtitle="Frais annuels, paiements et reste à payer par élève. Statut : Soldé, Partiel ou Impayé."
        icon={<Wallet className="size-5" />}
        crud={crud}
        addLabel="Nouvel élève"
        emptyHint="Ajoutez un élève, ou convertissez une inscription depuis le module Inscriptions."
        defaults={{ fraisAnnuels: 150000, empreinte: "Non" }}
        formNote="Données biométriques : seule la référence (N° ID) et l'indicateur Oui/Non sont enregistrés — jamais l'empreinte elle-même."
        fields={[
          { key: "matricule", label: "Matricule", placeholder: "Laisser vide pour ELV-xxx" },
          { key: "classe", label: "Classe", type: "classe" },
          { key: "nom", label: "Nom" },
          { key: "prenom", label: "Prénom" },
          { key: "sexe", label: "Sexe", type: "select", options: SEXES },
          { key: "niveau", label: "Niveau", type: "classe" },
          { key: "parent", label: "Nom parent / tuteur" },
          { key: "telephone", label: "Téléphone", type: "tel" },
          { key: "fraisAnnuels", label: "Frais de scolarité annuels (Fdj)", type: "number" },
          { key: "photoRef", label: "Photo (réf. fichier)" },
          { key: "empreinte", label: "Empreinte digitale enregistrée", type: "select", options: OUI_NON },
          { key: "bioId", label: "N° ID biométrique (référence)" },
        ]}
        beforeSave={(d) => {
          const { totalPaye: _a, reste: _b, pct: _c, statutPaiement: _d, ...rest } = d;
          return rest;
        }}
        filters={[
          { key: "classe", label: "Classe", options: classes },
          { key: "statutPaiement", label: "Statut", options: ["Soldé", "Partiel", "Impayé"] },
        ]}
        searchKeys={["matricule", "nom", "prenom", "parent", "telephone"]}
        columns={[
          { key: "matricule", label: "Matricule", className: "font-medium" },
          { key: "nom", label: "Nom & prénom", render: (r) => `${r.nom} ${r.prenom}`, value: (r) => `${r.nom} ${r.prenom}` },
          { key: "classe", label: "Classe" },
          { key: "parent", label: "Parent" },
          { key: "telephone", label: "Téléphone" },
          { key: "fraisAnnuels", label: "Frais annuels", align: "right", render: (r) => formatFdj(r.fraisAnnuels) },
          { key: "totalPaye", label: "Total payé", align: "right", render: (r) => formatFdj(r.totalPaye) },
          { key: "reste", label: "Reste", align: "right", render: (r) => <span className={r.reste > 0 ? "text-bad" : ""}>{formatFdj(r.reste)}</span> },
          {
            key: "pct",
            label: "% payé",
            value: (r) => (r.pct === null ? "" : Math.round(r.pct * 100)),
            render: (r) => (
              <div className="flex w-28 items-center gap-2">
                <ProgressBar value={r.pct ?? 0} tone={r.statutPaiement === "Soldé" ? "ok" : r.statutPaiement === "Partiel" ? "warn" : "bad"} />
                <span className="num w-9 text-right text-xs">{r.pct === null ? "—" : `${Math.round(r.pct * 100)}%`}</span>
              </div>
            ),
          },
          { key: "statutPaiement", label: "Statut", render: (r) => <Badge>{r.statutPaiement}</Badge> },
          { key: "bioId", label: "Biométrie", render: (r) => (r.empreinte === "Oui" ? <span className="text-xs">{r.bioId || "Oui"}</span> : <span className="text-xs text-muted">Non</span>) },
        ]}
        summary={(rows) => (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Attendu" value={formatFdj(rows.reduce((a, r) => a + r.fraisAnnuels, 0))} />
            <Stat label="Encaissé" value={formatFdj(rows.reduce((a, r) => a + r.totalPaye, 0))} tone="ok" />
            <Stat label="Reste à payer" value={formatFdj(rows.reduce((a, r) => a + Math.max(0, r.reste), 0))} tone="bad" />
            <Stat label="Soldé / Partiel / Impayé" value={`${rows.filter((r) => r.statutPaiement === "Soldé").length} / ${rows.filter((r) => r.statutPaiement === "Partiel").length} / ${rows.filter((r) => r.statutPaiement === "Impayé").length}`} />
          </div>
        )}
        rowActions={(r) => (
          <Button size="sm" variant="outline" onClick={() => setSel(r)}>
            <Receipt className="size-3.5" /> Paiements
          </Button>
        )}
      />
      {current && <PaiementsSheet eleve={current} onClose={() => setSel(null)} />}
    </>
  );
}

function PaiementsSheet({ eleve, onClose }: { eleve: Eleve; onClose: () => void }) {
  const { data, isLoading } = usePaiements(eleve.id);
  const payer = usePayer();
  const suppr = useSupprimerPaiement();
  const [montant, setMontant] = useState<number>(Math.max(0, eleve.reste));
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState(MODES[0]);
  const [note, setNote] = useState("");
  return (
    <Sheet open onClose={onClose} title={`Paiements — ${eleve.nom} ${eleve.prenom}`} wide>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Frais annuels" value={formatFdj(eleve.fraisAnnuels)} />
        <Stat label="Total payé" value={formatFdj(eleve.totalPaye)} tone="ok" />
        <Stat label="Reste" value={formatFdj(eleve.reste)} tone={eleve.reste > 0 ? "bad" : "ok"} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={eleve.pct ?? 0} tone={eleve.statutPaiement === "Soldé" ? "ok" : "warn"} />
        <Badge>{eleve.statutPaiement}</Badge>
      </div>

      <form
        className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-line p-4 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!montant) return;
          await payer.mutateAsync({ eleveId: eleve.id, montant, date, mode, note });
          setNote("");
          setMontant(0);
        }}
      >
        <Field label="Montant (Fdj)"><input aria-label="Montant (Fdj)" className="field" type="number" value={montant} onChange={(e) => setMontant(Number(e.target.value))} /></Field>
        <Field label="Date"><input aria-label="Date" className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Mode">
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="Note"><input aria-label="Note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. 1er versement" /></Field>
        <div className="sm:col-span-4 flex justify-end">
          <Button type="submit" loading={payer.isPending} disabled={!montant}>Enregistrer le paiement</Button>
        </div>
        {payer.error && <div className="sm:col-span-4 text-sm text-bad">{payer.error.message}</div>}
      </form>

      <h3 className="mb-2 mt-6 text-sm font-semibold">Historique</h3>
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <p className="text-sm text-muted">Aucun paiement enregistré.</p>
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line">
          {[...data].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="num w-24 text-muted">{fmtDate(p.date)}</div>
              <div className="flex-1">
                <div>{p.mode}</div>
                {p.note && <div className="text-xs text-muted">{p.note}</div>}
              </div>
              <div className="num font-semibold">{formatFdj(p.montant)}</div>
              <button
                className="rounded-md p-1.5 text-muted hover:bg-bad/10 hover:text-bad cursor-pointer"
                aria-label="Supprimer le paiement"
                onClick={() => confirm("Supprimer ce paiement ?") && suppr.mutate({ id: p.id })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
