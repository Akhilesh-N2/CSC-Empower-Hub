import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Calendar from "react-calendar"; // ✨ NEW
import "react-calendar/dist/Calendar.css"; // ✨ NEW
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  Phone,
  GraduationCap,
  User,
  Store,
  KeyRound,
  ShieldCheck,
  Trash2,
  EyeOff,
  History,
  FileClock,
  ShieldAlert,
  BadgeCheck,
  Laptop,
  Bell,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import ShopDeviceManager from "../ShopDeviceManager";

const calendarStyles = `
  .react-calendar { border: none; font-family: inherit; width: 100% !important; border-radius: 1rem; padding: 10px; }
  .react-calendar__tile--active { background: #10b981 !important; color: white !important; border-radius: 8px; }
  .react-calendar__tile--range { background: #ecfdf5; color: #065f46; }
  .react-calendar__tile--now { background: #f1f5f9; border-radius: 8px; }
`;

const DetailBox = ({ label, value, highlight }) => (
  <div className="flex flex-col group">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">
      {label}
    </span>
    <span
      className={`text-sm md:text-base ${highlight ? "text-blue-600 font-black" : "text-slate-800 font-semibold"}`}
    >
      {value || "Not Provided"}
    </span>
  </div>
);

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
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [shopDetails, setShopDetails] = useState(initialShopDetails);

  const [renewalHistory, setRenewalHistory] = useState([]);
  const [globalLedger, setGlobalLedger] = useState([]);
  const [dossierTab, setDossierTab] = useState("details");

  const [showRenewalRequestsOnly, setShowRenewalRequestsOnly] = useState(false);

  const [dateRange, setDateRange] = useState(null); 
  const [showCalendar, setShowCalendar] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    setShopDetails(initialShopDetails);
  }, [initialShopDetails]);

  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
    setShowRenewalRequestsOnly(false);
  }, [userSubTab]);

  useEffect(() => {
    if (selectedUser) {
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
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            await supabase.rpc("admin_update_shop_license", {
              target_shop_id: id,
              new_expiry: oneYearFromNow.toISOString(),
              reset_renewal: false,
              action_taken: "Account Approved (+1 Year License)",
            });

            await supabase.functions.invoke("shop-approval-email", {
              body: {
                email: email,
                shopName: shopData?.shop_name || "Authorized Partner",
              },
            });
            alert(
              "Shop Approved! 1-Year License activated and Welcome Email sent.",
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

  const handleRenewSubscription = async (id) => {
    const shopData = shopDetails.find((s) => s.id === id);
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

  const pendingRenewalsCount = shopDetails.filter(
    (s) => s.renewal_requested,
  ).length;
  const roleMap = { seekers: "seeker", providers: "provider", shops: "shop" };
  const usersByRole = users.filter((u) => u.role === roleMap[userSubTab]);

  const filteredUsers = usersByRole.filter((user) => {
    const term = searchTerm.toLowerCase();
    const emailMatch = user.email.toLowerCase().includes(term);
    let idMatch = false;
    let isRenewalRequested = false;

    if (user.role === "shop") {
      const shopData = shopDetails.find((s) => s.id === user.id);
      if (shopData && shopData.member_id) {
        idMatch = shopData.member_id.toString().includes(term);
      }
      if (shopData?.renewal_requested) {
        isRenewalRequested = true;
      }
    }

    const matchesSearch = emailMatch || idMatch;

    if (
      userSubTab === "shops" &&
      showRenewalRequestsOnly &&
      !isRenewalRequested
    ) {
      return false;
    }

    return matchesSearch;
  });

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Logic for Global Ledger filtering
  const enrichedLedger = globalLedger.map(log => {
    const shop = shopDetails.find(s => s.id === log.shop_id);
    const user = users.find(u => u.id === log.shop_id);
    return { ...log, shopName: shop?.shop_name, memberId: shop?.member_id, email: user?.email };
  });

  const filteredLedger = enrichedLedger.filter(log => {
    const matchesSearch = log.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.memberId?.toString().includes(searchTerm);
    
    // ✨ CALENDAR FILTER LOGIC
    if (dateRange) {
      const logDate = new Date(log.renewed_at);
      const start = new Date(dateRange[0]);
      const end = new Date(dateRange[1]);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      if (logDate < start || logDate > end) return false;
    }

    return matchesSearch;
  });

  const currentLedger = filteredLedger.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalLedgerPages = Math.ceil(filteredLedger.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto">
      <style>{`
        .react-calendar { border: none; font-family: inherit; width: 100% !important; border-radius: 1rem; padding: 10px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
        .react-calendar__tile--active { background: #10b981 !important; color: white !important; border-radius: 8px; }
        .react-calendar__tile--range { background: #ecfdf5; color: #065f46; }
      `}</style>
      {!selectedUser ? (
        <div className="animate-in fade-in duration-500">
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

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            

            {userSubTab === "shops" && (
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
                  Requests
                  {pendingRenewalsCount > 0 && (
                    <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[10px] leading-none">
                      {pendingRenewalsCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>


          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                    : `Search ${userSubTab} by email or ID...`
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm transition-all"
              />
            </div>

            {/* ✨ NEW: VISUAL CALENDAR TOGGLE */}
            {userSubTab === "ledger" && (
              <div className="relative">
                <button 
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`h-[46px] px-4 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${dateRange ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <CalendarIcon size={16} />
                  {dateRange ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}` : "Filter by Date Range"}
                  {dateRange && (
                    <X size={14} className="ml-2 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setDateRange(null); }} />
                  )}
                </button>

                {showCalendar && (
                  <div className="absolute top-14 left-0 z-50 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left">
                    <Calendar 
                      onChange={(val) => { setDateRange(val); setShowCalendar(false); }} 
                      selectRange={true} 
                      value={dateRange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

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
                                if (targetUser) setSelectedUser(targetUser);
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
                            <p className="text-sm text-slate-500 mt-1">
                              Approvals and renewals will be logged here.
                            </p>
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
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalLedgerPages}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
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
                            <td className="p-4 md:p-5">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div
                                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ${user.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : user.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
                                >
                                  {user.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs md:text-sm flex items-center flex-wrap gap-2">
                                    {user.email}
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
                                  <div className="text-[10px] md:text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">
                                    System Ref: {user.id.slice(0, 8)}
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
                                )}
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
                          <td colSpan="3" className="p-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                              <Search size={20} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-base">
                              {showRenewalRequestsOnly
                                ? "No Pending Renewals"
                                : "No accounts found"}
                            </h3>
                            {showRenewalRequestsOnly && (
                              <p className="text-sm text-slate-500 mt-1">
                                All shops are up to date.
                              </p>
                            )}
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
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalUserPages}
                      className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
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
        <div className="animate-in slide-in-from-right duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-200 pb-4 md:pb-6">
            <button
              onClick={() => setSelectedUser(null)}
              className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 hover:text-blue-600 font-bold transition group w-full sm:w-fit text-sm bg-white px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm"
            >
              <ChevronLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />{" "}
              Back to Directory
            </button>
            <div className="flex gap-2 w-full sm:w-fit">
              <button
                onClick={() =>
                  handleForcePasswordReset(selectedUser.id, selectedUser.email)
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition shadow-sm"
              >
                <KeyRound size={16} /> Reset Password
              </button>
              <button
                onClick={() =>
                  handleDeleteUser(selectedUser.id, selectedUser.email)
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition shadow-sm"
              >
                <Trash2 size={16} /> Delete Account
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 w-full h-2 ${selectedUser.role === "seeker" ? "bg-blue-500" : selectedUser.role === "provider" ? "bg-purple-500" : "bg-emerald-500"}`}
                ></div>

                <div className="flex flex-col items-center text-center mt-2 mb-8">
                  <div
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-xl mb-5 transform rotate-3 ${selectedUser.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : selectedUser.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
                  >
                    <span className="-rotate-3">
                      {selectedUser.email.substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <h3
                    className="text-xl md:text-2xl font-black text-slate-900 w-full truncate px-2"
                    title={selectedUser.email}
                  >
                    {(() => {
                      const d =
                        selectedUser.role === "seeker"
                          ? seekerDetails.find((s) => s.id === selectedUser.id)
                          : selectedUser.role === "provider"
                            ? providerDetails.find(
                                (p) => p.id === selectedUser.id,
                              )
                            : shopDetails.find((s) => s.id === selectedUser.id);
                      return (
                        d?.full_name ||
                        d?.company_name ||
                        d?.shop_name ||
                        "Name Not Provided"
                      );
                    })()}
                  </h3>

                  <div className="text-slate-500 text-sm mt-1.5 flex items-center justify-center gap-2">
                    {selectedUser.email}
                  </div>

                  {selectedUser.role === "shop" &&
                    (() => {
                      const shopDossierData = shopDetails.find(
                        (s) => s.id === selectedUser.id,
                      );
                      return shopDossierData?.member_id ? (
                        <div className="mt-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-xs font-mono font-bold border border-emerald-200 shadow-sm">
                          SHOP ID: #{shopDossierData.member_id}
                        </div>
                      ) : null;
                    })()}

                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 shadow-inner">
                    <User size={14} /> {selectedUser.role}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <button
                    onClick={() =>
                      toggleUserApproval(
                        selectedUser.id,
                        selectedUser.is_approved,
                        selectedUser.role,
                        selectedUser.email,
                      )
                    }
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all ${selectedUser.is_approved ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                  >
                    {selectedUser.is_approved ? (
                      <>
                        <AlertCircle size={18} /> Revoke Approval
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} /> Approve User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {(() => {
                const details =
                  selectedUser.role === "seeker"
                    ? seekerDetails.find((s) => s.id === selectedUser.id)
                    : selectedUser.role === "provider"
                      ? providerDetails.find((p) => p.id === selectedUser.id)
                      : shopDetails.find((s) => s.id === selectedUser.id);
                return (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50"></div>

                    <h3 className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                      {selectedUser.role === "seeker" ? (
                        <GraduationCap size={16} />
                      ) : selectedUser.role === "provider" ? (
                        <Briefcase size={16} />
                      ) : (
                        <Store size={16} />
                      )}
                      {selectedUser.role === "seeker"
                        ? "Applicant Details"
                        : selectedUser.role === "provider"
                          ? "Company Details"
                          : "Shop Management"}
                    </h3>

                    {details ? (
                      selectedUser.role === "shop" ? (
                        <div className="relative z-10">
                          {/* DOSSIER TABS FOR SHOPS */}
                          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 overflow-x-auto no-scrollbar p-1">
                            <button
                              onClick={() => setDossierTab("details")}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "details" ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
                            >
                              <Store size={14} /> Shop Details
                            </button>

                            <button
                              onClick={() => setDossierTab("license")}
                              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "license" ? "bg-emerald-600 text-white shadow-md" : "bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100"}`}
                            >
                              <BadgeCheck size={14} /> Current License Status
                              {/* ✨ FIXED: PULSING DOT WITH BETTER SPACING */}
                              {details.renewal_requested && (
                                <span className="absolute -top-1 -right-0.5 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white shadow-sm"></span>
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => setDossierTab("devices")}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "devices" ? "bg-indigo-600 text-white shadow-md" : "bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100"}`}
                            >
                              <Laptop size={14} /> Active Devices
                            </button>
                          </div>

                          {/* TAB 1: SHOP DETAILS */}
                          {dossierTab === "details" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 animate-in fade-in duration-300">
                              <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                                  Contact Info
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                      <Phone size={16} />
                                    </div>
                                    <DetailBox
                                      label="Phone"
                                      value={
                                        details.phone || details.contact_phone
                                      }
                                      highlight
                                    />
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                      <MapPin size={16} />
                                    </div>
                                    <DetailBox
                                      label="Location"
                                      value={details.location}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Shop Name"
                                  value={details.shop_name}
                                  highlight
                                />
                              </div>
                              <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Owner/Manager Name"
                                  value={details.full_name}
                                />
                              </div>
                            </div>
                          )}

                          {/* TAB 2: CURRENT LICENSE STATUS */}
                          {dossierTab === "license" && (
                            <div className="animate-in fade-in duration-300">
                              <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                  <div>
                                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-1">
                                      <CheckCircle2 size={14} /> Current License
                                      Status
                                    </h4>
                                    {details.subscription_expires_at ? (
                                      <p className="text-sm font-bold text-slate-800">
                                        Valid Until:{" "}
                                        <span className="text-emerald-600">
                                          {new Date(
                                            details.subscription_expires_at,
                                          ).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                          })}
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="text-sm font-bold text-slate-400 italic">
                                        No active license recorded.
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {details.renewal_requested && (
                                      <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        Renewal Requested
                                      </span>
                                    )}
                                    <button
                                      onClick={() =>
                                        handleRenewSubscription(selectedUser.id)
                                      }
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                    >
                                      Renew 1 Year
                                    </button>
                                  </div>
                                </div>

                                {/* AUDIT TRAIL */}
                                {renewalHistory.length > 0 && (
                                  <div className="mt-6 pt-6 border-t border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <History size={14} /> Audit Trail
                                      </h4>
                                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {renewalHistory.length} Record(s)
                                      </span>
                                    </div>
                                    <div className="space-y-3 border-l-2 border-slate-200 ml-2 pl-4">
                                      {renewalHistory.map((history) => {
                                        let isRevoke = history.action_type
                                          ?.toLowerCase()
                                          .includes("revoked");
                                        let isApprove = history.action_type
                                          ?.toLowerCase()
                                          .includes("approved");
                                        let badgeColor = isRevoke
                                          ? "text-red-600 bg-red-50"
                                          : isApprove
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-emerald-600 bg-emerald-50";
                                        let Icon = isRevoke
                                          ? ShieldAlert
                                          : isApprove
                                            ? BadgeCheck
                                            : CheckCircle2;

                                        return (
                                          <div
                                            key={history.id}
                                            className="relative"
                                          >
                                            <div
                                              className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${isRevoke ? "bg-red-400" : isApprove ? "bg-blue-400" : "bg-emerald-400"}`}
                                            ></div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-300 transition-colors">
                                              <div>
                                                <p
                                                  className={`text-xs font-bold flex items-center gap-1.5 ${badgeColor} w-fit px-2 py-0.5 rounded-md`}
                                                >
                                                  <Icon size={12} />{" "}
                                                  {history.action_type ||
                                                    "License Renewed"}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                                                  On{" "}
                                                  {new Date(
                                                    history.renewed_at,
                                                  ).toLocaleDateString()}{" "}
                                                  at{" "}
                                                  {new Date(
                                                    history.renewed_at,
                                                  ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  })}
                                                </p>
                                              </div>
                                              {!isRevoke &&
                                                history.new_expiry && (
                                                  <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                      Expiration Set To
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-800">
                                                      {new Date(
                                                        history.new_expiry,
                                                      ).getFullYear()}
                                                    </p>
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 3: ACTIVE DEVICES */}
                          {dossierTab === "devices" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                              <div className="bg-gradient-to-br from-white to-indigo-50/50 p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <ShieldCheck
                                        size={18}
                                        className="text-indigo-600"
                                      />
                                      <label className="block text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">
                                        Device License Limit
                                      </label>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm pl-6 sm:pl-0">
                                      Define the maximum number of unique
                                      physical computers permitted to log into
                                      this shop account.
                                    </p>
                                  </div>
                                  <div className="flex items-center shrink-0 pl-6 sm:pl-0">
                                    <div className="flex items-center bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
                                      <input
                                        type="number"
                                        min="1"
                                        className="w-16 md:w-20 py-2.5 px-3 font-black text-center text-indigo-900 text-lg outline-none bg-transparent"
                                        value={details.device_limit || 1}
                                        onChange={async (e) => {
                                          const newLimit =
                                            parseInt(e.target.value) || 1;
                                          setShopDetails((prev) =>
                                            prev.map((s) =>
                                              s.id === selectedUser.id
                                                ? {
                                                    ...s,
                                                    device_limit: newLimit,
                                                  }
                                                : s,
                                            ),
                                          );

                                          const { error } = await supabase.rpc(
                                            "admin_update_device_limit",
                                            {
                                              target_shop_id: selectedUser.id,
                                              new_limit: newLimit,
                                            },
                                          );

                                          if (error) {
                                            alert(
                                              "Error updating limit: " +
                                                error.message,
                                            );
                                            fetchData();
                                          }
                                        }}
                                      />
                                      <div className="bg-indigo-50/80 px-3 md:px-4 py-3 border-l border-indigo-100 flex items-center justify-center h-full">
                                        <span className="text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest">
                                          Devices
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <ShopDeviceManager shopId={selectedUser.id} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 relative z-10">
                          <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                              Contact Info
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                  <Phone size={16} />
                                </div>
                                <DetailBox
                                  label="Phone"
                                  value={details.phone || details.contact_phone}
                                  highlight
                                />
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                  <MapPin size={16} />
                                </div>
                                <DetailBox
                                  label="Location"
                                  value={details.location}
                                />
                              </div>
                            </div>
                          </div>

                          {selectedUser.role === "seeker" && (
                            <>
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Target Job Title"
                                  value={details.title}
                                  highlight
                                />
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Experience Level"
                                  value={details.experience}
                                />
                              </div>
                              <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Highest Qualification"
                                  value={details.qualification}
                                />
                              </div>
                            </>
                          )}

                          {selectedUser.role === "provider" && (
                            <>
                              <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <DetailBox
                                  label="Company Name"
                                  value={details.company_name}
                                  highlight
                                />
                              </div>
                              <div className="md:col-span-2 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                                  Company Summary
                                </span>
                                <div className="text-slate-700 text-sm leading-relaxed bg-slate-50/50 p-5 rounded-2xl border-l-4 border-l-purple-400 border border-slate-100 whitespace-pre-wrap">
                                  {details.job_offering || (
                                    <span className="italic text-slate-400">
                                      No description provided.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                        <AlertCircle
                          size={28}
                          className="mx-auto text-slate-300 mb-3"
                        />
                        <p className="text-slate-500 font-medium px-4">
                          Profile setup incomplete.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
