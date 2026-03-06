import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import { supabase } from "../supabaseClient";
import { useDeviceTracker } from "../hooks/useDeviceTracker";
import InventoryManager from "../components/InventoryManager"; 
import ShopCalculators from "../components/ShopCalculators"; 
import {
  Plus, Trash2, Download, Store, Receipt, IndianRupee, Settings, Save,
  MapPin, Phone, User, FileText, Printer, AlertCircle, BadgeCheck,
  CalendarDays, Laptop, LifeBuoy, History, CheckCircle, ImagePlus,
  Loader2, QrCode, Package, Search, ScrollText, ChevronDown, Calculator 
} from "lucide-react";

function ShopDashboard() {
  useDeviceTracker();

  const [activeTab, setActiveTab] = useState("billing");
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const [pageSize, setPageSize] = useState("Thermal80");
  const [showExportMenu, setShowExportMenu] = useState(false); 

  const [shopInfo, setShopInfo] = useState({
    shop_name: "", full_name: "", phone: "", email: "", location: "", address: "", gstin: "", logo_url: "", qr_code_url: "",
    created_at: null, subscription_expires_at: null, renewal_requested: false, member_id: null, device_limit: 1, active_devices: 0, has_inventory_module: false,
  });

  const [renewalHistory, setRenewalHistory] = useState([]);
  const [profileErrors, setProfileErrors] = useState({ shop_name: false, full_name: false, phone: false });

  const [customerInfo, setCustomerInfo] = useState(() => {
    const saved = localStorage.getItem("shop_billing_customer");
    return saved ? JSON.parse(saved) : { name: "", phone: "", address: "" };
  });

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("shop_billing_items");
    return saved ? JSON.parse(saved) : [];
  });

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState("%"); 
  const [gstPercentage, setGstPercentage] = useState("");

  const [inventoryList, setInventoryList] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState(null); 

  const [billErrors, setBillErrors] = useState({ itemName: false, quantity: false, price: false });

  const [pastBills, setPastBills] = useState([]);
  const [billSearch, setBillSearch] = useState("");
  const [isLoadingBills, setIsLoadingBills] = useState(false);

  const [invoiceSeq, setInvoiceSeq] = useState(1);
  const currentInvoiceId = String(invoiceSeq).padStart(4, "0");

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  
  const rawDiscount = Number(discountInput) || 0;
  const discountVal = discountType === "%" ? (subTotal * rawDiscount) / 100 : rawDiscount;

  const taxableAmount = Math.max(0, subTotal - discountVal);
  const gstVal = (taxableAmount * (Number(gstPercentage) || 0)) / 100;
  const grandTotal = taxableAmount + gstVal;

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          const { data, error } = await supabase.from("shop_profiles").select("*").eq("id", user.id).single();
          const { count: deviceCount } = await supabase.from("shop_devices").select("*", { count: "exact", head: true }).eq("shop_id", user.id).eq("is_blocked", false);

          if (data && !error) {
            setShopInfo({
              ...data,
              email: data.email || user.email || "",
              device_limit: data.device_limit || 1,
              active_devices: deviceCount || 0,
              has_inventory_module: data.has_inventory_module || false,
            });

            setInvoiceSeq((data.last_invoice_number || 0) + 1);

            if (data.has_inventory_module) {
              const { data: invData } = await supabase.from("inventory_items").select("*").eq("shop_id", user.id);
              setInventoryList(invData || []);
            }

            const { data: history } = await supabase.from("license_renewals").select("*").eq("shop_id", user.id).order("renewed_at", { ascending: false });
            setRenewalHistory(history || []);
          }
        }
      } catch (err) {
        console.error("Error fetching shop details:", err);
      }
    };
    fetchShopData();
  }, []);

  useEffect(() => {
    if (activeTab === "history" && userId) fetchPastBills();
  }, [activeTab, userId]);

  const fetchPastBills = async () => {
    setIsLoadingBills(true);
    try {
      const { data, error } = await supabase.from("shop_bills").select("*").eq("shop_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      setPastBills(data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("shop_billing_items", JSON.stringify(items));
    localStorage.setItem("shop_billing_customer", JSON.stringify(customerInfo));
  }, [items, customerInfo]);

  const handleLogoUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploadingLogo(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cleanShopName = shopInfo.shop_name ? shopInfo.shop_name.replace(/[^a-zA-Z0-9]/g, "_") : `Shop_${userId?.substring(0, 6)}`;
      formData.append("folder", `Shoppers-Logo/${cleanShopName}`);
      formData.append("public_id", `Logo_${Date.now()}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setShopInfo((prev) => ({ ...prev, logo_url: data.secure_url }));
        const { error: updateError } = await supabase.from("shop_profiles").update({ logo_url: data.secure_url }).eq("id", userId);
        if (updateError) throw updateError;
        alert("Logo successfully updated!");
      } else throw new Error("Failed to get secure URL from Cloudinary.");
    } catch (error) {
      alert("Error uploading logo: " + error.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleQrUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploadingQr(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const cleanShopName = shopInfo.shop_name ? shopInfo.shop_name.replace(/[^a-zA-Z0-9]/g, "_") : `Shop_${userId?.substring(0, 6)}`;
      formData.append("folder", `Shoppers-Logo/${cleanShopName}`);
      formData.append("public_id", `QR_Code_${Date.now()}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        const smartCropUrl = data.secure_url.replace("/upload/", "/upload/c_fill,g_north,w_500,h_500,z_1.05/");
        setShopInfo((prev) => ({ ...prev, qr_code_url: smartCropUrl }));
        const { error: updateError } = await supabase.from("shop_profiles").update({ qr_code_url: smartCropUrl }).eq("id", userId);
        if (updateError) throw updateError;
        alert("QR Code successfully updated!");
      } else throw new Error("Failed to get secure URL from Cloudinary.");
    } catch (error) {
      alert("Error uploading QR: " + error.message);
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleRequestRenewal = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("shop_profiles").update({ renewal_requested: true }).eq("id", userId);
      if (error) throw error;
      
      await supabase.from("license_renewals").insert([{
        shop_id: userId,
        action_type: "Renewal Requested (Pending Payment)",
        new_expiry: shopInfo.subscription_expires_at 
      }]);

      alert("Renewal request sent successfully! An admin will review your account shortly.");
      setShopInfo((prev) => ({ ...prev, renewal_requested: true }));
      const { data: history } = await supabase.from("license_renewals").select("*").eq("shop_id", userId).order("renewed_at", { ascending: false });
      setRenewalHistory(history || []);
    } catch (err) {
      alert("Failed to send request: " + err.message);
    }
  };

  const handleSelectInventoryItem = (item) => {
    setItemName(item.item_name);
    setPrice(item.selling_price);
    setQuantity(1);
    setSelectedInvId(item.id); 
    setInventorySearch("");
    setShowSuggestions(false);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const newErrors = { itemName: !itemName.trim(), quantity: !quantity || Number(quantity) < 1, price: !price || Number(price) <= 0 };
    if (newErrors.itemName || newErrors.quantity || newErrors.price) return setBillErrors(newErrors);

    setBillErrors({ itemName: false, quantity: false, price: false });
    const newItem = { id: Date.now().toString(), inv_id: selectedInvId, name: itemName, quantity: Number(quantity), price: Number(price), total: Number(quantity) * Number(price) };
    setItems((prev) => [...prev, newItem]);
    
    setItemName(""); setQuantity(1); setPrice(""); setSelectedInvId(null);
  };

  const handleRemoveItem = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

  const handleCompleteBill = async () => {
    if (items.length === 0) return alert("Add items to the bill first!");
    if (window.confirm("Complete this sale and start the next bill?")) {
      try {
        const { error: billError } = await supabase.from('shop_bills').insert([{
          shop_id: userId, invoice_no: currentInvoiceId, customer_name: customerInfo.name || null, customer_phone: customerInfo.phone || null, customer_address: customerInfo.address || null, items_json: items, sub_total: subTotal, discount_amount: discountVal, gst_percentage: Number(gstPercentage) || 0, gst_amount: gstVal, grand_total: grandTotal
        }]);
        if (billError) throw billError;

        const { data: newDbCount, error: seqError } = await supabase.rpc("increment_shop_invoice", { target_shop_id: userId });
        if (seqError) throw seqError;

        if (shopInfo.has_inventory_module) {
          for (const cartItem of items) {
            if (cartItem.inv_id) {
              const targetItem = inventoryList.find(i => i.id === cartItem.inv_id);
              if (targetItem) {
                const newStock = Math.max(0, targetItem.current_stock - cartItem.quantity);
                const newSold = (targetItem.total_sold || 0) + cartItem.quantity;
                await supabase.from('inventory_items').update({ current_stock: newStock, total_sold: newSold }).eq('id', cartItem.inv_id);
                targetItem.current_stock = newStock; targetItem.total_sold = newSold;
              }
            }
          }
        }
        
        setItems([]); setCustomerInfo({ name: "", phone: "", address: "" });
        setDiscountInput(""); setDiscountType("%"); setGstPercentage(""); 
        if (newDbCount !== null) setInvoiceSeq(newDbCount + 1);

      } catch (err) {
        alert("Error saving bill. Please check your connection.");
      }
    }
  };

  const clearCartOnly = () => {
    if (window.confirm("Empty cart items without changing the invoice number?")) {
      setItems([]); setCustomerInfo({ name: "", phone: "", address: "" });
      setDiscountInput(""); setDiscountType("%"); setGstPercentage("");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const newErrors = { shop_name: !shopInfo.shop_name.trim(), full_name: !shopInfo.full_name.trim(), phone: !shopInfo.phone.trim() };
    if (newErrors.shop_name || newErrors.full_name || newErrors.phone) return setProfileErrors(newErrors);

    setProfileErrors({ shop_name: false, full_name: false, phone: false });
    setIsSaving(true);
    try {
      const { error } = await supabase.from("shop_profiles").update({
          shop_name: shopInfo.shop_name, full_name: shopInfo.full_name, phone: shopInfo.phone,
          location: shopInfo.location, address: shopInfo.address, gstin: shopInfo.gstin,
        }).eq("id", userId);
      if (error) throw error;
      alert("Shop Profile Updated Successfully!");
    } catch (error) { alert("Error updating profile: " + error.message); } finally { setIsSaving(false); }
  };

  const triggerPrint = (printItems, printCustomer, printInvoiceId, printDateStr, printTimeStr, printTotal, printSubTotal = printTotal, printDiscount = 0, printGstAmount = 0, printGstPercent = 0) => {
    let pageCSS = ""; let containerStyle = "";
    const isThermal = pageSize === "Thermal80";

    if (pageSize === "A4") {
      pageCSS = "@page { size: A4; margin: 15mm; }"; containerStyle = "max-width: 210mm; margin: 0 auto; font-size: 14px;";
    } else if (pageSize === "A5") {
      pageCSS = "@page { size: A5; margin: 12mm; }"; containerStyle = "max-width: 148mm; margin: 0 auto; font-size: 12px;";
    } else if (isThermal) {
      pageCSS = "@page { size: 80mm auto; margin: 0; }"; containerStyle = "width: 76mm; padding: 4mm; margin: 0 auto; font-size: 11px; box-sizing: border-box;";
    }

    const itemsHtml = printItems.map((item, i) => `
      <tr>
        <td class="td-pad" style="white-space: nowrap; vertical-align: top; padding-right: 4px;">${i + 1}</td>
        <td class="td-pad" style="width: 100%; word-break: break-word; white-space: normal; font-weight: 500; line-height: 1.2; vertical-align: top; padding-right: 4px;">${item.name}</td>
        <td class="td-pad text-center" style="white-space: nowrap; vertical-align: top; padding-right: 4px;">${item.quantity}</td>
        <td class="td-pad text-right" style="white-space: nowrap; vertical-align: top; padding-right: 4px;">${Number(item.price).toFixed(2)}</td>
        <td class="td-pad text-right" style="font-weight: 700; white-space: nowrap; vertical-align: top;">${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join("");

    const logoHtml = shopInfo.logo_url
      ? `<img src="${shopInfo.logo_url}" class="print-logo" style="margin: 0 auto 10px auto; display: block; max-height: ${isThermal ? "45px" : "75px"}; object-fit: contain;" />` : "";

    let printQrUrl = shopInfo.qr_code_url;
    const qrHtml = printQrUrl
      ? `<div style="width: 100%; text-align: center; margin: 15px 0 10px 0; position: relative; z-index: 15;">
           <div style="display: inline-block; background: #ffffff; padding: 6px; border-radius: 8px; border: 1px dashed #94a3b8; text-align: center;">
             <img src="${printQrUrl}" style="width: ${isThermal ? "110px" : "150px"}; height: ${isThermal ? "110px" : "150px"}; object-fit: contain; display: block; margin: 0 auto;" />
             <p style="margin: 4px 0 0 0; font-size: 10px; color: #111827; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Scan to Pay</p>
           </div>
         </div>` : "";

    const headerHtml = isThermal
      ? `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
        ${logoHtml}
        <h1 class="shop-title">${shopInfo.shop_name || "RETAIL INVOICE"}</h1>
        <p style="margin: 2px 0; color: #4b5563; font-size: 11px; text-align: center; width: 100%;">${shopInfo.address || shopInfo.location || ""}</p>
        <p style="margin: 2px 0; color: #4b5563; font-size: 11px; text-align: center; width: 100%;">Ph: ${shopInfo.phone || "N/A"}</p>
        ${shopInfo.email ? `<p style="margin: 2px 0; color: #4b5563; font-size: 11px; text-align: center; width: 100%;">Email: ${shopInfo.email}</p>` : ""}
        ${shopInfo.gstin ? `<p style="margin: 4px 0 0 0; font-weight: 700; font-size: 11px; text-align: center; width: 100%;">GSTIN: ${shopInfo.gstin.toUpperCase()}</p>` : ""}
      </div>
      <div class="divider"></div>
      <div style="text-align: center; width: 100%;">
        <p style="margin: 0; font-size: 11px;"><strong>INV:</strong> #${printInvoiceId} | <strong>Date:</strong> ${printDateStr}</p>
      </div>`
      : `<div class="flex-between" style="align-items: flex-start;">
        <div style="flex: 1;">
          ${logoHtml}
          <h1 class="shop-title" style="text-align: left !important;">${shopInfo.shop_name || "RETAIL INVOICE"}</h1>
          <p class="text-muted">${shopInfo.address || shopInfo.location || ""}</p>
          <p class="text-muted">Ph: ${shopInfo.phone || "N/A"}</p>
          ${shopInfo.email ? `<p class="text-muted">Email: ${shopInfo.email}</p>` : ""}
          ${shopInfo.gstin ? `<p class="text-bold mt-1">GSTIN: ${shopInfo.gstin.toUpperCase()}</p>` : ""}
        </div>
        <div style="text-align: right; padding-top: 10px;">
          <h2 style="margin:0 0 5px 0; font-size: 24px; color: #111827; text-transform: uppercase; letter-spacing: 2px;">Invoice</h2>
          <p style="margin: 2px 0;"><strong># ${printInvoiceId}</strong></p>
          <p class="text-muted" style="margin: 2px 0;">${printDateStr} | ${printTimeStr}</p>
        </div>
      </div>`;

    const customerHtml = printCustomer.name || printCustomer.phone
        ? `<div class="customer-box">
        <p class="section-label">Billed To:</p>
        ${printCustomer.name ? `<p class="cust-name">${printCustomer.name}</p>` : ""}
        ${printCustomer.phone ? `<p class="text-muted">${printCustomer.phone}</p>` : ""}
        ${printCustomer.address ? `<p class="text-muted" style="margin-top:2px;">${printCustomer.address}</p>` : ""}
      </div>` : "";

    const summaryHtml = `
      <div class="divider-thick"></div>
      ${printDiscount > 0 || printGstAmount > 0 ? `
          <div class="total-box" style="padding: 2px 0;"><span class="text-muted" style="font-size: 0.9em; font-weight: 700;">Subtotal</span><span style="font-weight: 700;">₹ ${Number(printSubTotal).toFixed(2)}</span></div>
      ` : ""}
      ${printDiscount > 0 ? `
          <div class="total-box" style="padding: 2px 0;"><span class="text-muted" style="font-size: 0.9em; font-weight: 700;">Discount</span><span style="color: #ef4444; font-weight: 700;">- ₹ ${Number(printDiscount).toFixed(2)}</span></div>
      ` : ""}
      ${printGstAmount > 0 ? `
          <div class="total-box" style="padding: 2px 0;"><span class="text-muted" style="font-size: 0.9em; font-weight: 700;">GST (${printGstPercent}%)</span><span style="font-weight: 700;">+ ₹ ${Number(printGstAmount).toFixed(2)}</span></div>
      ` : ""}
      ${(printDiscount > 0 || printGstAmount > 0) ? `<div class="divider"></div>` : ""}
      <div class="total-box"><span class="total-label">Grand Total</span><span class="total-amount">₹ ${Number(printTotal).toFixed(2)}</span></div>
    `;

    const watermarkText = shopInfo.shop_name || "RETAIL INVOICE";
    const nameLen = watermarkText.length;
    let watermarkFontSize = "45px";
    if (isThermal) {
      if (nameLen > 20) watermarkFontSize = "14px";
      else if (nameLen > 12) watermarkFontSize = "18px";
      else watermarkFontSize = "22px";
    } else {
      if (nameLen > 25) watermarkFontSize = "28px";
      else if (nameLen > 15) watermarkFontSize = "38px";
      else watermarkFontSize = "55px";
    }
    
    // ✨ FIX: Changed from thick left border to a clean box outline for A4/A5
    const premiumSideBar = isThermal ? "" : "border: 1px solid #cbd5e1; border-radius: 4px; padding: 24px;";

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Invoice #${printInvoiceId}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; } html, body { font-family: 'Inter', sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; } 
        ${pageCSS} 
        .print-container { position: relative; ${containerStyle} overflow: hidden; }
        .content-layer { position: relative; z-index: 1; ${premiumSideBar} }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: ${watermarkFontSize}; color: rgba(0, 0, 0, 0.05); z-index: 10; text-align: center !important; width: 100%; line-height: 1.2; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; pointer-events: none; white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word; }
        .text-center { text-align: center !important; } .text-right { text-align: right; } .text-muted { color: #6b7280; font-size: 0.9em; } .text-bold { font-weight: 700; } .mt-1 { margin-top: 5px; } .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .shop-title { margin: 0 0 4px 0; font-size: ${isThermal ? "16px" : "26px"}; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; text-align: center !important; word-wrap: break-word; width: 100%;}
        .divider { border-top: 1px solid #e5e7eb; margin: 12px 0; width: 100%; } .divider-thick { border-top: 2px solid #111827; margin: 12px 0; }
        .customer-box { background: transparent; padding: 10px; border-radius: 8px; margin: 12px 0; border: 1px dashed #cbd5e1; position: relative; z-index: 1;} .section-label { margin: 0 0 4px 0; font-size: 0.75em; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; } .cust-name { margin: 0 0 2px 0; font-weight: 700; font-size: 1.1em; }
        table { border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; width: 100%; max-width: 100%; } th { border-bottom: 2px solid #111827; padding: 6px 2px; text-align: left; font-size: 0.85em; text-transform: uppercase; color: #4b5563; font-weight: 700; } .td-pad { padding: 8px 2px; border-bottom: 1px solid #f3f4f6; }
        .total-box { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; } .total-label { font-size: ${isThermal ? "12px" : "18px"}; font-weight: 900; text-transform: uppercase; } .total-amount { font-size: ${isThermal ? "16px" : "24px"}; font-weight: 900; color: #111827; }
      </style>
      </head><body>
      <div class="print-container">
        <div class="watermark">${watermarkText}</div>
        <div class="content-layer">
          ${headerHtml}
          ${isThermal ? "" : '<div class="divider"></div>'}
          ${customerHtml}
          <table>
            <thead><tr><th style="white-space: nowrap; padding-right: 4px;">#</th><th style="width: 100%;">Item</th><th class="text-center" style="white-space: nowrap; padding-right: 4px;">Qty</th><th class="text-right" style="white-space: nowrap; padding-right: 4px;">Rate</th><th class="text-right" style="white-space: nowrap;">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          ${summaryHtml}
          ${qrHtml}
          <div class="divider"></div>
          <div style="text-align: center; margin-top: 15px; width: 100%;">
            <p style="margin: 0; font-weight: 700; text-align: center; font-size: 11px;">Thank you for your business!</p>
            <p style="margin: 6px 0; font-size: 9px; font-style: italic; color: #4b5563; text-align: center;">Computer generated receipt, no signature required.</p>
            <p style="margin: 4px 0; font-size: 8px; color: #9ca3af; text-align: center;">Software by CSC Empower Hub</p>
          </div>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
  };

  const handlePrintCurrentBill = () => {
    if (items.length === 0) return alert("Please add items to the bill before printing.");
    const dateStr = new Date().toLocaleDateString("en-GB");
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    triggerPrint(items, customerInfo, currentInvoiceId, dateStr, timeStr, grandTotal, subTotal, discountVal, gstVal, gstPercentage);
  };

  const handleReprintPastBill = (bill) => {
    const dateObj = new Date(bill.created_at);
    const subT = bill.sub_total || bill.grand_total; 
    const disc = bill.discount_amount || 0;
    const gstP = bill.gst_percentage || 0;
    const gstA = bill.gst_amount || 0;

    const safeItems = typeof bill.items_json === 'string' ? JSON.parse(bill.items_json) : (bill.items_json || []);

    triggerPrint(
        safeItems, 
        { name: bill.customer_name || "", phone: bill.customer_phone || "", address: bill.customer_address || "" }, 
        bill.invoice_no, 
        dateObj.toLocaleDateString("en-GB"), 
        dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), 
        bill.grand_total,
        subT, disc, gstA, gstP
    );
  };

  const generatePDF = (printItems, printCustomer, printInvoiceId, printDateStr, printTotal, printSubTotal = printTotal, printDiscount = 0, printGstAmount = 0, printGstPercent = 0) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22); doc.setTextColor(17, 24, 39); doc.text(shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : "RETAIL INVOICE", 14, 22);
      doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text(shopInfo.address || shopInfo.location || "Location: N/A", 14, 30); doc.text(`Ph: ${shopInfo.phone || "N/A"}`, 14, 36);
      if (shopInfo.gstin) doc.text(`GSTIN: ${shopInfo.gstin.toUpperCase()}`, 14, 42);
      doc.setFontSize(16); doc.setTextColor(17, 24, 39); doc.text("INVOICE", 196, 22, { align: "right" });
      doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text(`# ${printInvoiceId}`, 196, 28, { align: "right" }); doc.text(`Date: ${printDateStr}`, 196, 34, { align: "right" });
      
      if (printCustomer.name || printCustomer.phone) {
         doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.text("BILLED TO:", 14, 55);
         doc.setFontSize(11); doc.setTextColor(17, 24, 39); doc.text(printCustomer.name || "Walk-in Customer", 14, 61);
         doc.setFontSize(10); doc.setTextColor(107, 114, 128);
         if(printCustomer.phone) doc.text(printCustomer.phone, 14, 67);
         if(printCustomer.address) doc.text(printCustomer.address, 14, 73);
      }

      const safeItems = typeof printItems === 'string' ? JSON.parse(printItems) : (printItems || []);
      const tableData = safeItems.map((item, index) => [index + 1, item.name, item.quantity, `Rs ${Number(item.price).toFixed(2)}`, `Rs ${Number(item.total).toFixed(2)}`]);
      
      autoTable(doc, {
        startY: 85, head: [['#', 'Item Description', 'Qty', 'Rate', 'Total']], body: tableData, theme: 'striped', headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, 
        styles: { fontSize: 10, cellPadding: 4 }, columnStyles: { 0: { cellWidth: 15 }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }, },
      });
      
      let currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 85 + (tableData.length * 10)) + 10;
      
      if (printDiscount > 0 || printGstAmount > 0) {
          doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text("SUBTOTAL", 140, currentY); doc.text(`Rs ${Number(printSubTotal).toFixed(2)}`, 196, currentY, { align: "right" });
          currentY += 6;
      }
      if (printDiscount > 0) {
          doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text("DISCOUNT", 140, currentY); doc.setTextColor(239, 68, 68); doc.text(`- Rs ${Number(printDiscount).toFixed(2)}`, 196, currentY, { align: "right" });
          currentY += 6;
      }
      if (printGstAmount > 0) {
          doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text(`GST (${printGstPercent}%)`, 140, currentY); doc.text(`+ Rs ${Number(printGstAmount).toFixed(2)}`, 196, currentY, { align: "right" });
          currentY += 6;
      }
      
      doc.setFontSize(12); doc.setTextColor(17, 24, 39); doc.text("GRAND TOTAL", 140, currentY + 5);
      doc.setFontSize(16); doc.setTextColor(5, 150, 105); doc.text(`Rs ${Number(printTotal).toFixed(2)}`, 196, currentY + 5, { align: "right" });
      
      doc.setFontSize(8); doc.setTextColor(156, 163, 175); doc.text("Thank you for your business!", 105, 280, { align: "center" }); doc.text("Computer generated receipt, no signature required.", 105, 285, { align: "center" });
      doc.save(`Invoice_${printInvoiceId}_${printDateStr.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Failed to generate PDF. Make sure items exist.");
    }
  };

  const exportToExcel = () => {
    if (items.length === 0) return alert("Please add items before exporting.");
    const exportData = items.map((item, index) => ({ "S.No": index + 1, "Product Name": item.name, Quantity: item.quantity, "Unit Price (₹)": item.price, "Total Amount (₹)": item.total }));
    const dateStr = new Date().toLocaleDateString("en-GB");
    const contactStr = `Contact: ${shopInfo.phone || "N/A"}` + (shopInfo.email ? ` | Email: ${shopInfo.email}` : "");
    const headerData = [
      [shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : "RETAIL INVOICE"], [shopInfo.address ? shopInfo.address : `Location: ${shopInfo.location || "N/A"}`], [contactStr, "", "", "", `Date: ${dateStr}`],
      [shopInfo.gstin ? `GSTIN: ${shopInfo.gstin.toUpperCase()}` : "", "", "", "", `Invoice No: ${currentInvoiceId}`], [], ["TAX INVOICE / BILL OF SUPPLY"], [],
      ["BILLED TO:", customerInfo.name || "Walk-in Customer", "", "", ""], ["Phone:", customerInfo.phone || "N/A", "", "", ""], ["Address:", customerInfo.address || "N/A", "", "", ""], [],
    ];
    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: "A13" });
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }, { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } }];
    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: "A1" });
    
    const extraRows = [];
    if (discountVal > 0 || gstVal > 0) { extraRows.push(["", "", "", "SUBTOTAL", `₹${subTotal.toFixed(2)}`]); }
    if (discountVal > 0) { extraRows.push(["", "", "", "DISCOUNT", `-₹${discountVal.toFixed(2)}`]); }
    if (gstVal > 0) { extraRows.push(["", "", "", `GST (${gstPercentage}%)`, `+₹${gstVal.toFixed(2)}`]); }
    extraRows.push(["", "", "", "GRAND TOTAL", `₹${grandTotal.toFixed(2)}`]);
    
    XLSX.utils.sheet_add_aoa(worksheet, extraRows, { origin: -1 });
    
    if (worksheet["A1"]) worksheet["A1"].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } }; if (worksheet["A6"]) worksheet["A6"].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center" } };
    const headers = ["A13", "B13", "C13", "D13", "E13"]; headers.forEach((cell) => { if (worksheet[cell]) worksheet[cell].s = { font: { bold: true }, border: { bottom: { style: "thin", color: { rgb: "000000" } } } }; });
    worksheet["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, `INV_${currentInvoiceId}_${dateStr.replace(/\//g, "-")}.xlsx`);
  };

  const filteredPastBills = pastBills.filter(b => 
    (b.invoice_no && b.invoice_no.toLowerCase().includes(billSearch.toLowerCase())) ||
    (b.customer_name && b.customer_name.toLowerCase().includes(billSearch.toLowerCase())) ||
    (b.customer_phone && b.customer_phone.includes(billSearch))
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* URGENT RENEWAL BANNER */}
        {shopInfo.subscription_expires_at &&
          new Date(shopInfo.subscription_expires_at) <
            new Date(new Date().setDate(new Date().getDate() + 30)) && (
            <div className="bg-amber-50 border border-amber-200 p-4 md:p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in slide-in-from-top-4">
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-amber-800 font-black flex items-center justify-center sm:justify-start gap-2 uppercase tracking-wider text-sm mb-1">
                  <AlertCircle size={18} /> Trail License Expiring Soon! 
                </h4>
                <p className="text-amber-700 text-xs md:text-sm font-medium">
                  Your Trail period ends on{" "}
                  <strong className="font-black text-amber-900">
                    {new Date(
                      shopInfo.subscription_expires_at,
                    ).toLocaleDateString()}
                  </strong>
                  . Please contact the admin to avoid service interruption.
                </p>
              </div>
            </div>
          )}

        {/* ✨ FIX: Redesigned Nav Bar Wrapper - All overflow classes removed completely! */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "billing" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Receipt size={18} /> POS Billing
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "history" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ScrollText size={18} /> Past Bills
            </button>

            {shopInfo.has_inventory_module && (
              <button
                onClick={() => setActiveTab("inventory")}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "inventory" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Package size={18} /> Inventory
              </button>
            )}

            <button
              onClick={() => setActiveTab("tools")}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "tools" ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Calculator size={18} /> Tools
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "profile" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Settings size={18} /> Shop Settings
            </button>
            
            <button
              onClick={() => setActiveTab("license")}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "license" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <BadgeCheck size={18} /> License & Plan
            </button>
          </div>

          {activeTab === "billing" && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto ml-auto">
              <div className="flex items-center bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm h-11 flex-1 lg:flex-none">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="h-full px-3 text-xs font-bold text-slate-600 bg-emerald-50/50 outline-none cursor-pointer border-r border-emerald-100 focus:bg-emerald-50 transition-colors w-full"
                >
                  <option value="Thermal80">Thermal POS (80mm)</option>
                  <option value="A4">A4 Sheet</option>
                  <option value="A5">A5 Sheet</option>
                </select>
                <button
                  onClick={handlePrintCurrentBill}
                  className="h-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold transition text-sm whitespace-nowrap"
                >
                  <Printer size={16} /> Print Bill
                </button>
              </div>

              {/* ✨ FIX: Lowered Z-index to 20 so it goes UNDER the top dark blue navbar when scrolling */}
              <div className="relative z-20">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="h-11 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-emerald-700 border border-slate-200 px-4 rounded-xl font-bold transition shadow-sm"
                  title="Export Options"
                >
                  <Download size={18} /> Export <ChevronDown size={14} />
                </button>
                
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)}></div>
                    <div className="absolute right-0 top-14 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition"
                      >
                        <FileText size={16} /> Excel (.xlsx)
                      </button>
                      <div className="h-px bg-slate-100 w-full"></div>
                      <button
                        onClick={() => { 
                          if (items.length === 0) return alert("Please add items to the bill before exporting.");
                          const dateStr = new Date().toLocaleDateString("en-GB");
                          generatePDF(items, customerInfo, currentInvoiceId, dateStr, grandTotal, subTotal, discountVal, gstVal, gstPercentage);
                          setShowExportMenu(false); 
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition"
                      >
                        <Download size={16} /> PDF (.pdf)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === "tools" && <ShopCalculators />}

        {activeTab === "billing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-emerald-600" /> Customer
                    Details
                  </h3>
                  {(customerInfo.name ||
                    customerInfo.phone ||
                    customerInfo.address) && (
                    <button
                      onClick={() =>
                        setCustomerInfo({ name: "", phone: "", address: "" })
                      }
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md"
                      type="button"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white"
                  />
                  <textarea
                    rows="2"
                    placeholder="Customer Address (Optional)"
                    value={customerInfo.address}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:sticky top-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Plus size={18} className="text-emerald-600" /> Add Product
                </h3>

                {shopInfo.has_inventory_module && inventoryList.length > 0 && (
                  <div className="mb-5 relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Scan Barcode or Search Item..."
                        value={inventorySearch}
                        onChange={(e) => {
                          setInventorySearch(e.target.value);
                          setShowSuggestions(true);
                          
                          const exactMatch = inventoryList.find(i => i.barcode && i.barcode === e.target.value);
                          if (exactMatch) {
                             handleSelectInventoryItem(exactMatch);
                          }
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full pl-9 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-100 text-indigo-900 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none placeholder-indigo-300 transition-all"
                      />
                    </div>
                    
                    {showSuggestions && inventorySearch.trim() !== "" && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {inventoryList
                          .filter(i => i.item_name.toLowerCase().includes(inventorySearch.toLowerCase()) || (i.barcode && i.barcode.includes(inventorySearch)))
                          .map((invItem) => (
                            <button
                              key={invItem.id}
                              type="button"
                              onClick={() => handleSelectInventoryItem(invItem)}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-800">{invItem.item_name}</p>
                                <p className="text-[10px] font-mono text-slate-400">Stock: {invItem.current_stock}</p>
                              </div>
                              <span className="text-sm font-bold text-emerald-600">₹{invItem.selling_price}</span>
                            </button>
                          ))}
                        {inventoryList.filter(i => i.item_name.toLowerCase().includes(inventorySearch.toLowerCase()) || (i.barcode && i.barcode.includes(inventorySearch))).length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-400 text-center">No items found in inventory</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleAddItem} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => {
                        setItemName(e.target.value);
                        setSelectedInvId(null); 
                        if (billErrors.itemName)
                          setBillErrors((prev) => ({
                            ...prev,
                            itemName: false,
                          }));
                      }}
                      placeholder="e.g. A4 Paper Rim"
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.itemName ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300" : "border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"}`}
                    />
                    {billErrors.itemName && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        * Required
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Qty *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                          setQuantity(e.target.value);
                          if (billErrors.quantity)
                            setBillErrors((prev) => ({
                              ...prev,
                              quantity: false,
                            }));
                        }}
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.quantity ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (billErrors.price)
                            setBillErrors((prev) => ({ ...prev, price: false }));
                        }}
                        placeholder="0.00"
                        className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${billErrors.price ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300" : "border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"}`}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 mt-2 shadow-sm"
                  >
                    Add to Bill
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Receipt size={18} className="text-emerald-600" /> Current
                      Invoice
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono border border-slate-200 ml-2 shadow-sm font-bold">
                        {currentInvoiceId}
                      </span>
                    </h3>
                    {customerInfo.name && (
                      <p className="text-[11px] font-bold text-slate-600 mt-1 ml-6 flex items-center gap-1">
                        Billed to:{" "}
                        <span className="text-emerald-700">
                          {customerInfo.name}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {(items.length > 0 || customerInfo.name) && (
                      <button
                        onClick={clearCartOnly}
                        className="text-xs font-bold text-red-500 hover:text-red-700 underline underline-offset-4 transition px-2"
                      >
                        Empty Cart
                      </button>
                    )}
                    <button
                      onClick={handleCompleteBill}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      <CheckCircle size={14} /> Complete Sale & Next Bill
                    </button>
                  </div>
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
                          <td
                            colSpan="5"
                            className="p-16 text-center text-slate-400"
                          >
                            <Receipt
                              size={40}
                              className="mx-auto mb-4 opacity-20"
                            />
                            <p className="font-bold text-slate-500">
                              No items added yet.
                            </p>
                            <p className="text-sm mt-1">
                              Add products using the form to build your invoice.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/50 transition"
                          >
                            <td
                              className="p-4 pl-6 font-bold text-slate-800 text-sm max-w-[200px] truncate"
                              title={item.name}
                            >
                              {item.name}
                              {item.inv_id && (
                                <span className="ml-2 inline-block bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider" title="Auto-deducts from stock">Stock Linked</span>
                              )}
                            </td>
                            <td className="p-4 text-center text-sm font-medium text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="p-4 text-right text-sm font-medium text-slate-600">
                              ₹{item.price.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-black text-emerald-600 text-sm">
                              ₹{item.total.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-300 hover:text-red-500 transition p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Breakdown Total Section */}
                <div className="bg-slate-50 border-t border-slate-100 flex flex-col">
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">Subtotal</span>
                      <span className="font-bold text-slate-800">₹{subTotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">Discount</span>
                        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 shadow-sm">
                          <input 
                            type="number" min="0" 
                            value={discountInput} 
                            onChange={e => setDiscountInput(e.target.value)} 
                            className="w-16 p-1.5 text-right text-xs outline-none" 
                            placeholder="0" 
                          />
                          <select 
                            value={discountType} 
                            onChange={e => setDiscountType(e.target.value)}
                            className="bg-slate-50 text-xs font-black text-slate-600 border-l border-slate-200 outline-none cursor-pointer px-1.5 hover:bg-slate-100 transition-colors"
                          >
                            <option value="%">%</option>
                            <option value="₹">₹</option>
                          </select>
                        </div>
                      </div>
                      <span className="font-bold text-red-500">- ₹{discountVal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">GST (%)</span>
                        <input 
                          type="number" min="0" 
                          value={gstPercentage} 
                          onChange={e => setGstPercentage(e.target.value)} 
                          className="w-16 p-1.5 border border-slate-200 rounded-lg text-right text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white" 
                          placeholder="0" 
                        />
                      </div>
                      <span className="font-bold text-slate-700">+ ₹{gstVal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-emerald-50/80 border-t border-emerald-100 flex justify-between items-center mt-auto">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                      Grand Total
                    </span>
                    <span className="text-3xl font-black text-emerald-600 flex items-center">
                      <IndianRupee size={24} className="mr-1" />
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <ScrollText size={18} className="text-blue-600" /> Invoice History
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold ml-2">
                    {pastBills.length} Bills
                  </span>
                </h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-10 w-full sm:w-auto shrink-0 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <div className="px-3 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-slate-500 h-full">
                      <Printer size={14} />
                    </div>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="h-full px-3 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer hover:bg-slate-50 transition-colors w-full sm:w-auto"
                    >
                      <option value="Thermal80">Thermal (80mm)</option>
                      <option value="A4">A4 Sheet</option>
                      <option value="A5">A5 Sheet</option>
                    </select>
                  </div>
                  
                  <div className="relative w-full sm:w-80">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search by Invoice No or Customer..." 
                      value={billSearch}
                      onChange={e => setBillSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                    <tr>
                      <th className="p-4 pl-6">Invoice details</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4 text-center">Items</th>
                      <th className="p-4 text-right">Total Amount</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoadingBills ? (
                      <tr><td colSpan="5" className="p-16 text-center text-slate-400"><Loader2 size={30} className="mx-auto animate-spin mb-3" /> Fetching records...</td></tr>
                    ) : filteredPastBills.length === 0 ? (
                      <tr><td colSpan="5" className="p-16 text-center text-slate-400">No past bills found.</td></tr>
                    ) : (
                      filteredPastBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            <p className="font-black text-slate-800 text-sm">#{bill.invoice_no}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                              {new Date(bill.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-slate-700">{bill.customer_name || "Walk-in Customer"}</p>
                            {bill.customer_phone && <p className="text-[10px] text-slate-400 mt-0.5">{bill.customer_phone}</p>}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
                              {bill.items_json?.length || 0}
                            </span>
                          </td>
                          <td className="p-4 text-right text-sm font-black text-emerald-600">
                            ₹{Number(bill.grand_total).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleReprintPastBill(bill)} 
                                className="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                title="Print this bill"
                              >
                                <Printer size={14} /> Print
                              </button>
                              <button 
                                onClick={() => {
                                  const dateStr = new Date(bill.created_at).toLocaleDateString("en-GB");
                                  const pastCustomer = { name: bill.customer_name || "", phone: bill.customer_phone || "", address: bill.customer_address || "" };
                                  const subT = bill.sub_total || bill.grand_total; 
                                  const disc = bill.discount_amount || 0;
                                  const gstP = bill.gst_percentage || 0;
                                  const gstA = bill.gst_amount || 0;
                                  const safeItems = typeof bill.items_json === 'string' ? JSON.parse(bill.items_json) : (bill.items_json || []);
                                  generatePDF(safeItems, pastCustomer, bill.invoice_no, dateStr, bill.grand_total, subT, disc, gstA, gstP);
                                }} 
                                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                title="Download as PDF"
                              >
                                <Download size={14} /> PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && shopInfo.has_inventory_module && (
          <InventoryManager userId={userId} />
        )}

        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-900 text-white">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <Store className="text-emerald-400" /> Business Profile
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  This information will be printed on your Excel and Paper Invoices.
                </p>
              </div>
              <form
                onSubmit={handleUpdateProfile}
                className="p-6 md:p-8 space-y-6"
                noValidate
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {shopInfo.logo_url ? (
                        <img src={shopInfo.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Store size={28} className="text-slate-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 mb-1 text-sm">Shop Logo</h3>
                      <p className="text-[11px] text-slate-500 mb-3">Appears at top of bill</p>
                      <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition w-full ${isUploadingLogo ? "bg-slate-200 text-slate-500" : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"}`}>
                        {isUploadingLogo ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><ImagePlus size={14} /> Choose Logo</>}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-sm rounded-lg">
                      {shopInfo.qr_code_url ? (
                        <img src={shopInfo.qr_code_url} alt="QR Code" className="w-full h-full object-contain p-1" />
                      ) : (
                        <QrCode size={28} className="text-slate-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 mb-1 text-sm">Payment QR Code</h3>
                      <p className="text-[11px] text-slate-500 mb-3">Appears at bottom of bill</p>
                      <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition w-full ${isUploadingQr ? "bg-slate-200 text-slate-500" : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"}`}>
                        {isUploadingQr ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><QrCode size={14} /> Choose QR Image</>}
                        <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={isUploadingQr} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Store size={14} /> Shop / Business Name *
                    </label>
                    <input
                      type="text"
                      value={shopInfo.shop_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShopInfo((prev) => ({ ...prev, shop_name: val }));
                        if (profileErrors.shop_name) setProfileErrors((prev) => ({ ...prev, shop_name: false }));
                      }}
                      className={`w-full p-3.5 border rounded-xl outline-none font-bold text-slate-800 transition-all ${profileErrors.shop_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.shop_name && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">* Shop Name is required</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <User size={14} /> Owner Name *
                    </label>
                    <input
                      type="text"
                      value={shopInfo.full_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShopInfo((prev) => ({ ...prev, full_name: val }));
                        if (profileErrors.full_name) setProfileErrors((prev) => ({ ...prev, full_name: false }));
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.full_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.full_name && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">* Owner Name is required</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Phone size={14} /> Contact Number *
                    </label>
                    <input
                      type="tel"
                      value={shopInfo.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShopInfo((prev) => ({ ...prev, phone: val }));
                        if (profileErrors.phone) setProfileErrors((prev) => ({ ...prev, phone: false }));
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.phone ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.phone && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">* Contact Number is required</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={14} /> GSTIN / Tax ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={shopInfo.gstin}
                      onChange={(e) => setShopInfo((prev) => ({ ...prev, gstin: e.target.value }))}
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
                      onChange={(e) => setShopInfo((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street, City, Landmark, PIN Code"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm leading-relaxed"
                    ></textarea>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <button type="submit" disabled={isSaving} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5"}`}>
                    {isSaving ? "Saving..." : <><Save size={18} /> Save Profile</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "license" && (
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
                          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">🟢 Active License</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-red-200 animate-pulse">🔴 Expired</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium text-sm">Awaiting Admin Approval</span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500"><CalendarDays size={16} /><span className="text-xs font-bold uppercase tracking-wider">Activated</span></div>
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
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Laptop size={18} className="text-emerald-600" /> Device License Limit</h3>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">{shopInfo.active_devices} / {shopInfo.device_limit} Used</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 inset-shadow-sm">
                    <div className={`h-3 rounded-full transition-all duration-1000 ${shopInfo.active_devices >= shopInfo.device_limit ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min((shopInfo.active_devices / shopInfo.device_limit) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    Your account is limited to <strong className="text-slate-700">{shopInfo.device_limit} physical computer(s)</strong> at a time for security. To add more systems, please contact the admin team to upgrade your plan.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 text-slate-500 text-sm"><LifeBuoy size={18} /><span>Need help or an upgrade? Contact Admin.</span></div>
                  {shopInfo.renewal_requested ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-6 py-3 rounded-xl text-sm font-bold w-full sm:w-auto text-center">⏳ Renewal Request Pending</span>
                  ) : (
                    <button onClick={handleRequestRenewal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition w-full sm:w-auto text-center">Request Plan Renewal</button>
                  )}
                </div>

                {renewalHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><History size={18} className="text-emerald-600" /> Billing History</h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {renewalHistory.map((history) => {
                        const isRevoke = history.action_type?.toLowerCase().includes("revoked") || history.action_type?.toLowerCase().includes("canceled");
                        const isPending = history.action_type?.toLowerCase().includes("pending");
                        
                        return (
                          <div key={history.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-200 transition-colors group">
                            <div>
                              <p className={`text-sm font-bold ${isRevoke ? "text-red-600" : isPending ? "text-amber-600" : "text-slate-800 group-hover:text-emerald-700"} transition-colors`}>
                                {history.action_type || "1-Year License Extension"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><CalendarDays size={12} /> Processed on: {new Date(history.renewed_at).toLocaleDateString()}</p>
                            </div>
                            <div className="mt-3 sm:mt-0 text-left sm:text-right">
                              <span className={`${isRevoke ? "bg-red-100 text-red-800 border-red-200" : isPending ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"} font-bold px-3 py-1 rounded-lg text-xs border inline-block`}>
                                {isRevoke ? "Cancelled" : isPending ? "Pending" : "Paid / Approved"}
                              </span>
                              {!isRevoke && !isPending && history.new_expiry && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Valid until {new Date(history.new_expiry).getFullYear()}</p>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopDashboard;