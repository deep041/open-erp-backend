import
    {
        Injectable,
        UnauthorizedException,
    } from '@nestjs/common';
import
    {
        createHash,
        randomBytes,
        randomUUID,
    } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RefreshSessionService
{
    constructor(private readonly prisma: PrismaService) { }

    private readonly lifetimeMs =
        7 * 24 * 60 * 60 * 1000;

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
                familyId: randomUUID(),
                tokenHash: this.hash(token),
                expiresAt: new Date(
                    Date.now() + this.lifetimeMs,
                ),
            },
        });

        return token;
    }

    async rotate(token: string)
    {
        const tokenHash = this.hash(token);
        const now = new Date();

        const session =
            await this.prisma.refreshSession.findUnique({
                where: { tokenHash },
                include: {
                    user: {
                        select: {
                            id: true,
                            isActive: true,
                        },
                    },
                },
            });

        if (!session)
        {
            throw new UnauthorizedException(
                'Invalid refresh session',
            );
        }

        if (session.revokedAt)
        {
            // Replay of an already-consumed token:
            // invalidate the entire login session family.
            await this.prisma.refreshSession.updateMany({
                where: {
                    familyId: session.familyId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: now,
                },
            });

            throw new UnauthorizedException(
                'Refresh session revoked',
            );
        }

        if (
            session.expiresAt <= now ||
            !session.user.isActive
        )
        {
            throw new UnauthorizedException(
                'Invalid refresh session',
            );
        }

        const newToken = randomBytes(48).toString('hex');

        const rotated = await this.prisma.$transaction(
            async (tx) =>
            {
                const consumed =
                    await tx.refreshSession.updateMany({
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
                    return false;
                }

                await tx.refreshSession.create({
                    data: {
                        userId: session.userId,
                        familyId: session.familyId,
                        tokenHash: this.hash(newToken),
                        expiresAt: new Date(
                            Date.now() + this.lifetimeMs,
                        ),
                    },
                });

                return true;
            },
        );

        if (!rotated)
        {
            await this.prisma.refreshSession.updateMany({
                where: {
                    familyId: session.familyId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            });

            throw new UnauthorizedException(
                'Refresh token reuse detected',
            );
        }

        return {
            userId: session.userId,
            refreshToken: newToken,
        };
    }

    async revoke(token: string): Promise<void>
    {
        const session =
            await this.prisma.refreshSession.findUnique({
                where: {
                    tokenHash: this.hash(token),
                },
                select: {
                    familyId: true,
                },
            });

        if (!session) return;

        await this.prisma.refreshSession.updateMany({
            where: {
                familyId: session.familyId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    async revokeAll(userId: string): Promise<void>
    {
        await this.prisma.refreshSession.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }
}
