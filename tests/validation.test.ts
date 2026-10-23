import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnquiry, type FieldRule } from '../src/scripts/validation.ts';

const messages = {
  required: 'Enter your {field}.',
  select: 'Select a property type.',
  email: 'Enter an email address in the format name@example.com.',
  phone: 'Enter a phone number using digits, spaces and an optional + sign.',
  units: 'Enter the number of units as a whole number.',
};

const rules: FieldRule[] = [
  { name: 'fullName', label: 'Full name', required: true },
  { name: 'phone', label: 'Phone', required: true, kind: 'phone' },
  { name: 'email', label: 'Email', required: true, kind: 'email' },
  { name: 'propertyType', label: 'Property type', required: true, kind: 'select' },
  { name: 'units', label: 'Number of units', required: false, kind: 'integer' },
];

const valid = {
  fullName: 'Sara Haddad',
  phone: '+971 55 123 4567',
  email: 'sara@example.ae',
  propertyType: 'Villa',
  units: '',
};

test('accepts a complete, well-formed enquiry', () => {
  assert.deepEqual(validateEnquiry(valid, rules, messages), {});
});

test('reports each missing required field with its label in lower case', () => {
  const errors = validateEnquiry({ ...valid, fullName: '  ', phone: '' }, rules, messages);
  assert.equal(errors.fullName, 'Enter your full name.');
  assert.equal(errors.phone, 'Enter your phone.');
});

test('uses the select message for an empty select', () => {
  assert.equal(validateEnquiry({ ...valid, propertyType: '' }, rules, messages).propertyType, messages.select);
});

test('rejects malformed email addresses', () => {
  for (const email of ['sara', 'sara@', '@example.com', 'sara@example', 'sa ra@example.com']) {
    assert.equal(validateEnquiry({ ...valid, email }, rules, messages).email, messages.email, email);
  }
});

test('rejects phone numbers with letters or too few digits', () => {
  for (const phone of ['call me', '12345', '+971-55-abc']) {
    assert.equal(validateEnquiry({ ...valid, phone }, rules, messages).phone, messages.phone, phone);
  }
});

test('accepts common phone formats', () => {
  for (const phone of ['0551234567', '+971551205005', '+971 (55) 120-5005']) {
    assert.equal(validateEnquiry({ ...valid, phone }, rules, messages).phone, undefined, phone);
  }
});

test('optional integer field must be a positive whole number when filled', () => {
  assert.equal(validateEnquiry({ ...valid, units: '3.5' }, rules, messages).units, messages.units);
  assert.equal(validateEnquiry({ ...valid, units: '0' }, rules, messages).units, messages.units);
  assert.equal(validateEnquiry({ ...valid, units: '12' }, rules, messages).units, undefined);
});

test('does not mutate the input values', () => {
  const input = Object.freeze({ ...valid, fullName: '' });
  assert.doesNotThrow(() => validateEnquiry(input, rules, messages));
});
