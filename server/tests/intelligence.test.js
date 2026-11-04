const request = require('supertest');
const app = require('../src/app');
const { query, close } = require('../src/config/db');
const { SESSION_COOKIE_NAME } = require('../src/middleware/auth');
const { parseDeadlineText } = require('../src/services/parsingService');
const reminderRepository = require('../src/repositories/reminderRepository');

describe('Milestone 5: Deadline Intelligence & Prioritization Engine', () => {
  const student = {
    email: `intelligence_student_${Date.now()}@college.edu`,
    password: 'Password123!',
  };

  let studentCookie = null;
  let studentUserId = null;

  beforeAll(async () => {
    const res = await request(app).post('/auth/signup').send(student);
    const cookies = res.headers['set-cookie'];
    studentCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];
    studentUserId = res.body.user.id;
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE email = $1;', [student.email.toLowerCase()]);
    await close();
  });

  describe('1. Natural Language Parser (Unit)', () => {
    it('parses day-first dates correctly (e.g. 05/11 is 5th Nov, not 11th May)', () => {
      const parsed = parseDeadlineText('Submit lab record on 05/11');
      expect(parsed.dueAt).not.toBeNull();
      const date = new Date(parsed.dueAt);
      expect(date.getMonth()).toBe(10); // 10 is November (0-indexed)
      expect(date.getDate()).toBe(5);
      expect(parsed.warnings.some((w) => w.includes('day-first'))).toBe(true);
    });

    it('extracts effort and cleans title', () => {
      const parsed = parseDeadlineText('Complete DBMS assignment by 25 October at 5 PM ~4.5h');
      expect(parsed.title).toBe('Complete DBMS assignment');
      expect(parsed.effortHours).toBe(4.5);
      expect(parsed.subject).toBe('DBMS');
      expect(parsed.hasDueTime).toBe(true);
    });

    it('handles date-only input with end-of-day interpretation and warning', () => {
      const parsed = parseDeadlineText('ML project report due Friday');
      expect(parsed.hasDueTime).toBe(false);
      expect(parsed.warnings.some((w) => w.includes('Time nahi diya'))).toBe(true);
    });

    it('handles undated tasks with clear warning', () => {
      const parsed = parseDeadlineText('Meet with faculty advisor');
      expect(parsed.title).toBe('Meet with faculty advisor');
      expect(parsed.dueAt).toBeNull();
      expect(parsed.warnings.some((w) => w.includes('Date samajh nahi aayi'))).toBe(true);
    });
  });

  describe('2. POST /deadlines/parse (Mandatory Preview Contract)', () => {
    it('returns preview without writing to the database', async () => {
      const { rows: countBefore } = await query('SELECT COUNT(*) FROM deadlines WHERE user_id = $1;', [
        studentUserId,
      ]);

      const res = await request(app)
        .post('/deadlines/parse')
        .set('Cookie', [studentCookie])
        .send({ text: 'Prepare DAA presentation tomorrow at 3 PM ~2h' });

      expect(res.status).toBe(200);
      expect(res.body.preview).toBeDefined();
      expect(res.body.preview.title).toBe('Prepare DAA presentation');
      expect(res.body.preview.subject).toBe('DAA');
      expect(res.body.preview.hasDueTime).toBe(true);
      expect(res.body.preview.effortHours).toBe(2);

      // Verify ZERO database rows were created
      const { rows: countAfter } = await query('SELECT COUNT(*) FROM deadlines WHERE user_id = $1;', [
        studentUserId,
      ]);
      expect(countAfter[0].count).toBe(countBefore[0].count);
    });
  });

  describe('3. Automated Reminder Lifecycle', () => {
    it('schedules 48h, 24h, 6h reminders for explicit time deadline in the future', async () => {
      // 4 days in future (96h)
      const futureDue = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Compiler Design Project',
          dueAt: futureDue,
          hasDueTime: true,
          effortHours: 8.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.remindersScheduled).toBe(3);

      const reminders = await reminderRepository.findByDeadlineId(res.body.deadline.id);
      expect(reminders).toHaveLength(3);
      const kinds = reminders.map((r) => r.kind);
      expect(kinds).toContain('48h');
      expect(kinds).toContain('24h');
      expect(kinds).toContain('6h');
    });

    it('skips reminder offsets already in the past', async () => {
      // 18 hours in future: 48h and 24h offsets are in the past; only 6h offset is in future!
      const soonDue = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Urgent Lab Quiz',
          dueAt: soonDue,
          hasDueTime: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.remindersScheduled).toBe(1);

      const reminders = await reminderRepository.findByDeadlineId(res.body.deadline.id);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].kind).toBe('6h');
    });

    it('schedules exactly 2 reminders (night_before and morning_of) for date-only deadlines', async () => {
      // 4 days in future date-only (23:59 EOD)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 4);
      futureDate.setHours(23, 59, 0, 0);

      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Seminar Submission',
          dueAt: futureDate.toISOString(),
          hasDueTime: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.remindersScheduled).toBe(2);

      const reminders = await reminderRepository.findByDeadlineId(res.body.deadline.id);
      expect(reminders).toHaveLength(2);
      const kinds = reminders.map((r) => r.kind);
      expect(kinds).toContain('night_before');
      expect(kinds).toContain('morning_of');
      expect(kinds).not.toContain('48h');
    });

    it('cancels pending reminders when task is completed', async () => {
      const futureDue = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Math Assignment 4',
          dueAt: futureDue,
          hasDueTime: true,
        });

      const deadlineId = createRes.body.deadline.id;
      let reminders = await reminderRepository.findByDeadlineId(deadlineId);
      expect(reminders.every((r) => r.status === 'pending')).toBe(true);

      // Complete deadline
      await request(app)
        .patch(`/deadlines/${deadlineId}`)
        .set('Cookie', [studentCookie])
        .send({ status: 'completed' });

      reminders = await reminderRepository.findByDeadlineId(deadlineId);
      expect(reminders.every((r) => r.status === 'cancelled')).toBe(true);
    });

    it('reschedules reminders when due date is modified', async () => {
      const initialDue = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Rescheduled Presentation',
          dueAt: initialDue,
          hasDueTime: true,
        });

      const deadlineId = createRes.body.deadline.id;

      // Reschedule to 10 days in future
      const newDue = new Date(Date.now() + 240 * 60 * 60 * 1000).toISOString();
      await request(app)
        .patch(`/deadlines/${deadlineId}`)
        .set('Cookie', [studentCookie])
        .send({ dueAt: newDue });

      const reminders = await reminderRepository.findByDeadlineId(deadlineId);
      const pendingReminders = reminders.filter((r) => r.status === 'pending');
      const cancelledReminders = reminders.filter((r) => r.status === 'cancelled');

      // Previous 3 were cancelled, new 3 pending scheduled
      expect(cancelledReminders.length).toBeGreaterThanOrEqual(3);
      expect(pendingReminders).toHaveLength(3);
    });
  });

  describe('4. "Do This Next" Prioritization Engine (GET /deadlines/next)', () => {
    beforeAll(async () => {
      // Clear student's test deadlines for clean ranking assertions
      await query('DELETE FROM deadlines WHERE user_id = $1;', [studentUserId]);

      // Task 1: Due in 48 hours, Effort = 44 hours => Slack = 4 hours (Urgent!)
      await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Heavy Capstone Milestone',
          dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          effortHours: 44.0,
        });

      // Task 2: Due in 24 hours, Effort = 1 hour => Slack = 23 hours (Lots of spare time!)
      await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Quick 1-Page Summary',
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          effortHours: 1.0,
        });

      // Task 3: Overdue task (due 3 hours ago) => MUST be top priority!
      await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Overdue Homework Problem',
          dueAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          effortHours: 2.0,
        });

      // Task 4: Unknown effort due in 36 hours
      await request(app)
        .post('/deadlines')
        .set('Cookie', [studentCookie])
        .send({
          title: 'Essay Draft (No Estimate)',
          dueAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
        });
    });

    it('ranks overdue task first, followed by smallest slack, then unknown effort', async () => {
      const res = await request(app)
        .get('/deadlines/next')
        .set('Cookie', [studentCookie]);

      expect(res.status).toBe(200);
      expect(res.body.rankedDeadlines).toHaveLength(4);
      expect(res.body.overdueCount).toBe(1);

      const [rank1, rank2, rank3, rank4] = res.body.rankedDeadlines;

      // Rank 1: Overdue Homework Problem
      expect(rank1.title).toBe('Overdue Homework Problem');
      expect(rank1.isOverdue).toBe(true);

      // Rank 2: Heavy Capstone Milestone (Slack ~ 4 hours)
      // Must beat Quick 1-Page Summary even though Quick Summary is due sooner!
      expect(rank2.title).toBe('Heavy Capstone Milestone');
      expect(rank2.slackHours).toBeLessThan(5);
      expect(rank2.suggestedStartBy).toBeDefined();

      // Rank 3: Quick 1-Page Summary (Slack ~ 23 hours)
      expect(rank3.title).toBe('Quick 1-Page Summary');
      expect(rank3.slackHours).toBeGreaterThan(20);

      // Rank 4: Essay Draft (No estimate)
      expect(rank4.title).toBe('Essay Draft (No Estimate)');
      expect(rank4.hasEffort).toBe(false);
      expect(rank4.reason).toContain('effort estimate needed');
    });
  });
});

