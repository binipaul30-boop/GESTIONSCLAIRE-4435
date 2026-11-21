import { useMemo, useState } from "react";
import { BookOpen, CornerDownLeft } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Button, PageHeader, Stat, Tabs } from "../components/ui";
import { useEmprunts, useLivres, type Emprunt, type Livre } from "../queries/modules";
import { fmtDate, today } from "../lib/format";

type LivreRow = Livre & { empruntes: number; disponibles: number };
const actif = (e: Emprunt) => e.statut === "Emprunté";
const statutEmprunt = (e: Emprunt) => (actif(e) && e.dateRetourPrevue && e.dateRetourPrevue < today() ? "En retard" : e.statut);

export default function BibliothequePage() {
  const [tab, setTab] = useState<"livres" | "emprunts">("livres");
  const livres = useLivres();
  const emprunts = useEmprunts();
  const em = useMemo(() => emprunts.list.data ?? [], [emprunts.list.data]);
  const rows = useMemo<LivreRow[]>(
    () =>
      (livres.list.data ?? []).map((l) => {
        const n = em.filter((e) => actif(e) && e.codeLivre === l.code).length;
        return { ...l, empruntes: n, disponibles: Math.max(0, l.exemplaires - n) };
      }),
    [livres.list.data, em],
  );
  const codes = rows.map((l) => l.code);
  return (
    <div>
      <PageHeader title="Bibliothèque" subtitle="Catalogue, exemplaires disponibles, emprunts et retours." icon={<BookOpen className="size-5" />} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Titres" value={rows.length} />
        <Stat label="Exemplaires" value={rows.reduce((a, l) => a + l.exemplaires, 0)} />
        <Stat label="Emprunts en cours" value={em.filter(actif).length} tone="info" />
        <Stat label="En retard" value={em.filter((e) => statutEmprunt(e) === "En retard").length} tone="bad" />
      </div>
      <Tabs tabs={[{ id: "livres", label: "Livres" }, { id: "emprunts", label: "Emprunts & retours" }]} value={tab} onChange={setTab} />
      {tab === "livres" ? (
        <DataModule<LivreRow>
          hideHeader
          title="Livres"
          crud={livres as never}
          rows={rows}
          addLabel="Nouveau livre"
          defaults={{ exemplaires: 1, etat: "Disponible" }}
          fields={[
            { key: "code", label: "Code livre", placeholder: "LIV-001" },
            { key: "categorie", label: "Catégorie", suggestions: ["Roman", "Manuel", "Dictionnaire", "Bande dessinée", "Documentaire"] },
            { key: "titre", label: "Titre", span: 2 },
            { key: "auteur", label: "Auteur" },
            { key: "exemplaires", label: "Exemplaires", type: "number" },
            { key: "etat", label: "État", type: "select", options: ["Disponible", "Emprunté", "Perdu", "En réparation"] },
          ]}
          columns={[
            { key: "code", label: "Code", className: "font-medium" },
            { key: "titre", label: "Titre" },
            { key: "auteur", label: "Auteur" },
            { key: "categorie", label: "Catégorie" },
            { key: "exemplaires", label: "Exemplaires", align: "right" },
            { key: "empruntes", label: "Empruntés", align: "right" },
            { key: "disponibles", label: "Disponibles", align: "right", render: (r) => <span className={r.disponibles ? "text-ok font-semibold" : "text-bad font-semibold"}>{r.disponibles}</span> },
            { key: "etat", label: "État", render: (r) => <Badge>{r.etat === "Disponible" && r.disponibles === 0 ? "Emprunté" : r.etat}</Badge> },
          ]}
        />
      ) : (
        <DataModule<Emprunt>
          hideHeader
          title="Emprunts"
          crud={emprunts}
          addLabel="Nouvel emprunt"
          defaults={{ dateEmprunt: today(), dateRetourPrevue: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), statut: "Emprunté" }}
          beforeSave={(d) => {
            const l = rows.find((x) => x.code === d.codeLivre);
            return l && !d.titre ? { ...d, titre: l.titre } : d;
          }}
          fields={[
            { key: "codeLivre", label: "Code livre", suggestions: codes, help: "Le titre est complété automatiquement s'il est vide." },
            { key: "titre", label: "Titre" },
            { key: "matricule", label: "Élève", type: "eleve" },
            { key: "nom", label: "Nom" },
            { key: "dateEmprunt", label: "Date d'emprunt", type: "date" },
            { key: "dateRetourPrevue", label: "Retour prévu", type: "date" },
            { key: "dateRetour", label: "Date de retour", type: "date" },
            { key: "statut", label: "Statut", type: "select", options: ["Emprunté", "Rendu", "Perdu"] },
          ]}
          filters={[{ key: "statut", label: "Statut", options: ["Emprunté", "En retard", "Rendu", "Perdu"], get: statutEmprunt }]}
          searchKeys={["codeLivre", "titre", "matricule", "nom"]}
          columns={[
            { key: "codeLivre", label: "Code", className: "font-medium" },
            { key: "titre", label: "Titre" },
            { key: "matricule", label: "Matricule" },
            { key: "nom", label: "Emprunteur" },
            { key: "dateEmprunt", label: "Emprunt", render: (r) => fmtDate(r.dateEmprunt) },
            { key: "dateRetourPrevue", label: "Retour prévu", render: (r) => fmtDate(r.dateRetourPrevue) },
            { key: "dateRetour", label: "Rendu le", render: (r) => fmtDate(r.dateRetour) },
            { key: "statut", label: "Statut", value: statutEmprunt, render: (r) => <Badge>{statutEmprunt(r)}</Badge> },
          ]}
          rowActions={(r) =>
            actif(r) ? (
              <Button size="sm" variant="outline" onClick={() => emprunts.update.mutateAsync({ id: r.id, data: { statut: "Rendu", dateRetour: today() } })}>
                <CornerDownLeft className="size-3.5" /> Rendu
              </Button>
            ) : null
          }
        />
      )}
    </div>
  );
}
