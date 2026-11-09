
import
    {
        CanActivate,
        ExecutionContext,
        Injectable,
        UnauthorizedException,
    } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

export interface AuthenticatedRequest extends Request
{
    user: {
        id: string;
    };
}

@Injectable()
export class JwtAuthGuard implements CanActivate
{
    constructor(
        private readonly jwt: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext)
    {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const authorization = request.headers.authorization;

        if (!authorization?.startsWith('Bearer '))
        {
            throw new UnauthorizedException();
        }

        const token = authorization.slice(7);

        try
        {
            const payload = await this.jwt.verifyAsync<{
                sub: string;
            }>(token);

            if (!payload.sub)
            {
                throw new UnauthorizedException();
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, isActive: true },
            });

            if (!user?.isActive)
            {
                throw new UnauthorizedException();
            }

            request.user = { id: user.id };
            return true;
        } catch
        {
            throw new UnauthorizedException(
                'Invalid or expired access token',
            );
        }
    }
}
