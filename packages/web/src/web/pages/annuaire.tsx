import { useMemo } from "react";
import { Contact } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge } from "../components/ui";
import { useEnseignants, usePersonnelAdmin } from "../queries/modules";
import { STATUTS_PERSONNEL, fmtDate } from "../lib/format";

interface Row {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  departement: string;
  fonction: string;
  telephone: string;
  email: string;
  dateEmbauche: string;
  contrat: string;
  statut: string;
}

export default function AnnuairePage() {
  const ens = useEnseignants();
  const adm = usePersonnelAdmin();
  const rows = useMemo<Row[]>(
    () => [
      ...(ens.list.data ?? []).map((e) => ({ ...e, id: e.id, departement: "Enseignement", fonction: e.matieres })),
      ...(adm.list.data ?? []).map((a) => ({ ...a, id: -a.id, departement: "Administration", fonction: a.fonction })),
    ],
    [ens.list.data, adm.list.data],
  );
  const crud = {
    list: { data: rows, isLoading: ens.list.isLoading || adm.list.isLoading },
    create: ens.create,
    update: ens.update,
    remove: ens.remove,
  };
  return (
    <DataModule<Row>
      title="Annuaire du personnel"
      subtitle="Vue regroupée des enseignants et du personnel administratif (lecture seule — modifiez depuis chaque module)."
      icon={<Contact className="size-5" />}
      crud={crud}
      rows={rows}
      readOnly
      fields={[]}
      emptyHint="Ajoutez des enseignants ou du personnel administratif."
      filters={[
        { key: "departement", label: "Département", options: ["Enseignement", "Administration"] },
        { key: "statut", label: "Statut", options: STATUTS_PERSONNEL },
      ]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom & prénom", render: (r) => `${r.nom} ${r.prenom}`, value: (r) => `${r.nom} ${r.prenom}` },
        { key: "departement", label: "Département", render: (r) => <Badge tone={r.departement === "Enseignement" ? "info" : "muted"}>{r.departement}</Badge>, value: (r) => r.departement },
        { key: "fonction", label: "Fonction / matière" },
        { key: "telephone", label: "Téléphone" },
        { key: "email", label: "Email" },
        { key: "dateEmbauche", label: "Embauche", render: (r) => fmtDate(r.dateEmbauche) },
        { key: "contrat", label: "Contrat" },
        { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
      ]}
    />
  );
}
