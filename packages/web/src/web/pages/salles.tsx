import { DoorOpen } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { useSalles, type Salle } from "../queries/modules";

const STATUTS = ["Disponible", "En travaux", "Réservée", "Hors service"];
const TYPES = ["Salle de classe (attitrée)", "Laboratoire", "Salle spécialisée", "Installation sportive", "Salle commune"];

export default function SallesPage() {
  const crud = useSalles();
  return (
    <DataModule<Salle>
      title="Salles"
      subtitle="Inventaire des salles. Une salle non « Disponible » est exclue de la génération de l'emploi du temps."
      icon={<DoorOpen className="size-5" />}
      crud={crud}
      addLabel="Nouvelle salle"
      defaults={{ statut: "Disponible", capacite: 30 }}
      formNote="Pour qu'une salle soit attitrée à une classe, nommez-la « Salle <classe> » (ex. Salle 6ème). Les laboratoires contiennent « Labo », les terrains « Terrain »."
      fields={[
        { key: "code", label: "Code salle" },
        { key: "type", label: "Type", suggestions: TYPES },
        { key: "capacite", label: "Capacité (places)", type: "number" },
        { key: "batiment", label: "Bâtiment / étage" },
        { key: "equipements", label: "Équipements", span: 2 },
        { key: "statut", label: "Statut", type: "select", options: STATUTS },
      ]}
      filters={[{ key: "statut", label: "Statut", options: STATUTS }]}
      columns={[
        { key: "code", label: "Code", className: "font-medium" },
        { key: "type", label: "Type" },
        { key: "capacite", label: "Capacité", align: "right" },
        { key: "batiment", label: "Bâtiment / étage" },
        { key: "equipements", label: "Équipements" },
        { key: "statut", label: "Statut", render: (r) => <Badge>{r.statut}</Badge> },
      ]}
      summary={(rs) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Salles" value={rs.length} />
          <Stat label="Disponibles" value={rs.filter((r) => r.statut === "Disponible").length} tone="ok" />
          <Stat label="Réservées" value={rs.filter((r) => r.statut === "Réservée").length} tone="info" />
          <Stat label="En travaux / hors service" value={rs.filter((r) => r.statut === "En travaux" || r.statut === "Hors service").length} tone="bad" />
        </div>
      )}
    />
  );
}
