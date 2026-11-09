
import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { RolesGuard } from '../guards/roles.guard';
import { TenantGuard } from '../guards/tenant.guard';

@Module({
    imports: [AuthModule],
    providers: [TenantGuard, RolesGuard],
    exports: [AuthModule, TenantGuard, RolesGuard],
})
export class SecurityModule { }
