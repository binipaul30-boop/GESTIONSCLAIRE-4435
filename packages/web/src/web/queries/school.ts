import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { parseClasses } from "../../api/lib/calc";

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useSettings() {
  const q = useQuery(orpc.settings.get.queryOptions({ staleTime: 60_000 }));
  return { ...q, classes: parseClasses(q.data?.classes) };
}
export function useUpdateSettings() {
  const inv = useInvalidateAll();
  return useMutation(orpc.settings.update.mutationOptions({ onSuccess: inv }));
}
export function useDemo() {
  const inv = useInvalidateAll();
  return useMutation(orpc.settings.demo.mutationOptions({ onSuccess: inv }));
}
export function useStats() {
  return useQuery(orpc.stats.overview.queryOptions());
}
export function useBilan() {
  return useQuery(orpc.finance.bilan.queryOptions());
}
export function useScolarite() {
  return useQuery(orpc.scolarite.list.queryOptions());
}
export function usePaiements(eleveId: number | null) {
  return useQuery(orpc.scolarite.paiements.queryOptions({ input: { eleveId: eleveId ?? 0 }, enabled: !!eleveId }));
}
export function usePayer() {
  const inv = useInvalidateAll();
  return useMutation(orpc.scolarite.payer.mutationOptions({ onSuccess: inv }));
}
export function useSupprimerPaiement() {
  const inv = useInvalidateAll();
  return useMutation(orpc.scolarite.supprimerPaiement.mutationOptions({ onSuccess: inv }));
}
export function useConvertir() {
  const inv = useInvalidateAll();
  return useMutation(orpc.scolarite.convertir.mutationOptions({ onSuccess: inv }));
}
export function useGenererEDT() {
  const inv = useInvalidateAll();
  return useMutation(orpc.edt.generer.mutationOptions({ onSuccess: inv }));
}
export function useViderEDT() {
  const inv = useInvalidateAll();
  return useMutation(orpc.edt.vider.mutationOptions({ onSuccess: inv }));
}
