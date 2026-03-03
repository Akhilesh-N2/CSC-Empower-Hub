import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Trash2, Package, AlertTriangle, Truck, Search, IndianRupee } from "lucide-react";

export default function InventoryManager({ userId }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [newItem, setNewItem] = useState({
    item_name: "",
    selling_price: "",
    current_stock: "",
    min_stock_level: "5",
    barcode: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_location: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userId) fetchInventory();
  }, [userId]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("shop_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newItem.item_name || !newItem.selling_price || !newItem.current_stock) {
      return alert("Please fill the required fields: Name, Price, and Current Stock.");
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert([
          {
            shop_id: userId,
            item_name: newItem.item_name,
            selling_price: Number(newItem.selling_price),
            current_stock: Number(newItem.current_stock),
            min_stock_level: Number(newItem.min_stock_level),
            barcode: newItem.barcode,
            supplier_name: newItem.supplier_name,
            supplier_phone: newItem.supplier_phone,
            supplier_location: newItem.supplier_location,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setInventory([data, ...inventory]);
      setNewItem({
        item_name: "", selling_price: "", current_stock: "", min_stock_level: "5",
        barcode: "", supplier_name: "", supplier_phone: "", supplier_location: "",
      });
      alert("Product added to inventory!");
    } catch (error) {
      alert("Failed to add product: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      setInventory(inventory.filter((item) => item.id !== id));
    } catch (error) {
      alert("Error deleting product.");
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.barcode && item.barcode.includes(searchQuery))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: ADD PRODUCT FORM */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Package size={18} className="text-indigo-600" /> Add New Product
          </h3>
          
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Name *</label>
              <input type="text" value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} placeholder="e.g. A4 Paper Rim" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price (₹) *</label>
                <input type="number" min="0" step="0.01" value={newItem.selling_price} onChange={e => setNewItem({...newItem, selling_price: e.target.value})} placeholder="0.00" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Barcode (Opt)</label>
                <input type="text" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} placeholder="Scan or type" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock *</label>
                <input type="number" min="0" value={newItem.current_stock} onChange={e => setNewItem({...newItem, current_stock: e.target.value})} placeholder="0" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Low Stock Alert At</label>
                <input type="number" min="1" value={newItem.min_stock_level} onChange={e => setNewItem({...newItem, min_stock_level: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                <Truck size={14} className="text-slate-400"/> Supplier Details (For Restock PDF)
              </h4>
              <div className="space-y-3">
                <input type="text" value={newItem.supplier_name} onChange={e => setNewItem({...newItem, supplier_name: e.target.value})} placeholder="Supplier Name" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
                <input type="tel" value={newItem.supplier_phone} onChange={e => setNewItem({...newItem, supplier_phone: e.target.value})} placeholder="Supplier Phone" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
                <input type="text" value={newItem.supplier_location} onChange={e => setNewItem({...newItem, supplier_location: e.target.value})} placeholder="Supplier Location / City" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white" />
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 mt-2 shadow-sm">
              {isSaving ? "Saving..." : <><Plus size={18} /> Save Product</>}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: INVENTORY LIST */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package size={18} className="text-indigo-600" /> Current Stock
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold ml-2">
                {inventory.length} Items
              </span>
            </h3>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                <tr>
                  <th className="p-4 pl-6">Product</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading inventory...</td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan="5" className="p-16 text-center text-slate-400">No products found.</td></tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isLowStock = item.current_stock <= item.min_stock_level;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-slate-800 text-sm">{item.item_name}</p>
                          {item.barcode && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.barcode}</p>}
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-slate-700 flex items-center justify-end gap-0.5">
                          <IndianRupee size={12} />{item.selling_price.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${isLowStock ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {isLowStock && <AlertTriangle size={12} />}
                            {item.current_stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-slate-600">{item.supplier_name || "-"}</p>
                          {item.supplier_phone && <p className="text-[10px] text-slate-400 mt-0.5">{item.supplier_phone}</p>}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}