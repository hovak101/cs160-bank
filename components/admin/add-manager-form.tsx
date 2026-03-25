"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type FormErrors = {
  email?: string;
  password?: string;
  repeatPassword?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  general?: string;
};

export function AddManagerForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!repeatPassword) {
      newErrors.repeatPassword = "Please confirm your password";
    } else if (password !== repeatPassword) {
      newErrors.repeatPassword = "Passwords do not match";
    }

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!/^[A-Za-z\s'-]+$/.test(firstName.trim())) {
      newErrors.firstName = "First name cannot contain numbers or invalid characters";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!/^[A-Za-z\s'-]+$/.test(lastName.trim())) {
      newErrors.lastName = "Last name cannot contain numbers or invalid characters";
    }

    if (!employeeId.trim()) {
      newErrors.employeeId = "Employee ID is required";
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/managers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          employeeId: employeeId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || "Failed to create manager account" });
        return;
      }

      setSuccess("Manager account created successfully!");
      setEmail("");
      setPassword("");
      setRepeatPassword("");
      setFirstName("");
      setLastName("");
      setEmployeeId("");
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 ${
      hasError
        ? "border border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
        : "border border-white/10 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
    }`;

  return (
    <div className="w-full rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
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
              disabled={isLoading}
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
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-sm text-red-400">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Email
          </label>
          <input
            type="email"
            placeholder="manager@bank.com"
            className={inputClass(errors.email)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            className={inputClass(errors.password)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="Confirm password"
            className={inputClass(errors.repeatPassword)}
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.repeatPassword && (
            <p className="text-sm text-red-400">{errors.repeatPassword}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-white/70">
            Employee ID
          </label>
          <input
            type="text"
            placeholder="EMP001"
            className={inputClass(errors.employeeId)}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.employeeId && (
            <p className="text-sm text-red-400">{errors.employeeId}</p>
          )}
        </div>

        {errors.general && (
          <p className="text-sm text-red-400">{errors.general}</p>
        )}

        {success && (
          <p className="text-sm text-cyan-400">{success}</p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating manager..." : "Create Manager"}
        </Button>
      </form>
    </div>
  );
}
