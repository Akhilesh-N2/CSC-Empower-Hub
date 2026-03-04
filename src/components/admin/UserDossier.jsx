import React, { useState } from "react";
import {
  ChevronLeft, KeyRound, Trash2, CheckCircle2, AlertCircle,
  User, Store, GraduationCap, Briefcase, Phone, MapPin,
  BadgeCheck, Laptop, History, ShieldAlert, ShieldCheck, Eye, EyeOff, X 
} from "lucide-react";
import ShopDeviceManager from "../ShopDeviceManager";

const DetailBox = ({ label, value, highlight }) => (
  <div className="flex flex-col group">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">
      {label}
    </span>
    <span className={`text-sm md:text-base ${highlight ? "text-blue-600 font-black" : "text-slate-800 font-semibold"}`}>
      {value || "Not Provided"}
    </span>
  </div>
);

export default function UserDossier({
  selectedUser,
  setSelectedUser,
  details,
  jobs,
  renewalHistory,
  dossierTab,
  setDossierTab,
  handleForcePasswordReset,
  handleDeleteUser,
  toggleUserApproval,
  handleRenewSubscription,
  handleActivatePaidLicense, 
  handleCancelRenewalRequest, 
  toggleJobStatus,
  deleteJob,
  updateDeviceLimit
}) {
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  if (!details) return null;

  const currentExpiry = details?.subscription_expires_at ? new Date(details.subscription_expires_at) : null;
  const daysRemaining = currentExpiry ? Math.ceil((currentExpiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const hasLongTermLicense = daysRemaining > 15;

  return (
    <div className="animate-in slide-in-from-right duration-300">
      {/* DOSSIER HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-200 pb-4 md:pb-6">
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 hover:text-blue-600 font-bold transition group w-full sm:w-fit text-sm bg-white px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Directory
        </button>
        <div className="flex gap-2 w-full sm:w-fit">
          <button
            onClick={() => handleForcePasswordReset(selectedUser.id, selectedUser.email)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition shadow-sm"
          >
            <KeyRound size={16} /> Reset Password
          </button>
          <button
            onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition shadow-sm"
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* LEFT COLUMN: IDENTITY CARD */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${selectedUser.role === "seeker" ? "bg-blue-500" : selectedUser.role === "provider" ? "bg-purple-500" : "bg-emerald-500"}`}></div>
            <div className="flex flex-col items-center text-center mt-2 mb-8">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-xl mb-5 transform rotate-3 ${selectedUser.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : selectedUser.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                <span className="-rotate-3">{selectedUser.email.substring(0, 1).toUpperCase()}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 w-full truncate px-2" title={selectedUser.email}>
                {details.full_name || details.company_name || details.shop_name || "Name Not Provided"}
              </h3>
              <div className="text-slate-500 text-sm mt-1.5 flex items-center justify-center gap-2">{selectedUser.email}</div>
              
              {selectedUser.role === "shop" && details.member_id && (
                <div className="mt-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-xs font-mono font-bold border border-emerald-200 shadow-sm">
                  SHOP ID: #{details.member_id}
                </div>
              )}
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 shadow-inner">
                <User size={14} /> {selectedUser.role}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <button
                onClick={() => toggleUserApproval(selectedUser.id, selectedUser.is_approved, selectedUser.role, selectedUser.email)}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all ${selectedUser.is_approved ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {selectedUser.is_approved ? <><AlertCircle size={18} /> Revoke Access</> : <><CheckCircle2 size={18} /> Approve Trial</>}
              </button>

              {selectedUser.role === "shop" && selectedUser.is_approved && (
                <button
                  onClick={() => !hasLongTermLicense && handleActivatePaidLicense(selectedUser.id)}
                  disabled={hasLongTermLicense}
                  title={hasLongTermLicense ? `Paid Plan is active (${daysRemaining} days remaining)` : "Start 1-Year Paid Plan"}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all ${
                    hasLongTermLicense 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  <BadgeCheck size={18} /> {hasLongTermLicense ? "Paid Plan Active" : "Activate Paid (1 Yr)"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED DOSSIER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50"></div>
            <h3 className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
              {selectedUser.role === "seeker" ? <GraduationCap size={16} /> : selectedUser.role === "provider" ? <Briefcase size={16} /> : <Store size={16} />}
              {selectedUser.role === "seeker" ? "Applicant Details" : selectedUser.role === "provider" ? "Company Details" : "Shop Management"}
            </h3>

            {/* SHOP DOSSIER */}
            {selectedUser.role === "shop" ? (
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 overflow-x-auto no-scrollbar p-1">
                  <button onClick={() => setDossierTab("details")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "details" ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                    <Store size={14} /> Shop Details
                  </button>
                  <button onClick={() => setDossierTab("license")} className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "license" ? "bg-emerald-600 text-white shadow-md" : "bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100"}`}>
                    <BadgeCheck size={14} /> Current License Status
                    {details.renewal_requested && (
                      <span className="absolute -top-1 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white shadow-sm"></span>
                      </span>
                    )}
                  </button>
                  <button onClick={() => setDossierTab("devices")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${dossierTab === "devices" ? "bg-indigo-600 text-white shadow-md" : "bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100"}`}>
                    <Laptop size={14} /> Active Devices
                  </button>
                </div>

                {dossierTab === "details" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 animate-in fade-in duration-300">
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
                    <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Shop Name" value={details.shop_name} highlight /></div>
                    <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Owner/Manager Name" value={details.full_name} /></div>
                  </div>
                )}

                {dossierTab === "license" && (
                  <div className="animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div>
                          <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-1"><CheckCircle2 size={14} /> Current License Status</h4>
                          {details.subscription_expires_at ? (
                            <p className="text-sm font-bold text-slate-800">Valid Until: <span className="text-emerald-600">{new Date(details.subscription_expires_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span></p>
                          ) : (<p className="text-sm font-bold text-slate-400 italic">No active license recorded.</p>)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {details.renewal_requested && (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">Renewal Requested</span>
                              <button
                                onClick={() => handleCancelRenewalRequest(selectedUser.id)}
                                className="p-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors shadow-sm"
                                title="Cancel this renewal request"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}

                          <button 
                            onClick={() => handleRenewSubscription(selectedUser.id)} 
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            Renew (+1 Yr)
                          </button>
                        </div>
                      </div>

                      {renewalHistory.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} /> Audit Trail</h4>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{renewalHistory.length} Record(s)</span>
                          </div>
                          <div className="space-y-3 border-l-2 border-slate-200 ml-2 pl-4">
                            {renewalHistory.map((history) => {
                              // ✨ FIX: ensure the word "canceled" highlights red!
                              let isRevoke = history.action_type?.toLowerCase().includes("revoked") || history.action_type?.toLowerCase().includes("canceled");
                              let isPending = history.action_type?.toLowerCase().includes("pending");
                              let badgeColor = isRevoke ? "text-red-600 bg-red-50" : isPending ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";
                              let Icon = isRevoke ? ShieldAlert : isPending ? History : BadgeCheck;
                              return (
                                <div key={history.id} className="relative">
                                  <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${isRevoke ? "bg-red-400" : isPending ? "bg-amber-400" : "bg-emerald-400"}`}></div>
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-300 transition-colors">
                                    <div>
                                      <p className={`text-xs font-bold flex items-center gap-1.5 ${badgeColor} w-fit px-2 py-0.5 rounded-md`}><Icon size={12} /> {history.action_type || "License Renewed"}</p>
                                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">On {new Date(history.renewed_at).toLocaleDateString()} at {new Date(history.renewed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    {!isRevoke && !isPending && history.new_expiry && (
                                      <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expiration Set To</p>
                                        <p className="text-xs font-bold text-slate-800">{new Date(history.new_expiry).getFullYear()}</p>
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

                {dossierTab === "devices" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-white to-indigo-50/50 p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
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
                            <input type="number" min="1" className="w-16 md:w-20 py-2.5 px-3 font-black text-center text-indigo-900 text-lg outline-none bg-transparent" value={details.device_limit || 1} onChange={(e) => {
                              const newLimit = parseInt(e.target.value) || 1;
                              updateDeviceLimit(newLimit);
                            }} />
                            <div className="bg-indigo-50/80 px-3 md:px-4 py-3 border-l border-indigo-100 flex items-center justify-center h-full">
                              <span className="text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest">Devices</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ShopDeviceManager shopId={selectedUser.id} />
                  </div>
                )}
              </div>
            ) : selectedUser.role === "provider" ? (
              
              /* PROVIDER DOSSIER */
              <>
                <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Company Name" value={details.company_name} highlight /></div>
                <div className="md:col-span-2 mt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Company Summary</span>
                  <div className="text-slate-700 text-sm leading-relaxed bg-slate-50/50 p-5 rounded-2xl border-l-4 border-l-purple-400 border border-slate-100 whitespace-pre-wrap">
                    {details.job_offering || <span className="italic text-slate-400">No description provided.</span>}
                  </div>
                </div>
                <div className="md:col-span-2 mt-6 border-t pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Briefcase className="text-purple-600" /> Published Jobs</h3>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">{jobs.length} Active</span>
                  </div>
                  <div className="space-y-4">
                    {jobs.map(job => (
                      <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{job.title}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{job.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedJobDetails(selectedJobDetails?.id === job.id ? null : job)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedJobDetails?.id === job.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}>
                            {selectedJobDetails?.id === job.id ? "Close Preview" : "Preview"}
                          </button>
                          <button onClick={() => toggleJobStatus(job.id, job.is_active)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${job.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {job.is_active ? 'Live' : 'Hidden'}
                          </button>
                          <button onClick={() => deleteJob(job.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Delete Job"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    {jobs.length === 0 && (
                      <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Briefcase size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 font-medium">No jobs published by this provider.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SEEKER PREVIEW MODAL */}
                {selectedJobDetails && (
                  <div className="md:col-span-2 mt-6 p-5 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                    <div className="absolute top-0 right-0 p-3 md:p-4">
                      <button onClick={() => setSelectedJobDetails(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><EyeOff size={16} /></button>
                    </div>
                    <div className="flex flex-col gap-4 mt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold w-fit"><Eye size={14} /> Seeker View</div>
                      <h2 className="text-xl md:text-2xl font-black text-white pr-10">{selectedJobDetails.title}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                        <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-bold border border-purple-500/30 flex items-center gap-1.5"><Briefcase size={12} /> {selectedJobDetails.company || details.company_name}</span>
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-bold border border-blue-500/30 flex items-center gap-1.5"><MapPin size={12} /> {selectedJobDetails.location}</span>
                        {selectedJobDetails.salary && <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1.5">₹ {selectedJobDetails.salary}</span>}
                      </div>
                      <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 mt-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-widest">Job Description</span>
                        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedJobDetails.description || "No description provided."}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              
              /* SEEKER DOSSIER */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 relative z-10">
                <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Contact Info</h4>
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
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Target Job Title" value={details.title} highlight /></div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Experience Level" value={details.experience} /></div>
                <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><DetailBox label="Highest Qualification" value={details.qualification} /></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}