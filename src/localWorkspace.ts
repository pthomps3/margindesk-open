import { useRef, useState } from 'react';
import { validateWorkspace } from './validation.ts';

export const workspaceKey = 'margindesk-open-workspace-v1';
const format = 'margindesk-open-workspace';
const maxBackupLength = 5_000_000;
// Version 1 limits UTF-16 code units. Each code unit requires at most three UTF-8 bytes.
const maxBackupFileBytes = maxBackupLength * 3;

export function blankWorkspace() {
  return {
    name: 'My business',
    currency: 'USD',
    businessType: 'service',
    setupComplete: false,
    services: [],
    estimates: [],
    jobs: [],
    expenses: [],
    plans: [],
    scenarios: [],
  };
}

export function encodeWorkspace(workspace: unknown) {
  return JSON.stringify({ format, version: 1, workspace: validateWorkspace(workspace) });
}

export function decodeWorkspace(raw: string) {
  if (raw.length > maxBackupLength) throw new Error('This backup exceeds the workspace size limit.');
  const backup = JSON.parse(raw);
  if (backup?.format !== format || backup.version !== 1) {
    throw new Error('Choose a MarginDesk Open workspace backup.');
  }
  return validateWorkspace(backup.workspace);
}

export async function readWorkspaceBackup(file: Blob) {
  if (file.size > maxBackupFileBytes) throw new Error('This backup exceeds the workspace size limit.');
  return decodeWorkspace(await file.text());
}

export function writeWorkspace(storage: Storage, workspace: unknown, expected: string | null) {
  const serialized = encodeWorkspace(workspace);
  if (serialized.length > maxBackupLength) {
    throw new Error('Workspace storage limit reached. Export your records before adding more.');
  }
  if (storage.getItem(workspaceKey) !== expected) {
    throw new Error('This workspace changed in another tab. Reload before saving.');
  }
  try {
    storage.setItem(workspaceKey, serialized);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('The browser could not save this change because its storage is full. Your previous records are still saved.');
    }
    throw error;
  }
  return serialized;
}

function readLocalWorkspace() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(workspaceKey);
    return { data: raw === null ? blankWorkspace() : decodeWorkspace(raw), raw, error: '' };
  } catch {
    return {
      data: blankWorkspace(),
      raw,
      error: raw === null
        ? 'Browser storage is unavailable. Check your browser settings before entering records.'
        : 'The saved workspace could not be read. Download the original file in Settings before replacing it.',
    };
  }
}

export function useLocalWorkspace(sample: boolean, seed: unknown) {
  const [initial] = useState(() => sample
    ? { data: validateWorkspace(seed), raw: null, error: '' }
    : readLocalWorkspace());
  const [data, setData] = useState(initial.data);
  const [loadError, setLoadError] = useState(initial.error);
  const saved = useRef(initial.raw);

  function write(workspace: unknown, replaceUnreadable = false) {
    if (!sample) {
      if (loadError && !replaceUnreadable) {
        throw new Error('Restore a backup or reset the workspace in Settings first.');
      }
      saved.current = writeWorkspace(localStorage, workspace, saved.current);
      setLoadError('');
    }
    setData(workspace);
  }

  return { data, write, loadError, unreadableBackup: loadError ? saved.current : null };
}
