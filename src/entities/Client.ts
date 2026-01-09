import { ClientType, SalesChannel } from '../types';

export interface Client {
  id: number;
  code: string;
  client_type: ClientType;
  sales_channel: SalesChannel;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  code: string;
  client_type?: ClientType;
  sales_channel?: SalesChannel;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}
