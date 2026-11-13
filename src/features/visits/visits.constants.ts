import type { Database } from '@/lib/supabase/database.types';

export type VisitStatus = Database['public']['Enums']['visit_status'];

export type PayerType = 'umum' | 'bpjs';
