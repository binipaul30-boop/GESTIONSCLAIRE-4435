import { useEffect, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "../lib/utils";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "dark";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-white hover:bg-[#185d8e]",
        variant === "dark" && "bg-ink text-white hover:bg-ink-2",
        variant === "outline" && "border border-line bg-white hover:bg-paper",
        variant === "ghost" && "hover:bg-black/5",
        variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/15",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[14px] border border-line bg-white", className)}>{children}</div>;
}

const TONES: Record<string, string> = {
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/12 text-warn",
  bad: "bg-bad/10 text-bad",
  info: "bg-primary/10 text-primary",
  muted: "bg-black/5 text-muted",
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  Soldé: "ok", Payé: "ok", Admis: "ok", Actif: "ok", Disponible: "ok", Inscrit: "ok", Valide: "ok", Régularisé: "ok", Oui: "ok", Excellent: "ok", "Très bien": "ok", Rendu: "ok", OK: "ok",
  Partiel: "warn", "En attente": "warn", Congé: "warn", "En travaux": "warn", "À renouveler": "warn", "Sans réponse": "warn", Retard: "warn", Réservée: "info", Emprunté: "info", Bien: "info", Passable: "warn", "En réparation": "warn", Envoyée: "info",
  Impayé: "bad", Ajourné: "bad", Refusé: "bad", Suspendu: "bad", "Hors service": "bad", Expiré: "bad", Sanction: "bad", Insuffisant: "bad", Perdu: "bad", Non: "muted", Parti: "muted", Archivé: "muted", Absence: "bad", "En retard": "bad", CONFLIT: "bad",
};
export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof TONES }) {
  const t = tone ?? (typeof children === "string" ? STATUS_TONE[children] : undefined) ?? "muted";
  if (children === "" || children === null || children === undefined) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap", TONES[t])}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rise">
      <div className="flex items-center gap-3">
        {icon && <div className="grid size-11 place-items-center rounded-xl bg-ink text-white">{icon}</div>}
        <div>
          <h1 className="text-[22px] font-semibold leading-tight sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone, delay = 0 }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "bad" | "warn" | "info"; delay?: number }) {
  return (
    <Card className="p-4 rise">
      <div style={{ animationDelay: `${delay}ms` }}>
        <div className="label">{label}</div>
        <div className={cn("num mt-1.5 text-[22px] font-semibold leading-tight", tone === "ok" && "text-ok", tone === "bad" && "text-bad", tone === "warn" && "text-warn", tone === "info" && "text-primary")}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>
    </Card>
  );
}

export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} />
      <div className={cn("relative flex h-full w-full flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 cursor-pointer" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 scrollbar-thin">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn("whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition cursor-pointer", value === t.id ? "bg-ink text-white" : "text-muted hover:text-ink")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-[15px] font-medium">{title}</div>
      {hint && <div className="max-w-sm text-sm text-muted">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "info" }: { value: number; tone?: "ok" | "warn" | "bad" | "info" }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
      <div className={cn("h-full rounded-full", tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : tone === "bad" ? "bg-bad" : "bg-primary")} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
