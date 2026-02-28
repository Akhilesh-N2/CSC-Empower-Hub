import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import fpPromise from '@fingerprintjs/fingerprintjs';

export function useDeviceTracker() {
    const navigate = useNavigate();

    useEffect(() => {
        const trackAndVerifyDevice = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const ua = navigator.userAgent;

                // 🚨 1. BLOCK MOBILE PHONES 🚨
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
                if (isMobile) {
                    await supabase.auth.signOut();
                    alert("SECURITY POLICY: Mobile access is restricted. Use a Desktop computer.");
                    window.location.href = '/login';
                    return;
                }

                // 🚨 2. BLOCK INCOGNITO / PRIVATE MODE 🚨
                let isPrivate = false;
                if ("storage" in navigator && "estimate" in navigator.storage) {
                    const { quota } = await navigator.storage.estimate();
                    if (quota < 120000000) isPrivate = true; 
                }

                if (isPrivate) {
                    await supabase.auth.signOut();
                    alert("SECURITY ALERT: Private/Incognito browsing is disabled for the Shop Dashboard. Please use a normal window.");
                    window.location.href = '/login';
                    return;
                }

                // 💻 3. GENERATE STICKY HARDWARE ID 💻
                const fp = await fpPromise.load();
                const result = await fp.get();
                const hardwareId = result.visitorId; 
                
                // Hybrid combo: Hardware ID + LocalStorage
                localStorage.setItem('shop_device_fingerprint', hardwareId);

                // --- NEW: FETCH SHOP SPECIFIC DEVICE LIMIT ---
                const { data: shopProfile } = await supabase
                    .from('shop_profiles')
                    .select('device_limit')
                    .eq('id', user.id)
                    .single();
                
                const limit = shopProfile?.device_limit || 1;

                // 4. THE GLOBAL BAN CHECK
                const { data: globalBlockCheck } = await supabase
                    .from('shop_devices')
                    .select('is_blocked')
                    .eq('device_id', hardwareId)
                    .eq('is_blocked', true)
                    .limit(1);

                if (globalBlockCheck && globalBlockCheck.length > 0) {
                    await supabase.auth.signOut();
                    alert("SECURITY ALERT: This physical computer has been permanently banned.");
                    window.location.href = '/login';
                    return;
                }

                // 5. UPDATE DATABASE LOG & LIMIT CHECK
                let ip = 'Unknown';
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    const data = await res.json();
                    ip = data.ip;
                } catch (e) {}

                const browserInfo = ua.substring(0, 50) + '...'; 

                // Check for existing row for this specific shop to determine if this is a "new" device
                const { data: existingDevice } = await supabase
                    .from('shop_devices')
                    .select('id')
                    .eq('shop_id', user.id)
                    .eq('device_id', hardwareId)
                    .single();

                // --- NEW: LICENSE LIMIT ENFORCEMENT ---
                // If it's a new device, check if they have room in their license
                if (!existingDevice) {
                    const { count } = await supabase
                        .from('shop_devices')
                        .select('*', { count: 'exact', head: true })
                        .eq('shop_id', user.id)
                        .eq('is_blocked', false);

                    if (count >= limit) {
                        await supabase.auth.signOut();
                        alert(`LICENSE LIMIT REACHED: Your plan allows only ${limit} device(s). Please log out from other devices or contact Admin to upgrade.`);
                        window.location.href = '/login';
                        return;
                    }
                }

                // Final Step: Update timestamp or Register new device
                if (existingDevice) {
                    await supabase.from('shop_devices').update({
                        ip_address: ip,
                        last_active: new Date()
                    }).eq('id', existingDevice.id);
                } else {
                    await supabase.from('shop_devices').insert({
                        shop_id: user.id,
                        device_id: hardwareId,
                        ip_address: ip,
                        browser_info: browserInfo
                    });
                }

            } catch (err) {
                console.error("Device tracking error:", err);
            }
        };

        trackAndVerifyDevice();
    }, [navigate]);
}