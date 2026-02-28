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
                    if (quota < 120000000) isPrivate = true; // Incognito typically has <120MB quota
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
                
                // We store it in localStorage too for speed, but rely on the hardwareId above
                localStorage.setItem('shop_device_fingerprint', hardwareId);

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

                // 5. UPDATE DATABASE LOG
                let ip = 'Unknown';
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    const data = await res.json();
                    ip = data.ip;
                } catch (e) {}

                const browserInfo = ua.substring(0, 50) + '...'; 

                // Check for existing row to avoid duplicates
                const { data: existingRow } = await supabase
                    .from('shop_devices')
                    .select('id')
                    .eq('shop_id', user.id)
                    .eq('device_id', hardwareId)
                    .single();

                if (existingRow) {
                    await supabase.from('shop_devices').update({
                        ip_address: ip,
                        last_active: new Date()
                    }).eq('id', existingRow.id);
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