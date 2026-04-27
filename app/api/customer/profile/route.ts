import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const firstName = body.first_name?.trim() || "";
    const lastName = body.last_name?.trim() || "";
    const phoneNumber = body.phone_number?.replace(/\D/g, "").trim() || null;
    const taxId = body.tax_id?.trim() || null;
    const country = body.country?.trim() || null;
    const addressLine1 = body.address_line_1?.trim() || null;
    const addressLine2 = body.address_line_2?.trim() || null;
    const city = body.city?.trim() || null;
    const state = body.state?.trim() || null;
    const zipCode = body.zip_code?.trim() || null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`;

    const { data: existingCustomer, error: customerCheckError } = await supabase
      .from("customers")
      .select("customer_id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerCheckError) {
      console.error("Customer check error:", customerCheckError);
      return NextResponse.json(
        { error: customerCheckError.message },
        { status: 500 }
      );
    }

    // Check whether phone number already belongs to someone else
    if (phoneNumber) {
      let phoneQuery = supabase
        .from("customers")
        .select("customer_id, user_id")
        .eq("phone_number", phoneNumber)
        .limit(1);

      if (existingCustomer) {
        phoneQuery = phoneQuery.neq("user_id", user.id);
      }

      const { data: phoneMatch, error: phoneError } = await phoneQuery.maybeSingle();

      if (phoneMatch) {
        return NextResponse.json(
          { field: "phoneNumber", error: "Phone number already exists." },
          { status: 409 }
        );
      }
      else if (phoneError) {
        console.error("Phone duplicate check error:", phoneError);
        return NextResponse.json(
          { error: "Failed to validate phone number." },
          { status: 500 }
        );
      }
    }

    // Check whether tax ID already belongs to someone else
    if (taxId) {
      let taxQuery = supabase
        .from("customers")
        .select("customer_id, user_id")
        .eq("tax_id", taxId)
        .limit(1);

      if (existingCustomer) {
        taxQuery = taxQuery.neq("user_id", user.id);
      }

      const { data: taxMatch, error: taxError } = await taxQuery.maybeSingle();

      if (taxMatch) {
        return NextResponse.json(
          { field: "taxId", error: "Tax ID already exists." },
          { status: 409 }
        );
      }
      else if (taxError) {
        console.error("Tax ID duplicate check error:", taxError);
        return NextResponse.json(
          { error: "Failed to validate tax ID." },
          { status: 500 }
        );
      }
    }

    if (existingCustomer) {
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          tax_id: taxId,
          country,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city,
          state,
          zip_code: zipCode,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Update customer error:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase.from("customers").insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tax_id: taxId,
        country,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        state,
        zip_code: zipCode,
        kyc_status: "pending",
      });

      if (insertError) {
        console.error("Insert customer error:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authUpdateError) {
      console.error("Auth update error:", authUpdateError);
      return NextResponse.json(
        { error: authUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected profile route error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}