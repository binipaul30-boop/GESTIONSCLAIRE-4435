import { ClipboardCheck } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { useExamens, useMatieres, type Examen } from "../queries/modules";
import { useSettings } from "../queries/school";
import { statutExamen } from "../../api/lib/calc";
import { fmtDate, fmtNote, today } from "../lib/format";

const TYPES = ["Devoir", "Examen blanc", "Examen national"];

export default function ExamensPage() {
  const crud = useExamens();
  const { classes } = useSettings();
  const mats = useMatieres().list.data?.map((m) => m.nom) ?? [];
  return (
    <DataModule<Examen>
      title="Examens"
      subtitle="Note sur 20 : Admis si ≥ 10, sinon Ajourné."
      icon={<ClipboardCheck className="size-5" />}
      crud={crud}
      addLabel="Nouvelle note"
      defaults={{ type: "Devoir", date: today(), note: 0 }}
      fields={[
        { key: "matricule", label: "Élève", type: "eleve" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe", type: "classe" },
        { key: "type", label: "Type d'examen", type: "select", options: TYPES },
        { key: "matiere", label: "Matière", suggestions: mats },
        { key: "date", label: "Date", type: "date" },
        { key: "note", label: "Note / 20", type: "number" },
      ]}
      filters={[
        { key: "classe", label: "Classe", options: classes },
        { key: "type", label: "Type", options: TYPES },
        { key: "statut", label: "Statut", options: ["Admis", "Ajourné"], get: (r) => statutExamen(r.note) },
      ]}
      searchKeys={["matricule", "nom", "matiere"]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe" },
        { key: "type", label: "Type" },
        { key: "matiere", label: "Matière" },
        { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
        { key: "note", label: "Note /20", align: "right", render: (r) => <span className="font-semibold">{fmtNote(r.note)}</span> },
        { key: "statut", label: "Statut", value: (r) => statutExamen(r.note), render: (r) => <Badge>{statutExamen(r.note)}</Badge> },
      ]}
      summary={(rs) => {
        const admis = rs.filter((r) => r.note >= 10).length;
        return (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Notes" value={rs.length} />
            <Stat label="Admis" value={admis} tone="ok" />
            <Stat label="Ajournés" value={rs.length - admis} tone="bad" />
            <Stat label="Taux de réussite" value={rs.length ? `${Math.round((admis / rs.length) * 100)} %` : "—"} tone="info" />
          </div>
        );
      }}
    />
  );
}
