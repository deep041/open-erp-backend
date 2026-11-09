
import
    {
        CanActivate,
        ExecutionContext,
        Injectable,
        NotFoundException,
    } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedRequest } from './jwt-auth.guard';

export interface TenantRequest extends AuthenticatedRequest
{
    tenant: {
        organizationId: string;
        role: 'OWNER' | 'ADMIN' | 'MEMBER';
    };
}

@Injectable()
export class TenantGuard implements CanActivate
{
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext)
    {
        const request = context
            .switchToHttp()
            .getRequest<TenantRequest>();

        const organizationId = Array.isArray(request.params.organizationId) ? request.params.organizationId[0] : request.params.organizationId;
        const userId = request.user?.id;

        if (!userId || !organizationId)
        {
            throw new NotFoundException(
                'Organization not found',
            );
        }

        const membership = await this.prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
            select: {
                role: true,
            },
        });

        if (!membership)
        {
            throw new NotFoundException(
                'Organization not found',
            );
        }

        request.tenant = {
            organizationId,
            role: membership.role,
        };

        return true;
    }
}
