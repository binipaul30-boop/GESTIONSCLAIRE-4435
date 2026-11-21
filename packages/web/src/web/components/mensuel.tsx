import type { ReactNode } from "react";
import { DataModule, type FieldDef } from "./data-module";
import { Badge, Stat } from "./ui";
import { useSettings } from "../queries/school";
import { MOIS, formatFdj, statutMensuel } from "../../api/lib/calc";

interface Row { id: number; matricule: string; nom: string; classe: string; mois: string; du: number; paye: number; circuit?: string }

/** Cantine et transport : dû, payé, reste, statut, par mois. */
export function Mensuel<R extends Row>({ title, subtitle, icon, crud, circuit, circuits, defaultDu }: {
  title: string; subtitle: string; icon: ReactNode; crud: never; circuit?: boolean; circuits?: string[]; defaultDu: number;
}) {
  const { classes } = useSettings();
  const extra: FieldDef[] = circuit ? [{ key: "circuit", label: "Circuit / zone", suggestions: circuits }] : [];
  return (
    <DataModule<R>
      title={title}
      subtitle={subtitle}
      icon={icon}
      crud={crud}
      addLabel="Nouvelle ligne"
      defaults={{ mois: MOIS[new Date().getMonth() >= 8 ? new Date().getMonth() - 8 : new Date().getMonth() + 4], du: defaultDu, paye: 0 }}
      fields={[
        { key: "matricule", label: "Élève", type: "eleve" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe", type: "classe" },
        ...extra,
        { key: "mois", label: "Mois", type: "mois" },
        { key: "du", label: "Montant dû (Fdj)", type: "number" },
        { key: "paye", label: "Montant payé (Fdj)", type: "number" },
      ]}
      filters={[
        { key: "mois", label: "Mois", options: MOIS },
        { key: "classe", label: "Classe", options: classes },
        { key: "statut", label: "Statut", options: ["Payé", "Impayé"], get: (r) => statutMensuel(r.du, r.paye) },
      ]}
      searchKeys={["matricule", "nom", "circuit"]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe" },
        ...(circuit ? [{ key: "circuit", label: "Circuit / zone" }] : []),
        { key: "mois", label: "Mois" },
        { key: "du", label: "Dû", align: "right", render: (r) => formatFdj(r.du) },
        { key: "paye", label: "Payé", align: "right", render: (r) => formatFdj(r.paye) },
        { key: "reste", label: "Reste", align: "right", value: (r) => r.du - r.paye, render: (r) => <span className={r.du - r.paye > 0 ? "text-bad" : ""}>{formatFdj(r.du - r.paye)}</span> },
        { key: "statut", label: "Statut", value: (r) => statutMensuel(r.du, r.paye), render: (r) => <Badge>{statutMensuel(r.du, r.paye)}</Badge> },
      ]}
      summary={(rs) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total dû" value={formatFdj(rs.reduce((a, r) => a + r.du, 0))} />
          <Stat label="Encaissé" value={formatFdj(rs.reduce((a, r) => a + r.paye, 0))} tone="ok" />
          <Stat label="Reste" value={formatFdj(rs.reduce((a, r) => a + Math.max(0, r.du - r.paye), 0))} tone="bad" />
          <Stat label="Impayés" value={rs.filter((r) => statutMensuel(r.du, r.paye) === "Impayé").length} tone="warn" />
        </div>
      )}
    />
  );
}
