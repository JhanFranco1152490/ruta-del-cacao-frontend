import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type Buyer = Schemas['Buyer'];
export type { BuyerType } from '@/lib/buyer-types';
export type BuyerCreateRequest = Schemas['BuyerCreateRequest'];
export type BuyerUpdateRequest = Schemas['PatchedBuyerUpdateRequest'];
export type BuyerList = Schemas['BuyerList'];
// El 409: `existing` llega con `duplicate_document` y `current` con `stale_version`.
export type BuyerConflictError = Schemas['BuyerConflictError'];
export type ExistingBuyer = Schemas['ExistingBuyer'];
