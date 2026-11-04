const request = require('supertest');
const app = require('../src/app');
const { query, close } = require('../src/config/db');
const { SESSION_COOKIE_NAME } = require('../src/middleware/auth');
const {
  formatNotification,
  expireMissedReminders,
  claimDueReminders,
  processClaimedReminder,
} = require('../src/jobs/reminderWorker');
const pushSubscriptionRepository = require('../src/repositories/pushSubscriptionRepository');
const { webpush } = require('../src/config/push');

describe('Milestone 6: Reminder Engine & Web Push Delivery', () => {
  const student = {
    email: `worker_student_${Date.now()}@college.edu`,
    password: 'Password123!',
  };

  let studentCookie = null;
  let studentUserId = null;
  let testDeadlineId = null;

  beforeAll(async () => {
    // 1. Sign up student
    const res = await request(app).post('/auth/signup').send(student);
    const cookies = res.headers['set-cookie'];
    studentCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];
    studentUserId = res.body.user.id;

    // 2. Create test deadline
    const deadlineRes = await request(app)
      .post('/deadlines')
      .set('Cookie', [studentCookie])
      .send({
        title: 'Distributed Systems Project',
        subject: 'DS',
        dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        effortHours: 6.0,
      });

    testDeadlineId = deadlineRes.body.deadline.id;
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE email = $1;', [student.email.toLowerCase()]);
    await close();
  });

  describe('1. Push Subscriptions API (/push)', () => {
    it('GET /push/vapid-public-key returns VAPID public key', async () => {
      const res = await request(app).get('/push/vapid-public-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicKey');
      expect(typeof res.body.publicKey).toBe('string');
      expect(res.body.publicKey.length).toBeGreaterThan(20);
    });

    it('POST /push/subscribe rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/push/subscribe').send({
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test',
        keys: { p256dh: 'test', auth: 'test' },
      });
      expect(res.status).toBe(401);
    });

    it('POST /push/subscribe validates payload and registers subscription', async () => {
      const res = await request(app)
        .post('/push/subscribe')
        .set('Cookie', [studentCookie])
        .send({
          endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/valid_endpoint_1',
          keys: {
            p256dh: 'BCVxsF4...',
            auth: '5K90...',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const subs = await pushSubscriptionRepository.findByUserId(studentUserId);
      expect(subs).toHaveLength(1);
      expect(subs[0].endpoint).toContain('valid_endpoint_1');
    });

    it('DELETE /push/subscribe unregisters push subscription', async () => {
      const res = await request(app)
        .delete('/push/subscribe')
        .set('Cookie', [studentCookie])
        .send({
          endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/valid_endpoint_1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const subs = await pushSubscriptionRepository.findByUserId(studentUserId);
      expect(subs).toHaveLength(0);
    });
  });

  describe('2. Notification Copy Formatter', () => {
    const mockDeadline = {
      id: 'd1',
      title: 'Operating Systems Lab',
      effort_hours: 4.0,
    };

    it('formats 48h, 24h, 6h, night_before, and morning_of copy', () => {
      const copy48h = formatNotification({ kind: '48h' }, mockDeadline);
      expect(copy48h.title).toContain('2 din baaki');
      expect(copy48h.body).toContain('~4h kaam');

      const copy24h = formatNotification({ kind: '24h' }, mockDeadline);
      expect(copy24h.title).toContain('Kal due:');
      expect(copy24h.body).toContain('Ho jayega');

      const copy6h = formatNotification({ kind: '6h' }, mockDeadline);
      expect(copy6h.title).toContain('6 ghante bache');

      const copyNight = formatNotification({ kind: 'night_before' }, mockDeadline);
      expect(copyNight.title).toContain('Kal due:');
      expect(copyNight.body).toContain('Time set nahi hai');

      const copyMorning = formatNotification({ kind: 'morning_of' }, mockDeadline);
      expect(copyMorning.title).toContain('Aaj due:');
    });
  });

  describe('3. Restart Grace Window & Expiration', () => {
    it('marks missed reminders outside 15-minute grace window as skipped', async () => {
      // Insert a reminder scheduled 45 minutes in the past
      const pastSendAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      const insertRes = await query(
        `INSERT INTO reminders (deadline_id, kind, send_at, status) VALUES ($1, '48h', $2, 'pending') RETURNING id;`,
        [testDeadlineId, pastSendAt]
      );
      const reminderId = insertRes.rows[0].id;

      // Run expiration
      const expiredCount = await expireMissedReminders(15);
      expect(expiredCount).toBeGreaterThanOrEqual(1);

      const { rows } = await query('SELECT status, error_details FROM reminders WHERE id = $1;', [
        reminderId,
      ]);
      expect(rows[0].status).toBe('skipped');
      expect(rows[0].error_details).toContain('outside grace window');
    });
  });

  describe('4. Atomic Row Claiming (FOR UPDATE SKIP LOCKED)', () => {
    let claimedReminderId = null;

    beforeAll(async () => {
      // Insert a due reminder scheduled 2 minutes in the past (inside 15-minute grace window)
      const dueSendAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const insertRes = await query(
        `INSERT INTO reminders (deadline_id, kind, send_at, status) VALUES ($1, '24h', $2, 'pending') RETURNING id;`,
        [testDeadlineId, dueSendAt]
      );
      claimedReminderId = insertRes.rows[0].id;
    });

    it('claims due reminder row atomically and increments attempt count', async () => {
      const claimed = await claimDueReminders(10, 15);
      const target = claimed.find((r) => r.id === claimedReminderId);
      expect(target).toBeDefined();
      expect(target.title).toBe('Distributed Systems Project');
      expect(target.attempts).toBe(1);

      // Verify status in DB transitioned to 'processing'
      const { rows } = await query('SELECT status, attempts FROM reminders WHERE id = $1;', [
        claimedReminderId,
      ]);
      expect(rows[0].status).toBe('processing');
      expect(rows[0].attempts).toBe(1);

      // Running claimDueReminders again immediately must return 0 for this row (already claimed)
      const secondClaim = await claimDueReminders(10, 15);
      expect(secondClaim.some((r) => r.id === claimedReminderId)).toBe(false);
    });

    it('processes claimed reminder and marks sent if user has no devices', async () => {
      const { rows } = await query(
        `SELECT r.id, r.deadline_id, r.kind, r.send_at, r.attempts, d.user_id, d.title, d.subject, d.effort_hours 
         FROM reminders r JOIN deadlines d ON r.deadline_id = d.id WHERE r.id = $1;`,
        [claimedReminderId]
      );

      const res = await processClaimedReminder(rows[0]);
      expect(res.success).toBe(true);

      const check = await query('SELECT status, sent_at FROM reminders WHERE id = $1;', [
        claimedReminderId,
      ]);
      expect(check.rows[0].status).toBe('sent');
      expect(check.rows[0].sent_at).not.toBeNull();
    });
  });

  describe('5. Expired Push Subscription Auto-Pruning', () => {
    it('automatically prunes subscription when web-push returns HTTP 410 Gone', async () => {
      const deadEndpoint = 'https://fcm.googleapis.com/fcm/send/dead_client_subscription_410';

      // 1. Register subscription
      await pushSubscriptionRepository.upsert({
        userId: studentUserId,
        endpoint: deadEndpoint,
        p256dh: 'mock_key',
        auth: 'mock_auth',
      });

      // Verify it exists in DB
      let subs = await pushSubscriptionRepository.findByUserId(studentUserId);
      expect(subs.some((s) => s.endpoint === deadEndpoint)).toBe(true);

      // 2. Mock webpush.sendNotification to simulate HTTP 410 Gone from push service
      const originalSend = webpush.sendNotification;
      webpush.sendNotification = async () => {
        const error = new Error('Subscription has expired or is no longer valid');
        error.statusCode = 410;
        throw error;
      };

      // 3. Insert and process a due reminder
      const insertRes = await query(
        `INSERT INTO reminders (deadline_id, kind, send_at, status) VALUES ($1, '6h', NOW() - INTERVAL '1 minute', 'processing') RETURNING id;`,
        [testDeadlineId]
      );
      const reminder = {
        id: insertRes.rows[0].id,
        deadline_id: testDeadlineId,
        user_id: studentUserId,
        kind: '6h',
        title: 'Distributed Systems Project',
        attempts: 1,
      };

      try {
        await processClaimedReminder(reminder);

        // 4. Assert that the dead subscription was automatically deleted from database
        subs = await pushSubscriptionRepository.findByUserId(studentUserId);
        expect(subs.some((s) => s.endpoint === deadEndpoint)).toBe(false);
      } finally {
        webpush.sendNotification = originalSend;
      }
    });
  });
});
