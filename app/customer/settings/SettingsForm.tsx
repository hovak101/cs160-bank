"use client";

import React, { useState } from "react";
import {
  User,
  Lock,
  Bell,
  ShieldCheck,
  LogOut,
  Save,
  CheckCircle2,
  Loader2,
  Globe,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  name: string;
  email: string;
}

export default function SettingsForm({ initialData }: { initialData: UserData }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState<UserData>(initialData);
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
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
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
          <button className="hidden lg:flex items-center gap-3 px-4 py-3 text-red-400/70 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all">
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
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-cyan-400" />
                    <h3 className="text-lg font-semibold text-white">Security Keys</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-400/20">ENCRYPTED</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">Two-factor authentication is active. We'll send a code to {formData.email} for new logins.</p>
                <button className="text-sm text-cyan-400 font-bold hover:underline">Update Security Preferences →</button>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6">
                <h4 className="text-white font-medium mb-4">Change Password</h4>
                <div className="space-y-4">
                  <input type="password" placeholder="Current Password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                  <input type="password" placeholder="New Password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                  <button className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-bold transition-all">Update Password</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "notifications" && (
            <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Alert Preferences</h3>
              {["Transaction Alerts", "New Device Login", "Weekly Financial Summary"].map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-300">{item}</span>
                  <div className="w-10 h-5 bg-cyan-400 rounded-full relative shadow-[0_0_10px_-2px_#22d3ee]">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              ))}
            </section>
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