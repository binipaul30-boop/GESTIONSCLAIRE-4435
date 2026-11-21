import { useMemo } from "react";
import { FileText } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Stat } from "../components/ui";
import { useBulletins, type Bulletin } from "../queries/modules";
import { useSettings } from "../queries/school";
import { appreciation, moyenneNotes, rang } from "../../api/lib/calc";
import { TRIMESTRES, fmtNote } from "../lib/format";

type Row = Bulletin & { moyenne: number | null; rang: number | null; appreciation: string };

export default function BulletinsPage() {
  const crud = useBulletins();
  const { classes } = useSettings();
  const rows = useMemo<Row[]>(() => {
    const list = (crud.list.data ?? []).map((b) => ({ ...b, moyenne: moyenneNotes([b.note1, b.note2, b.note3, b.note4]) }));
    return list.map((b) => {
      const pairs = list.filter((x) => x.classe === b.classe && x.trimestre === b.trimestre).map((x) => x.moyenne);
      return { ...b, rang: rang(b.moyenne, pairs), appreciation: appreciation(b.moyenne) };
    });
  }, [crud.list.data]);
  const note = (k: "note1" | "note2" | "note3" | "note4", i: number) => ({ key: k, label: `Note ${i}`, type: "number" as const, nullable: true });
  return (
    <DataModule<Row>
      title="Bulletins"
      subtitle="Jusqu'à 4 notes par trimestre. Moyenne, rang dans la classe et appréciation calculés automatiquement."
      icon={<FileText className="size-5" />}
      crud={crud as never}
      rows={rows}
      addLabel="Nouveau bulletin"
      defaults={{ trimestre: "Trimestre 1", note1: null, note2: null, note3: null, note4: null }}
      formNote="Appréciation : ≥ 16 Excellent · ≥ 14 Très bien · ≥ 12 Bien · ≥ 10 Passable · sinon Insuffisant. Les notes vides ne comptent pas dans la moyenne."
      fields={[
        { key: "matricule", label: "Élève", type: "eleve" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe", type: "classe" },
        { key: "trimestre", label: "Trimestre", type: "select", options: TRIMESTRES },
        note("note1", 1), note("note2", 2), note("note3", 3), note("note4", 4),
      ]}
      filters={[
        { key: "classe", label: "Classe", options: classes },
        { key: "trimestre", label: "Trimestre", options: TRIMESTRES },
      ]}
      searchKeys={["matricule", "nom"]}
      columns={[
        { key: "matricule", label: "Matricule", className: "font-medium" },
        { key: "nom", label: "Nom" },
        { key: "classe", label: "Classe" },
        { key: "trimestre", label: "Trimestre" },
        ...(["note1", "note2", "note3", "note4"] as const).map((k, i) => ({ key: k, label: `N${i + 1}`, align: "right" as const, render: (r: Row) => fmtNote(r[k]) })),
        { key: "moyenne", label: "Moyenne", align: "right", value: (r) => fmtNote(r.moyenne), render: (r) => <span className="font-semibold">{fmtNote(r.moyenne)}</span> },
        { key: "rang", label: "Rang", align: "right", render: (r) => (r.rang ? `${r.rang}${r.rang === 1 ? "er" : "e"}` : "") },
        { key: "appreciation", label: "Appréciation", render: (r) => <Badge>{r.appreciation}</Badge> },
      ]}
      summary={(rs) => {
        const ms = rs.map((r) => r.moyenne).filter((m): m is number => m !== null);
        return (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Bulletins" value={rs.length} />
            <Stat label="Moyenne" value={ms.length ? (ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2) : "—"} tone="info" />
            <Stat label="Meilleure moyenne" value={ms.length ? Math.max(...ms).toFixed(2) : "—"} tone="ok" />
            <Stat label="Moyenne ≥ 10" value={ms.length ? `${Math.round((ms.filter((m) => m >= 10).length / ms.length) * 100)} %` : "—"} />
          </div>
        );
      }}
    />
  );
}
