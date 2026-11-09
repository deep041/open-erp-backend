
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { Roles } from './roles.decorator';

export function OrganizationAccess(
    ...roles: OrganizationRole[]
)
{
    return applyDecorators(
        Roles(...roles),
        UseGuards(JwtAuthGuard, TenantGuard, RolesGuard),
        ApiBearerAuth(),
    );
}
