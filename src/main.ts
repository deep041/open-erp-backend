import { ForbiddenException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap()
{
    const app = await NestFactory.create(AppModule);

    configureApp(app);

    app.enableCors({
        origin: ['http://localhost:4200'],
    });

    const allowedOrigins = new Set([
        'http://localhost:4200',
        'http://localhost:3000',
        ...(process.env.APP_ORIGIN
            ? [process.env.APP_ORIGIN]
            : []),
    ]);

    app.use(
        '/api/v1/auth',
        (req: Request, _res: Response, next: NextFunction) =>
        {
            if (
                req.method === 'POST' &&
                ['/refresh', '/logout'].includes(
                    req.path.replace(/\/$/, ''),
                )
            )
            {
                const origin = req.headers.origin;

                if (origin && !allowedOrigins.has(origin))
                {
                    return next(
                        new ForbiddenException('Untrusted origin'),
                    );
                }

                // Also reject browser-like cross-site requests
                // that omit Origin but report a cross-site context.
                if (
                    req.headers['sec-fetch-site'] === 'cross-site'
                )
                {
                    return next(
                        new ForbiddenException('Cross-site request blocked'),
                    );
                }
            }

            next();
        },
    );

    app.enableCors({
        origin: [...allowedOrigins],
        credentials: true,
    });

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Open ERP API')
        .setDescription('Open-source modular ERP platform')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT access token',
            },
            'access-token',
        )
        .build();

    const document = SwaggerModule.createDocument(
        app,
        swaggerConfig,
    );

    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
