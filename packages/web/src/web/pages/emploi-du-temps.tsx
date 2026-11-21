import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Eraser, Wand2 } from "lucide-react";
import { DataModule } from "../components/data-module";
import { Badge, Button, Card, Empty, Field, PageHeader, Sheet, Spinner, Stat, Tabs } from "../components/ui";
import { useMatieres, useSalles, useSeances, type Matiere, type Seance } from "../queries/modules";
import { useGenererEDT, useSettings, useViderEDT } from "../queries/school";
import { CRENEAUX, JOURS, TOUS_CRENEAUX, creneauxDuJour } from "../../api/lib/calc";
import { TYPES_SALLE, detecterConflits } from "../../api/lib/edt";
import { cn } from "../lib/utils";

type Tab = "param" | "classe" | "profs" | "salles" | "conflits" | "remplissage";
type Cell = { jour: string; creneau: string; seance?: Seance };

export default function EmploiDuTempsPage() {
  const [tab, setTab] = useState<Tab>("classe");
  const seances = useSeances();
  const matieres = useMatieres();
  const salles = useSalles();
  const { classes } = useSettings();
  const list = useMemo(() => seances.list.data ?? [], [seances.list.data]);
  const conflits = useMemo(() => detecterConflits(list), [list]);
  const conflitIds = useMemo(() => new Set(conflits.flatMap((c) => c.ids)), [conflits]);

  const profs = useMemo(() => {
    const set = new Set<string>();
    for (const m of matieres.list.data ?? []) if (m.enseignant) set.add(m.enseignant);
    for (const s of list) if (s.enseignant) set.add(s.enseignant);
    return [...set].sort();
  }, [matieres.list.data, list]);
  const codesSalles = useMemo(() => (salles.list.data ?? []).map((s) => s.code).filter(Boolean), [salles.list.data]);

  const [classe, setClasse] = useState("");
  const [prof, setProf] = useState("");
  const [salle, setSalle] = useState("");
  const [edit, setEdit] = useState<{ classe: string; cell: Cell } | null>(null);

  const c = classe || classes[0] || "";
  const p = prof || profs[0] || "";
  const sa = salle || codesSalles[0] || "";

  if (seances.list.isLoading) return <Spinner />;

  const totalCreneaux = TOUS_CRENEAUX.length;

  return (
    <div>
      <PageHeader
        title="Emploi du temps"
        subtitle={`${list.length} séances planifiées · ${totalCreneaux} créneaux par classe (samedi matin : 4)`}
        icon={<CalendarDays className="size-5" />}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Séances" value={list.length} />
        <Stat label="Classes" value={classes.length} />
        <Stat label="Matières" value={matieres.list.data?.length ?? 0} />
        <Stat label="Conflits" value={conflits.length} tone={conflits.length ? "bad" : "ok"} />
      </div>
      <Tabs<Tab>
        tabs={[
          { id: "classe", label: "Par classe" },
          { id: "profs", label: "Par enseignant" },
          { id: "salles", label: "Par salle" },
          { id: "conflits", label: `Conflits${conflits.length ? ` (${conflits.length})` : ""}` },
          { id: "remplissage", label: "Remplissage" },
          { id: "param", label: "Paramétrage" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "param" && <Parametrage matieres={matieres} />}

      {tab === "classe" && (
        <>
          <Selector label="Classe" value={c} options={classes} onChange={setClasse} />
          <Grille
            seances={list.filter((s) => s.classe === c)}
            conflitIds={conflitIds}
            render={(s) => [s.matiere, s.enseignant, s.salle]}
            onCell={(cell) => setEdit({ classe: c, cell })}
          />
        </>
      )}
      {tab === "profs" && (
        <>
          <Selector label="Enseignant" value={p} options={profs} onChange={setProf} />
          <Grille
            seances={list.filter((s) => s.enseignant === p)}
            conflitIds={conflitIds}
            render={(s) => [s.classe, s.matiere, s.salle]}
            onCell={(cell) => cell.seance && setEdit({ classe: cell.seance.classe, cell })}
          />
        </>
      )}
      {tab === "salles" && (
        <>
          <Selector label="Salle" value={sa} options={codesSalles} onChange={setSalle} />
          <Grille
            seances={list.filter((s) => s.salle === sa)}
            conflitIds={conflitIds}
            render={(s) => [s.classe, s.matiere, s.enseignant]}
            onCell={(cell) => cell.seance && setEdit({ classe: cell.seance.classe, cell })}
          />
        </>
      )}
      {tab === "conflits" && <Conflits conflits={conflits} />}
      {tab === "remplissage" && <Remplissage classes={classes} matieres={matieres.list.data ?? []} seances={list} />}

      {edit && (
        <EditSeance
          classe={edit.classe}
          cell={edit.cell}
          matieres={matieres.list.data ?? []}
          profs={profs}
          salles={codesSalles}
          crud={seances}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}

function Selector({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-sm text-muted">{label}</span>
      <select className="field max-w-xs" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Grille({
  seances,
  conflitIds,
  render,
  onCell,
}: {
  seances: Seance[];
  conflitIds: Set<number>;
  render: (s: Seance) => string[];
  onCell: (c: Cell) => void;
}) {
  const map = new Map<string, Seance[]>();
  for (const s of seances) {
    const k = `${s.jour}|${s.creneau}`;
    map.set(k, [...(map.get(k) ?? []), s]);
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line bg-paper">
            <th className="w-20 px-3 py-2.5 text-left font-medium text-muted">Créneau</th>
            {JOURS.map((j) => (
              <th key={j} className="px-2 py-2.5 text-left font-medium text-muted">{j}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRENEAUX.map((cr, i) => (
            <tr key={cr} className={cn("border-b border-line last:border-0", i === 4 && "border-t-4 border-t-paper")}>
              <td className="px-3 py-2 font-medium text-muted whitespace-nowrap">{cr}</td>
              {JOURS.map((j) => {
                if (!creneauxDuJour(j).includes(cr)) return <td key={j} className="bg-paper/60" aria-label="Pas de cours" />;
                const items = map.get(`${j}|${cr}`) ?? [];
                const s = items[0];
                const conflit = items.length > 1 || items.some((x) => conflitIds.has(x.id));
                return (
                  <td key={j} className="p-1 align-top">
                    <button
                      type="button"
                      onClick={() => onCell({ jour: j, creneau: cr, seance: s })}
                      className={cn(
                        "h-full min-h-[58px] w-full rounded-lg px-2 py-1.5 text-left transition",
                        s ? "bg-primary/[0.07] hover:bg-primary/[0.13]" : "border border-dashed border-line text-muted/60 hover:bg-paper",
                        conflit && "bg-bad/10 ring-1 ring-bad/40 hover:bg-bad/15",
                      )}
                    >
                      {s ? (
                        <>
                          {render(s).map((t, k) => (
                            <div key={k} className={cn("truncate", k === 0 ? "font-semibold text-ink" : "text-muted")}>{t || "—"}</div>
                          ))}
                          {items.length > 1 && <div className="mt-0.5 text-[11px] font-medium text-bad">+{items.length - 1} en conflit</div>}
                        </>
                      ) : (
                        <span className="text-[11px]">+</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EditSeance({
  classe,
  cell,
  matieres,
  profs,
  salles,
  crud,
  onClose,
}: {
  classe: string;
  cell: Cell;
  matieres: Matiere[];
  profs: string[];
  salles: string[];
  crud: ReturnType<typeof useSeances>;
  onClose: () => void;
}) {
  const s = cell.seance;
  const [v, setV] = useState({ matiere: s?.matiere ?? "", enseignant: s?.enseignant ?? "", salle: s?.salle ?? "" });
  const [err, setErr] = useState("");
  const pending = crud.create.isPending || crud.update.isPending || crud.remove.isPending;

  const save = async () => {
    setErr("");
    try {
      if (s) await crud.update.mutateAsync({ id: s.id, data: v });
      else await crud.create.mutateAsync({ ...v, classe, jour: cell.jour, creneau: cell.creneau });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const del = async () => {
    if (!s) return;
    await crud.remove.mutateAsync({ id: s.id });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${classe} · ${cell.jour} ${cell.creneau}`}
      footer={
        <>
          {s && <Button variant="danger" onClick={del} className="mr-auto">Libérer le créneau</Button>}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save} loading={pending} disabled={!v.matiere}>Enregistrer</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Matière">
          <select
            className="field"
            value={v.matiere}
            onChange={(e) => {
              const m = matieres.find((x) => x.nom === e.target.value);
              setV((o) => ({ ...o, matiere: e.target.value, enseignant: m?.enseignant || o.enseignant }));
            }}
          >
            <option value="">— Choisir —</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.nom}>{m.nom}</option>
            ))}
            {v.matiere && !matieres.some((m) => m.nom === v.matiere) && <option value={v.matiere}>{v.matiere}</option>}
          </select>
        </Field>
        <Field label="Enseignant">
          <input aria-label="Enseignant" className="field" list="edt-profs" value={v.enseignant} onChange={(e) => setV((o) => ({ ...o, enseignant: e.target.value }))} />
          <datalist id="edt-profs">{profs.map((p) => <option key={p} value={p}>{p}</option>)}</datalist>
        </Field>
        <Field label="Salle">
          <select className="field" value={v.salle} onChange={(e) => setV((o) => ({ ...o, salle: e.target.value }))}>
            <option value="">— Aucune —</option>
            {salles.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </Field>
        {err && <p className="text-sm text-bad">{err}</p>}
      </div>
    </Sheet>
  );
}

function Parametrage({ matieres }: { matieres: ReturnType<typeof useMatieres> }) {
  const gen = useGenererEDT();
  const vider = useViderEDT();
  const [msg, setMsg] = useState<string | null>(null);

  const generer = async () => {
    if (!confirm("Régénérer l'emploi du temps ? Les séances actuelles seront remplacées.")) return;
    const r = await gen.mutateAsync({});
    const m = r.manques.length
      ? ` · ${r.manques.reduce((a, x) => a + x.manquant, 0)} heure(s) non placée(s) : ${r.manques.map((x) => `${x.classe} ${x.matiere} (${x.manquant})`).join(", ")}`
      : " · toutes les heures ont été placées.";
    setMsg(`${r.total} séances générées${m}`);
  };
  const tout = async () => {
    if (!confirm("Vider tout l'emploi du temps ?")) return;
    await vider.mutateAsync({});
    setMsg("Emploi du temps vidé.");
  };
  const totalH = (matieres.list.data ?? []).reduce((a, m) => a + (m.heures || 0), 0);

  return (
    <div>
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Génération automatique</div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Place les heures de chaque matière pour toutes les classes, sans conflit d'enseignant ni de salle. Les salles non « Disponible » sont ignorées.
              Volume hebdomadaire par classe : <b className="text-ink">{totalH} h</b> sur {TOUS_CRENEAUX.length} créneaux.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={tout} loading={vider.isPending}><Eraser className="size-4" />Vider</Button>
            <Button onClick={generer} loading={gen.isPending}><Wand2 className="size-4" />Générer</Button>
          </div>
        </div>
        {totalH > TOUS_CRENEAUX.length && (
          <p className="mt-3 text-sm text-warn">Le total d'heures dépasse le nombre de créneaux disponibles : certaines heures ne pourront pas être placées.</p>
        )}
        {msg && <p className="mt-3 rounded-lg bg-paper p-3 text-sm">{msg}</p>}
        {gen.error && <p className="mt-3 text-sm text-bad">{gen.error.message}</p>}
      </Card>
      <DataModule<Matiere>
        hideHeader
        title="Matières"
        exportName="Parametrage-EDT"
        crud={matieres}
        addLabel="Nouvelle matière"
        defaults={{ heures: 2, typeSalle: "Classe" }}
        fields={[
          { key: "nom", label: "Matière" },
          { key: "heures", label: "Heures / semaine / classe", type: "number" },
          { key: "enseignant", label: "Enseignant" },
          { key: "typeSalle", label: "Type de salle", type: "select", options: [...TYPES_SALLE] },
        ]}
        columns={[
          { key: "nom", label: "Matière", className: "font-medium" },
          { key: "heures", label: "Heures / sem.", align: "right" },
          { key: "enseignant", label: "Enseignant" },
          { key: "typeSalle", label: "Type de salle", render: (r) => <Badge tone="info">{r.typeSalle}</Badge> },
        ]}
      />
    </div>
  );
}

function Conflits({ conflits }: { conflits: ReturnType<typeof detecterConflits> }) {
  if (!conflits.length) return <Card className="p-6"><Empty title="Aucun conflit" hint="Aucun enseignant, salle ou classe n'est programmé deux fois sur le même créneau." /></Card>;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-left text-muted">
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Concerné</th>
            <th className="px-4 py-2.5 font-medium">Jour</th>
            <th className="px-4 py-2.5 font-medium">Créneau</th>
            <th className="px-4 py-2.5 font-medium text-right">Séances</th>
          </tr>
        </thead>
        <tbody>
          {conflits.map((c, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5"><Badge tone="bad"><AlertTriangle className="size-3" />{c.type}</Badge></td>
              <td className="px-4 py-2.5 font-medium">{c.valeur}</td>
              <td className="px-4 py-2.5">{c.jour}</td>
              <td className="px-4 py-2.5">{c.creneau}</td>
              <td className="px-4 py-2.5 text-right">{c.ids.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Remplissage({ classes, matieres, seances }: { classes: string[]; matieres: Matiere[]; seances: Seance[] }) {
  const count = new Map<string, number>();
  for (const s of seances) count.set(`${s.matiere}|${s.classe}`, (count.get(`${s.matiere}|${s.classe}`) ?? 0) + 1);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-left text-muted">
            <th className="px-4 py-2.5 font-medium">Matière</th>
            <th className="px-3 py-2.5 font-medium text-right">Prévu</th>
            {classes.map((c) => (
              <th key={c} className="px-3 py-2.5 text-center font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matieres.map((m) => (
            <tr key={m.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2 font-medium">{m.nom}</td>
              <td className="px-3 py-2 text-right text-muted">{m.heures} h</td>
              {classes.map((c) => {
                const n = count.get(`${m.nom}|${c}`) ?? 0;
                const tone = n === m.heures ? "bg-ok/10 text-ok" : n < m.heures ? "bg-warn/12 text-warn" : "bg-bad/10 text-bad";
                return (
                  <td key={c} className="px-2 py-1.5 text-center">
                    <span className={cn("inline-block min-w-12 rounded-md px-2 py-1 text-[12.5px] font-medium", tone)}>{n}/{m.heures}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3 text-[12px] text-muted">
        <span><span className="mr-1.5 inline-block size-2.5 rounded-sm bg-ok/60" />Complet</span>
        <span><span className="mr-1.5 inline-block size-2.5 rounded-sm bg-warn/60" />Heures manquantes</span>
        <span><span className="mr-1.5 inline-block size-2.5 rounded-sm bg-bad/60" />Dépassement</span>
      </div>
    </Card>
  );
}
