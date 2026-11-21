import { GraduationCap } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { identite, contact, contrat } from "../components/personnel-fields";
import { useEnseignants, useMatieres, type Enseignant } from "../queries/modules";
import { formatFdj } from "../../api/lib/calc";
import { STATUTS_PERSONNEL, fmtDate } from "../lib/format";

export default function EnseignantsPage() {
  const crud = useEnseignants();
  const mats = useMatieres().list.data?.map((m) => m.nom) ?? [];
  return (
    <DataModule<Enseignant>
      title="Enseignants"
      subtitle="Fiches enseignants, contrats et salaires mensuels."
      icon={<GraduationCap className="size-5" />}
      crud={crud}
      addLabel="Nouvel enseignant"
      defaults={{ statut: "Actif", empreinte: "Non", contrat: "CDI", salaire: 0 }}
      fields={[
        ...identite,
        { key: "matieres", label: "Matière(s) enseignée(s)", suggestions: mats },
        { key: "classes", label: "Classes affectées", placeholder: "ex. 6ème, 5ème" },
        ...contact,
        ...contrat,
      ]}
      filters={[{ key: "statut", label: "Statut", options: STATUTS_PERSONNEL }]}
      searchKeys={["matricule", "nom", "prenom", "matieres", "classes", "telephone"]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom & prénom", render: (r) => `${r.nom} ${r.prenom}`, value: (r) => `${r.nom} ${r.prenom}` },
        { key: "matieres", label: "Matière(s)" },
        { key: "classes", label: "Classes" },
        { key: "telephone", label: "Téléphone" },
        { key: "email", label: "Email" },
        { key: "dateEmbauche", label: "Embauche", render: (r) => fmtDate(r.dateEmbauche) },
        { key: "contrat", label: "Contrat" },
        { key: "salaire", label: "Salaire", align: "right", render: (r) => formatFdj(r.salaire) },
        { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
      ]}
      summary={(rs) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Enseignants" value={rs.length} />
          <Stat label="Actifs" value={rs.filter((r) => r.statut === "Actif").length} tone="ok" />
          <Stat label="En congé / suspendus" value={rs.filter((r) => r.statut === "Congé" || r.statut === "Suspendu").length} tone="warn" />
          <Stat label="Masse salariale / mois" value={formatFdj(rs.filter((r) => r.statut !== "Parti").reduce((a, r) => a + r.salaire, 0))} tone="info" />
        </div>
      )}
    />
  );
}
