"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Landmark } from "lucide-react";

type AccountType = "customer";

function validate(
  type: AccountType,
  fields: Record<string, string>
): string | null {
  if (!fields.firstName.trim()) return "First name is required.";
  if (!fields.lastName.trim()) return "Last name is required.";
  if (!fields.email.trim()) return "Email is required.";

  if (type === "customer") {
    const phoneDigits = fields.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10)
      return "Phone number must have at least 10 digits.";

    const ssnDigits = fields.ssn.replace(/\D/g, "");
    if (ssnDigits.length !== 9) return "SSN must be exactly 9 digits.";
  }

  if (fields.password.length < 8)
    return "Password must be at least 8 characters.";
  if (fields.password !== fields.confirmPassword)
    return "Passwords do not match.";

  return null;
}

const inputClass =
  "mt-1.5 w-full h-11 rounded-xl border border-charcoal-700 bg-charcoal-800 px-3 text-sm text-white placeholder-charcoal-400 outline-none focus:border-teal-500 focus:bg-charcoal-900 transition";

const labelClass = "block text-xs font-medium text-charcoal-300 uppercase tracking-wide";

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("customer");

  // shared
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // customer only
  const [phone, setPhone] = useState("");
  const [ssn, setSsn] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate(accountType, {
      firstName,
      lastName,
      email,
      phone,
      ssn,
      password,
      confirmPassword,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const metadata: Record<string, string> = {
      role: accountType,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    };

    if (accountType === "customer") {
      metadata.phone_number = phone.trim();
      metadata.tax_id = ssn.replace(/\D/g, "");
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: metadata },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If session exists, user is auto-logged in (email confirm disabled)
    if (data.session) {
      router.push("/dashboard");
    } else {
      // Email confirmation required
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="dark min-h-screen bg-charcoal-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-charcoal-700 bg-charcoal-900 p-10 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
              <Landmark className="h-6 w-6 text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-charcoal-400">
              We sent a confirmation link to <span className="text-white">{email}</span>.
              Click it to activate your account, then sign in.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block w-full rounded-xl bg-teal-500 py-2.5 text-sm font-medium text-white hover:bg-teal-400 transition text-center"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-charcoal-950 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(174_72%_42%_/_0.12),transparent_70%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Landmark className="h-5 w-5 text-teal-400" />
          <span className="text-lg font-semibold text-white">
            Vitality <span className="text-teal-400">Bank</span>
          </span>
        </div>

        <div className="rounded-2xl border border-charcoal-700 bg-charcoal-900 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h1 className="text-xl font-semibold text-white">Create Account</h1>
            <p className="mt-1 text-sm text-charcoal-400">
              Open your Vitality Bank account today.
            </p>

            {/* Toggle */}
            <div className="mt-5 flex rounded-xl border border-charcoal-700 bg-charcoal-800 p-1">
              <button
                type="button"
                onClick={() => { setAccountType("customer"); setError(null); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  accountType === "customer"
                    ? "bg-teal-500 text-white shadow"
                    : "text-charcoal-400 hover:text-white"
                }`}
              >
                Customer
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-8 pb-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
              />
            </div>

            {/* Customer-specific fields */}
            {accountType === "customer" && (
              <>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 867-5309"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    SSN / Tax ID
                    <span className="ml-1 normal-case text-charcoal-500">(9 digits)</span>
                  </label>
                  <input
                    type="password"
                    value={ssn}
                    onChange={(e) => setSsn(e.target.value)}
                    placeholder="•••-••-••••"
                    maxLength={11}
                    className={inputClass}
                    required
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          
          </form>
       </div>
      </div> 
    </div>
  );
}
