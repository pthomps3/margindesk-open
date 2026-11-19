import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localCalendarDate } from '../src/calendar.mjs';

test('date defaults follow the owner’s calendar on both sides of UTC midnight', () => {
  const originalZone = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    assert.equal(localCalendarDate(new Date('2026-12-01T04:30:00Z')), '2026-11-30');
    process.env.TZ = 'Asia/Tokyo';
    assert.equal(localCalendarDate(new Date('2026-12-31T16:30:00Z')), '2027-01-01');
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});
