import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style'; 
import { supabase } from '../supabaseClient';
import { useDeviceTracker } from '../hooks/useDeviceTracker';
import { Plus, Trash2, Download, Store, Receipt, IndianRupee, Settings, Save, MapPin, Phone, User, FileText, Printer, AlertCircle, BadgeCheck, CalendarDays, Laptop, LifeBuoy, History } from 'lucide-react';

function ShopDashboard() {
  useDeviceTracker();

  const [activeTab, setActiveTab] = useState('billing'); 
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Print Page Size State
  const [pageSize, setPageSize] = useState('Thermal80'); // Defaults to POS Thermal Receipt

  // 1. STATE: Shop Details & Profile Errors
  const [shopInfo, setShopInfo] = useState({ 
    shop_name: '', 
    full_name: '',
    phone: '', 
    location: '',
    address: '',
    gstin: '',
    created_at: null,              
    subscription_expires_at: null, 
    renewal_requested: false,
    member_id: null,               
    device_limit: 1,               
    active_devices: 0              
  });
  const [renewalHistory, setRenewalHistory] = useState([]);
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

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  
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
          
          // Fetch Profile Data
          const { data, error } = await supabase
            .from('shop_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          // Fetch Device Count
          const { count: deviceCount } = await supabase
            .from('shop_devices')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', user.id)
            .eq('is_blocked', false);
            
          if (data && !error) {
            setShopInfo({
              shop_name: data.shop_name || '',
              full_name: data.full_name || '',
              phone: data.phone || '',
              location: data.location || '',
              address: data.address || '',
              gstin: data.gstin || '',
              created_at: data.created_at || null,
              subscription_expires_at: data.subscription_expires_at || null, 
              renewal_requested: data.renewal_requested || false,
              member_id: data.member_id || null,
              device_limit: data.device_limit || 1,
              active_devices: deviceCount || 0
            });
            
            // Fetch Billing/Renewal History
            const { data: history } = await supabase
              .from('license_renewals')
              .select('*')
              .eq('shop_id', user.id)
              .order('renewed_at', { ascending: false });
            setRenewalHistory(history || []);
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

  // HANDLE RENEWAL REQUEST
  const handleRequestRenewal = async () => {
    if(!userId) return;
    try {
      const { error } = await supabase
          .from('shop_profiles')
          .update({ renewal_requested: true })
          .eq('id', userId);
          
      if(error) throw error;
      
      alert("Renewal request sent successfully! An admin will review your account shortly.");
      setShopInfo(prev => ({ ...prev, renewal_requested: true }));
    } catch(err) {
      alert("Failed to send request: " + err.message);
    }
  };

  // 5. BILLING LOGIC
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = (e) => {
    e.preventDefault();
    const newErrors = {
      itemName: !itemName.trim(),
      quantity: !quantity || Number(quantity) < 1,
      price: !price || Number(price) <= 0
    };
    if (newErrors.itemName || newErrors.quantity || newErrors.price) {
      setBillErrors(newErrors);
      return;
    }
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

  const handleRemoveItem = (id) => setItems(items.filter(item => item.id !== id));
  const clearAll = () => { if(window.confirm("Are you sure you want to clear the current bill?")) setItems([]); }

  // 6. PROFILE UPDATE LOGIC
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const newErrors = {
      shop_name: !shopInfo.shop_name.trim(),
      full_name: !shopInfo.full_name.trim(),
      phone: !shopInfo.phone.trim()
    };
    if (newErrors.shop_name || newErrors.full_name || newErrors.phone) {
      setProfileErrors(newErrors);
      return;
    }
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

  // 7. PRINT & EXPORT LOGIC
  const handlePrint = () => {
    if (items.length === 0) return alert("Please add items to the bill before printing.");
    let pageCSS = ""; let containerStyle = "";
    if (pageSize === "A4") { pageCSS = "@page { size: A4; margin: 20mm; }"; containerStyle = "max-width: 210mm; margin: 0 auto; font-size: 14px;"; } 
    else if (pageSize === "A5") { pageCSS = "@page { size: A5; margin: 15mm; }"; containerStyle = "max-width: 148mm; margin: 0 auto; font-size: 12px;"; } 
    else if (pageSize === "Thermal80") { pageCSS = "@page { size: 80mm auto; margin: 5mm; }"; containerStyle = "max-width: 72mm; margin: 0 auto; font-size: 12px; font-family: 'Courier New', Courier, monospace;"; }

    const itemsHtml = items.map((item, i) => `<tr><td style="padding: 6px 0; border-bottom: 1px dashed #ccc;">${i + 1}</td><td style="padding: 6px 0; border-bottom: 1px dashed #ccc; word-break: break-word;">${item.name}</td><td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: center;">${item.quantity}</td><td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: right;">${item.price.toFixed(2)}</td><td style="padding: 6px 0; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">${item.total.toFixed(2)}</td></tr>`).join('');
    const dateStr = new Date().toLocaleDateString('en-GB'); const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Print Invoice</title><style>body { font-family: sans-serif; color: #000; margin: 0; padding: 0; background: #fff; } ${pageCSS} table { border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; width: 100%; } th { border-bottom: 2px solid #000; padding-bottom: 6px; text-align: left; font-size: 0.9em; text-transform: uppercase; } .text-center { text-align: center; } .text-right { text-align: right; } .dashed-line { border-top: 2px dashed #000; margin: 15px 0; } .header-info p { margin: 4px 0; color: #333; }</style></head><body><div style="${containerStyle}"><div class="text-center header-info"><h1 style="margin: 0 0 5px 0; font-size: ${pageSize === 'Thermal80' ? '18px' : '28px'}; text-transform: uppercase;">${shopInfo.shop_name || 'RETAIL INVOICE'}</h1><p>${shopInfo.address || shopInfo.location || ''}</p><p>Ph: ${shopInfo.phone || 'N/A'}</p>${shopInfo.gstin ? `<p><strong>GSTIN:</strong> ${shopInfo.gstin.toUpperCase()}</p>` : ''}</div><div class="dashed-line"></div><div style="display: flex; justify-content: space-between; font-size: 0.9em;"><span><strong>Date:</strong> ${dateStr}</span><span><strong>Time:</strong> ${timeStr}</span></div><div class="dashed-line"></div><table><thead><tr><th style="width: 5%;">#</th><th style="width: 45%;">Item</th><th class="text-center" style="width: 15%;">Qty</th><th class="text-right" style="width: 15%;">Rate</th><th class="text-right" style="width: 20%;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="dashed-line"></div><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: ${pageSize === 'Thermal80' ? '16px' : '20px'}; font-weight: bold;">GRAND TOTAL:</span><span style="font-size: ${pageSize === 'Thermal80' ? '18px' : '24px'}; font-weight: bold;">Rs. ${grandTotal.toFixed(2)}</span></div><div class="dashed-line"></div><div class="text-center" style="margin-top: 20px;"><p style="margin: 0; font-weight: bold;">Thank you for your business!</p><p style="margin: 4px 0; font-size: 0.8em; color: #666;">Software by CSC Empower Hub</p></div></div></body></html>`);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const exportToExcel = () => {
    if (items.length === 0) return alert("Please add items before exporting.");
    const exportData = items.map((item, index) => ({ 'S.No': index + 1, 'Product Name': item.name, 'Quantity': item.quantity, 'Unit Price (₹)': item.price, 'Total Amount (₹)': item.total }));
    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: 'A8' });
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }];
    const dateStr = new Date().toLocaleDateString('en-GB'); 
    const headerData = [ [shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : 'RETAIL INVOICE'], [shopInfo.address ? shopInfo.address : `Location: ${shopInfo.location || 'N/A'}`], [`Contact: ${shopInfo.phone || 'N/A'}`, '', '', '', `Date: ${dateStr}`], [shopInfo.gstin ? `GSTIN: ${shopInfo.gstin.toUpperCase()}` : '', '', '', '', ''], [], ['TAX INVOICE / BILL OF SUPPLY'], [] ];
    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: 'A1' }); XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', 'GRAND TOTAL', `₹${grandTotal.toFixed(2)}`]], { origin: -1 });
    if (worksheet['A1']) worksheet['A1'].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } }; if (worksheet['A2']) worksheet['A2'].s = { font: { sz: 10 }, alignment: { horizontal: 'center' } }; if (worksheet['A3']) worksheet['A3'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } }; if (worksheet['E3']) worksheet['E3'].s = { font: { sz: 11 }, alignment: { horizontal: 'right' } }; if (worksheet['A4']) worksheet['A4'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } }; if (worksheet['A6']) worksheet['A6'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
    const headers = ['A8', 'B8', 'C8', 'D8', 'E8']; headers.forEach(cell => { if (worksheet[cell]) worksheet[cell].s = { font: { bold: true }, border: { bottom: { style: 'thin', color: { rgb: "000000" } } } }; });
    const range = XLSX.utils.decode_range(worksheet['!ref']); const lastRow = range.e.r + 1; 
    if (worksheet[`D${lastRow}`]) worksheet[`D${lastRow}`].s = { font: { bold: true } }; if (worksheet[`E${lastRow}`]) worksheet[`E${lastRow}`].s = { font: { bold: true } };
    worksheet['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, `${shopInfo.shop_name ? shopInfo.shop_name.replace(/\s+/g, '_') : 'Invoice'}_${dateStr.replace(/\//g, '-')}.xlsx`);
  };

  // Helper for dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* URGENT RENEWAL BANNER */}
        {shopInfo.subscription_expires_at && new Date(shopInfo.subscription_expires_at) < new Date(new Date().setDate(new Date().getDate() + 30)) && (
          <div className="bg-amber-50 border border-amber-200 p-4 md:p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in slide-in-from-top-4">
              <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-amber-800 font-black flex items-center justify-center sm:justify-start gap-2 uppercase tracking-wider text-sm mb-1">
                      <AlertCircle size={18} /> License Expiring Soon
                  </h4>
                  <p className="text-amber-700 text-xs md:text-sm font-medium">
                      Your platform license expires on <strong className="font-black text-amber-900">{new Date(shopInfo.subscription_expires_at).toLocaleDateString()}</strong>. Please request a renewal to avoid service interruption.
                  </p>
              </div>
              
              {shopInfo.renewal_requested ? (
                  <span className="bg-amber-200 text-amber-800 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-inner border border-amber-300">
                      ⏳ Review Pending
                  </span>
              ) : (
                  <button 
                      onClick={handleRequestRenewal}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wide shadow-md whitespace-nowrap transition transform hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                      Request Renewal
                  </button>
              )}
          </div>
        )}

        {/* TOP NAVIGATION TABS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex w-full md:w-auto gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('billing')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'billing' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Receipt size={18} /> POS Billing
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Settings size={18} /> Shop Settings
            </button>
            <button 
              onClick={() => setActiveTab('license')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'license' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <BadgeCheck size={18} /> License & Plan
            </button>
          </div>
          
          {/* PRINTER & EXPORT CONTROLS */}
          {activeTab === 'billing' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
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

        {/* TAB 1: BILLING SYSTEM */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-300">
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
                      onChange={e => { setItemName(e.target.value); if(billErrors.itemName) setBillErrors({...billErrors, itemName: false}); }}
                      placeholder="e.g. A4 Paper Rim"
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.itemName ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'}`}
                    />
                    {billErrors.itemName && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Product Name is required</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                      <input 
                        type="number" min="1" value={quantity}
                        onChange={e => { setQuantity(e.target.value); if(billErrors.quantity) setBillErrors({...billErrors, quantity: false}); }}
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.quantity ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'}`}
                      />
                      {billErrors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Invalid Qty</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (₹)</label>
                      <input 
                        type="number" min="0" step="0.01" value={price}
                        onChange={e => { setPrice(e.target.value); if(billErrors.price) setBillErrors({...billErrors, price: false}); }}
                        placeholder="0.00"
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.price ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white'}`}
                      />
                      {billErrors.price && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Required</p>}
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 mt-2">
                    <Plus size={18} /> Add to Bill
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" /> Current Invoice
                  </h3>
                  {items.length > 0 && <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-700 underline underline-offset-4 transition">Clear All</button>}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                      <tr><th className="p-4 pl-6">Product</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Total</th><th className="p-4 text-center"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.length === 0 ? (
                        <tr><td colSpan="5" className="p-16 text-center text-slate-400"><Receipt size={40} className="mx-auto mb-4 opacity-20" /><p className="font-bold text-slate-500">No items added yet.</p><p className="text-sm mt-1">Add products using the form to build your invoice.</p></td></tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 pl-6 font-bold text-slate-800 text-sm max-w-[200px] truncate" title={item.name}>{item.name}</td>
                            <td className="p-4 text-center text-sm font-medium text-slate-600">{item.quantity}</td>
                            <td className="p-4 text-right text-sm font-medium text-slate-600">₹{item.price.toFixed(2)}</td>
                            <td className="p-4 text-right font-black text-emerald-600 text-sm">₹{item.total.toFixed(2)}</td>
                            <td className="p-4 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition p-1"><Trash2 size={16} /></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 bg-emerald-50/50 border-t border-emerald-100 flex justify-between items-center mt-auto">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Grand Total</span>
                  <span className="text-3xl font-black text-emerald-600 flex items-center"><IndianRupee size={24} className="mr-1" />{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHOP PROFILE / SETTINGS */}
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Store size={14} /> Shop / Business Name *</label>
                    <input type="text" value={shopInfo.shop_name} onChange={e => { setShopInfo({...shopInfo, shop_name: e.target.value}); if(profileErrors.shop_name) setProfileErrors({...profileErrors, shop_name: false}); }} className={`w-full p-3.5 border rounded-xl outline-none font-bold text-slate-800 transition-all ${profileErrors.shop_name ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'}`} />
                    {profileErrors.shop_name && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Shop Name is required</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User size={14} /> Owner Name *</label>
                    <input type="text" value={shopInfo.full_name} onChange={e => { setShopInfo({...shopInfo, full_name: e.target.value}); if(profileErrors.full_name) setProfileErrors({...profileErrors, full_name: false}); }} className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.full_name ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'}`} />
                    {profileErrors.full_name && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Owner Name is required</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Phone size={14} /> Contact Number *</label>
                    <input type="tel" value={shopInfo.phone} onChange={e => { setShopInfo({...shopInfo, phone: e.target.value}); if(profileErrors.phone) setProfileErrors({...profileErrors, phone: false}); }} className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'}`} />
                    {profileErrors.phone && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">⚠️ Contact Number is required</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={14} /> GSTIN / Tax ID (Optional)</label>
                    <input type="text" value={shopInfo.gstin} onChange={e => setShopInfo({...shopInfo, gstin: e.target.value})} placeholder="e.g. 32XXXXX1234X1Z5" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm uppercase" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={14} /> Full Shop Address</label>
                    <textarea rows="3" value={shopInfo.address} onChange={e => setShopInfo({...shopInfo, address: e.target.value})} placeholder="Street, City, Landmark, PIN Code" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm leading-relaxed" ></textarea>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <button type="submit" disabled={isSaving} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5'}`}>
                    {isSaving ? 'Saving...' : <><Save size={18} /> Save Profile</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: LICENSE & PLAN */}
        {activeTab === 'license' && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-900 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                      <BadgeCheck className="text-emerald-400" /> License Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Manage your active subscription and device allocations.</p>
                  </div>
                  {shopInfo.member_id && (
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Your Shop ID</p>
                      <p className="text-xl font-mono font-bold tracking-tight text-emerald-400">#{shopInfo.member_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subscription Status</span>
                    {shopInfo.subscription_expires_at ? (
                      <div>
                        {new Date(shopInfo.subscription_expires_at) > new Date() ? (
                          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">
                            🟢 Active License
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-red-200 animate-pulse">
                            🔴 Expired
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium text-sm">Awaiting Admin Approval</span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Activated</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{formatDate(shopInfo.created_at)}</span>
                    </div>
                    <div className="h-px bg-slate-200 w-full"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays size={16} className={new Date(shopInfo.subscription_expires_at) < new Date(new Date().setDate(new Date().getDate() + 30)) ? "text-amber-500" : ""} />
                        <span className="text-xs font-bold uppercase tracking-wider">Expires</span>
                      </div>
                      <span className={`text-sm font-bold ${new Date(shopInfo.subscription_expires_at) < new Date(new Date().setDate(new Date().getDate() + 30)) ? "text-amber-600" : "text-slate-800"}`}>
                        {formatDate(shopInfo.subscription_expires_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Laptop size={18} className="text-emerald-600" /> Device License Limit
                    </h3>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                      {shopInfo.active_devices} / {shopInfo.device_limit} Used
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 inset-shadow-sm">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        shopInfo.active_devices >= shopInfo.device_limit ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((shopInfo.active_devices / shopInfo.device_limit) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    Your account is limited to <strong className="text-slate-700">{shopInfo.device_limit} physical computer(s)</strong> at a time for security. To add more systems, please contact the admin team to upgrade your plan.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <LifeBuoy size={18} />
                    <span>Need help or an upgrade? Contact Admin.</span>
                  </div>
                  
                  {shopInfo.renewal_requested ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-6 py-3 rounded-xl text-sm font-bold w-full sm:w-auto text-center">
                      ⏳ Renewal Request Pending
                    </span>
                  ) : (
                    <button 
                      onClick={handleRequestRenewal}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition w-full sm:w-auto text-center"
                    >
                      Request Plan Renewal
                    </button>
                  )}
                </div>

                {/* ✨ NEW: BILLING HISTORY LEDGER IN SHOP DASHBOARD */}
                {renewalHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <History size={18} className="text-emerald-600" /> Billing History
                    </h3>
                    <div className="space-y-3">
                      {renewalHistory.map((history) => (
                        <div key={history.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-200 transition-colors group">
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">1-Year License Extension</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <CalendarDays size={12} /> 
                              Processed on: {new Date(history.renewed_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mt-3 sm:mt-0 text-left sm:text-right">
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-200 inline-block">
                              Paid / Approved
                            </span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                              Valid until {new Date(history.new_expiry).getFullYear()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ShopDashboard;