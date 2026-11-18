import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, decodeWorkspace, encodeWorkspace, workspaceKey, writeWorkspace } from '../src/localWorkspace.ts';

test('workspace backup restores the business and validated records', () => {
  const workspace = {
    ...blankWorkspace(),
    name: 'Independent Laundry',
    expenses: [{ id: 'rent', name: 'Storage', amount: 12000, date: '2026-11-01', recurring: true }],
  };
  assert.deepEqual(decodeWorkspace(encodeWorkspace(workspace)), workspace);
  assert.throws(() => decodeWorkspace('{"format":"margindesk-open-workspace","version":9}'));
  assert.throws(() => decodeWorkspace('{"format":"margindesk-open-workspace","version":1,"workspace":{}}'));
});

test('a stale tab cannot overwrite the workspace saved by another tab', () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
  const first = writeWorkspace(storage, blankWorkspace(), null);
  const update = { ...blankWorkspace(), name: 'New name' };
  assert.throws(() => writeWorkspace(storage, update, null), /changed in another tab/);
  assert.equal(records.get(workspaceKey), first);
  writeWorkspace(storage, update, first);
  assert.equal(decodeWorkspace(records.get(workspaceKey)).name, update.name);
});
