"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CustomerRow = {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  tax_id: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  kyc_status: string | null;
};

function isCustomerProfileComplete(customer: CustomerRow | null) {
  return Boolean(
    customer?.first_name?.trim() &&
      customer?.last_name?.trim() &&
      customer?.phone_number?.trim() &&
      customer?.address_line_1?.trim() &&
      customer?.city?.trim() &&
      customer?.state?.trim() &&
      customer?.zip_code?.trim() &&
      customer?.country?.trim()
  );
}

export default function CompleteProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("USA");

  useEffect(() => {
    async function loadProfile() {
      setMsg(null);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.replace("/");
        return;
      }

      setEmail(user.email || "");

      const { data: customer, error } = await supabase
        .from("customers")
        .select(
          "first_name, last_name, phone_number, tax_id, address_line_1, address_line_2, city, state, zip_code, country, kyc_status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        setChecking(false);
        return;
      }

      if (!customer) {
        setMsg(
          "Customer profile row was not found. Please make sure the signup trigger created it."
        );
        setChecking(false);
        return;
      }

      if (isCustomerProfileComplete(customer)) {
        router.replace("/dashboard");
        return;
      }

      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setPhoneNumber(customer.phone_number || "");
      setTaxId(customer.tax_id || "");
      setAddressLine1(customer.address_line_1 || "");
      setAddressLine2(customer.address_line_2 || "");
      setCity(customer.city || "");
      setStateValue(customer.state || "");
      setZipCode(customer.zip_code || "");
      setCountry(customer.country || "USA");

      setChecking(false);
    }

    loadProfile();
  }, [router, supabase]);

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setMsg(null);
  setLoading(true);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    setLoading(false);
    setMsg("You must be logged in first.");
    router.replace("/");
    return;
  }

  const { error } = await supabase
    .from("customers")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim(),
      tax_id: taxId.trim() || null,
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || null,
      city: city.trim(),
      state: stateValue.trim(),
      zip_code: zipCode.trim(),
      country: country.trim(),
      kyc_status: "pending",
    })
    .eq("user_id", user.id);

  setLoading(false);

  if (error) {
    setMsg(error.message);
    return;
  }

  router.refresh();
  router.replace("/dashboard");
}

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-slate-900">
                Complete Your Profile
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Fill in the required information to continue.
              </p>
            </div>

            {msg && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            )}

            <form
              onSubmit={onSubmit}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Tax ID / SSN (optional)
                </label>
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Address Line 1
                </label>
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Address Line 2
                </label>
                <input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  State
                </label>
                <input
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  ZIP Code
                </label>
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Country
                </label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:bg-white focus:border-slate-300"
                  required
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save and Continue"}
                </button>
              </div>
            </form>
          </div>

          <div className="h-3 bg-gradient-to-b from-white to-slate-50" />
        </div>
      </div>
    </main>
  );
}