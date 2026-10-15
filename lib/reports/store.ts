type ReportEntry = { status: string; buffer?: string; error?: string };
const globalAny = globalThis as unknown as { __reportStore?: Map<string, ReportEntry> };
if (!globalAny.__reportStore) globalAny.__reportStore = new Map();
const store = globalAny.__reportStore;

export function setReport(id: string, entry: ReportEntry) {
  store.set(id, entry);
}
export function getReport(id: string): ReportEntry | undefined {
  return store.get(id);
}
