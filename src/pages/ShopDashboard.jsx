import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx-js-style";
import { supabase } from "../supabaseClient";
import { useDeviceTracker } from "../hooks/useDeviceTracker";
import {
  Plus,
  Trash2,
  Download,
  Store,
  Receipt,
  IndianRupee,
  Settings,
  Save,
  MapPin,
  Phone,
  User,
  FileText,
  Printer,
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Laptop,
  LifeBuoy,
  History,
  CheckCircle,
  ImagePlus,
  Loader2,
  Mail,
} from "lucide-react";

function ShopDashboard() {
  useDeviceTracker();

  const [activeTab, setActiveTab] = useState("billing");
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Print Page Size State
  const [pageSize, setPageSize] = useState("Thermal80");

  // 1. STATE: Shop Details & Profile Errors
  const [shopInfo, setShopInfo] = useState({
    shop_name: "",
    full_name: "",
    phone: "",
    email: "", // ✨ EMAIL STATE
    location: "",
    address: "",
    gstin: "",
    logo_url: "",
    created_at: null,
    subscription_expires_at: null,
    renewal_requested: false,
    member_id: null,
    device_limit: 1,
    active_devices: 0,
  });
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [profileErrors, setProfileErrors] = useState({
    shop_name: false,
    full_name: false,
    phone: false,
  });

  // 2. STATE: Customer Details (Syncs with Local Storage for safety)
  const [customerInfo, setCustomerInfo] = useState(() => {
    const saved = localStorage.getItem("shop_billing_customer");
    return saved ? JSON.parse(saved) : { name: "", phone: "", address: "" };
  });

  // 3. STATE: Billing Items & Errors
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("shop_billing_items");
    return saved ? JSON.parse(saved) : [];
  });

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");

  const [billErrors, setBillErrors] = useState({
    itemName: false,
    quantity: false,
    price: false,
  });

  // 4. STATE: Live DB Invoice Sequence
  const [invoiceSeq, setInvoiceSeq] = useState(1);
  const currentInvoiceId = String(invoiceSeq).padStart(4, "0");

  // 5. FETCH SHOP DETAILS ON LOAD
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);

          const { data, error } = await supabase
            .from("shop_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          const { count: deviceCount } = await supabase
            .from("shop_devices")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", user.id)
            .eq("is_blocked", false);

          if (data && !error) {
            setShopInfo({
              shop_name: data.shop_name || "",
              full_name: data.full_name || "",
              phone: data.phone || "",
              // ✨ SMART LOGIC: Use saved profile email, or fallback to their Supabase login email
              email: data.email || user.email || "", 
              location: data.location || "",
              address: data.address || "",
              gstin: data.gstin || "",
              logo_url: data.logo_url || "", 
              created_at: data.created_at || null,
              subscription_expires_at: data.subscription_expires_at || null,
              renewal_requested: data.renewal_requested || false,
              member_id: data.member_id || null,
              device_limit: data.device_limit || 1,
              active_devices: deviceCount || 0,
            });

            setInvoiceSeq((data.last_invoice_number || 0) + 1);

            const { data: history } = await supabase
              .from("license_renewals")
              .select("*")
              .eq("shop_id", user.id)
              .order("renewed_at", { ascending: false });
            setRenewalHistory(history || []);
          }
        }
      } catch (err) {
        console.error("Error fetching shop details:", err);
      }
    };
    fetchShopData();
  }, []);

  // 6. SYNC CURRENT CART WITH LOCAL STORAGE
  useEffect(() => {
    localStorage.setItem("shop_billing_items", JSON.stringify(items));
    localStorage.setItem("shop_billing_customer", JSON.stringify(customerInfo));
  }, [items, customerInfo]);

  // ✨ CLOUDINARY LOGO UPLOAD HANDLER ✨
  const handleLogoUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploadingLogo(true);

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      formData.append(
        "upload_preset",
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      );

      const cleanShopName = shopInfo.shop_name 
        ? shopInfo.shop_name.replace(/[^a-zA-Z0-9]/g, '_') 
        : `Shop_${userId?.substring(0,6)}`;
      
      formData.append("folder", "Shoppers-Logo");
      formData.append("public_id", `${cleanShopName}_Logo`);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (data.secure_url) {
        setShopInfo((prev) => ({ ...prev, logo_url: data.secure_url }));
        alert(
          "Logo uploaded to Cloudinary! Please click 'Save Profile' below to update your shop.",
        );
      } else {
        throw new Error("Failed to get secure URL from Cloudinary.");
      }
    } catch (error) {
      alert("Error uploading logo: " + error.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // HANDLE RENEWAL REQUEST
  const handleRequestRenewal = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("shop_profiles")
        .update({ renewal_requested: true })
        .eq("id", userId);

      if (error) throw error;

      alert(
        "Renewal request sent successfully! An admin will review your account shortly.",
      );
      setShopInfo((prev) => ({ ...prev, renewal_requested: true }));
    } catch (err) {
      alert("Failed to send request: " + err.message);
    }
  };

  // 7. BILLING LOGIC
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = (e) => {
    e.preventDefault();
    const newErrors = {
      itemName: !itemName.trim(),
      quantity: !quantity || Number(quantity) < 1,
      price: !price || Number(price) <= 0,
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
      total: Number(quantity) * Number(price),
    };
    setItems([...items, newItem]);
    setItemName("");
    setQuantity(1);
    setPrice("");
  };

  const handleRemoveItem = (id) =>
    setItems(items.filter((item) => item.id !== id));

  // COMPLETES BILL & PULLS NEXT NUMBER FROM DB
  const handleCompleteBill = async () => {
    if (window.confirm("Complete this sale and start the next bill?")) {
      try {
        const { data: newDbCount, error } = await supabase.rpc(
          "increment_shop_invoice",
          {
            target_shop_id: userId,
          },
        );

        if (error) throw error;

        setItems([]);
        setCustomerInfo({ name: "", phone: "", address: "" });

        if (newDbCount !== null) {
          setInvoiceSeq(newDbCount + 1);
        }
      } catch (err) {
        console.error("Failed to increment sequence:", err);
        alert("Error generating next invoice number. Please check connection.");
      }
    }
  };

  const clearCartOnly = () => {
    if (
      window.confirm("Empty cart items without changing the invoice number?")
    ) {
      setItems([]);
      setCustomerInfo({ name: "", phone: "", address: "" });
    }
  };

  // 8. PROFILE UPDATE LOGIC
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const newErrors = {
      shop_name: !shopInfo.shop_name.trim(),
      full_name: !shopInfo.full_name.trim(),
      phone: !shopInfo.phone.trim(),
    };
    if (newErrors.shop_name || newErrors.full_name || newErrors.phone) {
      setProfileErrors(newErrors);
      return;
    }
    setProfileErrors({ shop_name: false, full_name: false, phone: false });
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("shop_profiles")
        .update({
          shop_name: shopInfo.shop_name,
          full_name: shopInfo.full_name,
          phone: shopInfo.phone,
          email: shopInfo.email,
          location: shopInfo.location,
          address: shopInfo.address,
          gstin: shopInfo.gstin,
          logo_url: shopInfo.logo_url, 
        })
        .eq("id", userId);

      if (error) throw error;
      alert("Shop Profile Updated Successfully!");
    } catch (error) {
      alert("Error updating profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 9. ✨ PREMIUM PRINT LOGIC (WITH LOGO, WATERMARK & EMAIL) ✨
  const handlePrint = () => {
    if (items.length === 0) return alert("Please add items to the bill before printing.");
    
    let pageCSS = ""; let containerStyle = "";
    const isThermal = pageSize === 'Thermal80';

    if (pageSize === "A4") { pageCSS = "@page { size: A4; margin: 15mm; }"; containerStyle = "max-width: 210mm; margin: 0 auto; font-size: 14px;"; } 
    else if (pageSize === "A5") { pageCSS = "@page { size: A5; margin: 12mm; }"; containerStyle = "max-width: 148mm; margin: 0 auto; font-size: 12px;"; } 
    else if (isThermal) { pageCSS = "@page { size: 80mm auto; margin: 5mm; }"; containerStyle = "max-width: 72mm; margin: 0 auto; font-size: 12px;"; }

    const itemsHtml = items.map((item, i) => `
      <tr>
        <td class="td-pad">${i + 1}</td>
        <td class="td-pad" style="word-break: break-word; font-weight: 500;">${item.name}</td>
        <td class="td-pad text-center">${item.quantity}</td>
        <td class="td-pad text-right">${item.price.toFixed(2)}</td>
        <td class="td-pad text-right" style="font-weight: 700;">${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const dateStr = new Date().toLocaleDateString('en-GB'); 
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const logoHtml = shopInfo.logo_url ? `<img src="${shopInfo.logo_url}" class="print-logo" />` : '';

    const headerHtml = isThermal ? `
      <div class="text-center header-info">
        ${logoHtml}
        <h1 class="shop-title">${shopInfo.shop_name || 'RETAIL INVOICE'}</h1>
        <p class="text-muted">${shopInfo.address || shopInfo.location || ''}</p>
        <p class="text-muted">Ph: ${shopInfo.phone || 'N/A'}</p>
        ${shopInfo.email ? `<p class="text-muted">Email: ${shopInfo.email}</p>` : ''}
        ${shopInfo.gstin ? `<p class="text-bold mt-1">GSTIN: ${shopInfo.gstin.toUpperCase()}</p>` : ''}
      </div>
      <div class="divider"></div>
      <div class="inv-meta text-center">
        <p><strong>INV:</strong> #${currentInvoiceId} | <strong>Date:</strong> ${dateStr}</p>
      </div>
    ` : `
      <div class="flex-between" style="align-items: flex-start;">
        <div style="flex: 1;">
          ${logoHtml}
          <h1 class="shop-title" style="text-align: left;">${shopInfo.shop_name || 'RETAIL INVOICE'}</h1>
          <p class="text-muted">${shopInfo.address || shopInfo.location || ''}</p>
          <p class="text-muted">Ph: ${shopInfo.phone || 'N/A'}</p>
          ${shopInfo.email ? `<p class="text-muted">Email: ${shopInfo.email}</p>` : ''}
          ${shopInfo.gstin ? `<p class="text-bold mt-1">GSTIN: ${shopInfo.gstin.toUpperCase()}</p>` : ''}
        </div>
        <div style="text-align: right; padding-top: 10px;">
          <h2 style="margin:0 0 5px 0; font-size: 24px; color: #111827; text-transform: uppercase; letter-spacing: 2px;">Invoice</h2>
          <p style="margin: 2px 0;"><strong># ${currentInvoiceId}</strong></p>
          <p class="text-muted" style="margin: 2px 0;">${dateStr} | ${timeStr}</p>
        </div>
      </div>
    `;

    const customerHtml = (customerInfo.name || customerInfo.phone) ? `
      <div class="customer-box">
        <p class="section-label">Billed To:</p>
        ${customerInfo.name ? `<p class="cust-name">${customerInfo.name}</p>` : ''}
        ${customerInfo.phone ? `<p class="text-muted">📞 ${customerInfo.phone}</p>` : ''}
        ${customerInfo.address ? `<p class="text-muted" style="margin-top:2px;">${customerInfo.address}</p>` : ''}
      </div>
    ` : '';

    const watermarkText = shopInfo.shop_name || 'RETAIL INVOICE';
    const watermarkFontSize = isThermal ? '32px' : '80px';
    const premiumSideBar = isThermal ? '' : 'border-left: 8px solid #111827; padding-left: 24px; padding-right: 10px;';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Invoice #${currentInvoiceId}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        
        * { box-sizing: border-box; }
        html, body { 
          font-family: 'Inter', sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; 
          width: 100%; height: 100%; 
        } 
        ${pageCSS} 
        
        .main-container { 
          position: relative; 
          z-index: 1; 
          ${containerStyle} 
          ${premiumSideBar}
        }
        
        .text-center { text-align: center; } 
        .text-right { text-align: right; } 
        .text-muted { color: #6b7280; font-size: 0.9em; }
        .text-bold { font-weight: 700; }
        .mt-1 { margin-top: 5px; }
        
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
        
        .print-logo { max-height: ${isThermal ? '50px' : '75px'}; object-fit: contain; margin-bottom: 10px; }
        .shop-title { margin: 0 0 4px 0; font-size: ${isThermal ? '18px' : '26px'}; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        .header-info p { margin: 2px 0; }
        
        .divider { border-top: 1px solid #e5e7eb; margin: 15px 0; }
        .divider-thick { border-top: 2px solid #111827; margin: 15px 0; }
        
        .customer-box { background: #f9fafb; padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .section-label { margin: 0 0 4px 0; font-size: 0.75em; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
        .cust-name { margin: 0 0 2px 0; font-weight: 700; font-size: 1.1em; }
        
        table { border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; width: 100%; } 
        th { border-bottom: 2px solid #111827; padding: 8px 4px; text-align: left; font-size: 0.85em; text-transform: uppercase; color: #4b5563; font-weight: 700; } 
        .td-pad { padding: 10px 4px; border-bottom: 1px solid #f3f4f6; }
        
        .total-box { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
        .total-label { font-size: ${isThermal ? '14px' : '18px'}; font-weight: 900; text-transform: uppercase; }
        .total-amount { font-size: ${isThermal ? '18px' : '24px'}; font-weight: 900; color: #111827; }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: ${watermarkFontSize};
          color: rgba(0, 0, 0, 0.04);
          z-index: 0;
          white-space: nowrap;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 8px;
          pointer-events: none;
        }
      </style>
      </head><body>
      
      <div class="watermark">${watermarkText}</div>

      <div class="main-container">
        ${headerHtml}
        
        ${isThermal ? '' : '<div class="divider"></div>'}
        
        ${customerHtml}
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 45%;">Item Description</th>
              <th class="text-center" style="width: 15%;">Qty</th>
              <th class="text-right" style="width: 15%;">Rate</th>
              <th class="text-right" style="width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <div class="divider-thick"></div>
        
        <div class="total-box">
          <span class="total-label">Grand Total</span>
          <span class="total-amount">₹ ${grandTotal.toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        <div class="text-center" style="margin-top: 20px;">
          <p style="margin: 0; font-weight: 700;">Thank you for your business!</p>
          <p style="margin: 8px 0; font-size: 0.85em; font-style: italic; color: #4b5563;">
            This is a computer generated receipt, signature not required.
          </p>
          <p style="margin: 4px 0; font-size: 0.75em; color: #9ca3af;">Software by CSC Empower Hub</p>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close(); 
    printWindow.focus(); 
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 350); 
  };

  // 10. EXPORT LOGIC
  const exportToExcel = () => {
    if (items.length === 0) return alert("Please add items before exporting.");
    const exportData = items.map((item, index) => ({
      "S.No": index + 1,
      "Product Name": item.name,
      Quantity: item.quantity,
      "Unit Price (₹)": item.price,
      "Total Amount (₹)": item.total,
    }));

    const dateStr = new Date().toLocaleDateString("en-GB");
    const contactStr = `Contact: ${shopInfo.phone || "N/A"}` + (shopInfo.email ? ` | Email: ${shopInfo.email}` : '');
    
    const headerData = [
      [shopInfo.shop_name ? shopInfo.shop_name.toUpperCase() : "RETAIL INVOICE"],
      [shopInfo.address ? shopInfo.address : `Location: ${shopInfo.location || "N/A"}`],
      [contactStr, "", "", "", `Date: ${dateStr}`],
      [shopInfo.gstin ? `GSTIN: ${shopInfo.gstin.toUpperCase()}` : "", "", "", "", `Invoice No: ${currentInvoiceId}`],
      [],
      ["TAX INVOICE / BILL OF SUPPLY"],
      [],
      ["BILLED TO:", customerInfo.name || "Walk-in Customer", "", "", ""],
      ["Phone:", customerInfo.phone || "N/A", "", "", ""],
      ["Address:", customerInfo.address || "N/A", "", "", ""],
      [],
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: "A13" });
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
    ];

    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: "A1" });
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [["", "", "", "GRAND TOTAL", `₹${grandTotal.toFixed(2)}`]],
      { origin: -1 },
    );

    if (worksheet["A1"]) worksheet["A1"].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } };
    if (worksheet["A2"]) worksheet["A2"].s = { font: { sz: 10 }, alignment: { horizontal: "center" } };
    if (worksheet["A3"]) worksheet["A3"].s = { font: { sz: 11 }, alignment: { horizontal: "left" } };
    if (worksheet["E3"]) worksheet["E3"].s = { font: { sz: 11 }, alignment: { horizontal: "right" } };
    if (worksheet["A4"]) worksheet["A4"].s = { font: { sz: 11 }, alignment: { horizontal: "left" } };
    if (worksheet["E4"]) worksheet["E4"].s = { font: { sz: 11, bold: true }, alignment: { horizontal: "right" } };
    if (worksheet["A6"]) worksheet["A6"].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center" } };

    if (worksheet["A8"]) worksheet["A8"].s = { font: { bold: true, sz: 11 }, alignment: { horizontal: "left" } };
    if (worksheet["A9"]) worksheet["A9"].s = { font: { bold: true } };
    if (worksheet["A10"]) worksheet["A10"].s = { font: { bold: true } };
    if (worksheet["A11"]) worksheet["A11"].s = { font: { bold: true } };

    const headers = ["A13", "B13", "C13", "D13", "E13"];
    headers.forEach((cell) => {
      if (worksheet[cell])
        worksheet[cell].s = {
          font: { bold: true },
          border: { bottom: { style: "thin", color: { rgb: "000000" } } },
        };
    });

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const lastRow = range.e.r + 1;
    if (worksheet[`D${lastRow}`]) worksheet[`D${lastRow}`].s = { font: { bold: true } };
    if (worksheet[`E${lastRow}`]) worksheet[`E${lastRow}`].s = { font: { bold: true } };

    worksheet["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");

    XLSX.writeFile(
      workbook,
      `INV_${currentInvoiceId}_${dateStr.replace(/\//g, "-")}.xlsx`,
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* URGENT RENEWAL BANNER */}
        {shopInfo.subscription_expires_at &&
          new Date(shopInfo.subscription_expires_at) <
            new Date(new Date().setDate(new Date().getDate() + 30)) && (
            <div className="bg-amber-50 border border-amber-200 p-4 md:p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in slide-in-from-top-4">
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-amber-800 font-black flex items-center justify-center sm:justify-start gap-2 uppercase tracking-wider text-sm mb-1">
                  <AlertCircle size={18} /> License Expiring Soon
                </h4>
                <p className="text-amber-700 text-xs md:text-sm font-medium">
                  Your platform license expires on{" "}
                  <strong className="font-black text-amber-900">
                    {new Date(
                      shopInfo.subscription_expires_at,
                    ).toLocaleDateString()}
                  </strong>
                  . Please request a renewal to avoid service interruption.
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
              onClick={() => setActiveTab("billing")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "billing" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Receipt size={18} /> POS Billing
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "profile" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Settings size={18} /> Shop Settings
            </button>
            <button
              onClick={() => setActiveTab("license")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "license" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <BadgeCheck size={18} /> License & Plan
            </button>
          </div>

          {/* PRINTER & EXPORT CONTROLS */}
          {activeTab === "billing" && (
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
        {activeTab === "billing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-300">
            {/* LEFT COLUMN: FORMS */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* CUSTOMER DETAILS BLOCK WITH CLEAR BUTTON */}
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
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        phone: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white"
                  />
                  <textarea
                    rows="2"
                    placeholder="Customer Address (Optional)"
                    value={customerInfo.address}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        address: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 focus:bg-white resize-none"
                  ></textarea>
                </div>
              </div>

              {/* PRODUCT ENTRY BLOCK */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:sticky top-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Plus size={18} className="text-emerald-600" /> Add Product
                </h3>
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
                        if (billErrors.itemName)
                          setBillErrors({ ...billErrors, itemName: false });
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
                            setBillErrors({ ...billErrors, quantity: false });
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
                            setBillErrors({ ...billErrors, price: false });
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

            {/* RIGHT COLUMN: INVOICE TABLE */}
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
                    {/* COMPLETE SALE BUTTON */}
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
                <div className="p-6 bg-emerald-50/50 border-t border-emerald-100 flex justify-between items-center mt-auto">
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
        )}

        {/* TAB 2: SHOP PROFILE / SETTINGS (NOW WITH LOGO UPLOAD) */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-900 text-white">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <Store className="text-emerald-400" /> Business Profile
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  This information will be printed on your Excel and Paper
                  Invoices.
                </p>
              </div>
              <form
                onSubmit={handleUpdateProfile}
                className="p-6 md:p-8 space-y-6"
                noValidate
              >
                {/* ✨ LOGO UPLOAD SECTION ✨ */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {shopInfo.logo_url ? (
                      <img
                        src={shopInfo.logo_url}
                        alt="Shop Logo"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Store size={32} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 mb-1">
                      Shop Logo (For Printed Bills)
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Upload a clean PNG or JPG. It will be displayed at the top
                      of your printed invoices.
                    </p>
                    <label
                      className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition ${isUploadingLogo ? "bg-slate-200 text-slate-500" : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"}`}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />{" "}
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImagePlus size={16} /> Choose Logo Image
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                    </label>
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
                        setShopInfo({ ...shopInfo, shop_name: e.target.value });
                        if (profileErrors.shop_name)
                          setProfileErrors({
                            ...profileErrors,
                            shop_name: false,
                          });
                      }}
                      className={`w-full p-3.5 border rounded-xl outline-none font-bold text-slate-800 transition-all ${profileErrors.shop_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.shop_name && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        * Shop Name is required
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
                      onChange={(e) => {
                        setShopInfo({ ...shopInfo, full_name: e.target.value });
                        if (profileErrors.full_name)
                          setProfileErrors({
                            ...profileErrors,
                            full_name: false,
                          });
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.full_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.full_name && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        * Owner Name is required
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
                      onChange={(e) => {
                        setShopInfo({ ...shopInfo, phone: e.target.value });
                        if (profileErrors.phone)
                          setProfileErrors({ ...profileErrors, phone: false });
                      }}
                      className={`w-full p-3 border rounded-xl outline-none text-sm transition-all ${profileErrors.phone ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-2 focus:ring-emerald-500"}`}
                    />
                    {profileErrors.phone && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        * Contact Number is required
                      </p>
                    )}
                  </div>
                  
                  {/* ✨ EMAIL SETTINGS BLOCK ✨ */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mail size={14} /> Email Address
                    </label>
                    <input
                      type="email"
                      value={shopInfo.email}
                      onChange={(e) =>
                        setShopInfo({ ...shopInfo, email: e.target.value })
                      }
                      placeholder="shop@example.com"
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={14} /> GSTIN / Tax ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={shopInfo.gstin}
                      onChange={(e) =>
                        setShopInfo({ ...shopInfo, gstin: e.target.value })
                      }
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
                      onChange={(e) =>
                        setShopInfo({ ...shopInfo, address: e.target.value })
                      }
                      placeholder="Street, City, Landmark, PIN Code"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm leading-relaxed"
                    ></textarea>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5"}`}
                  >
                    {isSaving ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save size={18} /> Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: LICENSE & PLAN */}
        {activeTab === "license" && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-900 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                      <BadgeCheck className="text-emerald-400" /> License
                      Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Manage your active subscription and device allocations.
                    </p>
                  </div>
                  {shopInfo.member_id && (
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Your Shop ID
                      </p>
                      <p className="text-xl font-mono font-bold tracking-tight text-emerald-400">
                        #{shopInfo.member_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Subscription Status
                    </span>
                    {shopInfo.subscription_expires_at ? (
                      <div>
                        {new Date(shopInfo.subscription_expires_at) >
                        new Date() ? (
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
                      <span className="text-slate-500 font-medium text-sm">
                        Awaiting Admin Approval
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Activated
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {formatDate(shopInfo.created_at)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200 w-full"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays
                          size={16}
                          className={
                            new Date(shopInfo.subscription_expires_at) <
                            new Date(
                              new Date().setDate(new Date().getDate() + 30),
                            )
                              ? "text-amber-500"
                              : ""
                          }
                        />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Expires
                        </span>
                      </div>
                      <span
                        className={`text-sm font-bold ${new Date(shopInfo.subscription_expires_at) < new Date(new Date().setDate(new Date().getDate() + 30)) ? "text-amber-600" : "text-slate-800"}`}
                      >
                        {formatDate(shopInfo.subscription_expires_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Laptop size={18} className="text-emerald-600" /> Device
                      License Limit
                    </h3>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                      {shopInfo.active_devices} / {shopInfo.device_limit} Used
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 inset-shadow-sm">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        shopInfo.active_devices >= shopInfo.device_limit
                          ? "bg-red-500"
                          : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min((shopInfo.active_devices / shopInfo.device_limit) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    Your account is limited to{" "}
                    <strong className="text-slate-700">
                      {shopInfo.device_limit} physical computer(s)
                    </strong>{" "}
                    at a time for security. To add more systems, please contact
                    the admin team to upgrade your plan.
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

                {renewalHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <History size={18} className="text-emerald-600" /> Billing
                      History
                    </h3>
                    <div className="space-y-3">
                      {renewalHistory.map((history) => (
                        <div
                          key={history.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-200 transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                              1-Year License Extension
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <CalendarDays size={12} />
                              Processed on:{" "}
                              {new Date(
                                history.renewed_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mt-3 sm:mt-0 text-left sm:text-right">
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-200 inline-block">
                              Paid / Approved
                            </span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                              Valid until{" "}
                              {new Date(history.new_expiry).getFullYear()}
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