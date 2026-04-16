import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ManagerRow = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
  email?: string | null;
};


export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    // First, fetch all managers with their user_ids
    let query = supabase
      .from("managers")
      .select(`
        manager_id,
        user_id,
        first_name,
        last_name,
        employee_id,
        created_at,
        is_active
      `)
      .order("created_at", { ascending: false });

    const { data: managers, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get all user_ids from managers
    let userIds = (managers ?? []).map(m => m.user_id);
    
    // If search query, fetch users and filter by email/name match
    let filteredManagers = managers ?? [];
    if (q && userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds)
        .or(`email.ilike.%${q}%`);
      
      if (users && users.length > 0) {
        const matchingUserIds = new Set(users.map(u => u.user_id));
        filteredManagers = (managers ?? []).filter(m => 
          matchingUserIds.has(m.user_id) ||
          (m.first_name?.toLowerCase().includes(q.toLowerCase())) ||
          (m.last_name?.toLowerCase().includes(q.toLowerCase()))
        );
      } else {
        // Only filter by name if no email matches
        filteredManagers = (managers ?? []).filter(m =>
          (m.first_name?.toLowerCase().includes(q.toLowerCase())) ||
          (m.last_name?.toLowerCase().includes(q.toLowerCase()))
        );
      }
    }
    
    // Fetch user emails for filtered managers
    const filteredUserIds = filteredManagers.map(m => m.user_id);
    let emails: Record<string, string | null> = {};
    if (filteredUserIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", filteredUserIds);
      
      if (users) {
        users.forEach(user => {
          emails[user.user_id] = user.email;
        });
      }
    }

    // Combine manager data with email
    const managersWithEmail = filteredManagers.map(manager => ({
      ...manager,
      email: emails[manager.user_id] || null,
    }));

    return NextResponse.json({
      data: managersWithEmail as unknown as ManagerRow[],
    });
  } catch (error) {
    console.error("Search managers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers." },
      { status: 500 }
    );
  }
}
