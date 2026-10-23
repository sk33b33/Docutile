import type { Pack, Settings } from "@/types";

/** Remind once a pack has gone this long without a backup that covers its latest changes. */
export const BACKUP_REMIND_AFTER_DAYS = 7;
export const BACKUP_SNOOZE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const hasFiles = (p: Pack) => p.slots.some((s) => s.files.length > 0);

/**
 * Packs worth a reminder: they hold files, changed after their last backup (or were never backed up), and
 * the last backup (or creation) is old enough that losing the browser data would hurt. Empty packs and
 * freshly backed-up packs never count.
 */
export function packsNeedingBackup(packs: Pack[], settings: Pick<Settings, "lastBackups" | "backupSnoozedUntil">, now: number = Date.now()): Pack[] {
  const snoozed = settings.backupSnoozedUntil ? Date.parse(settings.backupSnoozedUntil) : NaN;
  if (!Number.isNaN(snoozed) && snoozed > now) return [];
  return packs.filter((p) => {
    if (!hasFiles(p)) return false;
    const last = settings.lastBackups?.[p.id];
    if (last && last >= p.updatedAt) return false; // ISO strings compare chronologically
    const since = Date.parse(last ?? p.createdAt);
    if (Number.isNaN(since)) return true;
    return now - since >= BACKUP_REMIND_AFTER_DAYS * DAY_MS;
  });
}

export function snoozeUntil(now: number = Date.now()): string {
  return new Date(now + BACKUP_SNOOZE_DAYS * DAY_MS).toISOString();
}

export function recordBackup(settings: Settings, packId: string, now: Date = new Date()): Settings {
  return { ...settings, lastBackups: { ...settings.lastBackups, [packId]: now.toISOString() } };
}
