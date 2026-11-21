/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, type ReactNode } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, PageHeader, Sheet, Spinner } from "./ui";
import { useScolarite, useSettings } from "../queries/school";
import { MOIS } from "../../api/lib/calc";
import { cn } from "../lib/utils";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "eleve" | "classe" | "mois" | "tel" | "email";
  options?: string[];
  suggestions?: string[];
  span?: 2;
  placeholder?: string;
  nullable?: boolean;
  help?: string;
}
export interface ColDef<R> {
  key: string;
  label: string;
  render?: (r: R) => ReactNode;
  value?: (r: R) => string | number | null | undefined;
  align?: "right";
  className?: string;
}
interface CrudLike<R> {
  list: { data?: R[]; isLoading: boolean };
  create: { mutateAsync: (d: Record<string, unknown>) => Promise<unknown>; isPending: boolean };
  update: { mutateAsync: (d: { id: number; data: Record<string, unknown> }) => Promise<unknown>; isPending: boolean };
  remove: { mutateAsync: (d: { id: number }) => Promise<unknown>; isPending: boolean };
}

export interface DataModuleProps<R extends { id: number }> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  crud: CrudLike<R>;
  rows?: R[];
  fields: FieldDef[];
  columns: ColDef<R>[];
  defaults?: Record<string, unknown>;
  searchKeys?: string[];
  filters?: { key: string; label: string; options: string[]; get?: (r: R) => string }[];
  rowActions?: (r: R) => ReactNode;
  summary?: (rows: R[]) => ReactNode;
  addLabel?: string;
  emptyHint?: string;
  beforeSave?: (d: Record<string, unknown>) => Record<string, unknown>;
  headerActions?: ReactNode;
  readOnly?: boolean;
  hideHeader?: boolean;
  exportName?: string;
  formNote?: ReactNode;
}

