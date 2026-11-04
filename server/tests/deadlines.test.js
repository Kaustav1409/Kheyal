const request = require('supertest');
const app = require('../src/app');
const { query, close } = require('../src/config/db');
const { SESSION_COOKIE_NAME } = require('../src/middleware/auth');

describe('Deadline CRUD APIs & Ownership Enforcement', () => {
  const userA = {
    email: `deadline_user_a_${Date.now()}@college.edu`,
    password: 'Password123!',
  };

  const userB = {
    email: `deadline_user_b_${Date.now()}@college.edu`,
    password: 'Password456!',
  };

  let userACookie = null;
  let userBCookie = null;
  let userADeadlineId = null;

  beforeAll(async () => {
    // 1. Sign up User A
    const resA = await request(app).post('/auth/signup').send(userA);
    const cookiesA = resA.headers['set-cookie'];
    userACookie = cookiesA.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];

    // 2. Sign up User B
    const resB = await request(app).post('/auth/signup').send(userB);
    const cookiesB = resB.headers['set-cookie'];
    userBCookie = cookiesB.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE email IN ($1, $2);', [
      userA.email.toLowerCase(),
      userB.email.toLowerCase(),
    ]);
    await close();
  });

  describe('Authentication Enforcement', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const resList = await request(app).get('/deadlines');
      expect(resList.status).toBe(401);

      const resCreate = await request(app).post('/deadlines').send({ title: 'Test' });
      expect(resCreate.status).toBe(401);
    });
  });

  describe('POST /deadlines (Validation & Creation)', () => {
    it('rejects missing or empty title with 400', async () => {
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({ title: '   ', effortHours: 2.0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects negative effort with 400', async () => {
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({ title: 'Lab Record', effortHours: -3.5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('creates a deadline with explicit time', async () => {
      const futureDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({
          title: 'DBMS Assignment 3',
          subject: 'Database Systems',
          dueAt: futureDue,
          hasDueTime: true,
          effortHours: 6.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.deadline).toHaveProperty('id');
      expect(res.body.deadline.title).toBe('DBMS Assignment 3');
      expect(res.body.deadline.subject).toBe('Database Systems');
      expect(res.body.deadline.hasDueTime).toBe(true);
      expect(Number(res.body.deadline.effortHours)).toBe(6.0);
      expect(res.body.deadline.status).toBe('active');

      userADeadlineId = res.body.deadline.id;
    });

    it('creates a date-only deadline', async () => {
      const dateOnlyDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({
          title: 'OS Viva Presentation',
          dueAt: dateOnlyDue,
          hasDueTime: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.deadline.hasDueTime).toBe(false);
      expect(res.body.deadline.effortHours).toBeNull();
    });

    it('creates an undated task', async () => {
      const res = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({
          title: 'Buy project materials',
        });

      expect(res.status).toBe(201);
      expect(res.body.deadline.dueAt).toBeNull();
    });
  });

  describe('GET /deadlines (Listing & Filtering)', () => {
    it('lists active deadlines for authenticated user', async () => {
      const res = await request(app)
        .get('/deadlines?status=active')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.deadlines.length).toBeGreaterThanOrEqual(3);
      expect(res.body.deadlines.some((d) => d.id === userADeadlineId)).toBe(true);
    });

    it('filters deadlines by subject', async () => {
      const res = await request(app)
        .get('/deadlines?subject=Database')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.deadlines).toHaveLength(1);
      expect(res.body.deadlines[0].title).toBe('DBMS Assignment 3');
    });

    it('identifies overdue deadlines dynamically', async () => {
      // Create an overdue deadline (2 hours in past)
      const pastDue = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app)
        .post('/deadlines')
        .set('Cookie', [userACookie])
        .send({
          title: 'Overdue Physics Worksheet',
          dueAt: pastDue,
        });

      expect(createRes.status).toBe(201);

      const res = await request(app)
        .get('/deadlines?status=overdue')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.deadlines.some((d) => d.title === 'Overdue Physics Worksheet')).toBe(true);
      const overdueItem = res.body.deadlines.find((d) => d.title === 'Overdue Physics Worksheet');
      expect(overdueItem.isOverdue).toBe(true);
    });
  });

  describe('GET /deadlines/:id', () => {
    it('returns deadline by id', async () => {
      const res = await request(app)
        .get(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.deadline.id).toBe(userADeadlineId);
      expect(res.body.deadline.title).toBe('DBMS Assignment 3');
    });

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app)
        .get('/deadlines/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Deadline not found');
    });
  });

  describe('PATCH /deadlines/:id (Updates & Completion)', () => {
    it('updates title and effort', async () => {
      const res = await request(app)
        .patch(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie])
        .send({
          title: 'DBMS Assignment 3 (Updated)',
          effortHours: 8.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.deadline.title).toBe('DBMS Assignment 3 (Updated)');
      expect(Number(res.body.deadline.effortHours)).toBe(8.5);
    });

    it('marks deadline as completed and records completedAt', async () => {
      const res = await request(app)
        .patch(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie])
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.deadline.status).toBe('completed');
      expect(res.body.deadline.completedAt).not.toBeNull();
    });

    it('reopens a completed deadline back to active', async () => {
      const res = await request(app)
        .patch(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie])
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.deadline.status).toBe('active');
      expect(res.body.deadline.completedAt).toBeNull();
    });
  });

  describe('Multi-User Ownership Enforcement (Strict Isolation)', () => {
    it('prevents User B from reading User A deadline (returns 404)', async () => {
      const res = await request(app)
        .get(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userBCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Deadline not found');
    });

    it('prevents User B from modifying User A deadline (returns 404)', async () => {
      const res = await request(app)
        .patch(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userBCookie])
        .send({ title: 'Hacked by User B' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Deadline not found');

      // Verify User A title remains intact
      const checkRes = await request(app)
        .get(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie]);
      expect(checkRes.body.deadline.title).not.toBe('Hacked by User B');
    });

    it('prevents User B from deleting User A deadline (returns 404)', async () => {
      const res = await request(app)
        .delete(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userBCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Deadline not found');
    });

    it('User B list does not expose User A deadlines', async () => {
      const res = await request(app)
        .get('/deadlines?status=all')
        .set('Cookie', [userBCookie]);

      expect(res.status).toBe(200);
      expect(res.body.deadlines.some((d) => d.id === userADeadlineId)).toBe(false);
    });
  });

  describe('DELETE /deadlines/:id', () => {
    it('deletes deadline successfully for owner', async () => {
      const res = await request(app)
        .delete(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify subsequent GET returns 404
      const checkRes = await request(app)
        .get(`/deadlines/${userADeadlineId}`)
        .set('Cookie', [userACookie]);

      expect(checkRes.status).toBe(404);
    });
  });
});
