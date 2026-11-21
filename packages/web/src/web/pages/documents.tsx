import { FolderArchive, AlertTriangle } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Card, Stat } from "../components/ui";
import { useDocuments, type Document } from "../queries/modules";
import { fmtDate, today } from "../lib/format";

const CATS = ["Élève", "Enseignant", "Personnel", "Établissement"];
const STATUTS = ["Valide", "Expiré", "À renouveler", "Archivé"];
const in30 = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const alerte = (d: Document) => {
  if (!d.dateExpiration || d.statut === "Archivé") return "";
  if (d.dateExpiration < today()) return "Expiré";
  if (d.dateExpiration <= in30()) return "Expire bientôt";
  return "";
};

export default function DocumentsPage() {
  const crud = useDocuments();
  const all = crud.list.data ?? [];
  const alerts = all.filter((d) => alerte(d));
  return (
    <DataModule<Document>
      title="Documents administratifs"
      subtitle="Registre des documents : émission, expiration, lieu de classement et statut."
      icon={<FolderArchive className="size-5" />}
      crud={crud}
      addLabel="Nouveau document"
      defaults={{ statut: "Valide", categorie: "Élève", dateEmission: today() }}
      fields={[
        { key: "type", label: "Type de document", suggestions: ["Certificat de scolarité", "Acte de naissance", "Contrat de travail", "Diplôme", "Autorisation d'ouverture", "Attestation d'assurance", "Dossier médical"] },
        { key: "categorie", label: "Catégorie", type: "select", options: CATS },
        { key: "concerne", label: "Concerné (nom / élève / enseignant)", span: 2 },
        { key: "dateEmission", label: "Date d'émission", type: "date" },
        { key: "dateExpiration", label: "Date d'expiration", type: "date" },
        { key: "lieu", label: "Lieu de classement", placeholder: "ex. Armoire A - Classeur 3" },
        { key: "statut", label: "Statut", type: "select", options: STATUTS },
      ]}
      filters={[
        { key: "categorie", label: "Catégorie", options: CATS },
        { key: "statut", label: "Statut", options: STATUTS },
      ]}
      columns={[
        { key: "id", label: "N°", align: "right" },
        { key: "type", label: "Type", className: "font-medium" },
        { key: "concerne", label: "Concerné" },
        { key: "categorie", label: "Catégorie" },
        { key: "dateEmission", label: "Émission", render: (r) => fmtDate(r.dateEmission) },
        { key: "dateExpiration", label: "Expiration", render: (r) => <span className={alerte(r) ? "text-bad font-medium" : ""}>{fmtDate(r.dateExpiration)}</span> },
        { key: "lieu", label: "Lieu de classement" },
        { key: "statut", label: "Statut", render: (r) => <span className="flex gap-1.5"><Badge>{r.statut}</Badge>{alerte(r) && r.statut !== "Expiré" && <Badge tone={alerte(r) === "Expiré" ? "bad" : "warn"}>{alerte(r)}</Badge>}</span> },
      ]}
      summary={(rs) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Documents" value={rs.length} />
            <Stat label="Valides" value={rs.filter((r) => r.statut === "Valide").length} tone="ok" />
            <Stat label="À renouveler" value={rs.filter((r) => r.statut === "À renouveler").length} tone="warn" />
            <Stat label="Expirés (date)" value={rs.filter((r) => alerte(r) === "Expiré").length} tone="bad" />
          </div>
          {alerts.length > 0 && (
            <Card className="flex items-start gap-3 border-warn/40 bg-warn/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <div>
                <div className="font-medium">{alerts.length} document(s) expiré(s) ou expirant dans les 30 jours</div>
                <div className="mt-1 text-muted">{alerts.slice(0, 5).map((d) => `${d.type} — ${d.concerne} (${fmtDate(d.dateExpiration)})`).join(" · ")}</div>
              </div>
            </Card>
          )}
        </div>
      )}
    />
  );
}
