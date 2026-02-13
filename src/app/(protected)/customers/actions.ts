"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchCustomerDetail } from "@/lib/customers/queries";
import type { CustomerDetail } from "@/lib/customers/types";

/**
 * Server action to fetch customer detail (callable from client components).
 */
export async function fetchCustomerDetailAction(
    customerId: string,
): Promise<{ data: CustomerDetail | null; error?: string }> {
    try {
        const data = await fetchCustomerDetail(customerId);
        return { data };
    } catch (err) {
        console.error("Error fetching customer detail:", err);
        return { data: null, error: "Failed to load customer detail" };
    }
}

/**
 * Update customer fields.
 */
export async function updateCustomer(
    customerId: string,
    fields: {
        name?: string;
        primary_contact?: string;
        contact_email?: string;
        contact_phone?: string;
        timezone?: string;
        notes?: string;
    },
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("customers")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", customerId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/customers");
    return { success: true };
}

/**
 * Add a venue to a customer.
 */
export async function addVenue(
    customerId: string,
    venue: {
        name: string;
        address?: string;
        city?: string;
        state?: string;
        is_primary?: boolean;
        notes?: string;
    },
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("venues")
        .insert({
            customer_id: customerId,
            name: venue.name,
            address: venue.address ?? null,
            city: venue.city ?? null,
            state: venue.state ?? null,
            is_primary: venue.is_primary ?? false,
            notes: venue.notes ?? null,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/customers");
    return { success: true };
}

/**
 * Update a venue.
 */
export async function updateVenue(
    venueId: string,
    fields: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        is_primary?: boolean;
        notes?: string;
    },
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("venues")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", venueId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/customers");
    return { success: true };
}

/**
 * Delete a venue.
 */
export async function deleteVenue(
    venueId: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("venues")
        .delete()
        .eq("id", venueId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/customers");
    return { success: true };
}
