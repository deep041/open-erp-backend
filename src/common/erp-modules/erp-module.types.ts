export type ErpModuleKey =
    | 'contacts'
    | 'crm'
    | 'sales'
    | 'inventory';

export interface ErpModuleManifest
{
    key: ErpModuleKey;
    name: string;
    description: string;
    icon: string;
    version: string;
    dependencies: readonly ErpModuleKey[];
    navigation: {
        label: string;
        path: string;
    };
}