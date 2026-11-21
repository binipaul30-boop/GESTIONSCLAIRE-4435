import { ShieldAlert } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { useAbsences, type Absence } from "../queries/modules";
import { useSettings } from "../queries/school";
import { OUI_NON, fmtDate, today } from "../lib/format";

const TYPES = ["Absence", "Retard", "Sanction"];

export default function AbsencesPage() {
  const crud = useAbsences();
  const { classes } = useSettings();
  return (
    <DataModule<Absence>
      title="Absences & discipline"
      subtitle="Absences, retards et sanctions, justifiés ou non."
      icon={<ShieldAlert className="size-5" />}
      crud={crud}
      addLabel="Nouveau signalement"
      defaults={{ type: "Absence", justifie: "Non", date: today() }}
      fields={[
        { key: "matricule", label: "Élève", type: "eleve" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe", type: "classe" },
        { key: "date", label: "Date", type: "date" },
        { key: "type", label: "Type", type: "select", options: TYPES },
        { key: "justifie", label: "Justifié", type: "select", options: OUI_NON },
        { key: "motif", label: "Motif", span: 2, suggestions: ["Maladie", "Transport", "Raison familiale", "Comportement", "Sans motif"] },
        { key: "sanction", label: "Sanction appliquée", span: 2, suggestions: ["Avertissement", "Retenue", "Exclusion temporaire", "Convocation des parents"] },
      ]}
      filters={[
        { key: "classe", label: "Classe", options: classes },
        { key: "type", label: "Type", options: TYPES },
        { key: "justifie", label: "Justifié", options: OUI_NON },
      ]}
      searchKeys={["matricule", "nom", "motif"]}
      columns={[
        { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe" },
        { key: "type", label: "Type", render: (r) => <Badge>{r.type}</Badge> },
        { key: "motif", label: "Motif" },
        { key: "justifie", label: "Justifié", render: (r) => <Badge>{r.justifie}</Badge> },
        { key: "sanction", label: "Sanction" },
      ]}
      summary={(rs) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Absences" value={rs.filter((r) => r.type === "Absence").length} tone="bad" />
          <Stat label="Retards" value={rs.filter((r) => r.type === "Retard").length} tone="warn" />
          <Stat label="Sanctions" value={rs.filter((r) => r.type === "Sanction").length} />
          <Stat label="Non justifiés" value={rs.filter((r) => r.justifie === "Non").length} tone="bad" />
        </div>
      )}
    />
  );
}
