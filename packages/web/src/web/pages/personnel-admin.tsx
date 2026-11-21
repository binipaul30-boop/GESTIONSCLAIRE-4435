import { Users } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { identite, contact, contrat } from "../components/personnel-fields";
import { usePersonnelAdmin, type PersonnelAdmin } from "../queries/modules";
import { formatFdj } from "../../api/lib/calc";
import { FONCTIONS_ADMIN, STATUTS_PERSONNEL, fmtDate } from "../lib/format";

export default function PersonnelAdminPage() {
  const crud = usePersonnelAdmin();
  return (
    <DataModule<PersonnelAdmin>
      title="Personnel administratif"
      subtitle="Direction, secrétariat, comptabilité, surveillance et services."
      icon={<Users className="size-5" />}
      crud={crud}
      addLabel="Nouveau membre"
      defaults={{ statut: "Actif", empreinte: "Non", contrat: "CDI", salaire: 0 }}
      fields={[...identite, { key: "fonction", label: "Fonction", type: "select", options: FONCTIONS_ADMIN, span: 2 }, ...contact, ...contrat]}
      filters={[
        { key: "fonction", label: "Fonction", options: FONCTIONS_ADMIN },
        { key: "statut", label: "Statut", options: STATUTS_PERSONNEL },
      ]}
      searchKeys={["matricule", "nom", "prenom", "fonction", "telephone"]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom & prénom", render: (r) => `${r.nom} ${r.prenom}`, value: (r) => `${r.nom} ${r.prenom}` },
        { key: "fonction", label: "Fonction" },
        { key: "telephone", label: "Téléphone" },
        { key: "email", label: "Email" },
        { key: "dateEmbauche", label: "Embauche", render: (r) => fmtDate(r.dateEmbauche) },
        { key: "contrat", label: "Contrat" },
        { key: "salaire", label: "Salaire", align: "right", render: (r) => formatFdj(r.salaire) },
        { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
      ]}
      summary={(rs) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Membres" value={rs.length} />
          <Stat label="Actifs" value={rs.filter((r) => r.statut === "Actif").length} tone="ok" />
          <Stat label="Masse salariale / mois" value={formatFdj(rs.filter((r) => r.statut !== "Parti").reduce((a, r) => a + r.salaire, 0))} tone="info" />
        </div>
      )}
    />
  );
}
