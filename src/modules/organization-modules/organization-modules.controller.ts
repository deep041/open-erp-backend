
import
    {
        Controller,
        Delete,
        Get,
        Param,
        Post,
        Req,
        UseGuards,
    } from '@nestjs/common';
import type { Request } from 'express';

import { OrganizationModulesService } from './organization-modules.service';

// Use your existing Phase 1.3 JWT guard here.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
    user: { id: string; };
};

@Controller('organizations/:organizationId/modules')
@UseGuards(JwtAuthGuard)
export class OrganizationModulesController
{
    constructor(
        private readonly service: OrganizationModulesService,
    ) { }

    @Get()
    list(
        @Param('organizationId') organizationId: string,
        @Req() req: AuthenticatedRequest,
    )
    {
        return this.service.list(organizationId, req.user.id);
    }

    @Post(':moduleKey/install')
    install(
        @Param('organizationId') organizationId: string,
        @Param('moduleKey') moduleKey: string,
        @Req() req: AuthenticatedRequest,
    )
    {
        return this.service.install(
            organizationId,
            req.user.id,
            moduleKey,
        );
    }

    @Delete(':moduleKey')
    uninstall(
        @Param('organizationId') organizationId: string,
        @Param('moduleKey') moduleKey: string,
        @Req() req: AuthenticatedRequest,
    )
    {
        return this.service.uninstall(
            organizationId,
            req.user.id,
            moduleKey,
        );
    }
}
