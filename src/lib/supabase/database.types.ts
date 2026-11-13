export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          clinic_id: string
          created_at: string
          id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          clinic_id: string
          created_at?: string
          id?: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          clinic_id?: string
          created_at?: string
          id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          bpjs_enabled: boolean
          bpjs_ppk_code: string | null
          created_at: string
          email: string | null
          id: string
          idle_logout_minutes: number
          license_no: string | null
          logo_path: string | null
          name: string
          phone: string | null
          satusehat_org_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bpjs_enabled?: boolean
          bpjs_ppk_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          idle_logout_minutes?: number
          license_no?: string | null
          logo_path?: string | null
          name: string
          phone?: string | null
          satusehat_org_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bpjs_enabled?: boolean
          bpjs_ppk_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          idle_logout_minutes?: number
          license_no?: string | null
          logo_path?: string | null
          name?: string
          phone?: string | null
          satusehat_org_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consumable_usages: {
        Row: {
          batch_id: string
          clinic_id: string
          created_at: string
          id: string
          medicine_id: string
          procedure_consumable_id: string
          qty: number
          unit_cost: number
          unit_price: number
          updated_at: string
          visit_id: string
        }
        Insert: {
          batch_id: string
          clinic_id: string
          created_at?: string
          id?: string
          medicine_id: string
          procedure_consumable_id: string
          qty: number
          unit_cost: number
          unit_price: number
          updated_at?: string
          visit_id: string
        }
        Update: {
          batch_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          medicine_id?: string
          procedure_consumable_id?: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumable_usages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usages_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "consumable_usages_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usages_procedure_consumable_id_fkey"
            columns: ["procedure_consumable_id"]
            isOneToOne: false
            referencedRelation: "procedure_consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usages_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      counters: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          scope: string
          updated_at: string
          value: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          scope: string
          updated_at?: string
          value?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "counters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      dispensations: {
        Row: {
          clinic_id: string
          created_at: string
          dispensed_at: string
          dispensed_by: string
          id: string
          prescription_id: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          dispensed_at?: string
          dispensed_by: string
          id?: string
          prescription_id: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          dispensed_at?: string
          dispensed_by?: string
          id?: string
          prescription_id?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispensations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      dispense_items: {
        Row: {
          batch_id: string | null
          clinic_id: string
          created_at: string
          dispensation_id: string
          id: string
          medicine_id: string
          not_given_reason: string | null
          prescription_item_id: string
          qty: number
          status: string
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          clinic_id: string
          created_at?: string
          dispensation_id: string
          id?: string
          medicine_id: string
          not_given_reason?: string | null
          prescription_item_id: string
          qty: number
          status: string
          unit_cost: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          clinic_id?: string
          created_at?: string
          dispensation_id?: string
          id?: string
          medicine_id?: string
          not_given_reason?: string | null
          prescription_item_id?: string
          qty?: number
          status?: string
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispense_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_items_dispensation_id_fkey"
            columns: ["dispensation_id"]
            isOneToOne: false
            referencedRelation: "dispensations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "dispense_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_items_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          clinic_id: string
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          poli_id: string
          quota: number
          start_time: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          poli_id: string
          quota: number
          start_time: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          poli_id?: string
          quota?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_schedules_poli_id_fkey"
            columns: ["poli_id"]
            isOneToOne: false
            referencedRelation: "polis"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          clinic_id: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          id: string
          status: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          category: string
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date: string
          id?: string
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          category?: string
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      icd10_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_jobs: {
        Row: {
          attempts: number
          clinic_id: string
          created_at: string
          external_id: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          next_run_at: string
          ref_id: string
          resource: string
          status: string
          target: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          clinic_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_run_at?: string
          ref_id: string
          resource: string
          status?: string
          target: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          clinic_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_run_at?: string
          ref_id?: string
          resource?: string
          status?: string
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          description: string
          discount: number
          discount_reason: string | null
          discounted_by: string | null
          doctor_fee: number
          fee_recipient_id: string | null
          id: string
          invoice_id: string
          item_type: string
          medicine_id: string | null
          qty: number
          ref_id: string | null
          service_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          description: string
          discount?: number
          discount_reason?: string | null
          discounted_by?: string | null
          doctor_fee?: number
          fee_recipient_id?: string | null
          id?: string
          invoice_id: string
          item_type: string
          medicine_id?: string | null
          qty: number
          ref_id?: string | null
          service_id?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          description?: string
          discount?: number
          discount_reason?: string | null
          discounted_by?: string | null
          doctor_fee?: number
          fee_recipient_id?: string | null
          id?: string
          invoice_id?: string
          item_type?: string
          medicine_id?: string | null
          qty?: number
          ref_id?: string | null
          service_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_discounted_by_fkey"
            columns: ["discounted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_fee_recipient_id_fkey"
            columns: ["fee_recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "invoice_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          discount: number
          discount_reason: string | null
          discounted_by: string | null
          id: string
          invoice_no: string
          item_discount: number
          paid_at: string | null
          paid_by: string | null
          payer_type: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          visit_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          discount?: number
          discount_reason?: string | null
          discounted_by?: string | null
          id?: string
          invoice_no: string
          item_discount?: number
          paid_at?: string | null
          paid_by?: string | null
          payer_type: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          visit_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          discount?: number
          discount_reason?: string | null
          discounted_by?: string | null
          id?: string
          invoice_no?: string
          item_discount?: number
          paid_at?: string | null
          paid_by?: string | null
          payer_type?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          visit_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_discounted_by_fkey"
            columns: ["discounted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_letters: {
        Row: {
          clinic_id: string
          clinical_summary: string | null
          created_at: string
          created_by: string
          destination: string | null
          id: string
          letter_no: string
          reason: string | null
          rest_days: number | null
          rest_from: string | null
          show_diagnosis: boolean
          specialty: string | null
          therapy: string | null
          type: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          clinic_id?: string
          clinical_summary?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          id?: string
          letter_no?: string
          reason?: string | null
          rest_days?: number | null
          rest_from?: string | null
          show_diagnosis?: boolean
          specialty?: string | null
          therapy?: string | null
          type: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          clinic_id?: string
          clinical_summary?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          id?: string
          letter_no?: string
          reason?: string | null
          rest_days?: number | null
          rest_from?: string | null
          show_diagnosis?: boolean
          specialty?: string | null
          therapy?: string | null
          type?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_letters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_letters_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          kfa_code: string | null
          min_stock: number
          name: string
          price: number
          unit: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kfa_code?: string | null
          min_stock?: number
          name: string
          price: number
          unit: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kfa_code?: string | null
          min_stock?: number
          name?: string
          price?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string
          bpjs_number: string | null
          clinic_id: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          mrn: string
          nik: string | null
          phone: string | null
          satusehat_id: string | null
          sex: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date: string
          bpjs_number?: string | null
          clinic_id: string
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          mrn?: string
          nik?: string | null
          phone?: string | null
          satusehat_id?: string | null
          sex: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string
          bpjs_number?: string | null
          clinic_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          mrn?: string
          nik?: string | null
          phone?: string | null
          satusehat_id?: string | null
          sex?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cash_received: number | null
          change: number | null
          clinic_id: string
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_by: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cash_received?: number | null
          change?: number | null
          clinic_id: string
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          paid_by: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_received?: number | null
          change?: number | null
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_by?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polis: {
        Row: {
          bpjs_poli_code: string | null
          clinic_id: string
          consultation_service_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          bpjs_poli_code?: string | null
          clinic_id: string
          consultation_service_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          bpjs_poli_code?: string | null
          clinic_id?: string
          consultation_service_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polis_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polis_consultation_service_id_fkey"
            columns: ["consultation_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_compounds: {
        Row: {
          clinic_id: string
          created_at: string
          form: string
          id: string
          prescription_id: string
          quantity: number
          signa: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          form: string
          id?: string
          prescription_id: string
          quantity: number
          signa: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          form?: string
          id?: string
          prescription_id?: string
          quantity?: number
          signa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_compounds_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_compounds_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          clinic_id: string
          compound_id: string | null
          created_at: string
          id: string
          medicine_id: string
          prescription_id: string
          qty: number
          signa: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          compound_id?: string | null
          created_at?: string
          id?: string
          medicine_id: string
          prescription_id: string
          qty: number
          signa?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          compound_id?: string | null
          created_at?: string
          id?: string
          medicine_id?: string
          prescription_id?: string
          qty?: number
          signa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "prescription_compounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "prescription_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          prescribed_by: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          prescribed_by?: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          prescribed_by?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_consumables: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          medicine_id: string
          qty: number
          updated_at: string
          visit_procedure_id: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          medicine_id: string
          qty: number
          updated_at?: string
          visit_procedure_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          medicine_id?: string
          qty?: number
          updated_at?: string
          visit_procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_consumables_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_consumables_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "procedure_consumables_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_consumables_visit_procedure_id_fkey"
            columns: ["visit_procedure_id"]
            isOneToOne: false
            referencedRelation: "visit_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          nik: string | null
          role: Database["public"]["Enums"]["user_role"]
          satusehat_practitioner_id: string | null
          sip_number: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          nik?: string | null
          role: Database["public"]["Enums"]["user_role"]
          satusehat_practitioner_id?: string | null
          sip_number?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          nik?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          satusehat_practitioner_id?: string | null
          sip_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          batch_id: string
          batch_no: string
          clinic_id: string
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          purchase_id: string
          qty: number
          subtotal: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          batch_id: string
          batch_no: string
          clinic_id: string
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          purchase_id: string
          qty: number
          subtotal: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          batch_id?: string
          batch_no?: string
          clinic_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          purchase_id?: string
          qty?: number
          subtotal?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          invoice_no: string | null
          note: string | null
          purchase_date: string
          supplier_id: string
          total: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          invoice_no?: string | null
          note?: string | null
          purchase_date: string
          supplier_id: string
          total: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_no?: string | null
          note?: string | null
          purchase_date?: string
          supplier_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_items: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          package_id: string
          qty: number
          service_id: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          id?: string
          package_id: string
          qty?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          package_id?: string
          qty?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_fee_type: string
          doctor_fee_value: number
          id: string
          is_active: boolean
          name: string
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          doctor_fee_type?: string
          doctor_fee_value?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          type: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_fee_type?: string
          doctor_fee_value?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_notes: {
        Row: {
          amends_id: string | null
          assessment: string | null
          author_id: string
          clinic_id: string
          created_at: string
          id: string
          objective: string | null
          plan: string | null
          signed_at: string | null
          subjective: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          amends_id?: string | null
          assessment?: string | null
          author_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          amends_id?: string | null
          assessment?: string | null
          author_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_notes_amends_id_fkey"
            columns: ["amends_id"]
            isOneToOne: false
            referencedRelation: "soap_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_no: string
          clinic_id: string
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          qty_on_hand: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          batch_no: string
          clinic_id: string
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          qty_on_hand: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          batch_no?: string
          clinic_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          qty_on_hand?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "stock_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          medicine_id: string
          qty: number
          ref_id: string
          ref_type: string
          type: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id: string
          qty: number
          ref_id: string
          ref_type: string
          type: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id?: string
          qty?: number
          ref_id?: string
          ref_type?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname_items: {
        Row: {
          batch_id: string
          clinic_id: string
          counted_qty: number
          created_at: string
          difference: number
          id: string
          medicine_id: string
          opname_id: string
          reason: string | null
          system_qty: number
          updated_at: string
        }
        Insert: {
          batch_id: string
          clinic_id: string
          counted_qty: number
          created_at?: string
          difference: number
          id?: string
          medicine_id: string
          opname_id: string
          reason?: string | null
          system_qty: number
          updated_at?: string
        }
        Update: {
          batch_id?: string
          clinic_id?: string
          counted_qty?: number
          created_at?: string
          difference?: number
          id?: string
          medicine_id?: string
          opname_id?: string
          reason?: string | null
          system_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "stock_opname_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_opname_id_fkey"
            columns: ["opname_id"]
            isOneToOne: false
            referencedRelation: "stock_opnames"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opnames: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          note: string | null
          opname_date: string
          posted_by: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          note?: string | null
          opname_date: string
          posted_by: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          note?: string | null
          opname_date?: string
          posted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_opnames_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opnames_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_diagnoses: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          icd10_code: string
          id: string
          is_primary: boolean
          updated_at: string
          visit_id: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          icd10_code: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          icd10_code?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_diagnoses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_diagnoses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_diagnoses_icd10_code_fkey"
            columns: ["icd10_code"]
            isOneToOne: false
            referencedRelation: "icd10_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "visit_diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_procedures: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          performed_by: string
          price: number
          qty: number
          service_id: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          performed_by: string
          price?: number
          qty?: number
          service_id: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          performed_by?: string
          price?: number
          qty?: number
          service_id?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_procedures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_procedures_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_procedures_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_procedures_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          called_at: string | null
          cancel_reason: string | null
          clinic_id: string
          created_at: string
          doctor_id: string
          id: string
          no_medicine_reason: string | null
          patient_id: string
          payer_type: string
          poli_id: string
          queue_no: number
          registered_by: string | null
          schedule_id: string
          skipped_at: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
          visit_date: string
          vitals_recorded_at: string | null
        }
        Insert: {
          called_at?: string | null
          cancel_reason?: string | null
          clinic_id: string
          created_at?: string
          doctor_id: string
          id?: string
          no_medicine_reason?: string | null
          patient_id: string
          payer_type: string
          poli_id: string
          queue_no: number
          registered_by?: string | null
          schedule_id: string
          skipped_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_date: string
          vitals_recorded_at?: string | null
        }
        Update: {
          called_at?: string | null
          cancel_reason?: string | null
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          no_medicine_reason?: string | null
          patient_id?: string
          payer_type?: string
          poli_id?: string
          queue_no?: number
          registered_by?: string | null
          schedule_id?: string
          skipped_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visit_date?: string
          vitals_recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_poli_id_fkey"
            columns: ["poli_id"]
            isOneToOne: false
            referencedRelation: "polis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "doctor_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          clinic_id: string
          created_at: string
          diastolic: number | null
          height: number | null
          id: string
          pulse: number | null
          recorded_by: string
          respiratory_rate: number | null
          spo2: number | null
          systolic: number | null
          temperature: number | null
          updated_at: string
          visit_id: string
          weight: number | null
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          diastolic?: number | null
          height?: number | null
          id?: string
          pulse?: number | null
          recorded_by?: string
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          updated_at?: string
          visit_id: string
          weight?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          diastolic?: number | null
          height?: number | null
          id?: string
          pulse?: number | null
          recorded_by?: string
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          updated_at?: string
          visit_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      medicine_stock: {
        Row: {
          clinic_id: string | null
          earliest_expiry: string | null
          is_active: boolean | null
          is_low: boolean | null
          medicine_id: string | null
          min_stock: number | null
          name: string | null
          qty_on_hand: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_card: {
        Row: {
          balance: number | null
          batch_no: string | null
          clinic_id: string | null
          created_at: string | null
          created_by_name: string | null
          expiry_date: string | null
          id: string | null
          medicine_id: string | null
          qty: number | null
          ref_id: string | null
          ref_type: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_invoice_service: {
        Args: { p_invoice_id: string; p_qty: number; p_service_id: string }
        Returns: undefined
      }
      create_invoice: { Args: { p_visit_id: string }; Returns: string }
      create_visit: {
        Args: {
          p_patient_id: string
          p_payer_type: string
          p_schedule_id: string
        }
        Returns: {
          called_at: string | null
          cancel_reason: string | null
          clinic_id: string
          created_at: string
          doctor_id: string
          id: string
          no_medicine_reason: string | null
          patient_id: string
          payer_type: string
          poli_id: string
          queue_no: number
          registered_by: string | null
          schedule_id: string
          skipped_at: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
          visit_date: string
          vitals_recorded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dispense_prescription: {
        Args: { p_not_given: Json; p_visit_id: string }
        Returns: string
      }
      patient_demographics: {
        Args: { p_month_start: string; p_today: string; p_week_ago: string }
        Returns: Json
      }
      pay_invoice: {
        Args: {
          p_cash_received: number
          p_invoice_id: string
          p_method: string
          p_reference: string
        }
        Returns: undefined
      }
      post_stock_opname: {
        Args: { p_items: Json; p_note: string }
        Returns: string
      }
      receive_purchase: {
        Args: {
          p_invoice_no: string
          p_items: Json
          p_note: string
          p_purchase_date: string
          p_supplier_id: string
        }
        Returns: string
      }
      remove_invoice_item: { Args: { p_item_id: string }; Returns: undefined }
      report_doctor_fees: {
        Args: { p_from: string; p_to: string }
        Returns: {
          billed: number
          fee: number
          lines: number
          recipient_id: string
          recipient_name: string
          recipient_role: string
        }[]
      }
      report_profit_loss: {
        Args: { p_from: string; p_to: string }
        Returns: {
          expenses: number
          medicine_cost: number
          profit: number
          revenue: number
        }[]
      }
      report_revenue_by_method: {
        Args: { p_from: string; p_to: string }
        Returns: {
          amount: number
          method: string
          payments: number
        }[]
      }
      report_revenue_by_poli: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bpjs_visits: number
          invoices: number
          poli_name: string
          revenue: number
        }[]
      }
      report_revenue_daily: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bpjs_billed: number
          bpjs_visits: number
          day: string
          discounts: number
          gross: number
          invoices: number
          revenue: number
        }[]
      }
      report_top_diseases: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cases: number
          icd10_code: string
          name: string
        }[]
      }
      report_visits: {
        Args: { p_from: string; p_to: string }
        Returns: {
          doctor_name: string
          new_patients: number
          poli_name: string
          returning_patients: number
          visits: number
        }[]
      }
      set_invoice_discount: {
        Args: { p_discount: number; p_invoice_id: string; p_reason: string }
        Returns: undefined
      }
      set_item_discount: {
        Args: { p_discount: number; p_item_id: string; p_reason: string }
        Returns: undefined
      }
      set_package_items: {
        Args: { p_items: Json; p_package_id: string }
        Returns: undefined
      }
      sign_visit: {
        Args: { p_visit_id: string }
        Returns: Database["public"]["Enums"]["visit_status"]
      }
      stock_summary: {
        Args: { p_cutoff: string }
        Returns: {
          expiring: number
          low: number
          medicines: number
          value: number
        }[]
      }
      void_invoice: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role:
        | "owner"
        | "admin"
        | "front_desk"
        | "nurse"
        | "doctor"
        | "pharmacist"
        | "cashier"
      visit_status:
        | "registered"
        | "waiting"
        | "in_exam"
        | "to_pharmacy"
        | "to_cashier"
        | "done"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: [
        "owner",
        "admin",
        "front_desk",
        "nurse",
        "doctor",
        "pharmacist",
        "cashier",
      ],
      visit_status: [
        "registered",
        "waiting",
        "in_exam",
        "to_pharmacy",
        "to_cashier",
        "done",
        "cancelled",
      ],
    },
  },
} as const
