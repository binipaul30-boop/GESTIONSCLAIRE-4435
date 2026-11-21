import { Bus } from "lucide-react";
import { Mensuel } from "../components/mensuel";
import { useTransport, type Transport } from "../queries/modules";

export default function TransportPage() {
  const crud = useTransport();
  const circuits = [...new Set((crud.list.data ?? []).map((r) => r.circuit).filter(Boolean))];
  return (
    <Mensuel<Transport>
      title="Transport scolaire"
      subtitle="Abonnements mensuels par circuit / zone : dû, payé, reste et statut."
      icon={<Bus className="size-5" />}
      crud={crud as never}
      circuit
      circuits={circuits.length ? circuits : ["Balbala", "Héron", "Plateau du Serpent", "Quartier 7", "Gabode"]}
      defaultDu={6000}
    />
  );
}
