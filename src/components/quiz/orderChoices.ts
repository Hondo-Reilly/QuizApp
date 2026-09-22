import type { Choice } from "@shared/types";

export function orderChoices(
  choices: Choice[],
  order?: readonly string[],
): Choice[] {
  if (!order || order.length === 0) return choices;
  const byId = new Map(choices.map((c) => [c.id, c]));
  const ordered: Choice[] = [];
  for (const id of order) {
    const c = byId.get(id);
    if (c) ordered.push(c);
  }
  if (ordered.length < choices.length) {
    const seen = new Set(order);
    for (const c of choices) if (!seen.has(c.id)) ordered.push(c);
  }
  return ordered;
}
