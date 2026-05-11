const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Film = require('../models/Film');

let mongoServer;
let adminToken;
let userToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const admin = new User({ username: 'admin', password: 'admin123', role: 'admin' });
    await admin.save();
    const adminRes = await request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
        .post('/api/register')
        .send({ username: 'normaluser', password: 'user123' });
    userToken = userRes.body.token;
}, 30000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
}, 30000);

afterEach(async () => {
    await Film.deleteMany({});
}, 10000);

describe('GET /api/films', () => {
    it('should return empty array when no films', async () => {
        const res = await request(app).get('/api/films');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should return list of films', async () => {
        await Film.create({ title: 'Test Film', releaseYear: 2024 });
        const res = await request(app).get('/api/films');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
    });
});

describe('POST /api/films', () => {
    it('should create film as admin', async () => {
        const res = await request(app)
            .post('/api/films')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'New Film', releaseYear: 2024, description: 'A film' });
        expect(res.statusCode).toBe(201);
        expect(res.body.title).toBe('New Film');
    });

    it('should return 403 if not admin', async () => {
        const res = await request(app)
            .post('/api/films')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'New Film', releaseYear: 2024 });
        expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token', async () => {
        const res = await request(app)
            .post('/api/films')
            .send({ title: 'New Film', releaseYear: 2024 });
        expect(res.statusCode).toBe(401);
    });

    it('should return 400 if title missing', async () => {
        const res = await request(app)
            .post('/api/films')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ releaseYear: 2024 });
        expect(res.statusCode).toBe(400);
    });
});

describe('GET /api/films/:id', () => {
    it('should return film by id', async () => {
        const film = await Film.create({ title: 'Test Film', releaseYear: 2024 });
        const res = await request(app).get(`/api/films/${film._id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Test Film');
    });

    it('should return 400 for invalid id', async () => {
        const res = await request(app).get('/api/films/invalidid');
        expect(res.statusCode).toBe(400);
    });

    it('should return 404 if film not found', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/films/${fakeId}`);
        expect(res.statusCode).toBe(404);
    });
});

describe('PUT /api/films/:id', () => {
    it('should update film as admin', async () => {
        const film = await Film.create({ title: 'Old Title', releaseYear: 2020 });
        const res = await request(app)
            .put(`/api/films/${film._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'New Title' });
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('New Title');
    });

    it('should return 403 if not admin', async () => {
        const film = await Film.create({ title: 'Old Title', releaseYear: 2020 });
        const res = await request(app)
            .put(`/api/films/${film._id}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'New Title' });
        expect(res.statusCode).toBe(403);
    });
});

describe('DELETE /api/films/:id', () => {
    it('should delete film as admin', async () => {
        const film = await Film.create({ title: 'To Delete', releaseYear: 2020 });
        const res = await request(app)
            .delete(`/api/films/${film._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(204);
    });

    it('should return 403 if not admin', async () => {
        const film = await Film.create({ title: 'To Delete', releaseYear: 2020 });
        const res = await request(app)
            .delete(`/api/films/${film._id}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(403);
    });

    it('should return 404 if film not found', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .delete(`/api/films/${fakeId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(404);
    });
});