
import
    {
        BadRequestException,
        ForbiddenException,
        Injectable,
        NotFoundException,
    } from '@nestjs/common';

import
    {
        ERP_MODULES,
        ERP_MODULE_LIST,
        isErpModuleKey,
    } from '../../common/erp-modules/erp-module.registry';
import
    {
        ErpModuleKey,
    } from '../../common/erp-modules/erp-module.types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationModulesService
{
    constructor(private readonly prisma: PrismaService) { }

    private async assertMembership(
        organizationId: string,
        userId: string,
        manage = false,
    )
    {
        const membership = await this.prisma.membership.findFirst({
            where: { organizationId, userId },
        });

        if (!membership)
        {
            throw new NotFoundException('Organization not found');
        }

        if (
            manage &&
            !['OWNER', 'ADMIN'].includes(membership.role)
        )
        {
            throw new ForbiddenException(
                'Insufficient organization permissions',
            );
        }

        return membership;
    }

    private getManifest(key: string)
    {
        if (!isErpModuleKey(key))
        {
            throw new NotFoundException('Unknown ERP module');
        }

        return ERP_MODULES[key];
    }

    async list(organizationId: string, userId: string)
    {
        await this.assertMembership(organizationId, userId);

        const installed = await this.prisma.installedModule.findMany({
            where: { organizationId },
            select: { moduleKey: true },
        });

        const keys = new Set(installed.map(m => m.moduleKey));

        return ERP_MODULE_LIST.map(module => ({
            ...module,
            installed: keys.has(module.key),
        }));
    }

    async install(
        organizationId: string,
        userId: string,
        key: string,
    )
    {
        await this.assertMembership(organizationId, userId, true);

        const manifest = this.getManifest(key);

        return this.prisma.$transaction(async tx =>
        {
            // Lock the organization row so concurrent module changes
            // for the same tenant cannot interleave.
            const rows = await tx.$queryRaw<Array<{ id: string; }>>`
        SELECT id FROM "organizations"
        WHERE id = ${ organizationId }
        FOR UPDATE
      `;

            if (!rows.length)
            {
                throw new NotFoundException('Organization not found');
            }

            const installed = await tx.installedModule.findMany({
                where: { organizationId },
                select: { moduleKey: true },
            });

            const keys = new Set(installed.map(m => m.moduleKey));

            const missing = manifest.dependencies.filter(
                dependency => !keys.has(dependency),
            );

            if (missing.length)
            {
                throw new BadRequestException(
                    `Install required modules first: ${ missing.join(', ') }`,
                );
            }

            await tx.installedModule.upsert({
                where: {
                    organizationId_moduleKey: {
                        organizationId,
                        moduleKey: manifest.key,
                    },
                },
                update: {},
                create: {
                    organizationId,
                    moduleKey: manifest.key,
                },
            });

            return {
                moduleKey: manifest.key,
                installed: true,
            };
        });
    }

    async uninstall(
        organizationId: string,
        userId: string,
        key: string,
    )
    {
        await this.assertMembership(organizationId, userId, true);

        const manifest = this.getManifest(key);

        return this.prisma.$transaction(async tx =>
        {
            await tx.$queryRaw`
        SELECT id FROM "organizations"
        WHERE id = ${ organizationId }
        FOR UPDATE
      `;

            const installed = await tx.installedModule.findMany({
                where: { organizationId },
                select: { moduleKey: true },
            });

            const keys = new Set(installed.map(m => m.moduleKey));

            const dependents = ERP_MODULE_LIST.filter(
                module =>
                    keys.has(module.key) &&
                    module.dependencies.includes(manifest.key),
            );

            if (dependents.length)
            {
                throw new BadRequestException(
                    `Cannot uninstall. Required by: ${ dependents.map(m => m.name).join(', ')
                    }`,
                );
            }

            await tx.installedModule.deleteMany({
                where: {
                    organizationId,
                    moduleKey: manifest.key,
                },
            });

            return {
                moduleKey: manifest.key,
                installed: false,
            };
        });
    }

    async assertInstalled(
        organizationId: string,
        userId: string,
        moduleKey: ErpModuleKey,
    ): Promise<void>
    {
        await this.assertMembership(organizationId, userId);

        const installed = await this.prisma.installedModule.findUnique({
            where: {
                organizationId_moduleKey: {
                    organizationId,
                    moduleKey,
                },
            },
        });

        if (!installed)
        {
            throw new ForbiddenException(
                `${ moduleKey } module is not installed`,
            );
        }
    }
}
