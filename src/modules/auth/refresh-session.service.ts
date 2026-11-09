
import
    {
        Injectable,
        UnauthorizedException,
    } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RefreshSessionService
{
    constructor(private readonly prisma: PrismaService) { }

    private readonly lifetimeMs = 7 * 24 * 60 * 60 * 1000;

    private hash(token: string): string
    {
        return createHash('sha256')
            .update(token)
            .digest('hex');
    }

    async create(userId: string): Promise<string>
    {
        const token = randomBytes(48).toString('hex');

        await this.prisma.refreshSession.create({
            data: {
                userId,
                tokenHash: this.hash(token),
                expiresAt: new Date(Date.now() + this.lifetimeMs),
            },
        });

        return token;
    }

    async rotate(token: string)
    {
        const existingHash = this.hash(token);
        const newToken = randomBytes(48).toString('hex');
        const now = new Date();

        return this.prisma.$transaction(async (tx) =>
        {
            const session = await tx.refreshSession.findUnique({
                where: { tokenHash: existingHash },
                include: {
                    user: {
                        select: {
                            id: true,
                            isActive: true,
                        },
                    },
                },
            });

            if (
                !session ||
                session.revokedAt ||
                session.expiresAt <= now ||
                !session.user.isActive
            )
            {
                throw new UnauthorizedException(
                    'Invalid refresh session',
                );
            }

            // Conditional update prevents concurrent reuse.
            const consumed = await tx.refreshSession.updateMany({
                where: {
                    id: session.id,
                    revokedAt: null,
                    expiresAt: { gt: now },
                },
                data: {
                    revokedAt: now,
                },
            });

            if (consumed.count !== 1)
            {
                throw new UnauthorizedException(
                    'Refresh token already used',
                );
            }

            await tx.refreshSession.create({
                data: {
                    userId: session.userId,
                    tokenHash: this.hash(newToken),
                    expiresAt: new Date(
                        Date.now() + this.lifetimeMs,
                    ),
                },
            });

            return {
                userId: session.userId,
                refreshToken: newToken,
            };
        });
    }

    async revoke(token: string): Promise<void>
    {
        await this.prisma.refreshSession.updateMany({
            where: {
                tokenHash: this.hash(token),
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }
}
