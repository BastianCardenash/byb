export const COUPLE_MEMBERS = [
  { id: '90041409-1fe3-4869-bc12-874b53df4a8c', name: 'Bastián' },
  { id: '68d927a4-40b2-41ba-a4ef-cdae028bbe0a', name: 'Beatriz' },
] as const;

export const COUPLE_NAMES: Record<string, string> = Object.fromEntries(
  COUPLE_MEMBERS.map((m) => [m.id, m.name]),
);
