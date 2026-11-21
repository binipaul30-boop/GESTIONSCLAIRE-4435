/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc } from "../lib/api";

/** Espace de noms oRPC d'un module CRUD (ex. orpc.salles). */
export type CrudNs = typeof orpc.salles;

/** Hooks CRUD génériques pour un module (list / create / update / remove).
 * Toute mutation rafraîchit l'ensemble des données (tableau de bord, bilan…). */
export function useCrud<Row extends { id: number }>(ns: any) {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries();
  const list = useQuery(ns.list.queryOptions()) as { data?: Row[]; isLoading: boolean; error: unknown };
  const create = useMutation(ns.create.mutationOptions({ onSuccess }));
  const update = useMutation(ns.update.mutationOptions({ onSuccess }));
  const remove = useMutation(ns.remove.mutationOptions({ onSuccess }));
  return {
    list,
    create: create as unknown as { mutateAsync: (d: Record<string, unknown>) => Promise<Row>; isPending: boolean },
    update: update as unknown as { mutateAsync: (d: { id: number; data: Record<string, unknown> }) => Promise<Row>; isPending: boolean },
    remove: remove as unknown as { mutateAsync: (d: { id: number }) => Promise<unknown>; isPending: boolean },
  };
}
