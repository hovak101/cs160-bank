"use client";

import React, { useState } from "react";
import {
  User,
  Lock,
  Bell,
  ShieldCheck,
  LogOut,
  Save,
  Loader2,
  Globe,
  ArrowUpRight,
  Shield,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


interface UserData {
  name: string;
  email: string;
  transaction_alerts?: boolean;
  device_alerts?: boolean;
  summary_alerts?: boolean;
}

type NotificationPreferenceKey =
  | "transaction_alerts"
  | "device_alerts"
  | "summary_alerts";

const notificationItems: { id: NotificationPreferenceKey; label: string }[] = [
  { id: "transaction_alerts", label: "Transaction Alerts" },
  { id: "device_alerts", label: "New Device Login" },
  { id: "summary_alerts", label: "Weekly Financial Summary" },
];

function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error ? error.message : fallback;
}

export default function SettingsForm({ initialData }: { initialData: UserData }) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState<UserData>(initialData);
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  // const [newPassword, setNewPassword] = useState(""); // Track password input
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Account Limits", icon: Wallet },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error } = await supabase
        .from("customers")
        .update({
          first_name: firstName,
          last_name: lastName,
          transaction_alerts: formData.transaction_alerts,
          device_alerts: formData.device_alerts,
          summary_alerts: formData.summary_alerts,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setShowSuccess(true);
      router.refresh();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: unknown) {
      alert(`Error: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new.length < 6) return alert("New password must be at least 6 characters");

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (updateError) throw updateError;

      setPasswords({ current: "", new: "" });
      alert("Password updated successfully!");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    router.push("/auth/login"); 
    
    router.refresh();
  } catch (error: unknown) {
    console.error("Sign out error:", getErrorMessage(error));
  }
};

  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[32px] mb-8 border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Banking
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Account Settings
          </h1>
          <p className="mt-2 max-w-5xl text-slate-400 leading-relaxed">
            Manage your Vitality Bank identity and security preferences    </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <tab.icon size={18} />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
          <div className="hidden lg:block my-4 border-t border-white/5" />
          <button
            onClick={handleSignOut}
            className="hidden lg:flex items-center gap-3 px-4 py-3 text-red-400/70 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all w-full"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 lg:p-8 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-6">Public Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email (Protected)</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Localization</h4>
                    <p className="text-sm text-slate-400">Set your preferred language and time zone.</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                    <Globe size={14} /> English (US)
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "security" && (
            <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6">
              <h4 className="text-white font-medium mb-4">Change Password</h4>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                />
                <button
                  onClick={handleUpdatePassword}
                  disabled={isSaving}
                  className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-bold transition-all"
                >
                  {isSaving ? "Processing..." : "Update Password"}
                </button>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Alert Preferences</h3>
              {notificationItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-300">{item.label}</span>

                  {/* Functional Toggle Button */}
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      [item.id]: !Boolean(formData[item.id])
                    })}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all duration-200",
                      formData[item.id]
                        ? "bg-cyan-400 shadow-[0_0_10px_-2px_#22d3ee]"
                        : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      formData[item.id] ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              ))}
            </section>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-white font-semibold">Standard Account Tier</h3>
                    <p className="text-xs text-slate-400 mt-1">Tier 1 Verification Active</p>
                  </div>
                  <Shield className="text-cyan-400" size={24} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Monthly Limit Usage</span>
                    <span className="text-cyan-400">24%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[24%] h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Transaction Limits</h4>
                <div className="space-y-4">
                  {[
                    { label: "Daily Transfer Limit", limit: "$5,000.00", used: "$1,200.00" },
                    { label: "ATM Withdrawal", limit: "$1,000.00", used: "$0.00" }
                  ].map((limit, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="text-white text-sm font-medium">{limit.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{limit.used} of {limit.limit} used</p>
                      </div>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:underline">
                        INCREASE <ArrowUpRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Persistent Save Button for relevant tabs */}
          {(activeTab === "profile") && (
            <div className="flex items-center justify-end gap-4 pt-4">
              {showSuccess && (
                <span className="text-emerald-400 text-sm font-medium animate-in fade-in">Saved Successfully</span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-cyan-400 hover:bg-cyan-500 text-[#0f172a] font-bold rounded-xl transition-all shadow-[0_0_20px_-5px_#22d3ee]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Update Profile
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
