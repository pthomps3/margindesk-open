import { useState } from 'react';
import { decodeWorkspace, encodeWorkspace } from './localWorkspace';

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
  const [backup, setBackup] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backup) return;
    const form = event.currentTarget;
    setRestoring(true);
    try {
      if (backup.size > 5_000_000) throw new Error('The backup is larger than 5 MB.');
      const workspace = decodeWorkspace(await backup.text());
      if (await save(workspace, true)) {
        form.reset();
        setBackup(null);
        notify('Backup restored.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The backup could not be read.');
    } finally {
      setRestoring(false);
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
          <label>Choose backup file<input type="file" accept=".json,application/json" onChange={event => setBackup(event.target.files?.[0] ?? null)} disabled={restoring}/></label>
          <label className="checkbox"><input type="checkbox" required/>Replace all current workspace records</label>
          <button disabled={!backup || restoring}>{restoring ? 'Restoring…' : 'Restore backup'}</button>
        </form>
        <button onClick={onSample}>Open sample workspace</button>
        <button onClick={onReset}>Reset workspace</button>
      </>}
    </section>
  );
}
