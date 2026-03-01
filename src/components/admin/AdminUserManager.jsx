import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, ChevronRight, Search, CheckCircle2, AlertCircle, Briefcase, MapPin, Phone, GraduationCap, User, Store, KeyRound, ShieldCheck, Trash2, EyeOff, Eye } from 'lucide-react';
import ShopDeviceManager from '../ShopDeviceManager';

const DetailBox = ({ label, value, highlight }) => (
  <div className="flex flex-col group">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{label}</span>
    <span className={`text-sm md:text-base ${highlight ? "text-blue-600 font-black" : "text-slate-800 font-semibold"}`}>{value || "Not Provided"}</span>
  </div>
);

export default function AdminUserManager({ users, jobs, seekerDetails, providerDetails, shopDetails: initialShopDetails, fetchData }) {
  const [userSubTab, setUserSubTab] = useState("seekers");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [shopDetails, setShopDetails] = useState(initialShopDetails);
  
  const itemsPerPage = 10;

  // Sync shop details if parent re-fetches
  useEffect(() => { setShopDetails(initialShopDetails); }, [initialShopDetails]);

  // Reset search and pagination on tab change
  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, [userSubTab]);

  const toggleUserApproval = async (id, currentStatus) => {
    try {
      const { data, error } = await supabase.from("profiles").update({ is_approved: !currentStatus }).eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Supabase RLS Policy blocked the update!");
      fetchData(); // Refresh global state
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser(prev => ({ ...prev, is_approved: !currentStatus }));
      }
    } catch (err) {
      alert("Database failed to approve user: " + err.message);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`🚨 WARNING: Are you absolutely sure you want to permanently delete ${email}? \n\nThis will wipe their login, profile, and all jobs they posted. This CANNOT be undone.`)) return;
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
    const newPassword = window.prompt(`Enter a new temporary password for ${userEmail}\n(Minimum 6 characters):`);
    if (!newPassword) return; 
    if (newPassword.length < 6) return alert("Password must be at least 6 characters long.");
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { userId: userId, newPassword: newPassword } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      alert(`Success! The password for ${userEmail} has been securely changed to:\n\n${newPassword}\n\nPlease share this with the user.`);
    } catch (err) {
      alert("Failed to reset password: " + err.message);
    }
  };

  const toggleJobStatus = async (id, currentStatus) => {
    await supabase.from("jobs").update({ is_active: !currentStatus, admin_override: !!currentStatus }).eq("id", id);
    fetchData();
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job permanently?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    fetchData();
  };

  const roleMap = { seekers: "seeker", providers: "provider", shops: "shop" };
  const usersByRole = users.filter((u) => u.role === roleMap[userSubTab]);
  const filteredUsers = usersByRole.filter((user) => user.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto">
      {!selectedUser ? (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">User Directory</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Manage platform access and review profiles.</p>
            </div>
            <div className="inline-flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/60 w-full md:w-fit overflow-x-auto no-scrollbar">
              <button onClick={() => setUserSubTab("seekers")} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "seekers" ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}>
                <GraduationCap size={16} /> Job Seekers
                <span className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "seekers" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{users.filter((u) => u.role === "seeker").length}</span>
              </button>
              <button onClick={() => setUserSubTab("providers")} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "providers" ? "bg-white text-purple-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}>
                <Briefcase size={16} /> Providers
                <span className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "providers" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-500"}`}>{users.filter((u) => u.role === "provider").length}</span>
              </button>
              <button onClick={() => setUserSubTab("shops")} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "shops" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}>
                <Store size={16} /> Shops
                <span className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "shops" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{users.filter((u) => u.role === "shop").length}</span>
              </button>
            </div>
          </div>

          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input type="text" placeholder={`Search ${userSubTab} by email...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm transition-all" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                  <tr><th className="p-4 md:p-5">Account Details</th><th className="p-4 md:p-5">Status</th><th className="p-4 md:p-5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 md:p-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ${user.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : user.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                            {user.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs md:text-sm">{user.email}</div>
                            <div className="text-[10px] md:text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">ID: {user.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:p-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border ${user.is_approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {user.is_approved ? <CheckCircle2 size={12} className="text-emerald-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                          {user.is_approved ? "Verified" : "Pending"}
                        </div>
                      </td>
                      <td className="p-4 md:p-5 text-right">
                        <button onClick={() => setSelectedUser(user)} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">View Dossier</button>
                      </td>
                    </tr>
                  ))}
                  {currentUsers.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-10 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3"><Search size={20} /></div>
                        <h3 className="text-slate-900 font-bold text-base">No accounts found</h3>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalUserPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-bold">Page <span className="text-slate-900">{currentPage}</span> / {totalUserPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalUserPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in slide-in-from-right duration-300">
          {/* DOSSIER HEADER ACTIONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-200 pb-4 md:pb-6">
            <button onClick={() => setSelectedUser(null)} className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 hover:text-blue-600 font-bold transition group w-full sm:w-fit text-sm bg-white px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm">
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Directory
            </button>
            <div className="flex gap-2 w-full sm:w-fit">
              <button onClick={() => handleForcePasswordReset(selectedUser.id, selectedUser.email)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition shadow-sm">
                <KeyRound size={16} /> Reset Password
              </button>
              <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition shadow-sm">
                <Trash2 size={16} /> Delete Account
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            {/* LEFT COLUMN: IDENTITY & STATUS CARD */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 `}></div>
                
                <div className="flex flex-col items-center text-center mt-2 mb-8">
                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-xl mb-5 transform rotate-3 ${selectedUser.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : selectedUser.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                    <span className="-rotate-3">{selectedUser.email.substring(0, 1).toUpperCase()}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 w-full truncate px-2" title={selectedUser.email}>
                    {(() => {
                      const d = selectedUser.role === "seeker" ? seekerDetails.find((s) => s.id === selectedUser.id) : selectedUser.role === "provider" ? providerDetails.find((p) => p.id === selectedUser.id) : shopDetails.find((s) => s.id === selectedUser.id);
                      return d?.full_name || d?.company_name || d?.shop_name || "Name Not Provided";
                    })()}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">{selectedUser.email}</p>
                  
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 shadow-inner">
                    <User size={14} /> {selectedUser.role}
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-6">
                  <button onClick={() => toggleUserApproval(selectedUser.id, selectedUser.is_approved)} className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all ${selectedUser.is_approved ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                    {selectedUser.is_approved ? (<><AlertCircle size={18} /> Revoke Approval</>) : (<><CheckCircle2 size={18} /> Approve User</>)}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILED DOSSIER */}
            <div className="lg:col-span-2 space-y-6">
              {(() => {
                const details = selectedUser.role === "seeker" ? seekerDetails.find((s) => s.id === selectedUser.id) : selectedUser.role === "provider" ? providerDetails.find((p) => p.id === selectedUser.id) : shopDetails.find((s) => s.id === selectedUser.id);
                return (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50"></div>
                    
                    <h3 className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                      {selectedUser.role === "seeker" ? <GraduationCap size={16} /> : selectedUser.role === "provider" ? <Briefcase size={16} /> : <Store size={16} />}
                      {selectedUser.role === "seeker" ? "Applicant Details" : selectedUser.role === "provider" ? "Company Details" : "Shop Details"}
                    </h3>
                    
                    {details ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 relative z-10">
                        <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Contact Info
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={16} /></div>
                              <DetailBox label="Phone" value={details.phone || details.contact_phone} highlight />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><MapPin size={16} /></div>
                              <DetailBox label="Location" value={details.location} />
                            </div>
                          </div>
                        </div>

                        {selectedUser.role === "seeker" && (
                          <>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <DetailBox label="Target Job Title" value={details.title} highlight />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <DetailBox label="Experience Level" value={details.experience} />
                            </div>
                            <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <DetailBox label="Highest Qualification" value={details.qualification} />
                            </div>
                            <div className="md:col-span-2 pt-4 border-t border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Reported Skillset</span>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(details.skills) && details.skills.length > 0 ? (
                                  details.skills.map((s, i) => <span key={i} className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200">{s}</span>)
                                ) : (
                                  <span className="text-slate-400 italic text-sm">No skills listed.</span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {selectedUser.role === "provider" && (
                          <>
                            <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <DetailBox label="Company Name" value={details.company_name} highlight />
                            </div>
                            <div className="md:col-span-2 mt-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Company Summary</span>
                              <div className="text-slate-700 text-sm leading-relaxed font-bold bg-white p-5 rounded-2xl  border border-slate-100 shadow-sm whitespace-pre-wrap">
                                {details.job_offering || <span className="italic text-slate-400">No description provided.</span>}
                              </div>
                            </div>
                          </>
                        )}

                        {selectedUser.role === "shop" && (
                          <>
                            <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Shop Name" value={details.shop_name} highlight /></div>
                            <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Owner/Manager Name" value={details.full_name} /></div>
                            
                            {/* DEVICE LICENSE LIMIT CONTROL */}
                            <div className="md:col-span-2 bg-gradient-to-br from-white to-indigo-50/50 p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm mt-4 mb-2 relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <ShieldCheck size={18} className="text-indigo-600" />
                                    <label className="block text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Device License Limit</label>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm pl-6 sm:pl-0">Define the maximum number of unique physical computers permitted to log into this shop account.</p>
                                </div>
                                <div className="flex items-center shrink-0 pl-6 sm:pl-0">
                                  <div className="flex items-center bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
                                    <input type="number" min="1" className="w-16 md:w-20 py-2.5 px-3 font-black text-center text-indigo-900 text-lg outline-none bg-transparent" value={details.device_limit || 1} onChange={async (e) => {
                                      const newLimit = parseInt(e.target.value) || 1;
                                      const { error } = await supabase.from("shop_profiles").update({ device_limit: newLimit }).eq("id", selectedUser.id);
                                      if (error) return alert("Error updating limit: " + error.message);
                                      setShopDetails((prev) => prev.map((s) => s.id === selectedUser.id ? { ...s, device_limit: newLimit } : s));
                                    }} />
                                    <div className="bg-indigo-50/80 px-3 md:px-4 py-3 border-l border-indigo-100 flex items-center justify-center h-full">
                                      <span className="text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest">Devices</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="md:col-span-2"><ShopDeviceManager shopId={selectedUser.id} /></div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                        <AlertCircle size={28} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium px-4">Profile setup incomplete.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 💼 PUBLISHED JOBS SECTION */}
              {selectedUser.role === "provider" && (
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden mt-6">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-slate-800 font-black flex items-center gap-2 text-base md:text-lg">
                      <Briefcase size={18} className="text-purple-600" /> Published Jobs
                    </h3>
                    <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-100">{jobs.filter((j) => j.provider_id === selectedUser.id).length} Active</span>
                  </div>
                  
                  <div className="overflow-x-auto w-full">
                    {jobs.filter((j) => j.provider_id === selectedUser.id).length > 0 ? (
                      <table className="w-full text-left min-w-[500px]">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="pb-3 pl-2">Job Title</th>
                            <th className="pb-3 text-center">Visibility Status</th>
                            <th className="pb-3 pr-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobs.filter((j) => j.provider_id === selectedUser.id).map((job) => (
                            <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="py-4 pl-2 font-bold text-slate-800 text-sm">{job.title}</td>
                              
                              <td className="py-4 text-center">
                                {/* ✨ NEW SLEEK TOGGLE SWITCH */}
                                <div className="inline-flex items-center justify-center gap-2.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${!job.is_active ? 'text-slate-600' : 'text-slate-300'}`}>Hidden</span>
                                  <button
                                    onClick={() => toggleJobStatus(job.id, job.is_active)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out focus:outline-none shadow-inner border border-transparent ${
                                      job.is_active ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-300 border-slate-400'
                                    }`}
                                  >
                                    <div
                                      className={`absolute top-[1px] left-[1px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                                        job.is_active ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${job.is_active ? 'text-emerald-600' : 'text-slate-300'}`}>Live</span>
                                </div>
                              </td>

                              <td className="py-4 pr-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setSelectedJobDetails(selectedJobDetails?.id === job.id ? null : job)} 
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedJobDetails?.id === job.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                                  >
                                    {selectedJobDetails?.id === job.id ? "Close" : "Preview"}
                                  </button>
                                  <button 
                                    onClick={() => deleteJob(job.id)} 
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                                    title="Delete Job"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        <Briefcase size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm font-medium">No jobs published yet.</p>
                      </div>
                    )}
                    
                    {/* PREVIEW JOB EXPANDED VIEW */}
                    {selectedJobDetails && (
                      <div className="mt-6 p-5 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                        <div className="absolute top-0 right-0 p-3 md:p-4">
                          <button onClick={() => setSelectedJobDetails(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><EyeOff size={16} /></button>
                        </div>
                        <div className="flex flex-col gap-4 mt-2">
                          <h2 className="text-xl md:text-2xl font-black text-white pr-10">{selectedJobDetails.title}</h2>
                          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                            <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-bold border border-purple-500/30 flex items-center gap-1.5">
                              <Briefcase size={12} /> {selectedJobDetails.company}
                            </span>
                            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-bold border border-blue-500/30 flex items-center gap-1.5">
                              <MapPin size={12} /> {selectedJobDetails.location}
                            </span>
                          </div>
                          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 mt-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-widest">Job Description</span>
                            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedJobDetails.description || "No description provided."}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}