import
    {
        ErpModuleKey,
        ErpModuleManifest,
    } from './erp-module.types';

export const ERP_MODULES: Record<
    ErpModuleKey,
    ErpModuleManifest
> = {
    contacts: {
        key: 'contacts',
        name: 'Contacts',
        description: 'Manage customers and suppliers',
        icon: 'users',
        version: '1.0.0',
        dependencies: [],
        navigation: {
            label: 'Contacts',
            path: 'contacts',
        },
    },

    crm: {
        key: 'crm',
        name: 'CRM',
        description: 'Manage leads and opportunities',
        icon: 'target',
        version: '1.0.0',
        dependencies: ['contacts'],
        navigation: {
            label: 'CRM',
            path: 'crm',
        },
    },

    sales: {
        key: 'sales',
        name: 'Sales',
        description: 'Manage quotations and orders',
        icon: 'shopping-cart',
        version: '1.0.0',
        dependencies: ['contacts'],
        navigation: {
            label: 'Sales',
            path: 'sales',
        },
    },

    inventory: {
        key: 'inventory',
        name: 'Inventory',
        description: 'Manage products and stock',
        icon: 'package',
        version: '1.0.0',
        dependencies: [],
        navigation: {
            label: 'Inventory',
            path: 'inventory',
        },
    },
};

export const ERP_MODULE_LIST = Object.values(ERP_MODULES);

export function isErpModuleKey(
    value: string,
): value is ErpModuleKey
{
    return Object.prototype.hasOwnProperty.call(
        ERP_MODULES,
        value,
    );
}