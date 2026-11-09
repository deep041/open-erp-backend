
import
    {
        CanActivate,
        ExecutionContext,
        ForbiddenException,
        Injectable,
    } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantRequest } from './tenant.guard';

@Injectable()
export class RolesGuard implements CanActivate
{
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean
    {
        const required = this.reflector.getAllAndOverride<
            OrganizationRole[]
        >(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!required?.length)
        {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<TenantRequest>();

        if (!request.tenant)
        {
            throw new ForbiddenException(
                'Organization context required',
            );
        }

        if (!required.includes(request.tenant.role))
        {
            throw new ForbiddenException(
                'Insufficient permissions',
            );
        }

        return true;
    }
}
