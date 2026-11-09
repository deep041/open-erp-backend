
import
    {
        Body,
        Controller,
        Get,
        Param,
        ParseUUIDPipe,
        Post,
        UseGuards,
    } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationAccess } from '../../common/decorators/organization-access.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiBearerAuth('access-token')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController
{
    constructor(
        private readonly organizations: OrganizationsService,
    ) { }

    @Post()
    create(
        @CurrentUser() userId: string,
        @Body() dto: CreateOrganizationDto,
    )
    {
        return this.organizations.create(userId, dto);
    }

    @Get()
    findMine(@CurrentUser() userId: string)
    {
        return this.organizations.findMine(userId);
    }

    @Get(':id')
    @OrganizationAccess('OWNER', 'ADMIN', 'MEMBER')
    findOne(
        @CurrentUser() userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    )
    {
        return this.organizations.findOne(userId, id);
    }

    @Get(':id/members')
    @OrganizationAccess('OWNER', 'ADMIN')
    findMembers(
        @CurrentUser() userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    )
    {
        return this.organizations.findMembers(userId, id);
    }
}
