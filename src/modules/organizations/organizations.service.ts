
import
    {
        ConflictException,
        ForbiddenException,
        Injectable,
        NotFoundException,
    } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService
{
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreateOrganizationDto)
    {
        try
        {
            return await this.prisma.organization.create({
                data: {
                    name: dto.name.trim(),
                    slug: dto.slug,
                    memberships: {
                        create: {
                            userId,
                            role: 'OWNER',
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    createdAt: true,
                },
            });
        } catch (error)
        {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002'
            )
            {
                throw new ConflictException(
                    'Organization slug already exists',
                );
            }

            throw error;
        }
    }

    async findMine(userId: string)
    {
        return this.prisma.membership.findMany({
            where: { userId },
            select: {
                role: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findOne(userId: string, organizationId: string)
    {
        const membership = await this.prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
            select: {
                role: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!membership)
        {
            throw new NotFoundException('Organization not found');
        }

        return membership;
    }

    async findMembers(userId: string, organizationId: string)
    {
        const membership = await this.prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
            select: { role: true },
        });

        if (!membership)
        {
            throw new NotFoundException('Organization not found');
        }

        if (!['OWNER', 'ADMIN'].includes(membership.role))
        {
            throw new ForbiddenException(
                'Insufficient permissions',
            );
        }

        return this.prisma.membership.findMany({
            where: { organizationId },
            select: {
                id: true,
                role: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
}
