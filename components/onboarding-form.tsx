"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormErrors = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  taxId?: string;
  country?: string;
  addressLine1?: string;
  city?: string;
  stateValue?: string;
  zipCode?: string;
  general?: string;
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validateForm(data: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  taxId: string;
  country: string;
  addressLine1: string;
  city: string;
  stateValue: string;
  zipCode: string;
}) {
  const errors: FormErrors = {};

  const nameRegex = /^[A-Za-z\s'-]+$/;
  const cityRegex = /^[A-Za-z\s.'-]+$/;
  const stateRegex = /^[A-Za-z]{2}$/;
  const zipRegex = /^\d{5}(-\d{4})?$/;
  const taxIdRegex = /^\d{9}$/;

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (!nameRegex.test(data.firstName.trim())) {
    errors.firstName =
      "First name cannot contain numbers or invalid characters.";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (!nameRegex.test(data.lastName.trim())) {
    errors.lastName =
      "Last name cannot contain numbers or invalid characters.";
  }

  const phoneDigits = data.phoneNumber.replace(/\D/g, "");
  if (!phoneDigits) {
    errors.phoneNumber = "Phone number is required.";
  } else if (phoneDigits.length !== 10) {
    errors.phoneNumber = "Phone number must contain exactly 10 digits.";
  }

  if (!data.taxId.trim()) {
    errors.taxId = "Tax ID is required.";
  } else if (!taxIdRegex.test(data.taxId.trim())) {
    errors.taxId = "Tax ID must be exactly 9 digits.";
  }

  if (!data.country.trim()) {
    errors.country = "Country is required.";
  }

  if (!data.addressLine1.trim()) {
    errors.addressLine1 = "Address Line 1 is required.";
  }

  if (!data.city.trim()) {
    errors.city = "City is required.";
  } else if (!cityRegex.test(data.city.trim())) {
    errors.city = "City cannot contain numbers or invalid characters.";
  }

  if (!data.stateValue.trim()) {
    errors.stateValue = "State is required.";
  } else if (!stateRegex.test(data.stateValue.trim())) {
    errors.stateValue = "State must be a 2-letter code.";
  }

  if (!data.zipCode.trim()) {
    errors.zipCode = "ZIP code is required.";
  } else if (!zipRegex.test(data.zipCode.trim())) {
    errors.zipCode = "ZIP code must be 5 digits or ZIP+4 format.";
  }

  return errors;
}

export function OnboardingForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [country, setCountry] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 ${
      hasError
        ? "border border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
        : "border border-white/10 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      firstName,
      lastName,
      phoneNumber,
      taxId,
      country,
      addressLine1,
      city,
      stateValue,
      zipCode,
    };

    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    
    try {
      const res = await fetch("/api/customer/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.replace(/\D/g, ""),
          tax_id: taxId.trim(),
          country: country.trim(),
          address_line_1: addressLine1.trim(),
          address_line_2: addressLine2.trim(),
          city: city.trim(),
          state: stateValue.trim().toUpperCase(),
          zip_code: zipCode.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setErrors({
          general: result.error || "Failed to save profile.",
        });
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({
        general: "Something went wrong. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            First Name
          </label>
          <input
            type="text"
            placeholder="First Name"
            className={inputClass(errors.firstName)}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          {errors.firstName && (
            <p className="text-sm text-red-400">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Last Name
          </label>
          <input
            type="text"
            placeholder="Last Name"
            className={inputClass(errors.lastName)}
            value={lastName}
            onChange  ={(e) => setLastName(e.target.value)}
            required
          />
          {errors.lastName && (
            <p className="text-sm text-red-400">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Phone Number
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="(555) 123-4567"
          className={inputClass(errors.phoneNumber)}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
          required
        />
        {errors.phoneNumber && (
          <p className="text-sm text-red-400">{errors.phoneNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Tax ID
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="123456789"
          className={inputClass(errors.taxId)}
          value={taxId}
          onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 9))}
          required
        />
        {errors.taxId && (
          <p className="text-sm text-red-400">{errors.taxId}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Country
        </label>
        <input
          type="text"
          placeholder="United States"
          className={inputClass(errors.country)}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        />
        {errors.country && (
          <p className="text-sm text-red-400">{errors.country}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Address Line 1
        </label>
        <input
          type="text"
          placeholder="123 Main St"
          className={inputClass(errors.addressLine1)}
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          required
        />
        {errors.addressLine1 && (
          <p className="text-sm text-red-400">{errors.addressLine1}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-white/70">
          Address Line 2
        </label>
        <input
          type="text"
          placeholder="Apartment, suite, unit, etc."
          className={inputClass()}
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            City
          </label>
          <input
            type="text"
            placeholder="San Jose"
            className={inputClass(errors.city)}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          {errors.city && (
            <p className="text-sm text-red-400">{errors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            State
          </label>
          <input
            type="text"
            placeholder="CA"
            maxLength={2}
            className={inputClass(errors.stateValue)}
            value={stateValue}
            onChange={(e) =>
              setStateValue(
                e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
              )
            }
            required
          />
          {errors.stateValue && (
            <p className="text-sm text-red-400">{errors.stateValue}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            ZIP Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="95112"
            className={inputClass(errors.zipCode)}
            value={zipCode}
            onChange={(e) =>
              setZipCode(e.target.value.replace(/[^\d-]/g, "").slice(0, 10))
            }
            required
          />
          {errors.zipCode && (
            <p className="text-sm text-red-400">{errors.zipCode}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Continue"}
      </button>

      {errors.general && (
        <p className="text-center text-sm text-red-400">{errors.general}</p>
      )}
    </form>
  );
}