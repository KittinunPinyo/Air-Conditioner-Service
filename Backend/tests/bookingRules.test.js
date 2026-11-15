import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEstimate, validateBooking, validateReview } from '../src/bookingRules.js';

const validBooking = {
  serviceType: 'repair',
  acType: 'wall',
  btu: 9000,
  issue: 'clean',
  installWork: '',
  date: '2099-01-01',
  timeSlot: 'morning',
  address: '123 ถนนสุขุมวิท เขตบางนา',
};

test('validates a booking and clears fields for the other service type', () => {
  const result = validateBooking(validBooking);
  assert.equal(result.error, undefined);
  assert.equal(result.value.issue, 'clean');
  assert.equal(result.value.installWork, null);
});

test('rejects invalid service types and past dates', () => {
  assert.match(validateBooking({ ...validBooking, serviceType: 'other' }).error, /ประเภทบริการ/);
  assert.match(validateBooking({ ...validBooking, date: '2000-01-01' }).error, /วันที่ผ่านมา/);
});

test('adds repair issue and ceiling surcharges to the estimate', () => {
  assert.deepEqual(calculateEstimate({
    serviceType: 'repair',
    acType: 'ceiling',
    btu: 9000,
    issue: 'not_cold',
  }), { min: 800, max: 1600 });
});

test('adds the moving surcharge to an installation estimate', () => {
  assert.deepEqual(calculateEstimate({
    serviceType: 'install',
    acType: 'wall',
    btu: 18000,
    installWork: 'move',
  }), { min: 4500, max: 5000 });
});

test('accepts a valid rating and trims the review comment', () => {
  const result = validateReview({ rating: 5, comment: '  บริการดี  ' });
  assert.deepEqual(result.value, { rating: 5, comment: 'บริการดี' });
});

test('rejects ratings outside the 1-to-5 range', () => {
  assert.match(validateReview({ rating: 0 }).error, /1 ถึง 5/);
  assert.match(validateReview({ rating: 6 }).error, /1 ถึง 5/);
});