export function DataModule<R extends { id: number }>(p: DataModuleProps<R>) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<R | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => p.rows ?? p.crud.list.data ?? [], [p.rows, p.crud.list.data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r: any) => {
      for (const fl of p.filters ?? []) {
        const v = f[fl.key];
        if (v && (fl.get ? fl.get(r) : String(r[fl.key] ?? "")) !== v) return false;
      }
      if (!needle) return true;
      const keys = p.searchKeys ?? p.columns.map((c) => c.key);
      return keys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle));
    });
  }, [rows, q, f, p.filters, p.searchKeys, p.columns]);

  const exportCsv = () => {
    const head = p.columns.map((c) => c.label);
    const lines = filtered.map((r: any) =>
      p.columns.map((c) => {
        const v = c.value ? c.value(r) : r[c.key];
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(";"),
    );
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.exportName ?? p.title}.csv`;
    a.click();
  };

  return (
    <div>
      {!p.hideHeader && (
        <PageHeader
          title={p.title}
          subtitle={p.subtitle}
          icon={p.icon}
          actions={
            <>
              {p.headerActions}
              <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="size-4" /> Export
              </Button>
              {!p.readOnly && (
                <Button onClick={() => setCreating(true)}>
                  <Plus className="size-4" /> {p.addLabel ?? "Ajouter"}
                </Button>
              )}
            </>
          }
        />
      )}
      {p.hideHeader && !p.readOnly && (
        <div className="mb-3 flex justify-end gap-2">
          {p.headerActions}
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> {p.addLabel ?? "Ajouter"}
          </Button>
        </div>
      )}

      {p.summary && rows.length > 0 && <div className="mb-5">{p.summary(filtered)}</div>}

      <Card className="overflow-hidden rise">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input aria-label="Rechercher" className="field !pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {(p.filters ?? []).map((fl) => (
            <select key={fl.key} className="field sm:!w-44" value={f[fl.key] ?? ""} onChange={(e) => setF({ ...f, [fl.key]: e.target.value })}>
              <option value="">{fl.label} : tous</option>
              {fl.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ))}
          <div className="num shrink-0 px-1 text-xs text-muted">{filtered.length} ligne(s)</div>
        </div>
        {p.crud.list.isLoading ? (
          <Spinner />
        ) : !filtered.length ? (
          <Empty
            title={rows.length ? "Aucun résultat" : "Aucune donnée pour le moment"}
            hint={rows.length ? "Modifiez la recherche ou les filtres." : p.emptyHint}
            action={!rows.length && !p.readOnly ? <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {p.addLabel ?? "Ajouter"}</Button> : undefined}
          />
        ) : (
          <div className="max-h-[68vh] overflow-auto scrollbar-thin">
            <table className="w-full text-[13.5px]">
              <thead className="sticky top-0 z-10 bg-[#FAF9F5]">
                <tr>
                  {p.columns.map((c) => (
                    <th key={c.key} className={cn("label whitespace-nowrap border-b border-line px-4 py-3 text-left !text-[10.5px]", c.align === "right" && "text-right")}>
                      {c.label}
                    </th>
                  ))}
                  <th className="border-b border-line px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="group border-b border-line/70 last:border-0 hover:bg-paper/60">
                    {p.columns.map((c) => (
                      <td key={c.key} className={cn("whitespace-nowrap px-4 py-2.5", c.align === "right" && "num text-right", c.className)}>
                        {c.render ? c.render(r) : String(r[c.key] ?? "")}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.rowActions?.(r)}
                        {!p.readOnly && (
                          <>
                            <button className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-ink cursor-pointer" onClick={() => setEditing(r)} aria-label="Modifier">
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="rounded-md p-1.5 text-muted hover:bg-bad/10 hover:text-bad cursor-pointer"
                              aria-label="Supprimer"
                              onClick={async () => {
                                if (confirm("Supprimer cette ligne ?")) await p.crud.remove.mutateAsync({ id: r.id });
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(creating || editing) && (
        <RecordForm
          title={editing ? `Modifier — ${p.title}` : `${p.addLabel ?? "Ajouter"} — ${p.title}`}
          fields={p.fields}
          initial={editing ? (editing as any) : (p.defaults ?? {})}
          note={p.formNote}
          pending={p.crud.create.isPending || p.crud.update.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={async (data) => {
            const d = p.beforeSave ? p.beforeSave(data) : data;
            if (editing) await p.crud.update.mutateAsync({ id: editing.id, data: d });
            else await p.crud.create.mutateAsync(d);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export function RecordForm({
  title,
  fields,
  initial,
  onSave,
  onClose,
  pending,
  note,
}: {
  title: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  onSave: (d: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  pending?: boolean;
  note?: ReactNode;
}) {
  const [v, setV] = useState<Record<string, unknown>>(() => {
    const o: Record<string, unknown> = {};
    for (const fd of fields) o[fd.key] = initial[fd.key] ?? (fd.type === "number" ? (fd.nullable ? null : 0) : "");
    return o;
  });
  const [err, setErr] = useState("");
  const { classes } = useSettings();
  const needsEleves = fields.some((x) => x.type === "eleve");
  const eleves = useScolarite();

  const set = (k: string, val: unknown) => setV((o) => ({ ...o, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await onSave(v);
    } catch (x: any) {
      setErr(x?.message ?? "Erreur lors de l'enregistrement");
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">Annuler</Button>
          <Button type="submit" form="record-form" loading={pending}>Enregistrer</Button>
        </>
      }
    >
      <form id="record-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {note && <div className="sm:col-span-2 rounded-xl bg-paper p-3 text-[13px] text-ink/80">{note}</div>}
        {fields.map((fd) => {
          const val = v[fd.key];
          const common = { className: "field", value: val === null || val === undefined ? "" : String(val) };
          let input: ReactNode;
          switch (fd.type) {
            case "eleve":
              input = (
                <select
                  {...common}
                  onChange={(e) => {
                    const el = eleves.data?.find((x) => x.matricule === e.target.value);
                    setV((o) => ({
                      ...o,
                      matricule: e.target.value,
                      ...(el ? { nom: `${el.nom} ${el.prenom}`.trim(), classe: el.classe } : {}),
                    }));
                  }}
                >
                  <option value="">{needsEleves && eleves.isLoading ? "Chargement…" : "— Choisir un élève —"}</option>
                  {(eleves.data ?? []).map((el) => (
                    <option key={el.id} value={el.matricule}>
                      {el.matricule} — {el.nom} {el.prenom} ({el.classe})
                    </option>
                  ))}
                  {val && !eleves.data?.some((x) => x.matricule === val) ? <option value={String(val)}>{String(val)}</option> : null}
                </select>
              );
              break;
            case "select":
            case "classe":
            case "mois": {
              const opts = fd.type === "classe" ? classes : fd.type === "mois" ? MOIS : fd.options ?? [];
              input = (
                <select {...common} onChange={(e) => set(fd.key, e.target.value)}>
                  <option value="">—</option>
                  {opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                  {val && !opts.includes(String(val)) ? <option>{String(val)}</option> : null}
                </select>
              );
              break;
            }
            case "textarea":
              input = <textarea {...common} rows={3} onChange={(e) => set(fd.key, e.target.value)} placeholder={fd.placeholder} />;
              break;
            case "number":
              input = (
                <input
                  {...common}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={fd.placeholder}
                  onChange={(e) => set(fd.key, e.target.value === "" ? (fd.nullable ? null : 0) : Number(e.target.value))}
                />
              );
              break;
            default: {
              const listId = fd.suggestions ? `dl-${fd.key}` : undefined;
              input = (
                <>
                  <input
                    {...common}
                    type={fd.type === "date" ? "date" : fd.type === "email" ? "email" : fd.type === "tel" ? "tel" : "text"}
                    placeholder={fd.placeholder}
                    list={listId}
                    onChange={(e) => set(fd.key, e.target.value)}
                  />
                  {listId && (
                    <datalist id={listId}>
                      {fd.suggestions!.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </datalist>
                  )}
                </>
              );
            }
          }
          return (
            <Field key={fd.key} label={fd.label} className={cn((fd.span === 2 || fd.type === "textarea" || fd.type === "eleve") && "sm:col-span-2")}>
              {input}
              {fd.help && <span className="text-[11.5px] text-muted">{fd.help}</span>}
            </Field>
          );
        })}
        {err && <div className="sm:col-span-2 rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</div>}
      </form>
    </Sheet>
  );
}
