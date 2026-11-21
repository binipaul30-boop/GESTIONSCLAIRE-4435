import { useState } from "react";
import { ArrowRightLeft, UserPlus } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Button, Field, Sheet, Stat } from "../components/ui";
import { useInscriptions, type Inscription } from "../queries/modules";
import { useConvertir, useSettings } from "../queries/school";
import { formatFdj } from "../../api/lib/calc";
import { SEXES, fmtDate, today } from "../lib/format";

export default function InscriptionsPage() {
  const crud = useInscriptions();
  const { classes } = useSettings();
  const [conv, setConv] = useState<Inscription | null>(null);
  return (
    <>
      <DataModule<Inscription>
        title="Inscriptions"
        subtitle="Matricule INS-001 attribué automatiquement. Convertissez une inscription en élève pour ouvrir son suivi de scolarité."
        icon={<UserPlus className="size-5" />}
        crud={crud}
        addLabel="Nouvelle inscription"
        emptyHint="Enregistrez la première demande d'inscription."
        defaults={{ date: today(), statut: "En attente", frais: 0 }}
        formNote="Le N° et le matricule (INS-001, INS-002…) sont générés automatiquement à l'enregistrement."
        fields={[
          { key: "date", label: "Date d'inscription", type: "date" },
          { key: "statut", label: "Statut", type: "select", options: ["Inscrit", "En attente", "Refusé"] },
          { key: "nom", label: "Nom" },
          { key: "prenom", label: "Prénom" },
          { key: "sexe", label: "Sexe", type: "select", options: SEXES },
          { key: "dateNaissance", label: "Date de naissance", type: "date" },
          { key: "niveau", label: "Niveau demandé", type: "classe" },
          { key: "classe", label: "Classe demandée", type: "classe" },
          { key: "parent", label: "Nom parent / tuteur" },
          { key: "telephone", label: "Téléphone", type: "tel" },
          { key: "adresse", label: "Adresse", span: 2 },
          { key: "frais", label: "Frais d'inscription (Fdj)", type: "number" },
          { key: "photoRef", label: "Photo (réf. fichier)", placeholder: "ex. photos/ins-001.jpg" },
        ]}
        filters={[
          { key: "classe", label: "Classe", options: classes },
          { key: "statut", label: "Statut", options: ["Inscrit", "En attente", "Refusé"] },
        ]}
        searchKeys={["matricule", "nom", "prenom", "parent", "telephone"]}
        columns={[
          { key: "num", label: "N°", align: "right" },
          { key: "matricule", label: "Matricule", className: "font-medium" },
          { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
          { key: "nom", label: "Nom & prénom", render: (r) => `${r.nom} ${r.prenom}`, value: (r) => `${r.nom} ${r.prenom}` },
          { key: "sexe", label: "Sexe" },
          { key: "classe", label: "Classe" },
          { key: "parent", label: "Parent / tuteur" },
          { key: "telephone", label: "Téléphone" },
          { key: "frais", label: "Frais", align: "right", render: (r) => formatFdj(r.frais) },
          { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
        ]}
        summary={(rows) => (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Demandes" value={rows.length} />
            <Stat label="Inscrits" value={rows.filter((r) => r.statut === "Inscrit").length} tone="ok" />
            <Stat label="En attente" value={rows.filter((r) => r.statut === "En attente").length} tone="warn" />
            <Stat label="Frais encaissés (inscrits)" value={formatFdj(rows.filter((r) => r.statut === "Inscrit").reduce((a, r) => a + r.frais, 0))} tone="info" />
          </div>
        )}
        rowActions={(r) =>
          r.converti ? (
            <span className="mr-1 text-[12px] text-ok">Élève ✓</span>
          ) : r.statut !== "Refusé" ? (
            <Button size="sm" variant="outline" onClick={() => setConv(r)}>
              <ArrowRightLeft className="size-3.5" /> Convertir en élève
            </Button>
          ) : null
        }
      />
      {conv && <ConvertSheet ins={conv} onClose={() => setConv(null)} />}
    </>
  );
}

function ConvertSheet({ ins, onClose }: { ins: Inscription; onClose: () => void }) {
  const [frais, setFrais] = useState(150000);
  const conv = useConvertir();
  return (
    <Sheet
      open
      onClose={onClose}
      title="Convertir en élève"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            loading={conv.isPending}
            onClick={async () => {
              await conv.mutateAsync({ inscriptionId: ins.id, fraisAnnuels: frais });
              onClose();
            }}
          >
            Créer l'élève
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-paper p-4 text-sm">
          <div className="font-semibold">{ins.nom} {ins.prenom}</div>
          <div className="mt-1 text-muted">{ins.matricule} · {ins.classe || "classe non renseignée"} · {ins.parent}</div>
        </div>
        <p className="text-sm text-muted">L'élève est ajouté à la Scolarité avec le même matricule. L'inscription passe au statut « Inscrit ».</p>
        <Field label="Frais de scolarité annuels (Fdj)">
          <input aria-label="Frais de scolarité" className="field" type="number" value={frais} onChange={(e) => setFrais(Number(e.target.value))} />
        </Field>
        {conv.error && <div className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{conv.error.message}</div>}
      </div>
    </Sheet>
  );
}
