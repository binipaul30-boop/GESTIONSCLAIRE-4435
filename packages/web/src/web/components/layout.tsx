import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, UserPlus, Wallet, GraduationCap, Users, Contact, FileText, UtensilsCrossed, Bus, DoorOpen,
  CalendarDays, ShieldAlert, ClipboardCheck, BookOpen, FolderArchive, BellRing, Landmark, Settings, LogOut, Menu, X, School,
} from "lucide-react";
import { authClient } from "../lib/auth";
import { useSettings } from "../queries/school";
import { cn } from "../lib/utils";

export const NAV: { group: string; items: { to: string; label: string; icon: typeof School }[] }[] = [
  { group: "Pilotage", items: [
    { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/bilan", label: "Bilan financier", icon: Landmark },
  ] },
  { group: "Élèves", items: [
    { to: "/inscriptions", label: "Inscriptions", icon: UserPlus },
    { to: "/scolarite", label: "Scolarité", icon: Wallet },
    { to: "/bulletins", label: "Bulletins", icon: FileText },
    { to: "/examens", label: "Examens", icon: ClipboardCheck },
    { to: "/absences", label: "Absences & discipline", icon: ShieldAlert },
  ] },
  { group: "Personnel", items: [
    { to: "/enseignants", label: "Enseignants", icon: GraduationCap },
    { to: "/personnel-admin", label: "Personnel administratif", icon: Users },
    { to: "/annuaire", label: "Annuaire du personnel", icon: Contact },
  ] },
  { group: "Logistique", items: [
    { to: "/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
    { to: "/salles", label: "Salles", icon: DoorOpen },
    { to: "/cantine", label: "Cantine", icon: UtensilsCrossed },
    { to: "/transport", label: "Transport", icon: Bus },
    { to: "/bibliotheque", label: "Bibliothèque", icon: BookOpen },
  ] },
  { group: "Administration", items: [
    { to: "/documents", label: "Documents administratifs", icon: FolderArchive },
    { to: "/relances", label: "Relances des impayés", icon: BellRing },
    { to: "/parametres", label: "Paramètres", icon: Settings },
  ] },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [loc] = useLocation();
  const { data: settings } = useSettings();
  const { data: session } = authClient.useSession();
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky/20 text-sky">
          <School className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight">{settings?.nom || "Mon établissement"}</div>
          <div className="text-[12px] text-white/50">Année {settings?.annee ?? "2026-2027"}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="px-3 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/35">{g.group}</div>
            {g.items.map((it) => {
              const active = it.to === "/" ? loc === "/" : loc.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition",
                    active ? "bg-white text-ink font-medium" : "text-white/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-[17px]", active ? "text-primary" : "")} />
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sky/25 text-[13px] font-semibold text-sky">
            {(session?.user.name || session?.user.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{session?.user.name || "Compte"}</div>
            <div className="truncate text-[11.5px] text-white/45">{session?.user.email}</div>
          </div>
          <button
            className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Se déconnecter"
            onClick={async () => {
              await authClient.signOut();
              localStorage.removeItem("runable.managed-auth.token");
              window.location.href = "/connexion";
            }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">
        <Sidebar />
      </aside>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-black/5 cursor-pointer" aria-label="Menu">
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{settings?.nom || "Mon établissement"}</div>
          <div className="text-[11px] text-muted">{settings?.annee}</div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[280px] animate-in slide-in-from-left duration-200">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 rounded-md p-1 text-white/70 cursor-pointer" aria-label="Fermer">
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <main className="lg:pl-[264px]">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
