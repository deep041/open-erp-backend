import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';
import { OrganizationModulesController } from './organization-modules.controller';
import { OrganizationModulesService } from './organization-modules.service';

@Module({
    imports: [PrismaModule],
    controllers: [OrganizationModulesController],
    providers: [OrganizationModulesService],
    exports: [OrganizationModulesService],
})
export class OrganizationModulesModule { }