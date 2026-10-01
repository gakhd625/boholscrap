'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from './auth';
import { normalizeIdNumber } from '@/lib/utils';
import type {
  Customer,
  CustomerMatch,
  IdDocument,
  Transaction,
  ActionResult,
  ConfirmedCustomerData,
  TransactionFormData,
  TransactionWithDetails,
  ExtractedIdData,
  ExtractionResult,
} from '@/lib/types';
import { extractIdInformation } from '@/lib/ocr';

// ============================================
// ID IMAGE UPLOAD
// ============================================

/**
 * Upload an ID image to private Supabase Storage.
 * Returns the storage path (NOT a public URL).
 */
export async function uploadIdImage(
  formData: FormData
): Promise<ActionResult<{ storagePath: string }>> {
  const { user } = await requireAuth();
  const file = formData.get('idImage') as File;

  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided.' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Unsupported file type. Use JPEG, PNG, or WebP.' };
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File is too large. Maximum size is 10MB.' };
  }

  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storagePath = `${user.id}/${timestamp}-${random}.${ext}`;

    const adminClient = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('id-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError.message);
      return { success: false, error: 'Failed to store the ID image. Please try again.' };
    }

    return { success: true, data: { storagePath } };
  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred while uploading.' };
  }
}

// ============================================
// OCR EXTRACTION
// ============================================

/**
 * Extract ID information from a stored image.
 * This result is a SUGGESTION only — must be confirmed by staff.
 */
export async function extractFromImage(
  storagePath: string
): Promise<ActionResult<ExtractionResult>> {
  await requireAuth();

  try {
    const adminClient = createAdminClient();

    // Download the image from private storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('id-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      return { success: false, error: 'Could not retrieve the uploaded image.' };
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine MIME type from file extension
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    const mimeType = mimeMap[ext || 'jpg'] || 'image/jpeg';

    // Extract information using the configured OCR provider
    const result = await extractIdInformation(buffer, mimeType);

    return { success: true, data: result };
  } catch (error) {
    console.error('[Extract] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to process the ID image. Please enter information manually.',
    };
  }
}

// ============================================
// CUSTOMER MATCHING
// ============================================

/**
 * Search for an existing customer by ID number.
 * Returns matches ranked by confidence.
 */
export async function findCustomerByIdNumber(
  idNumber: string
): Promise<ActionResult<CustomerMatch[]>> {
  await requireAuth();

  if (!idNumber || idNumber.trim().length < 3) {
    return { success: true, data: [] };
  }

  try {
    const supabase = await createClient();
    const normalized = normalizeIdNumber(idNumber);

    // Exact match on normalized ID number
    const { data: exactMatches, error } = await supabase
      .from('customers')
      .select('*')
      .eq('normalized_id_number', normalized)
      .limit(5);

    if (error) {
      console.error('[Match] Query error:', error.message);
      return { success: false, error: 'Failed to search for existing customers.' };
    }

    const matches: CustomerMatch[] = (exactMatches || []).map((customer) => ({
      customer: customer as Customer,
      matchType: 'exact_id' as const,
      confidence: 1.0,
    }));

    return { success: true, data: matches };
  } catch (error) {
    console.error('[Match] Unexpected error:', error);
    return { success: false, error: 'Failed to search for existing customers.' };
  }
}

// ============================================
// CUSTOMER CREATION
// ============================================

/**
 * Create a new customer with confirmed information.
 * Only call this after staff has reviewed and confirmed the data.
 */
