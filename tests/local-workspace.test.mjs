import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, decodeWorkspace, encodeWorkspace, readWorkspaceBackup, workspaceKey, writeWorkspace } from '../src/localWorkspace.ts';

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

test('a Unicode-rich workspace can restore its own exported backup', async () => {
  const source = {
    file: 'sales.csv',
    headers: Array.from({length: 40}, (_, i) => 'Column ' + i),
    values: Array(40).fill('商'.repeat(1000)),
    mapping: {},
  };
  const jobs = Array.from({length: 45}, (_, index) => ({
    id: String(index), reference: String(index), service: 'Laundry', date: '2026-11-02',
    price: 1000, discount: 0, refund: 0, feeBps: 0, cash: null,
    supplies: 0, labor: 0, other: 0, source,
  }));
  const workspace = { ...blankWorkspace(), name: '商店', jobs };
  const serialized = encodeWorkspace(workspace);
  const file = new Blob([serialized], {type: 'application/json'});
  assert.ok(file.size > 5_000_000 && serialized.length < 5_000_000);
  assert.equal(encodeWorkspace(await readWorkspaceBackup(file)), serialized);
});

test('oversized, malformed and future-version files are rejected before restore', async () => {
  const oversized = {size: 15_000_001, text: () => assert.fail('oversized file was read')};
  await assert.rejects(readWorkspaceBackup(oversized), /size limit/);
  await assert.rejects(readWorkspaceBackup(new Blob(['{'])), SyntaxError);
  const future = {format: 'margindesk-open-workspace', version: 2, workspace: blankWorkspace()};
  await assert.rejects(readWorkspaceBackup(new Blob([JSON.stringify(future)])), /backup/);
});

test('a quota-denied save leaves prior records available', () => {
  const previous = encodeWorkspace(blankWorkspace());
  const storage = {
    getItem: () => previous,
    setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
  };
  assert.throws(() => writeWorkspace(storage, {...blankWorkspace(), name: 'Changed'}, previous), /storage is full/);
  assert.equal(decodeWorkspace(storage.getItem(workspaceKey)).name, 'My business');
});
