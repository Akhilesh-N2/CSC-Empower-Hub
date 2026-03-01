import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MonitorX, MonitorCheck, Monitor, Clock, Trash2, Globe, Laptop } from 'lucide-react';

export default function ShopDeviceManager({ shopId }) {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = async () => {
        try {
            const { data, error } = await supabase
                .from('shop_devices')
                .select('*')
                .eq('shop_id', shopId)
                .order('last_active', { ascending: false });
                
            if (error) throw error;
            setDevices(data || []);
        } catch (error) {
            console.error("Error fetching devices:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) fetchDevices();
    }, [shopId]);

    const toggleBlockStatus = async (deviceId, currentStatus) => {
        const action = currentStatus ? "UNBLOCK" : "BLOCK (Kick out)";
        if (!window.confirm(`Are you sure you want to ${action} this device?`)) return;

        try {
            const { error } = await supabase
                .from('shop_devices')
                .update({ is_blocked: !currentStatus })
                .eq('id', deviceId);

            if (error) throw error;
            
            // Update the UI instantly
            setDevices(devices.map(d => d.id === deviceId ? { ...d, is_blocked: !currentStatus } : d));
        } catch (error) {
            alert("Failed to update device status: " + error.message);
        }
    };

    const handleDeleteDevice = async (deviceId) => {
        if (!window.confirm("Are you sure you want to permanently delete this device record?\n\nIf this device logs in again, it will be treated as a brand new device.")) return;

        try {
            const { error } = await supabase
                .from('shop_devices')
                .delete()
                .eq('id', deviceId);

            if (error) throw error;
            
            // Remove it from the screen instantly
            setDevices(devices.filter(d => d.id !== deviceId));
        } catch (error) {
            alert("Failed to delete device: " + error.message);
        }
    };

    if (loading) return (
      <div className="p-6 text-slate-400 text-sm font-medium animate-pulse flex items-center justify-center gap-2 border border-slate-100 rounded-3xl bg-slate-50 mt-4">
        <Monitor size={16} className="animate-bounce" /> Loading device history...
      </div>
    );

    return (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm mt-4">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-slate-800 font-black flex items-center gap-2 text-base md:text-lg">
                    <Monitor size={18} className="text-indigo-600" /> 
                    Active Devices 
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-indigo-100 ml-1">
                      {devices.length}
                    </span>
                </h3>
            </div>

            {devices.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    <Laptop size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm font-medium">No devices have logged into this account yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {devices.map((device, index) => {
                      // Determines if it's the most recently active device
                      const isLatest = index === 0 && !device.is_blocked; 

                      return (
                        <div key={device.id} className={`flex flex-col xl:flex-row xl:items-center justify-between p-4 md:p-5 rounded-2xl border transition-all duration-300 group ${
                          device.is_blocked 
                            ? 'bg-red-50/50 border-red-100 hover:border-red-200' 
                            : isLatest 
                              ? 'bg-gradient-to-r from-indigo-50/30 to-white border-indigo-100 shadow-[0_2px_10px_rgba(99,102,241,0.05)]'
                              : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                        }`}>
                            
                            <div className="mb-4 xl:mb-0 flex-1 pr-4">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide border ${
                                      device.is_blocked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      <Globe size={12} /> {device.ip_address}
                                    </div>

                                    {isLatest && (
                                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-500">
                                        Current Session
                                      </span>
                                    )}

                                    {device.is_blocked && (
                                      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-sm">
                                        Banned
                                      </span>
                                    )}
                                </div>
                                
                                <div className="text-xs text-slate-500 font-mono bg-white/60 p-2 rounded-lg border border-slate-100 w-full max-w-lg truncate" title={device.browser_info}>
                                    {device.browser_info || "Unknown Browser Signature"}
                                </div>
                                
                                <div className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase tracking-wider pl-1">
                                    <Clock size={12} /> Last active: <span className="text-slate-500">{new Date(device.last_active).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 xl:shrink-0 pt-3 xl:pt-0 border-t border-slate-100 xl:border-none">
                                {/* BLOCK / UNBLOCK BUTTON */}
                                <button 
                                    onClick={() => toggleBlockStatus(device.id, device.is_blocked)}
                                    className={`flex-1 xl:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm border ${
                                        device.is_blocked 
                                        ? 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300' 
                                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white'
                                    }`}
                                >
                                    {device.is_blocked ? (
                                        <><MonitorCheck size={14} /> Unblock Access</>
                                    ) : (
                                        <><MonitorX size={14} /> Kick & Ban</>
                                    )}
                                </button>

                                {/* DELETE BUTTON */}
                                <button
                                    onClick={() => handleDeleteDevice(device.id)}
                                    className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm group-hover:border-slate-300"
                                    title="Delete Record Permanently"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                      )
                    })}
                </div>
            )}
        </div>
    );
}