export async function createCustomer(
  data: ConfirmedCustomerData
): Promise<ActionResult<Customer>> {
  const { user } = await requireAuth();

  if (!data.fullName || !data.idType || !data.idNumber) {
    return { success: false, error: 'Full name, ID type, and ID number are required.' };
  }

  try {
    const supabase = await createClient();
    const normalized = normalizeIdNumber(data.idNumber);

    // Check for duplicates
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('normalized_id_number', normalized)
      .single();

    if (existing) {
      return { success: false, error: 'A customer with this ID number already exists.' };
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        full_name: data.fullName.trim(),
        id_type: data.idType,
        id_number: data.idNumber.trim(),
        normalized_id_number: normalized,
        address: data.address?.trim() || null,
        date_of_birth: data.dateOfBirth || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A customer with this ID number already exists.' };
      }
      console.error('[Customer] Insert error:', error.message);
      return { success: false, error: 'Failed to create customer. Please try again.' };
    }

    // Audit log
    await logAudit(user.id, 'customer_created', customer.id, undefined, {
      customerName: data.fullName,
    });

    return { success: true, data: customer as Customer };
  } catch (error) {
    console.error('[Customer] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================
// ID DOCUMENT LINKING
// ============================================

/**
 * Create an ID document record linked to a customer.
 */
export async function createIdDocument(
  customerId: string,
  storagePath: string,
  idType: string,
  idNumber: string,
  ocrRawData?: Record<string, unknown>
): Promise<ActionResult<IdDocument>> {
  const { user } = await requireAuth();

  try {
    const supabase = await createClient();

    const { data: doc, error } = await supabase
      .from('id_documents')
      .insert({
        customer_id: customerId,
        id_type: idType,
        id_number: idNumber,
        storage_path: storagePath,
        ocr_raw_data: ocrRawData || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[IdDoc] Insert error:', error.message);
      return { success: false, error: 'Failed to save ID document record.' };
    }

    return { success: true, data: doc as IdDocument };
  } catch (error) {
    console.error('[IdDoc] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================
// TRANSACTION CREATION
// ============================================

/**
 * Create a new transaction linked to a customer and ID document.
 * This is the final step after staff confirmation.
 */
export async function createTransaction(
  customerId: string,
  idDocumentId: string,
  formData: TransactionFormData
): Promise<ActionResult<Transaction>> {
  const { user } = await requireAuth();

  try {
    const supabase = await createClient();

    const amount = parseFloat(formData.amount) || 0;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        customer_id: customerId,
        id_document_id: idDocumentId,
        transaction_type: formData.transactionType || 'other',
        items: formData.items || [],
        amount,
        staff_id: user.id,
        notes: formData.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Transaction] Insert error:', error.message);
      return { success: false, error: 'Failed to create transaction. Please try again.' };
    }

    // Audit log
    await logAudit(user.id, 'transaction_created', customerId, transaction.id, {
      amount,
      type: formData.transactionType,
    });

    return { success: true, data: transaction as Transaction };
  } catch (error) {
    console.error('[Transaction] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================
// FULL TRANSACTION WORKFLOW
// ============================================

/**
 * Complete transaction workflow:
 * 1. Create or link customer
 * 2. Create ID document record
 * 3. Create transaction
 *
 * Only called after staff has reviewed and explicitly confirmed.
 */
export async function completeTransaction(params: {
  customerData: ConfirmedCustomerData;
  existingCustomerId?: string;
  storagePath?: string | null;
  transactionData: TransactionFormData;
  ocrRawData?: Record<string, unknown>;
}): Promise<ActionResult<{ transaction: Transaction; customer: Customer }>> {
  const { user } = await requireAuth();

  try {
    let customer: Customer;

    // Step 1: Get or create customer
    if (params.existingCustomerId) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.existingCustomerId)
        .single();

      if (error || !data) {
        return { success: false, error: 'Could not find the selected customer.' };
      }
      customer = data as Customer;
    } else {
      const result = await createCustomer(params.customerData);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to create customer.' };
      }
      customer = result.data;
    }

    let idDocId: string;

    if (params.storagePath) {
      // Step 2: Create new ID document record
      const docResult = await createIdDocument(
        customer.id,
        params.storagePath,
        params.customerData.idType,
        params.customerData.idNumber,
        params.ocrRawData
      );

      if (!docResult.success || !docResult.data) {
        return { success: false, error: docResult.error || 'Failed to save ID document.' };
      }
      idDocId = docResult.data.id;
    } else {
      // Reuse latest ID document for this customer
      const supabase = await createClient();
      const { data: docs } = await supabase
        .from('id_documents')
        .select('id')
        .eq('customer_id', customer.id)
        .order('uploaded_at', { ascending: false })
        .limit(1);
      
      if (!docs || docs.length === 0) {
        return { success: false, error: 'Customer has no ID document on file. Please upload a new ID.' };
      }
      idDocId = docs[0].id;
    }

    // Step 3: Create transaction
    const txResult = await createTransaction(
      customer.id,
      idDocId,
      params.transactionData
    );

    if (!txResult.success || !txResult.data) {
      return { success: false, error: txResult.error || 'Failed to create transaction.' };
    }

    return {
      success: true,
      data: {
        transaction: txResult.data,
        customer,
      },
    };
  } catch (error) {
    console.error('[CompleteTransaction] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get recent transactions with customer details.
 */
export async function getRecentTransactions(
  limit = 10
): Promise<ActionResult<TransactionWithDetails[]>> {
  await requireAuth();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(*),
        id_document:id_documents(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: 'Failed to load transactions.' };
    }
    return { success: true, data: (data || []) as TransactionWithDetails[] };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get transaction count for dashboard.
 */
export async function getTransactionCount(): Promise<number> {
  await requireAuth();
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get a single transaction with details.
 */
export async function getTransactionById(
  id: string
): Promise<ActionResult<TransactionWithDetails>> {
  await requireAuth();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(*),
        id_document:id_documents(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Transaction not found.' };
    }
    return { success: true, data: data as TransactionWithDetails };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get customer by ID with transactions and documents.
 */
export async function getCustomerById(
  id: string
): Promise<ActionResult<Customer & { transactions: Transaction[]; id_documents: IdDocument[] }>> {
  await requireAuth();
  try {
    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`*`)
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    const { data: idDocs } = await supabase
      .from('id_documents')
      .select('*')
      .eq('customer_id', id)
      .order('uploaded_at', { ascending: false });

    return {
      success: true,
      data: {
        ...(customer as Customer),
        transactions: (transactions || []) as Transaction[],
        id_documents: (idDocs || []) as IdDocument[],
      },
    };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Search customers by name or ID number.
 */
export async function searchCustomers(
  query: string
): Promise<ActionResult<Customer[]>> {
  await requireAuth();

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  try {
    const supabase = await createClient();
    const normalized = normalizeIdNumber(query);
    const searchTerm = `%${query.trim()}%`;

    // Search by normalized ID number or name (ILIKE)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`normalized_id_number.eq.${normalized},full_name.ilike.${searchTerm},id_number.ilike.${searchTerm}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[Search] Query error:', error.message);
      return { success: false, error: 'Search failed. Please try again.' };
    }

    return { success: true, data: (data || []) as Customer[] };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get customer transactions for history display.
 */
export async function getCustomerTransactions(
  customerId: string
): Promise<ActionResult<TransactionWithDetails[]>> {
  await requireAuth();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        id_document:id_documents(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to load transactions.' };
    }
    return { success: true, data: (data || []) as TransactionWithDetails[] };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================
// PRIVATE ID IMAGE ACCESS
// ============================================

/**
 * Get a temporary signed URL for a private ID document image.
 * Only accessible by authenticated staff through server-side action.
 */
export async function getIdImageUrl(
  storagePath: string
): Promise<ActionResult<{ url: string }>> {
  await requireAuth();

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.storage
      .from('id-documents')
      .createSignedUrl(storagePath, 60); // 60 second expiry

    if (error || !data?.signedUrl) {
      return { success: false, error: 'Could not retrieve ID image.' };
    }

    return { success: true, data: { url: data.signedUrl } };
  } catch {
    return { success: false, error: 'Failed to access ID image.' };
  }
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Create an audit log entry.
 */
async function logAudit(
  staffId: string,
  action: string,
  customerId?: string,
  transactionId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      staff_id: staffId,
      action,
      customer_id: customerId || null,
      transaction_id: transactionId || null,
      metadata: metadata || null,
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('[Audit] Log error:', error);
  }
}
