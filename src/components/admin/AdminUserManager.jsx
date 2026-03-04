import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import emailjs from "@emailjs/browser";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Store,
  History,
  FileClock,
  BadgeCheck,
  Bell,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import UserDossier from "./UserDossier"; 

export default function AdminUserManager({
  users,
  jobs,
  seekerDetails,
  providerDetails,
  shopDetails: initialShopDetails,
  fetchData,
}) {
  const [userSubTab, setUserSubTab] = useState("seekers");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [shopDetails, setShopDetails] = useState(initialShopDetails);

  const [renewalHistory, setRenewalHistory] = useState([]);
  const [globalLedger, setGlobalLedger] = useState([]);
  const [dossierTab, setDossierTab] = useState("details");

  const [showRenewalRequestsOnly, setShowRenewalRequestsOnly] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedShopIds, setSelectedShopIds] = useState([]);

  const itemsPerPage = 10;

  useEffect(() => {
    setShopDetails(initialShopDetails);
  }, [initialShopDetails]);

  // Reset selections when switching tabs
  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
    setShowRenewalRequestsOnly(false);
    setSelectedShopIds([]); 
  }, [userSubTab]);

  useEffect(() => {
    if (selectedUser && dossierTab !== "license") {
      setDossierTab("details");
    }
  }, [selectedUser]);

  const fetchGlobalLedger = async () => {
    const { data } = await supabase
      .from("license_renewals")
      .select("*")
      .order("renewed_at", { ascending: false });
    setGlobalLedger(data || []);
  };

  useEffect(() => {
    fetchGlobalLedger();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedUser && selectedUser.role === "shop") {
        const { data } = await supabase
          .from("license_renewals")
          .select("*")
          .eq("shop_id", selectedUser.id)
          .order("renewed_at", { ascending: false });
        setRenewalHistory(data || []);
      }
    };
    fetchHistory();
  }, [selectedUser]);

  // Bulk Revoke Logic
  const handleBulkRevoke = async () => {
    if (
      !window.confirm(
        `🚨 Are you sure you want to BULK REVOKE access for ${selectedShopIds.length} shop(s)?\n\nThey will immediately lose access to the platform.`
      )
    )
      return;

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: false })
        .in("id", selectedShopIds);

      if (profileError) throw profileError;

      for (const id of selectedShopIds) {
        await supabase.rpc("admin_log_shop_action", {
          target_shop_id: id,
          action_taken: "Account Revoked / Suspended (Bulk Action)",
        });
      }

      alert(`Successfully revoked access for ${selectedShopIds.length} shop(s).`);
      setSelectedShopIds([]); 
      fetchData(); 
      fetchGlobalLedger();
    } catch (error) {
      alert("Bulk revoke failed: " + error.message);
    }
  };

  // Approval gives a 14-Day Free Trial
  const toggleUserApproval = async (id, currentStatus, role, email) => {
    try {
      const isApproving = !currentStatus;

      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: isApproving })
        .eq("id", id)
        .select();
      if (profileError) throw profileError;
      if (!data || data.length === 0)
        throw new Error("Supabase RLS Policy blocked the update!");

      if (role === "shop") {
        const shopData = shopDetails.find((s) => s.id === id);

        if (isApproving) {
          if (
            !shopData?.subscription_expires_at ||
            new Date(shopData.subscription_expires_at) < new Date()
          ) {
            const trialExpiryDate = new Date();
            trialExpiryDate.setDate(trialExpiryDate.getDate() + 14); // 14 Days from today

            await supabase.rpc("admin_update_shop_license", {
              target_shop_id: id,
              new_expiry: trialExpiryDate.toISOString(),
              reset_renewal: false,
              action_taken: "Account Approved (14-Day Free Trial)",
            });

            try {
              await emailjs.send(
                "service_7bfs32k", 
                "template_cok2tvd", 
                {
                  to_email: email,
                  owner_name: shopData?.full_name || "Valued Partner",
                  shop_name: shopData?.shop_name || "your shop",
                },
                "LCf7B01Dm3o5RmXRv",
              );
              console.log("Approval email sent via EmailJS!");
            } catch (emailErr) {
              console.error("Failed to send EmailJS email:", emailErr);
              alert("Shop Approved, but the welcome email failed to send.");
            }

            alert(
              "Shop Approved! A 14-Day Trial has been activated and the Welcome Email was sent.",
            );
          } else {
            await supabase.rpc("admin_log_shop_action", {
              target_shop_id: id,
              action_taken: "Account Re-Approved (Access Restored)",
            });
            alert("Shop access restored.");
          }
        } else {
          await supabase.rpc("admin_log_shop_action", {
            target_shop_id: id,
            action_taken: "Account Revoked / Suspended",
          });
          alert("Shop account suspended.");
        }

        const { data: newHistory } = await supabase
          .from("license_renewals")
          .select("*")
          .eq("shop_id", id)
          .order("renewed_at", { ascending: false });
        setRenewalHistory(newHistory || []);
        fetchGlobalLedger();
      }

      fetchData();
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser((prev) => ({ ...prev, is_approved: isApproving }));
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  // ✨ Explicitly starts a 1-year license strictly from TODAY
  const handleActivatePaidLicense = async (id) => {
    const shopData = shopDetails.find((s) => s.id === id);
    const targetUser = users.find((u) => u.id === id);
    const userEmail = targetUser?.email;

    const newExpiryDate = new Date();
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1); // 1 Year from exactly today
    
    const friendlyDate = newExpiryDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (
      !window.confirm(
        `🚀 ACTIVATE PAID LICENSE?\n\nThis will start a 1-Year license from TODAY, overriding their trial.\n\nNew Expiration: 👉 ${friendlyDate}\n\nDo you want to proceed?`
      )
    ) return;

    const { error } = await supabase.rpc("admin_update_shop_license", {
      target_shop_id: id,
      new_expiry: newExpiryDate.toISOString(),
      reset_renewal: true, // Clears the pending renewal request
      action_taken: "Paid License Activated (1 Year from Today)",
    });

    if (error) {
      alert("Failed to activate: " + error.message);
    } else {
      try {
        await emailjs.send(
          "service_7bfs32k", 
          "template_6oekg48", 
          {
            to_email: userEmail,
            owner_name: shopData?.full_name || "Valued Partner",
            shop_name: shopData?.shop_name || "your shop", 
            new_expiry: friendlyDate, 
          },
          "LCf7B01Dm3o5RmXRv",
        );
        console.log("Activation email sent!");
      } catch (emailErr) {
        console.error("Failed to send activation email:", emailErr);
      }

      alert(`Success! Paid License activated. It will expire on ${friendlyDate}.`);
      fetchData();
      fetchGlobalLedger();
    }
  };

  const handleRenewSubscription = async (id) => {
    const shopData = shopDetails.find((s) => s.id === id);
    const targetUser = users.find((u) => u.id === id);
    const userEmail = targetUser?.email;

    let baseDate = new Date();

    if (shopData?.subscription_expires_at) {
      const currentExpiry = new Date(shopData.subscription_expires_at);
      if (currentExpiry > baseDate) {
        baseDate = currentExpiry;
      }
    }

    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    const friendlyDate = newExpiryDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (
      !window.confirm(
        `ADD 1 YEAR TO THIS LICENSE?\n\nThe new expiration date will be extended to:\n👉 ${friendlyDate}\n\nDo you want to proceed?`,
      )
    )
      return;

    const { error } = await supabase.rpc("admin_update_shop_license", {
      target_shop_id: id,
      new_expiry: newExpiryDate.toISOString(),
      reset_renewal: false,
      action_taken: "Manual License Renewal (+1 Year)",
    });

    if (error) {
      alert("Failed to renew: " + error.message);
    } else {
      try {
        await emailjs.send(
          "service_7bfs32k", 
          "template_6oekg48", 
          {
            to_email: userEmail,
            owner_name: shopData?.full_name || "Valued Partner",
            shop_name: shopData?.shop_name || "your shop", 
            new_expiry: friendlyDate, 
          },
          "LCf7B01Dm3o5RmXRv",
        );
        console.log("Renewal email sent via EmailJS!");
      } catch (emailErr) {
        console.error("Failed to send renewal email:", emailErr);
        alert("License renewed, but the receipt email failed to send.");
      }

      alert(`Success! License extended to ${newExpiryDate.getFullYear()}.`);
      fetchData();

      const { data: newHistory } = await supabase
        .from("license_renewals")
        .select("*")
        .eq("shop_id", id)
        .order("renewed_at", { ascending: false });
      setRenewalHistory(newHistory || []);
      fetchGlobalLedger();
    }
  };

  const updateDeviceLimit = async (newLimit) => {
    setShopDetails((prev) =>
      prev.map((s) =>
        s.id === selectedUser.id ? { ...s, device_limit: newLimit } : s,
      ),
    );
    const { error } = await supabase.rpc("admin_update_device_limit", {
      target_shop_id: selectedUser.id,
      new_limit: newLimit,
    });
    if (error) {
      alert("Error updating limit: " + error.message);
      fetchData();
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (
      !window.confirm(
        `🚨 WARNING: Are you absolutely sure you want to permanently delete ${email}? \n\nThis will wipe their login, profile, and all jobs they posted. This CANNOT be undone.`,
      )
    )
      return;
    try {
      const { error } = await supabase.rpc("delete_user", { user_id: id });
      if (error) throw error;
      alert("User completely wiped from the system.");
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      alert("Error deleting user: " + err.message);
    }
  };

  const handleForcePasswordReset = async (userId, userEmail) => {
    const newPassword = window.prompt(
      `Enter a new temporary password for ${userEmail}\n(Minimum 6 characters):`,
    );
    if (!newPassword) return;
    if (newPassword.length < 6)
      return alert("Password must be at least 6 characters long.");
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-reset-password",
        { body: { userId: userId, newPassword: newPassword } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      alert(
        `Success! The password for ${userEmail} has been securely changed to:\n\n${newPassword}\n\nPlease share this with the user.`,
      );
    } catch (err) {
      alert("Failed to reset password: " + err.message);
    }
  };

  const toggleJobStatus = async (id, currentStatus) => {
    await supabase
      .from("jobs")
      .update({ is_active: !currentStatus, admin_override: !!currentStatus })
      .eq("id", id);
    fetchData();
  };
  
  const deleteJob = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this job permanently?")
    )
      return;
    await supabase.from("jobs").delete().eq("id", id);
    fetchData();
  };

  // UI Calculated Data
  const pendingRenewalsCount = shopDetails.filter(
    (s) => s.renewal_requested,
  ).length;
  
  const roleMap = { seekers: "seeker", providers: "provider", shops: "shop" };
  const usersByRole = users.filter((u) => u.role === roleMap[userSubTab]);

  const filteredUsers = usersByRole.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    
    let isRenewalRequested = false;
    let shopNameMatch = false;
    let memberIdMatch = false;

    if (user.role === "shop") {
      const shopData = shopDetails.find((s) => s.id === user.id);
      if (shopData) {
        if (shopData.renewal_requested) isRenewalRequested = true;
        if (shopData.shop_name) shopNameMatch = shopData.shop_name.toLowerCase().includes(term);
        if (shopData.member_id) memberIdMatch = shopData.member_id.toString().includes(term);
      }
    }

    if (userSubTab === "shops" && showRenewalRequestsOnly && !isRenewalRequested) {
      return false;
    }

    if (!term) return true;

    const emailMatch = user.email?.toLowerCase().includes(term);
    const systemIdMatch = user.id?.toLowerCase().includes(term); 

    return emailMatch || systemIdMatch || shopNameMatch || memberIdMatch;
  });

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const enrichedLedger = globalLedger.map((log) => {
    const shop = shopDetails.find((s) => s.id === log.shop_id);
    const user = users.find((u) => u.id === log.shop_id);
    return {
      ...log,
      shopName: shop?.shop_name,
      memberId: shop?.member_id,
      email: user?.email,
    };
  });

  const filteredLedger = enrichedLedger.filter((log) => {
    const term = searchTerm.toLowerCase().trim();
    
    const matchesSearch =
      !term || 
      log.shopName?.toLowerCase().includes(term) ||
      log.email?.toLowerCase().includes(term) ||
      log.memberId?.toString().includes(term);

    if (dateRange) {
      const logDate = new Date(log.renewed_at);
      const start = new Date(dateRange[0]);
      const end = new Date(dateRange[1]);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (logDate < start || logDate > end) return false;
    }
    return matchesSearch;
  });

  const currentLedger = filteredLedger.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalLedgerPages = Math.ceil(filteredLedger.length / itemsPerPage);

  const activeUserDetails = selectedUser
    ? selectedUser.role === "seeker"
      ? seekerDetails.find((s) => s.id === selectedUser.id)
      : selectedUser.role === "provider"
        ? providerDetails.find((p) => p.id === selectedUser.id)
        : shopDetails.find((s) => s.id === selectedUser.id)
    : null;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedShopIds);
      currentUsers.forEach(u => newSelected.add(u.id));
      setSelectedShopIds(Array.from(newSelected));
    } else {
      const currentIds = currentUsers.map(u => u.id);
      setSelectedShopIds(selectedShopIds.filter(id => !currentIds.includes(id)));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <style>{`.react-calendar { border: none; font-family: inherit; width: 100% !important; border-radius: 1rem; padding: 10px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); } .react-calendar__tile--active { background: #10b981 !important; color: white !important; border-radius: 8px; } .react-calendar__tile--range { background: #ecfdf5; color: #065f46; }`}</style>

      {!selectedUser ? (
        <div className="animate-in fade-in duration-500">
          {/* HEADER TABS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                User Directory
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Manage platform access and review profiles.
              </p>
            </div>
            <div className="inline-flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/60 w-full md:w-fit overflow-x-auto no-scrollbar">
              <button
                onClick={() => setUserSubTab("seekers")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "seekers" ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
              >
                <GraduationCap size={16} /> Seekers
              </button>
              <button
                onClick={() => setUserSubTab("providers")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "providers" ? "bg-white text-purple-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Briefcase size={16} /> Providers
              </button>
              <button
                onClick={() => setUserSubTab("shops")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "shops" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Store size={16} /> Shops
              </button>
              <button
                onClick={() => setUserSubTab("ledger")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "ledger" ? "bg-slate-900 text-white shadow-sm border border-slate-800" : "text-slate-500 hover:text-slate-700"}`}
              >
                <FileClock size={16} /> License Logs
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-4 top-3 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  userSubTab === "ledger"
                    ? "Search renewals by shop name or ID..."
                    : `Search ${userSubTab} by Name, Email, or ID...`
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm transition-all"
              />
            </div>

            {userSubTab === "shops" && (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {selectedShopIds.length > 0 && (
                  <button
                    onClick={handleBulkRevoke}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 animate-in zoom-in duration-200 h-[46px] w-full sm:w-auto"
                  >
                    <AlertCircle size={16} /> Revoke ({selectedShopIds.length})
                  </button>
                )}

                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 h-[46px] w-full sm:w-fit">
                  <button
                    onClick={() => setShowRenewalRequestsOnly(false)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${!showRenewalRequestsOnly ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    All Shops
                  </button>
                  <button
                    onClick={() => setShowRenewalRequestsOnly(true)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${showRenewalRequestsOnly ? "bg-red-50 text-red-700 shadow-sm border border-red-100" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Bell
                      size={14}
                      className={
                        pendingRenewalsCount > 0
                          ? showRenewalRequestsOnly
                            ? "animate-none"
                            : "text-red-500 animate-pulse"
                          : ""
                      }
                    />
                    Requests{" "}
                    {pendingRenewalsCount > 0 && (
                      <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[10px] leading-none">
                        {pendingRenewalsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {userSubTab === "ledger" && (
              <div className="relative">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`h-[46px] px-4 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${dateRange ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <CalendarIcon size={16} />{" "}
                  {dateRange
                    ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
                    : "Filter by Date Range"}
                  {dateRange && (
                    <X
                      size={14}
                      className="ml-2 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange(null);
                      }}
                    />
                  )}
                </button>
                {showCalendar && (
                  <div className="absolute top-14 left-0 z-50 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left">
                    <Calendar
                      onChange={(val) => {
                        setDateRange(val);
                        setShowCalendar(false);
                      }}
                      selectRange={true}
                      value={dateRange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LIST VIEWS */}
          {userSubTab === "ledger" ? (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-900 text-[11px] uppercase text-slate-300 font-bold tracking-wider">
                      <tr>
                        <th className="p-4 md:p-5">Transaction Date</th>
                        <th className="p-4 md:p-5">Shop Info</th>
                        <th className="p-4 md:p-5">Action Result</th>
                        <th className="p-4 md:p-5 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentLedger.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="p-4 md:p-5">
                            <div className="font-bold text-slate-800 text-sm">
                              {new Date(log.renewed_at).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {new Date(log.renewed_at).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="p-4 md:p-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                                {log.shopName || "Unknown Shop"}
                              </span>
                              {log.memberId && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-black">
                                  #{log.memberId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                              {log.email}
                            </div>
                          </td>
                          <td className="p-4 md:p-5">
                            {log.action_type?.includes("Revoked") ? (
                              <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                                Account Suspended
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                                Extended to{" "}
                                {new Date(log.new_expiry).getFullYear()}
                              </span>
                            )}
                          </td>
                          <td className="p-4 md:p-5 text-right">
                            <button
                              onClick={() => {
                                const targetUser = users.find(
                                  (u) => u.id === log.shop_id,
                                );
                                if (targetUser) {
                                  setSelectedUser(targetUser);
                                  setDossierTab("license");
                                }
                              }}
                              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
                              title="Open Shop Profile"
                            >
                              <Store size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {currentLedger.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                              <History size={20} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-base">
                              No License Transactions Yet
                            </h3>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {totalLedgerPages > 1 && (
                <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-bold">
                    Page <span className="text-slate-900">{currentPage}</span> /{" "}
                    {totalLedgerPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalLedgerPages}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                      <tr>
                        {userSubTab === "shops" && (
                          <th className="p-4 md:p-5 w-12 text-center border-r border-slate-100">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={
                                currentUsers.length > 0 &&
                                currentUsers.every(u => selectedShopIds.includes(u.id))
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th className="p-4 md:p-5">Account Details</th>
                        <th className="p-4 md:p-5">Status</th>
                        <th className="p-4 md:p-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentUsers.map((user) => {
                        const shopData =
                          user.role === "shop"
                            ? shopDetails.find((s) => s.id === user.id)
                            : null;
                        const needsRenewal = shopData?.renewal_requested;
                        
                        return (
                          <tr
                            key={user.id}
                            className={`transition-colors group ${needsRenewal ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-slate-50/80"}`}
                          >
                            {userSubTab === "shops" && (
                              <td className="p-4 md:p-5 text-center border-r border-slate-100">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={selectedShopIds.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedShopIds([...selectedShopIds, user.id]);
                                    } else {
                                      setSelectedShopIds(selectedShopIds.filter(id => id !== user.id));
                                    }
                                  }}
                                />
                              </td>
                            )}

                            <td className="p-4 md:p-5">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div
                                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ${user.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : user.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
                                >
                                  {user.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs md:text-sm flex items-center flex-wrap gap-2">
                                    {shopData?.shop_name || user.email}
                                    {user.role === "shop" &&
                                      shopData?.member_id && (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider">
                                          ID: #{shopData.member_id}
                                        </span>
                                      )}
                                    {needsRenewal && (
                                      <span className="flex items-center gap-1.5 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                        </span>
                                        Renewal
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] md:text-[11px] text-slate-500 font-mono tracking-tight mt-0.5">
                                    {user.email} • Ref: {user.id.slice(0, 8)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 md:p-5">
                              <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border ${user.is_approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                              >
                                {user.is_approved ? (
                                  <CheckCircle2
                                    size={12}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <AlertCircle
                                    size={12}
                                    className="text-amber-500"
                                  />
                                )}{" "}
                                {user.is_approved ? "Verified" : "Pending"}
                              </div>
                            </td>
                            <td className="p-4 md:p-5 text-right">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                              >
                                {needsRenewal
                                  ? "Review Request"
                                  : "View Dossier"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {currentUsers.length === 0 && (
                        <tr>
                          <td colSpan={userSubTab === "shops" ? 4 : 3} className="p-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                              <Search size={20} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-base">
                              {showRenewalRequestsOnly
                                ? "No Pending Renewals"
                                : "No accounts found matching your search."}
                            </h3>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {totalUserPages > 1 && (
                <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-bold">
                    Page <span className="text-slate-900">{currentPage}</span> /{" "}
                    {totalUserPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalUserPages}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <UserDossier
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          details={activeUserDetails}
          jobs={jobs.filter((j) => j.provider_id === selectedUser.id)}
          renewalHistory={renewalHistory}
          dossierTab={dossierTab}
          setDossierTab={setDossierTab}
          handleForcePasswordReset={handleForcePasswordReset}
          handleDeleteUser={handleDeleteUser}
          toggleUserApproval={toggleUserApproval}
          handleRenewSubscription={handleRenewSubscription}
          handleActivatePaidLicense={handleActivatePaidLicense} 
          toggleJobStatus={toggleJobStatus}
          deleteJob={deleteJob}
          updateDeviceLimit={updateDeviceLimit}
        />
      )}
    </div>
  );
}