import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MonitorX, MonitorCheck, Monitor, Clock, Trash2 } from 'lucide-react'; // <-- Added Trash2 here

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

    // --- NEW: DELETE DEVICE FUNCTION ---
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

    if (loading) return <div className="p-4 text-slate-500 text-sm animate-pulse">Loading devices...</div>;

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 text-sm md:text-base">
                    <Monitor size={16} className="text-blue-600" /> Active Devices ({devices.length})
                </h3>
            </div>

            {devices.length === 0 ? (
                <p className="text-sm text-slate-500 italic p-4 text-center bg-slate-50 rounded-xl">No devices have logged into this account yet.</p>
            ) : (
                <div className="space-y-3">
                    {devices.map((device) => (
                        <div key={device.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border ${device.is_blocked ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="mb-3 sm:mb-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-800">{device.ip_address}</span>
                                    {device.is_blocked && <span className="bg-red-200 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Blocked</span>}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-1 w-full max-w-[200px] md:max-w-xs truncate" title={device.browser_info}>
                                    {device.browser_info || "Unknown Browser"}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock size={10} /> Last active: {new Date(device.last_active).toLocaleString()}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* BLOCK / UNBLOCK BUTTON */}
                                <button 
                                    onClick={() => toggleBlockStatus(device.id, device.is_blocked)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                                        device.is_blocked 
                                        ? 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50' 
                                        : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    }`}
                                >
                                    {device.is_blocked ? (
                                        <><MonitorCheck size={14} /> Unblock</>
                                    ) : (
                                        <><MonitorX size={14} /> Kick & Block</>
                                    )}
                                </button>

                                {/* NEW: DELETE BUTTON */}
                                <button
                                    onClick={() => handleDeleteDevice(device.id)}
                                    className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition shadow-sm"
                                    title="Delete Record"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}