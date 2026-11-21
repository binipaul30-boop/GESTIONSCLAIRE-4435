import { UtensilsCrossed } from "lucide-react";
import { Mensuel } from "../components/mensuel";
import { useCantine, type Cantine } from "../queries/modules";

export default function CantinePage() {
  const crud = useCantine();
  return <Mensuel<Cantine> title="Cantine" subtitle="Abonnements mensuels à la cantine : dû, payé, reste et statut." icon={<UtensilsCrossed className="size-5" />} crud={crud as never} defaultDu={8000} />;
}
