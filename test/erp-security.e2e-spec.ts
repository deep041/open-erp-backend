
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ERP Security (e2e)', () =>
{
    let app: INestApplication;

    const email = `test-${ Date.now() }@example.com`;
    const password = 'SecurePassword123!';

    beforeAll(async () =>
    {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();
    });

    afterAll(async () =>
    {
        await app.close();
    });

    it('registers and authenticates a user', async () =>
    {
        const registered = await request(app.getHttpServer())
            .post('/api/v1/auth/register')
            .send({
                email,
                password,
                firstName: 'Test',
                lastName: 'User',
            })
            .expect(201);

        expect(registered.body.accessToken).toBeDefined();
        expect(registered.body.user.passwordHash).toBeUndefined();

        const login = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email, password })
            .expect(200);

        expect(login.body.accessToken).toBeDefined();
        expect(login.body.refreshToken).toBeUndefined();
    });

    it('rejects an invalid password', async () =>
    {
        await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({
                email,
                password: 'incorrect-password',
            })
            .expect(401);
    });

    it('rejects unauthenticated organization access', async () =>
    {
        await request(app.getHttpServer())
            .get('/api/v1/organizations')
            .expect(401);
    });
});
