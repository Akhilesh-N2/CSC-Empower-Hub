import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style'; 
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Download, Store, Receipt, IndianRupee, Settings, Save, MapPin, Phone, User, FileText, Printer } from 'lucide-react';

function ShopDashboard() {
  const [activeTab, setActiveTab] = useState('billing'); 
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Print Page Size State
  const [pageSize, setPageSize] = useState('Thermal80'); // Defaults to POS Thermal Receipt

  // 1. STATE: Shop Details & Profile Errors
  const [shopInfo, setShopInfo] = useState({ 
    shop_name: '', 
    full_name: '',
    phone: '', 
    location: '',
    address: '',
    gstin: ''
  });
  const [profileErrors, setProfileErrors] = useState({
    shop_name: false,
    full_name: false,
    phone: false
  });

  // 2. STATE: Billing Items & Billing Errors
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shop_billing_items');
    return saved ? JSON.parse(saved) : [];
  });

  // Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  
  // Custom Error State for Billing
  const [billErrors, setBillErrors] = useState({
    itemName: false,
    quantity: false,
    price: false
  });

  // 3. FETCH SHOP DETAILS ON LOAD
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data, error } = await supabase
            .from('shop_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (data && !error) {
            setShopInfo({
              shop_name: data.shop_name || '',
              full_name: data.full_name || '',
              phone: data.phone || '',
              location: data.location || '',
              address: data.address || '',
              gstin: data.gstin || ''
            });
          }
        }
      } catch (err) {
        console.error("Error fetching shop details:", err);
      }
    };
    fetchShopData();
  }, []);

  // 4. SYNC WITH LOCAL STORAGE
  useEffect(() => {
    localStorage.setItem('shop_billing_items', JSON.stringify(items));
  }, [items]);

  // --- SAAS DEVICE TRACKING & SECURITY ---
  useEffect(() => {
    const trackAndVerifyDevice = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get or Create a unique Device ID in the browser
        let deviceId = localStorage.getItem('shop_device_fingerprint');
        if (!deviceId) {
          deviceId = crypto.randomUUID(); // Creates a permanent unique ID for this specific browser
          localStorage.setItem('shop_device_fingerprint', deviceId);
        }

        // 2. Fetch their current IP address safely
        let ip = 'Unknown';
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          ip = ipData.ip;
        } catch (e) { console.log("Could not fetch IP"); }

        // 3. Get basic browser info
        const browserInfo = navigator.userAgent;

        // 4. Register or Update the device in Supabase
        const { data: deviceData, error } = await supabase
          .from('shop_devices')
          .upsert({ 
            shop_id: user.id, 
            device_id: deviceId, 
            ip_address: ip, 
            browser_info: browserInfo,
            last_active: new Date()
          }, { onConflict: 'shop_id, device_id' })
          .select()
          .single();

        // 5. THE KILL SWITCH: If Admin blocked this device, kick them out!
        if (deviceData?.is_blocked) {
          await supabase.auth.signOut();
          localStorage.removeItem('shop_device_fingerprint'); // Wipe the fingerprint
          alert("SECURITY ALERT: This device has been revoked by the Administrator. Please contact support to upgrade your license.");
          window.location.href = '/login';
        }

      } catch (err) {
        console.error("Device tracking error:", err);
      }
    };

    trackAndVerifyDevice();
  }, []);

  // 5. BILLING LOGIC WITH CUSTOM VALIDATION
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = (e) => {
    e.preventDefault();
    
    // Check for empty fields
    const newErrors = {
      itemName: !itemName.trim(),
      quantity: !quantity || Number(quantity) < 1,
      price: !price || Number(price) <= 0
    };

    // If any errors exist, update state and stop submission
    if (newErrors.itemName || newErrors.quantity || newErrors.price) {
      setBillErrors(newErrors);
      return;
    }

    // Clear errors if valid
    setBillErrors({ itemName: false, quantity: false, price: false });

    const newItem = {
      id: Date.now().toString(),
      name: itemName,
      quantity: Number(quantity),
      price: Number(price),
      total: Number(quantity) * Number(price)
    };

    setItems([...items, newItem]);
    setItemName('');
    setQuantity(1);
    setPrice('');
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const clearAll = () => {
    if(window.confirm("Are you sure you want to clear the current bill?")) {
      setItems([]);
    }
  }

  // 6. PROFILE UPDATE LOGIC WITH CUSTOM VALIDATION
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    // Check for required profile fields
    const newErrors = {
      shop_name: !shopInfo.shop_name.trim(),
      full_name: !shopInfo.full_name.trim(),
      phone: !shopInfo.phone.trim()
    };

    if (newErrors.shop_name || newErrors.full_name || newErrors.phone) {
      setProfileErrors(newErrors);
      return;
    }

    // Clear errors if valid
    setProfileErrors({ shop_name: false, full_name: false, phone: false });
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('shop_profiles')
        .update({
          shop_name: shopInfo.shop_name,
          full_name: shopInfo.full_name,
          phone: shopInfo.phone,
          location: shopInfo.location,
          address: shopInfo.address,
          gstin: shopInfo.gstin
        })
        .eq('id', userId);

      if (error) throw error;
      alert("Shop Profile Updated Successfully!");
    } catch (error) {
      alert("Error updating profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 7. HIGH-FIDELITY PRINT LOGIC
  const handlePrint = () => {
    if (items.length === 0) return alert("Please add items to the bill before printing.");

    let pageCSS = "";
    let containerStyle = "";

    if (pageSize === "A4") {
      pageCSS = "@page { size: A4; margin: 20mm; }";
      containerStyle = "max-width: 210mm; margin: 0 auto; font-size: 14px;";
    } else if (pageSize === "A5") {
      pageCSS = "@page { size: A5; margin: 15mm; }";
      containerStyle = "max-width: 148mm; margin: 0 auto; font-size: 12px;";
    } else if (pageSize === "Thermal80") {
      pageCSS = "@page { size: 80mm auto; margin: 5mm; }";
      containerStyle = "max-width: 72mm; margin: 0 auto; font-size: 12px; font-family: 'Courier New', Courier, monospace;";
    }

    const itemsHtml = items.map((item, i) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ccc;">${i + 1}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ccc; word-break: break-word;">${item.name}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: right;">${item.price.toFixed(2)}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Invoice</title>
          <style>
            body { font-family: sans-serif; color: #000; margin: 0; padding: 0; background: #fff; }
            ${pageCSS}
            table { w-full; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; width: 100%; }
            th { border-bottom: 2px solid #000; padding-bottom: 6px; text-align: left; font-size: 0.9em; text-transform: uppercase; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .dashed-line { border-top: 2px dashed #000; margin: 15px 0; }
            .header-info p { margin: 4px 0; color: #333; }
          </style>
        </head>
        <body>
          <div style="${containerStyle}">
            <div class="text-center header-info">
              <h1 style="margin: 0 0 5px 0; font-size: ${pageSize === 'Thermal80' ? '18px' : '28px'}; text-transform: uppercase;">
                ${shopInfo.shop_name || 'RETAIL INVOICE'}
              </h1>
              <p>${shopInfo.address || shopInfo.location || ''}</p>
              <p>Ph: ${shopInfo.phone || 'N/A'}</p>
              ${shopInfo.gstin ? `<p><strong>GSTIN:</strong> ${shopInfo.gstin.toUpperCase()}</p>` : ''}
            </div>
            
            <div class="dashed-line"></div>
            
            <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
              <span><strong>Date:</strong> ${dateStr}</span>
              <span><strong>Time:</strong> ${timeStr}</span>
            </div>
            
            <div class="dashed-line"></div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 45%;">Item</th>
                  <th class="text-center" style="width: 15%;">Qty</th>
                  <th class="text-right" style="width: 15%;">Rate</th>
                  <th class="text-right" style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="dashed-line"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: ${pageSize === 'Thermal80' ? '16px' : '20px'}; font-weight: bold;">GRAND TOTAL:</span>
              <span style="font-size: ${pageSize === 'Thermal80' ? '18px' : '24px'}; font-weight: bold;">Rs. ${grandTotal.toFixed(2)}</span>
            </div>
            
            <div class="dashed-line"></div>
            
            <div class="text-center" style="margin-top: 20px;">
              <p style="margin: 0; font-weight: bold;">Thank you for your business!</p>
              <p style="margin: 4px 0; font-size: 0.8em; color: #666;">Software by CSC Empower Hub</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // 8. KEEPS EXCEL EXPORT (Secondary Option)
  const exportToExcel = () => {
    if (items.length === 0) return alert("Please add items before exporting.");
    const exportData = items.map((item, index) => ({
      'S.No': index + 1, 'Product Name': item.name, 'Quantity': item.quantity,
      'Unit Price (₹)': item.price, 'Total Amount (₹)': item.total
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: 'A8' });
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }];
    const dateStr = new Date().toLocaleDateString('en-GB'); 
    const headerData = [
      [shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : 'RETAIL INVOICE'], 
      [shopInfo.address ? shopInfo.address : `Location: ${shopInfo.location || 'N/A'}`], 
      [`Contact: ${shopInfo.phone || 'N/A'}`, '', '', '', `Date: ${dateStr}`], 
      [shopInfo.gstin ? `GSTIN: ${shopInfo.gstin.toUpperCase()}` : '', '', '', '', ''], 
      [], ['TAX INVOICE / BILL OF SUPPLY'], []  
    ];
    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', 'GRAND TOTAL', `₹${grandTotal.toFixed(2)}`]], { origin: -1 });
    if (worksheet['A1']) worksheet['A1'].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
    if (worksheet['A2']) worksheet['A2'].s = { font: { sz: 10 }, alignment: { horizontal: 'center' } };
    if (worksheet['A3']) worksheet['A3'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } };
    if (worksheet['E3']) worksheet['E3'].s = { font: { sz: 11 }, alignment: { horizontal: 'right' } };
    if (worksheet['A4']) worksheet['A4'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } };
    if (worksheet['A6']) worksheet['A6'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
    const headers = ['A8', 'B8', 'C8', 'D8', 'E8'];
    headers.forEach(cell => { if (worksheet[cell]) worksheet[cell].s = { font: { bold: true }, border: { bottom: { style: 'thin', color: { rgb: "000000" } } } }; });
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const lastRow = range.e.r + 1; 
    if (worksheet[`D${lastRow}`]) worksheet[`D${lastRow}`].s = { font: { bold: true } };
    if (worksheet[`E${lastRow}`]) worksheet[`E${lastRow}`].s = { font: { bold: true } };
    worksheet['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, `${shopInfo.shop_name ? shopInfo.shop_name.replace(/\s+/g, '_') : 'Invoice'}_${dateStr.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* TOP NAVIGATION TABS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex w-full md:w-auto gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('billing')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Receipt size={18} /> POS Billing
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Settings size={18} /> Shop Settings
            </button>
          </div>
          
          {/* PRINTER & EXPORT CONTROLS */}
          {activeTab === 'billing' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Page Size Selector & Print Button Combo */}
              <div className="flex flex-1 md:flex-none items-center bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm h-11">
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="h-full px-3 text-xs font-bold text-slate-600 bg-emerald-50/50 outline-none cursor-pointer border-r border-emerald-100 focus:bg-emerald-50 transition-colors"
                >
                  <option value="Thermal80">Thermal POS (80mm)</option>
                  <option value="A4">A4 Sheet</option>
                  <option value="A5">A5 Sheet</option>
                </select>
                <button 
                  onClick={handlePrint}
                  className="h-full flex flex-1 items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold transition text-sm"
                >
                  <Printer size={16} /> Print Bill
                </button>
              </div>

              {/* Secondary Export Button */}
              <button 
                onClick={exportToExcel}
                className="h-11 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-emerald-700 border border-slate-200 px-4 rounded-xl font-bold transition shadow-sm"
                title="Download Excel Backup"
              >
                <Download size={18} />
              </button>
            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* TAB 1: BILLING SYSTEM                     */}
        {/* ========================================= */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-300">
            {/* LEFT: ADD ITEM FORM */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:sticky top-24">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Plus size={20} className="text-emerald-600" /> Add Product
                </h3>
                <form onSubmit={handleAddItem} className="space-y-5" noValidate>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name</label>
                    <input 
                      type="text" 
                      value={itemName}
                      onChange={e => {
                        setItemName(e.target.value);
                        if(billErrors.itemName) setBillErrors({...billErrors, itemName: false});
                      }}
                      placeholder="e.g. A4 Paper Rim"
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${
                        billErrors.itemName 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'
                      }`}
                    />
                    {/* EXPLICIT ERROR MESSAGE */}
                    {billErrors.itemName && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        ⚠️ Product Name is required
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                      <input 
                        type="number" 
                        min="1"
                        value={quantity}
                        onChange={e => {
                          setQuantity(e.target.value);
                          if(billErrors.quantity) setBillErrors({...billErrors, quantity: false});
                        }}
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${
                          billErrors.quantity 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' 
                          : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'
                        }`}
                      />
                      {/* EXPLICIT ERROR MESSAGE */}
                      {billErrors.quantity && (
                        <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Invalid Qty
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (₹)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={e => {
                          setPrice(e.target.value);
                          if(billErrors.price) setBillErrors({...billErrors, price: false});
                        }}
                        placeholder="0.00"
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${
                          billErrors.price 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                          : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'
                        }`}
                      />
                      {/* EXPLICIT ERROR MESSAGE */}
                      {billErrors.price && (
                        <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Required
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 mt-2">
                    <Plus size={18} /> Add to Bill
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT: BILLING TABLE */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" /> Current Invoice
                  </h3>
                  {items.length > 0 && (
                    <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-700 underline underline-offset-4 transition">
                      Clear All
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                      <tr>
                        <th className="p-4 pl-6">Product</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4 text-right">Price</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-16 text-center text-slate-400">
                            <Receipt size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold text-slate-500">No items added yet.</p>
                            <p className="text-sm mt-1">Add products using the form to build your invoice.</p>
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 pl-6 font-bold text-slate-800 text-sm max-w-[200px] truncate" title={item.name}>{item.name}</td>
                            <td className="p-4 text-center text-sm font-medium text-slate-600">{item.quantity}</td>
                            <td className="p-4 text-right text-sm font-medium text-slate-600">₹{item.price.toFixed(2)}</td>
                            <td className="p-4 text-right font-black text-emerald-600 text-sm">₹{item.total.toFixed(2)}</td>
                            <td className="p-4 text-center">
                              <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition p-1">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* GRAND TOTAL */}
                <div className="p-6 bg-emerald-50/50 border-t border-emerald-100 flex justify-between items-center mt-auto">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Grand Total</span>
                  <span className="text-3xl font-black text-emerald-600 flex items-center">
                    <IndianRupee size={24} className="mr-1" />
                    {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* TAB 2: SHOP PROFILE / SETTINGS            */}
        {/* ========================================= */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-900 text-white">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <Store className="text-emerald-400" /> Business Profile
                </h2>
                <p className="text-slate-400 text-sm mt-1">This information will be printed on your Excel and Paper Invoices.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-6" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Store size={14} /> Shop / Business Name *
                    </label>
                    <input 
                      type="text" 
                      value={shopInfo.shop_name}
                      onChange={e => {
                        setShopInfo({...shopInfo, shop_name: e.target.value});
                        if(profileErrors.shop_name) setProfileErrors({...profileErrors, shop_name: false});
                      }}
                      className={`w-full p-3.5 border rounded-xl outline-none font-bold text-slate-800 transition-all ${
                        profileErrors.shop_name 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {/* EXPLICIT ERROR MESSAGE */}
                    {profileErrors.shop_name && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        ⚠️ Shop Name is required
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <User size={14} /> Owner Name *
                    </label>
                    <input 
                      type="text" 
                      value={shopInfo.full_name}
                      onChange={e => {
                        setShopInfo({...shopInfo, full_name: e.target.value});
                        if(profileErrors.full_name) setProfileErrors({...profileErrors, full_name: false});
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${
                        profileErrors.full_name 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {/* EXPLICIT ERROR MESSAGE */}
                    {profileErrors.full_name && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        ⚠️ Owner Name is required
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Phone size={14} /> Contact Number *
                    </label>
                    <input 
                      type="tel" 
                      value={shopInfo.phone}
                      onChange={e => {
                        setShopInfo({...shopInfo, phone: e.target.value});
                        if(profileErrors.phone) setProfileErrors({...profileErrors, phone: false});
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${
                        profileErrors.phone 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {/* EXPLICIT ERROR MESSAGE */}
                    {profileErrors.phone && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        ⚠️ Contact Number is required
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={14} /> GSTIN / Tax ID (Optional)
                    </label>
                    <input 
                      type="text" 
                      value={shopInfo.gstin}
                      onChange={e => setShopInfo({...shopInfo, gstin: e.target.value})}
                      placeholder="e.g. 32XXXXX1234X1Z5"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm uppercase"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MapPin size={14} /> Full Shop Address
                    </label>
                    <textarea 
                      rows="3"
                      value={shopInfo.address}
                      onChange={e => setShopInfo({...shopInfo, address: e.target.value})}
                      placeholder="Street, City, Landmark, PIN Code"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm leading-relaxed"
                    ></textarea>
                  </div>

                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5'}`}
                  >
                    {isSaving ? 'Saving...' : <><Save size={18} /> Save Profile</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ShopDashboard;