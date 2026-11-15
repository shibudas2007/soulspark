import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSendConnectionRequest,
  canUserComment,
  checkContentSafety,
  computeSharedInterests,
  diversifyFeed,
  sanitizeUsername,
  validateExpressionInput,
} from './soulspark';

test('diversifyFeed avoids consecutive posts from same author and category without popularity ranking', () => {
  const items = [
    { id: 1, author: { uid: 'a' }, category: 'Poetry', createdAt: '2026-11-15T10:00:00Z' },
    { id: 2, author: { uid: 'a' }, category: 'Poetry', createdAt: '2026-11-15T09:50:00Z' },
    { id: 3, author: { uid: 'b' }, category: 'Photography', createdAt: '2026-11-15T09:40:00Z' },
    { id: 4, author: { uid: 'c' }, category: 'Philosophy', createdAt: '2026-11-15T09:30:00Z' },
  ];

  const diversified = diversifyFeed(items);
  assert.equal(diversified.length, 4);
  assert.equal(diversified[0].id, 1);
  assert.notEqual(diversified[1].author.uid, diversified[0].author.uid);
  assert.notEqual(diversified[1].category, diversified[0].category);
});

test('computeSharedInterests finds case-insensitive overlap', () => {
  const shared = computeSharedInterests(
    ['Poetry', 'Astronomy', 'Slow Living'],
    ['astronomy', 'Ceramics', 'poetry']
  );
  assert.deepEqual(shared, ['astronomy', 'poetry']);
});

test('validateExpressionInput rejects spam, PII phone numbers, and invalid lengths', () => {
  assert.equal(
    validateExpressionInput({
      title: 'Hi',
      category: 'Poetry',
      content: 'Short',
    }).valid,
    false
  );

  assert.equal(
    validateExpressionInput({
      title: 'Call me today',
      category: 'Reflection',
      content: 'Reach me directly at 415-555-0199 anytime tonight.',
    }).valid,
    false
  );

  assert.equal(
    validateExpressionInput({
      title: 'Morning Lanterns',
      category: 'Poetry',
      content: 'Soft light breaks across the quiet windowsill before the street wakes.',
    }).valid,
    true
  );
});

test('checkContentSafety blocks harassment and spam links', () => {
  assert.equal(checkContentSafety('go die right now').safe, false);
  assert.equal(
    checkContentSafety('https://a.com https://b.com https://c.com check this').safe,
    false
  );
  assert.equal(checkContentSafety('What a gentle reflection on patience.').safe, true);
});

test('canUserComment enforces minor protection and connection-only controls', () => {
  const deniedMinor = canUserComment({
    allowComments: 'everyone',
    authorCommentPrivacy: 'everyone',
    authorIsMinorProtected: true,
    viewerUid: 'u2',
    authorUid: 'u1',
    isConnected: false,
    isBlocked: false,
  });
  assert.equal(deniedMinor.allowed, false);

  const allowedConnected = canUserComment({
    allowComments: 'connections',
    authorCommentPrivacy: 'connections',
    authorIsMinorProtected: true,
    viewerUid: 'u2',
    authorUid: 'u1',
    isConnected: true,
    isBlocked: false,
  });
  assert.equal(allowedConnected.allowed, true);
});

test('canSendConnectionRequest respects minor protection and blocks', () => {
  assert.equal(
    canSendConnectionRequest({
      senderUid: 'u1',
      recipientUid: 'u2',
      recipientIsMinorProtected: true,
      isBlocked: false,
      existingStatus: null,
    }).allowed,
    false
  );
  assert.equal(
    canSendConnectionRequest({
      senderUid: 'u1',
      recipientUid: 'u2',
      recipientIsMinorProtected: false,
      isBlocked: false,
      existingStatus: null,
    }).allowed,
    true
  );
});

test('sanitizeUsername produces safe lowercase handle', () => {
  assert.equal(sanitizeUsername('Aria Solis!!'), 'aria_solis');
  assert.equal(sanitizeUsername('x'), 'soul_x');
});
