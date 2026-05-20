const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
}, 30000);

afterEach(async () => {
    await User.deleteMany({});
}, 10000);

describe('POST /api/register', () => {
    it('should register a new user and return token', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'password123' });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    it('should return 400 if username or password missing', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'testuser' });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Username and password are required');
    });

    it('should return 409 if username already exists', async () => {
        await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'password123' });
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'password123' });
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('Username already exists');
    });
});

describe('POST /api/login', () => {
    beforeEach(async () => {
        await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'password123' });
    });

    it('should login and return token', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password123' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should return 401 with wrong password', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'wrongpassword' });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid login credentials');
    });

    it('should return 401 with wrong username', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'nobody', password: 'password123' });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid login credentials');
    });
});

// Thêm vào cuối file auth.test.js, sau describe('POST /api/login')

describe('Unit - User Model', () => {
    it('should hash password before saving', async () => {
        const user = new User({ username: 'hashtest', password: 'plaintext' });
        await user.save();
        expect(user.password).not.toBe('plaintext');
    });

    it('should return true for correct password', async () => {
        const user = new User({ username: 'comparetest', password: 'mypassword' });
        await user.save();
        const result = await user.comparePassword('mypassword');
        expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
        const user = new User({ username: 'comparetest2', password: 'mypassword' });
        await user.save();
        const result = await user.comparePassword('wrongpassword');
        expect(result).toBe(false);
    });
});

describe('GET /health', () => {
    it('should return status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

describe('GET /metrics', () => {
    it('should return prometheus metrics', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toBe(200);
    });
});