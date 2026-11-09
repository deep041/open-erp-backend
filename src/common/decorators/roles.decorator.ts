
import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../../generated/prisma/enums';

export const ROLES_KEY = 'organization_roles';

export const Roles = (...roles: OrganizationRole[]) =>
    SetMetadata(ROLES_KEY, roles);
