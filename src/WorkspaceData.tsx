import { useRef, useState } from 'react';
import { encodeWorkspace, readWorkspaceBackup } from './localWorkspace';

type Props = {
  data: unknown;
  demo: boolean;
  unreadableBackup: string | null;
  download: (name: string, contents: string, type: string) => void;
  save: (workspace: unknown, replaceUnreadable?: boolean) => Promise<boolean>;
  notify: (message: string) => void;
  onSample: () => void;
  onReset: () => void;
};

export default function WorkspaceData({
  data, demo, unreadableBackup, download, save, notify, onSample, onReset,
}: Props) {
  const [backup, setBackup] = useState<Awaited<ReturnType<typeof readWorkspaceBackup>> | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const selection = useRef(0);

  async function preview(file?: File) {
    const current = ++selection.current;
    setBackup(null);
    setConfirmed(false);
    setError('');
    setReading(Boolean(file));
    if (!file) return;
    try {
      const candidate = await readWorkspaceBackup(file);
      if (current === selection.current) setBackup(candidate);
    } catch (error) {
      if (current === selection.current) {
        setError(error instanceof Error ? error.message : 'The backup could not be read.');
      }
    } finally {
      if (current === selection.current) setReading(false);
    }
  }

  function clearSelection() {
    if (fileInput.current) fileInput.current.value = '';
    void preview();
  }

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backup || !confirmed || saving) return;
    setSaving(true);
    try {
      if (await save(backup, true)) {
        clearSelection();
        notify('Backup restored.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The backup could not be restored.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card formcard">
      <h3>Workspace data</h3>
      {demo ? <p>This sample is separate from your saved workspace.</p> : <>
        <p>Records stay in this browser. Download a backup before clearing browser data or switching devices.</p>
        <button onClick={() => download('margindesk-workspace.json', encodeWorkspace(data), 'application/json')}>
          Download workspace backup
        </button>
        {unreadableBackup && <button onClick={() => download('margindesk-original.json', unreadableBackup, 'application/json')}>
          Download unreadable original
        </button>}
        <form onSubmit={restore}>
          <label>Choose backup file<input ref={fileInput} type="file" accept=".json,application/json"
            onChange={event => void preview(event.target.files?.[0])} disabled={saving}/></label>
          {reading && <p role="status">Reading backup…</p>}
          {error && <p role="alert">{error}</p>}
          {backup && <>
            <div role="status">
              <strong>{backup.name} ({backup.currency})</strong>
              <p>Sales ({backup.jobs.length}), estimates ({backup.estimates.length}), expenses ({backup.expenses.length}),
                {' '}services ({backup.services.length}), prepaid plans ({backup.plans.length}) and scenarios ({backup.scenarios.length}).</p>
            </div>
            <label className="checkbox"><input type="checkbox" checked={confirmed} disabled={saving}
              onChange={event => setConfirmed(event.target.checked)}/>Replace all current workspace records with this backup</label>
            <div className="actions">
              <button disabled={!confirmed || saving}>{saving ? 'Restoring…' : 'Restore backup'}</button>
              <button type="button" disabled={saving} onClick={clearSelection}>Cancel restore</button>
            </div>
          </>}
        </form>
        <button onClick={onSample}>Open sample workspace</button>
        <button onClick={onReset}>Reset workspace</button>
      </>}
    </section>
  );
}
