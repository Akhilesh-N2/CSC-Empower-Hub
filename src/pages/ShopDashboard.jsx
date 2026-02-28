import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style'; // <-- Swapped to the styling library
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Download, Store, Receipt, IndianRupee, Settings, Save, MapPin, Phone, User, FileText } from 'lucide-react';

function ShopDashboard() {
  const [activeTab, setActiveTab] = useState('billing'); 
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. STATE: Shop Details
  const [shopInfo, setShopInfo] = useState({ 
    shop_name: '', 
    full_name: '',
    phone: '', 
    location: '',
    address: '',
    gstin: ''
  });

  // 2. STATE: Billing Items
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shop_billing_items');
    return saved ? JSON.parse(saved) : [];
  });

  // Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');

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

  // 5. BILLING LOGIC
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName || !price) return;

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

  // 6. PROFILE UPDATE LOGIC
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
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

  // 7. HIGH-FIDELITY EXCEL EXPORT
  const exportToExcel = () => {
    if (items.length === 0) return alert("Please add items before exporting.");

    // A. Format the Product Data Table
    const exportData = items.map((item, index) => ({
      'S.No': index + 1,
      'Product Name': item.name,
      'Quantity': item.quantity,
      'Unit Price (₹)': item.price,
      'Total Amount (₹)': item.total
    }));

    // B. Create Worksheet but start the table at row 8 (origin: 'A8')
    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: 'A8' });

    // C. Define Merges for Headers (Columns A through E)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Merge A1:E1 for Shop Name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Merge A2:E2 for Address
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }  // Merge A6:E6 for Bill Title
    ];

    const dateStr = new Date().toLocaleDateString('en-GB'); 

    // D. Construct Header Data Matrix
    const headerData = [
      [shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : 'RETAIL INVOICE'], // Row 1
      [shopInfo.address ? shopInfo.address : `Location: ${shopInfo.location || 'N/A'}`], // Row 2
      [`Contact: ${shopInfo.phone || 'N/A'}`, '', '', '', `Date: ${dateStr}`], // Row 3 (A3 is Contact, E3 is Date)
      [shopInfo.gstin ? `GSTIN: ${shopInfo.gstin.toUpperCase()}` : '', '', '', '', ''], // Row 4
      [], // Row 5 empty
      ['TAX INVOICE / BILL OF SUPPLY'], // Row 6
      []  // Row 7 empty
    ];

    // E. Inject Header and Footer Data
    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', 'GRAND TOTAL', `₹${grandTotal.toFixed(2)}`]], { origin: -1 });

    // F. APPLY STYLES
    // Shop Name (A1): Centered, Bold, Size 16
    if (worksheet['A1']) worksheet['A1'].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
    
    // Address (A2): Centered, Size 10
    if (worksheet['A2']) worksheet['A2'].s = { font: { sz: 10 }, alignment: { horizontal: 'center' } };
    
    // Contact (A3): Left aligned
    if (worksheet['A3']) worksheet['A3'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } };
    
    // Date (E3): Right aligned
    if (worksheet['E3']) worksheet['E3'].s = { font: { sz: 11 }, alignment: { horizontal: 'right' } };
    
    // GSTIN (A4): Left aligned
    if (worksheet['A4']) worksheet['A4'].s = { font: { sz: 11 }, alignment: { horizontal: 'left' } };
    
    // Bill Title (A6): Centered, Bold, Size 12
    if (worksheet['A6']) worksheet['A6'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };

    // Table Headers (Row 8 -> A8 to E8): Bold with bottom border
    const headers = ['A8', 'B8', 'C8', 'D8', 'E8'];
    headers.forEach(cell => {
      if (worksheet[cell]) worksheet[cell].s = { 
        font: { bold: true }, 
        border: { bottom: { style: 'thin', color: { rgb: "000000" } } } 
      };
    });

    // Make Grand Total Bold (Finds the dynamic last row)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const lastRow = range.e.r + 1; 
    if (worksheet[`D${lastRow}`]) worksheet[`D${lastRow}`].s = { font: { bold: true } };
    if (worksheet[`E${lastRow}`]) worksheet[`E${lastRow}`].s = { font: { bold: true } };

    // G. Column Widths
    worksheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 45 },  // Product Name (Made wider)
      { wch: 10 },  // Quantity
      { wch: 15 },  // Unit Price
      { wch: 20 }   // Total Amount
    ];

    // Create Workbook and save
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    
    const fileName = `${shopInfo.shop_name ? shopInfo.shop_name.replace(/\s+/g, '_') : 'Invoice'}_${dateStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
          
          {activeTab === 'billing' && (
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md w-full md:w-auto text-sm"
            >
              <Download size={18} /> Export Invoice
            </button>
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
                <form onSubmit={handleAddItem} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name</label>
                    <input 
                      type="text" 
                      required 
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                      placeholder="e.g. A4 Paper Rim"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (₹)</label>
                      <input 
                        type="number" 
                        required 
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
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
                <p className="text-slate-400 text-sm mt-1">This information will be printed on your Excel Invoices.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Store size={14} /> Shop / Business Name
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={shopInfo.shop_name}
                      onChange={e => setShopInfo({...shopInfo, shop_name: e.target.value})}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <User size={14} /> Owner Name
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={shopInfo.full_name}
                      onChange={e => setShopInfo({...shopInfo, full_name: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Phone size={14} /> Contact Number
                    </label>
                    <input 
                      type="tel" 
                      required 
                      value={shopInfo.phone}
                      onChange={e => setShopInfo({...shopInfo, phone: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
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
                    <p className="text-xs text-slate-400 mt-2 italic">If provided, this will legally validate your invoices for B2B sales.</p>
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

                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">City/District (Short)</label>
                     <input 
                      type="text" 
                      value={shopInfo.location}
                      onChange={e => setShopInfo({...shopInfo, location: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-slate-50"
                    />
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