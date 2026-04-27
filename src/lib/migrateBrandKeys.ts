const MIGRATION_FLAG = "planthing.migration.flowboardKeys.v1";
const OLD_PREFIXES = ["flowboard-", "flowboard.", "flowboard:"];

export function migrateFlowboardLocalStorageKeys() {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage;

  if (storage.getItem(MIGRATION_FLAG) === "done") {
    return;
  }

  const renames: Array<{ oldKey: string; newKey: string }> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    const matchedPrefix = OLD_PREFIXES.find((prefix) => key.startsWith(prefix));
    if (!matchedPrefix) continue;
    const separator = matchedPrefix.slice(-1);
    const newKey = `planthing${separator}${key.slice(matchedPrefix.length)}`;
    renames.push({ oldKey: key, newKey });
  }

  for (const { oldKey, newKey } of renames) {
    const value = storage.getItem(oldKey);
    if (value === null) continue;
    if (storage.getItem(newKey) === null) {
      storage.setItem(newKey, value);
    }
    storage.removeItem(oldKey);
  }

  storage.setItem(MIGRATION_FLAG, "done");
}
