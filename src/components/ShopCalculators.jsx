import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument } from 'pdf-lib'; 
import { 
  Calculator, ArrowRightLeft, GraduationCap, Plus, Trash2, 
  ScanLine, Loader2, BookOpen, Building2, CheckCircle2, 
  FileImage, FileDown, Image as ImageIcon, X, Minimize, RefreshCw, 
  UploadCloud, Files, Settings2, Crop, FilePlus
} from "lucide-react";
import { supabase } from '../supabaseClient';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// CONVERSION LOGIC & DATA
const conversionRates = {
  Weight: { kg: 1000, g: 1, mg: 0.001, lb: 453.592, oz: 28.3495 },
  Length: { m: 100, cm: 1, mm: 0.1, km: 100000, inch: 2.54, foot: 30.48, yard: 91.44 },
  Area: { 
    sq_m: 1, sq_cm: 0.0001, sq_ft: 0.092903, sq_yard: 0.836127, acre: 4046.86, hectare: 10000,
    are: 100, cent: 40.4686
  },
  Volume: { liter: 1000, ml: 1, gallon: 3785.41, fluid_oz: 29.5735 }
};

const unitLabels = {
  kg: "Kilograms (kg)", g: "Grams (g)", mg: "Milligrams (mg)", lb: "Pounds (lb)", oz: "Ounces (oz)",
  m: "Meters (m)", cm: "Centimeters (cm)", mm: "Millimeters (mm)", km: "Kilometers (km)", inch: "Inches (in)", foot: "Feet (ft)", yard: "Yards (yd)",
  sq_m: "Square Meters (m²)", sq_cm: "Square Centimeters (cm²)", sq_ft: "Square Feet (sq ft)", sq_yard: "Square Yards", acre: "Acres", hectare: "Hectares",
  are: "Are (Land)", cent: "Cents (Land)", 
  liter: "Liters (L)", ml: "Milliliters (ml)", gallon: "Gallons (gal)", fluid_oz: "Fluid Ounces (fl oz)"
};

const universityData = {
  "ktu": {
    name: "KTU (APJ Tech Uni)",
    schemes: {
      "2015": { grades: { "O": 10, "A+": 9, "A": 8.5, "B+": 8, "B": 7, "C": 6, "P": 5, "F": 0 }, calcPercentage: (sgpa) => Math.max(0, (sgpa * 10) - 3.75).toFixed(2) },
      "2019": { grades: { "S": 10, "A+": 9, "A": 8.5, "B+": 8, "B": 7, "C": 6, "P": 5, "F": 0 }, calcPercentage: (sgpa) => (sgpa * 10).toFixed(2) },
      "2024": { grades: { "S": 10, "A+": 9, "A": 8.5, "B+": 8, "B": 7, "C": 6, "P": 5, "F": 0 }, calcPercentage: (sgpa) => (sgpa * 10).toFixed(2) }
    }
  },
  "calicut": {
    name: "Calicut University",
    schemes: {
      "CUCBCSS (UG)": { grades: { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "P": 4, "F": 0 }, calcPercentage: (sgpa) => (sgpa * 10).toFixed(2) }
    }
  },
  "mg": {
    name: "MG University",
    schemes: {
      "CBCSS (UG)": { grades: { "A+": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5, "F": 0 }, calcPercentage: (sgpa) => (sgpa * 10).toFixed(2) }
    }
  },
  "generic": {
    name: "Generic UGC (10-Point)",
    schemes: {
      "Standard": { grades: { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "P": 4, "F": 0 }, calcPercentage: null }
    }
  }
};

const schoolGradePoints = { "A+": 9, "A": 8, "B+": 7, "B": 6, "C+": 5, "C": 4, "D+": 3, "D": 2, "E": 1 };

const processImage = (file, targetKb) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (targetKb && width > 1200) {
          const ratio = 1200 / width; width = 1200; height = height * ratio;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.9; let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (targetKb) {
          let sizeKb = (dataUrl.length * 3 / 4) / 1024;
          while (sizeKb > targetKb && quality > 0.1) {
            quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality); sizeKb = (dataUrl.length * 3 / 4) / 1024;
          }
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function ShopCalculators() {
  const ENABLE_AI_FEATURE = false;

  const [calcCategory, setCalcCategory] = useState("Area"); 
  const [calcFromUnit, setCalcFromUnit] = useState("are");
  const [calcToUnit, setCalcToUnit] = useState("cent");
  const [calcInput, setCalcInput] = useState(1);

  const [calcMode, setCalcMode] = useState("school"); 
  const [selectedUni, setSelectedUni] = useState("ktu");
  const [selectedScheme, setSelectedScheme] = useState("2019");

  const [subjects, setSubjects] = useState([{ id: 1, name: "Malayalam", credits: 4, grade: "A+" }]);
  const [percentMultiplier, setPercentMultiplier] = useState(9.5);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  // --- MULTI-TOOL STATE ---
  const [activeToolTab, setActiveToolTab] = useState("pdf"); 
  
  const [convertFiles, setConvertFiles] = useState([]);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const convertPdfInputRef = useRef(null);
  
  const [compressFile, setCompressFile] = useState(null);
  const [targetKB, setTargetKB] = useState(50);
  const [isCompressing, setIsCompressing] = useState(false);
  const compressInputRef = useRef(null);
  
  const [formatFile, setFormatFile] = useState(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const formatInputRef = useRef(null);
  
  const [extractFile, setExtractFile] = useState(null);
  const [extractedPages, setExtractedPages] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractInputRef = useRef(null);

  const [resizeFile, setResizeFile] = useState(null);
  const [resizePreset, setResizePreset] = useState("passport");
  const [resizeW, setResizeW] = useState(413); 
  const [resizeH, setResizeH] = useState(531); 
  const [isResizing, setIsResizing] = useState(false);
  const resizeInputRef = useRef(null);

  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [pdfSequence, setPdfSequence] = useState([]); 
  const [originalPdfFile, setOriginalPdfFile] = useState(null); 
  const [originalPdfName, setOriginalPdfName] = useState("");
  const [insertTargetIndex, setInsertTargetIndex] = useState(null);
  const insertPdfInputRef = useRef(null);
  const insertImageInputRef = useRef(null);
  const [isLoadingVisualPdf, setIsLoadingVisualPdf] = useState(false);

  // --- UNIT CONVERTER HANDLERS ---
  const handleCategoryChange = (e) => {
    const newCat = e.target.value; setCalcCategory(newCat);
    setCalcFromUnit(Object.keys(conversionRates[newCat])[0]); setCalcToUnit(Object.keys(conversionRates[newCat])[1]);
  };
  const calculatedConversion = () => {
    if (!calcInput) return 0;
    return ((calcInput * conversionRates[calcCategory][calcFromUnit]) / conversionRates[calcCategory][calcToUnit]).toFixed(4);
  };

  // --- EXISTING TOOL HANDLERS ---
  const handleAddPdfFiles = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return alert("Please select valid image files.");
    const newFiles = files.map(file => ({ id: Date.now() + Math.random(), file, name: file.name, preview: URL.createObjectURL(file) }));
    setConvertFiles(prev => [...prev, ...newFiles]);
    if (convertPdfInputRef.current) convertPdfInputRef.current.value = '';
  };
  
  const handleCreatePdf = async () => {
    if (convertFiles.length === 0) return;
    setIsConvertingPdf(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 0; i < convertFiles.length; i++) {
        if (i > 0) doc.addPage();
        const imgUrl = convertFiles[i].preview; const img = new Image(); img.src = imgUrl;
        await new Promise(resolve => { img.onload = resolve; });
        const imgRatio = img.width / img.height; const pageRatio = pageWidth / pageHeight;
        let renderWidth, renderHeight;
        if (imgRatio > pageRatio) { renderWidth = pageWidth - 20; renderHeight = renderWidth / imgRatio; } 
        else { renderHeight = pageHeight - 20; renderWidth = renderHeight * imgRatio; }
        doc.addImage(imgUrl, 'JPEG', (pageWidth - renderWidth) / 2, (pageHeight - renderHeight) / 2, renderWidth, renderHeight);
      }
      doc.save(`Merged_Document_${Date.now()}.pdf`); setConvertFiles([]); 
    } catch (err) { alert("Failed to create PDF."); } finally { setIsConvertingPdf(false); }
  };

  const triggerDownload = async (file, targetKb, prefix) => {
    try {
      if(targetKb) setIsCompressing(true); else setIsFormatting(true);
      const dataUrl = await processImage(file, targetKb);
      const link = document.createElement('a'); link.href = dataUrl;
      link.download = `${prefix}_${file.name.replace(/\.[^/.]+$/, "")}.jpg`; link.click();
    } catch (err) { alert("Action failed."); } finally {
      setIsCompressing(false); setIsFormatting(false);
    }
  };

  const handlePdfExtraction = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return alert("Please upload a valid PDF file.");
    setIsExtracting(true); setExtractFile(file); setExtractedPages([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages; const pages = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); 
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push({ pageNumber: i, dataUrl: canvas.toDataURL('image/jpeg', 0.9) });
      }
      setExtractedPages(pages);
    } catch(err) {
      alert("Failed to read the PDF. It might be corrupted or encrypted."); setExtractFile(null);
    } finally {
      setIsExtracting(false); if(extractInputRef.current) extractInputRef.current.value = '';
    }
  };

  const downloadExtractedPage = (page) => {
    const link = document.createElement('a'); link.href = page.dataUrl;
    link.download = `${extractFile.name.replace('.pdf', '')}_Page_${page.pageNumber}.jpg`; link.click();
  };

  const handleResizePreset = (e) => {
     const val = e.target.value; setResizePreset(val);
     if (val === 'passport') { setResizeW(413); setResizeH(531); } 
     else if (val === 'stamp') { setResizeW(236); setResizeH(295); } 
     else if (val === 'pan') { setResizeW(213); setResizeH(213); } 
     else if (val === 'signature') { setResizeW(400); setResizeH(150); } 
  };

  const handleResizePhoto = () => {
    if(!resizeFile) return;
    setIsResizing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetW = Number(resizeW); const targetH = Number(resizeH);
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      const imgRatio = img.width / img.height; const targetRatio = targetW / targetH;
      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
      
      if (imgRatio > targetRatio) { srcW = img.height * targetRatio; srcX = (img.width - srcW) / 2; } 
      else { srcH = img.width / targetRatio; srcY = (img.height - srcH) / 2; }
      
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a'); link.href = dataUrl;
      link.download = `Cropped_${targetW}x${targetH}.jpg`; link.click();
      setIsResizing(false);
    };
    img.src = URL.createObjectURL(resizeFile);
  };

  // --- VISUAL PDF INSERTER HANDLERS ---
  const handleLoadPdfForInsert = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return;
    
    setIsLoadingVisualPdf(true);
    try {
      setOriginalPdfFile(file); 
      setOriginalPdfName(file.name);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const numPages = pdf.numPages;
      const sequence = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 }); 
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        sequence.push({
          id: `pdf_${i}_${Date.now()}`,
          type: 'pdf',
          pageIndex: i - 1, 
          preview: canvas.toDataURL('image/jpeg', 0.6)
        });
      }
      setPdfSequence(sequence);
      setInsertModalOpen(true);
    } catch (err) {
      alert("Failed to load PDF.");
    } finally {
      setIsLoadingVisualPdf(false);
      if(insertPdfInputRef.current) insertPdfInputRef.current.value = ''; 
    }
  };

  const triggerImageInsert = (index) => {
    setInsertTargetIndex(index);
    if(insertImageInputRef.current) insertImageInputRef.current.click();
  };

  const handleImageInsertSelected = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const preview = URL.createObjectURL(file);
    const newItem = { id: `img_${Date.now()}`, type: 'image', file: file, preview: preview };
    
    const newSequence = [...pdfSequence];
    newSequence.splice(insertTargetIndex, 0, newItem);
    setPdfSequence(newSequence);
    if(insertImageInputRef.current) insertImageInputRef.current.value = '';
  };

  const removeSequenceItem = (index) => {
    const newSequence = [...pdfSequence];
    newSequence.splice(index, 1);
    setPdfSequence(newSequence);
  };

  const handleGenerateInsertedPdf = async () => {
    setIsConvertingPdf(true); 
    try {
      const freshBytes = await originalPdfFile.arrayBuffer();
      const originalDoc = await PDFDocument.load(freshBytes);
      const newDoc = await PDFDocument.create();

      for (let i = 0; i < pdfSequence.length; i++) {
        const item = pdfSequence[i];
        
        if (item.type === 'pdf') {
          const [copiedPage] = await newDoc.copyPages(originalDoc, [item.pageIndex]);
          newDoc.addPage(copiedPage);
        } else if (item.type === 'image') {
          const page = newDoc.addPage([595.28, 841.89]); 
          const imgBytes = await item.file.arrayBuffer();
          let pdfImg;
          
          if (item.file.type === 'image/png') { pdfImg = await newDoc.embedPng(imgBytes); } 
          else { pdfImg = await newDoc.embedJpg(imgBytes); }
          
          const imgDims = pdfImg.scale(1);
          const pageDims = page.getSize();
          
          const margin = 20;
          const maxWidth = pageDims.width - (margin * 2);
          const maxHeight = pageDims.height - (margin * 2);
          
          let finalW = imgDims.width;
          let finalH = imgDims.height;
          
          const widthRatio = maxWidth / finalW;
          const heightRatio = maxHeight / finalH;
          const ratio = Math.min(widthRatio, heightRatio, 1); 
          
          finalW = finalW * ratio;
          finalH = finalH * ratio;
          
          page.drawImage(pdfImg, {
            x: (pageDims.width - finalW) / 2,
            y: (pageDims.height - finalH) / 2,
            width: finalW,
            height: finalH
          });
        }
      }

      const modifiedBytes = await newDoc.save();
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Updated_${originalPdfName}`;
      link.click();

      setInsertModalOpen(false);
      setPdfSequence([]);
    } catch (err) {
      alert("Error generating PDF: " + err.message);
    } finally {
      setIsConvertingPdf(false);
    }
  };

  // --- ACADEMIC HANDLERS ---
  const activeGradeMap = calcMode === 'university' ? universityData[selectedUni].schemes[selectedScheme].grades : schoolGradePoints;
  
  const handleAddSubject = () => {
    const defaultGrade = Object.keys(activeGradeMap)[1] || Object.keys(activeGradeMap)[0];
    setSubjects([...subjects, { id: Date.now(), name: `Subject ${subjects.length + 1}`, credits: 4, grade: defaultGrade }]);
  };
  
  const handleRemoveSubject = (id) => { if (subjects.length > 1) setSubjects(subjects.filter(sub => sub.id !== id)); };
  
  const handleSubjectChange = (id, field, value) => {
    setSubjects(subjects.map(sub => sub.id === id ? { ...sub, [field]: value } : sub));
  };
  
  const handleUniChange = (e) => {
    const newUni = e.target.value; setSelectedUni(newUni); setSelectedScheme(Object.keys(universityData[newUni].schemes)[0]);
  };

  const calcAcademicResults = () => {
    let totalCredits = 0; let earnedPoints = 0; let totalSubjects = subjects.length;
    if (calcMode === 'university') {
      const schemeData = universityData[selectedUni].schemes[selectedScheme];
      const gradesMap = schemeData.grades;
      subjects.forEach(sub => {
        const cred = parseFloat(sub.credits) || 0; const gp = gradesMap[sub.grade.toUpperCase()] || 0;
        totalCredits += cred; earnedPoints += (cred * gp);
      });
      const sgpa = totalCredits > 0 ? (earnedPoints / totalCredits).toFixed(2) : "0.00";
      const percentage = schemeData.calcPercentage ? schemeData.calcPercentage(sgpa) : (sgpa * percentMultiplier).toFixed(2);
      return { primaryScore: sgpa, primaryLabel: "SGPA", percentage: percentage, details: `${totalCredits} Credits`, needsManualMultiplier: schemeData.calcPercentage === null };
    } else {
      subjects.forEach(sub => { earnedPoints += (schoolGradePoints[sub.grade.toUpperCase()] || 0); });
      const maxPossiblePoints = totalSubjects * 9;
      const percentageRaw = maxPossiblePoints > 0 ? (earnedPoints / maxPossiblePoints) * 100 : 0;
      return { primaryScore: percentageRaw.toFixed(2) + "%", primaryLabel: "Total Percentage", percentage: percentageRaw.toFixed(2), details: `${totalSubjects} Subjects` };
    }
  };
  const academicResults = calcAcademicResults();

  // AI SCANNER LOGIC
  const convertFileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = error => reject(error);
  });

  const handleScanMarksheet = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsScanning(true);
    try {
      const base64Image = await convertFileToBase64(file);
      const response = await supabase.functions.invoke('extract-grades', { body: { imageBase64: base64Image } });
      if (response.error) throw new Error(response.error.message || "Unknown Edge Function Error");
      const { data } = response;
      if (data && data.subjects && data.subjects.length > 0) {
        setSubjects(data.subjects.map((sub, index) => ({ id: Date.now() + index, name: sub.name, credits: 4, grade: sub.grade.toUpperCase() })));
        alert(`Magic! Successfully extracted ${data.subjects.length} subjects.`);
      } else { alert("The AI couldn't find any subjects on this document."); }
    } catch (error) {
      if (error.message.toLowerCase().includes("429") || error.message.toLowerCase().includes("quota")) {
         alert("The AI servers are currently busy! Please wait 60 seconds and try again.");
      } else { alert(`Scan Failed: ${error.message}`); }
    } finally {
      setIsScanning(false); if(fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // Helper function for Sidebar Tab Styles
  const getTabClass = (tabName, colorBase) => {
    const isActive = activeToolTab === tabName;
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap w-full text-left
      ${isActive 
        ? `bg-white text-${colorBase}-600 shadow-sm border border-slate-200` 
        : `text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent`
      }`;
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-6xl mx-auto space-y-6">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">

        <p className="text-sm font-semibold text-slate-500 mt-1">Quickly calculate daily shop metrics, assist students, or precisely format documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. UNIT CONVERTER */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowRightLeft size={16} className="text-blue-500" /> Unit Converter
          </h3>
          
          {/* Changed to a clean 3-column layout on large screens to properly utilize full width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center flex-1">
            <div className="mb-4 lg:mb-0">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Measurement Category</label>
              <select value={calcCategory} onChange={handleCategoryChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all">
                {Object.keys(conversionRates).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div className="lg:col-span-2 grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <div className="space-y-2">
                <input type="number" min="0" value={calcInput} onChange={(e) => setCalcInput(e.target.value)} className="w-full p-3 text-center border border-slate-200 rounded-xl outline-none text-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
                <select value={calcFromUnit} onChange={(e) => setCalcFromUnit(e.target.value)} className="w-full p-2 text-center border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-600 bg-slate-50">
                  {Object.keys(conversionRates[calcCategory]).map(unit => <option key={unit} value={unit}>{unitLabels[unit] || unit}</option>)}
                </select>
              </div>
              
              <div className="text-slate-300 font-bold px-2 pt-2">=</div>
              
              <div className="space-y-2">
                <div className="w-full p-3 text-center border border-slate-100 bg-blue-50 rounded-xl text-xl font-black text-blue-700 overflow-hidden text-ellipsis shadow-inner">{calculatedConversion()}</div>
                <select value={calcToUnit} onChange={(e) => setCalcToUnit(e.target.value)} className="w-full p-2 text-center border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-600 bg-slate-50">
                  {Object.keys(conversionRates[calcCategory]).map(unit => <option key={unit} value={unit}>{unitLabels[unit] || unit}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DOCUMENT TOOLS CARD */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden min-h-[400px]">
          
          {/* Vertical Sidebar (Desktop) / Horizontal Scroll (Mobile) */}
          <div className="bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:w-56 flex md:flex-col gap-2 overflow-x-auto no-scrollbar shrink-0">
            <h3 className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 mt-1">Document Tools</h3>
            
            <button onClick={() => setActiveToolTab('pdf')} className={getTabClass('pdf', 'rose')}>
              <FileImage size={16} /> Merge PDF
            </button>
            <button onClick={() => setActiveToolTab('pdf-edit')} className={getTabClass('pdf-edit', 'purple')}>
              <FilePlus size={16} /> Insert Pages
            </button>
            <button onClick={() => setActiveToolTab('extract')} className={getTabClass('extract', 'amber')}>
              <Files size={16} /> Extract PDF
            </button>
            
            <div className="hidden md:block w-full h-px bg-slate-200 my-2"></div>

            <button onClick={() => setActiveToolTab('resize')} className={getTabClass('resize', 'pink')}>
              <Crop size={16} /> Crop/Resize
            </button>
            <button onClick={() => setActiveToolTab('compress')} className={getTabClass('compress', 'blue')}>
              <Minimize size={16} /> Compress Image
            </button>
            <button onClick={() => setActiveToolTab('format')} className={getTabClass('format', 'emerald')}>
              <RefreshCw size={16} /> Format to JPG
            </button>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 p-5 md:p-8 flex flex-col bg-white">
            
            {/* TAB 1: MERGE PDF */}
            {activeToolTab === 'pdf' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">Merge Images to PDF</h4>
                  <p className="text-xs text-slate-500 mt-1">Combine multiple photos (like Front & Back ID) into a single A4 PDF document.</p>
                </div>
                
                <div className="flex-1 min-h-[160px] bg-rose-50/30 border border-rose-100 rounded-xl p-4 mb-5 overflow-y-auto custom-scrollbar">
                  {convertFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={36} className="mb-3 opacity-20 text-rose-500" />
                      <p className="text-sm font-bold text-slate-600">No images selected</p>
                      <p className="text-xs mt-1 text-center px-4 max-w-xs">Upload images to begin. They will automatically be centered with margins.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {convertFiles.map((f, index) => (
                        <div key={f.id} className="relative group bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                          <div className="w-12 h-12 rounded bg-slate-100 shrink-0 overflow-hidden"><img src={f.preview} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-slate-700 truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-400">Page {index + 1}</p>
                          </div>
                          <button onClick={() => setConvertFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 shadow-sm transition-opacity"><X size={12} strokeWidth={3} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div>
                    <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" multiple className="hidden" ref={convertPdfInputRef} onChange={handleAddPdfFiles} />
                    <button onClick={() => convertPdfInputRef.current.click()} className="w-full py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center gap-2 transition"><Plus size={16} /> Add Images</button>
                  </div>
                  <button onClick={handleCreatePdf} disabled={convertFiles.length === 0 || isConvertingPdf} className={`w-full py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition ${convertFiles.length === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 text-white"}`}>
                    {isConvertingPdf ? <><Loader2 size={16} className="animate-spin" /> Merging...</> : <><FileDown size={16} /> Save Final PDF</>}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INSERT PAGES INTO PDF */}
            {activeToolTab === 'pdf-edit' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200 justify-center items-center text-center px-4">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                  <FilePlus size={36} className="text-purple-500" />
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-2">Visual PDF Page Inserter</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
                  Upload an existing PDF document to visually insert missing pages (like a photo or a signature scan) exactly where they belong in the sequence.
                </p>
                
                <input type="file" accept="application/pdf" className="hidden" ref={insertPdfInputRef} onChange={handleLoadPdfForInsert} />
                <button 
                  onClick={() => insertPdfInputRef.current.click()} 
                  disabled={isLoadingVisualPdf}
                  className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 w-full max-w-xs"
                >
                  {isLoadingVisualPdf ? <><Loader2 size={16} className="animate-spin" /> Reading PDF Layout...</> : "Upload PDF to Edit"}
                </button>
              </div>
            )}

            {/* TAB 3: EXTRACT PDF */}
            {activeToolTab === 'extract' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                {extractedPages.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center flex-1 flex flex-col justify-center items-center border-dashed">
                     <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                       <Files size={28} className="text-amber-500" />
                     </div>
                     <h4 className="text-base font-bold text-slate-800 mb-1">Extract PDF to Images</h4>
                     <p className="text-xs text-slate-500 max-w-sm mb-6">Instantly split a multi-page PDF into individual, high-quality JPG images for easy portal uploading.</p>
                     
                     <input type="file" accept="application/pdf" className="hidden" ref={extractInputRef} onChange={handlePdfExtraction} />
                     <button onClick={() => extractInputRef.current.click()} disabled={isExtracting} className="px-8 py-3 bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-600 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2">
                       {isExtracting ? <><Loader2 size={16} className="animate-spin" /> Reading PDF...</> : "Select PDF Document"}
                     </button>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800">Pages Extracted</h4>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">{extractedPages.length} Pages Found</span>
                      </div>
                      <button onClick={() => { setExtractedPages([]); setExtractFile(null); }} className="text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">Start Over</button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                       {extractedPages.map(page => (
                         <div key={page.pageNumber} className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col group hover:border-amber-300 transition-colors">
                           <div className="bg-white rounded-lg border border-slate-100 flex-1 flex items-center justify-center overflow-hidden mb-2 p-1 relative h-32">
                             <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="max-h-full object-contain" />
                           </div>
                           <button onClick={() => downloadExtractedPage(page)} className="w-full py-2 bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5">
                             <FileDown size={14} /> Page {page.pageNumber}
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: RESIZE & CROP */}
            {activeToolTab === 'resize' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">Smart Crop & Resize</h4>
                  <p className="text-xs text-slate-500 mt-1">Perfectly format photos to exact pixel dimensions for government portals.</p>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 bg-pink-50/50 border border-pink-100 rounded-xl p-4 flex flex-col justify-center items-center border-dashed cursor-pointer hover:bg-pink-50 transition" onClick={() => resizeInputRef.current.click()}>
                     <input type="file" accept="image/*" className="hidden" ref={resizeInputRef} onChange={(e) => setResizeFile(e.target.files[0])} />
                     <ImageIcon size={28} className={resizeFile ? "text-pink-500 mb-2" : "text-pink-300 mb-2"} />
                     <p className="text-xs font-bold text-slate-700 truncate w-full text-center px-2">{resizeFile ? resizeFile.name : "Click to select a photo"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="col-span-3 md:col-span-1">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Preset Format</label>
                     <select value={resizePreset} onChange={handleResizePreset} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-pink-500 bg-slate-50 focus:bg-white">
                        <option value="passport">Passport (35x45mm)</option>
                        <option value="pan">PAN Card (213x213px)</option>
                        <option value="signature">Signature (400x150px)</option>
                        <option value="stamp">Stamp (20x25mm)</option>
                        <option value="custom">Custom (Pixels)</option>
                     </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Width (PX)</label>
                    <input type="number" min="10" value={resizeW} onChange={(e) => { setResizeW(e.target.value); setResizePreset('custom'); }} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-pink-500 bg-slate-50 focus:bg-white" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Height (PX)</label>
                    <input type="number" min="10" value={resizeH} onChange={(e) => { setResizeH(e.target.value); setResizePreset('custom'); }} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-pink-500 bg-slate-50 focus:bg-white" />
                  </div>
                </div>

                <button onClick={handleResizePhoto} disabled={!resizeFile || isResizing} className={`mt-auto w-full py-3.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition ${!resizeFile ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-pink-600 hover:bg-pink-700 text-white"}`}>
                  {isResizing ? <><Loader2 size={16} className="animate-spin" /> Cropping Image...</> : <><Crop size={16} /> Download Cropped Photo</>}
                </button>
              </div>
            )}

            {/* TAB 5: COMPRESS */}
            {activeToolTab === 'compress' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">Target KB Compressor</h4>
                  <p className="text-xs text-slate-500 mt-1">Shrink large photos to pass strict government portal file size limits.</p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 text-center mb-6 flex-1 flex flex-col justify-center items-center border-dashed">
                   {compressFile ? (
                     <div className="flex flex-col items-center">
                       <ImageIcon size={36} className="text-blue-500 mb-3" />
                       <p className="text-sm font-bold text-slate-800 truncate max-w-[250px]">{compressFile.name}</p>
                     </div>
                   ) : (
                     <>
                       <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                         <UploadCloud size={28} className="text-blue-500" />
                       </div>
                       <p className="text-sm font-bold text-slate-700">Select a large image file</p>
                     </>
                   )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                   <div className="flex-1">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Max Target Size (KB)</label>
                     <input type="number" min="10" value={targetKB} onChange={(e) => setTargetKB(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-[10px] font-black text-transparent mb-1.5">Action</label>
                     <input type="file" accept="image/*" className="hidden" ref={compressInputRef} onChange={(e) => setCompressFile(e.target.files[0])} />
                     <button onClick={() => compressInputRef.current.click()} className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:border-slate-300 hover:bg-slate-50 transition">{compressFile ? "Change Image" : "Select Image"}</button>
                   </div>
                </div>

                <button onClick={() => triggerDownload(compressFile, Number(targetKB), `Compressed_${targetKB}KB`)} disabled={!compressFile || isCompressing} className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 ${!compressFile ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                  {isCompressing ? <><Loader2 size={16} className="animate-spin" /> Compressing...</> : <><Minimize size={16} /> Download Compressed File</>}
                </button>
              </div>
            )}

            {/* TAB 6: FORMAT */}
            {activeToolTab === 'format' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">Format to Standard JPG</h4>
                  <p className="text-xs text-slate-500 mt-1">Fix WhatsApp (.webp), iPhone (.heic), or PNGs so portals accept them.</p>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center mb-6 flex-1 flex flex-col justify-center items-center border-dashed">
                   {formatFile ? (
                     <div className="flex flex-col items-center">
                       <ImageIcon size={36} className="text-emerald-500 mb-3" />
                       <p className="text-sm font-bold text-slate-800 truncate max-w-[250px]">{formatFile.name}</p>
                     </div>
                   ) : (
                     <>
                       <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                         <UploadCloud size={28} className="text-emerald-500" />
                       </div>
                       <p className="text-sm font-bold text-slate-700">Select any image file</p>
                     </>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div>
                    <input type="file" accept="image/*" className="hidden" ref={formatInputRef} onChange={(e) => setFormatFile(e.target.files[0])} />
                    <button onClick={() => formatInputRef.current.click()} className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center transition">{formatFile ? "Change Image" : "Select Image"}</button>
                  </div>
                  <button onClick={() => triggerDownload(formatFile, null, 'Standard_Format')} disabled={!formatFile || isFormatting} className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 ${!formatFile ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
                    {isFormatting ? <><Loader2 size={16} className="animate-spin" /> Converting...</> : <><RefreshCw size={16} /> Download as JPG</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 3. KERALA ACADEMIC GRADE CALCULATOR */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 border-b border-slate-100 pb-5 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <GraduationCap size={18} className="text-indigo-500" /> Academic Score Calculator
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCalcMode("school")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${calcMode === "school" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                  <BookOpen size={14} /> Kerala School (SSLC / +2)
                </button>
                <button onClick={() => setCalcMode("university")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${calcMode === "university" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                  <Building2 size={14} /> University (Degree)
                </button>
              </div>
            </div>
            
            {ENABLE_AI_FEATURE && (
              <div className="shrink-0 flex flex-col items-end">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleScanMarksheet} />
                <button onClick={() => fileInputRef.current.click()} disabled={isScanning} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 rounded-xl text-xs font-bold transition-all shadow-md w-full sm:w-auto justify-center">
                  {isScanning ? <><Loader2 size={14} className="animate-spin" /> AI Analyzing...</> : <><ScanLine size={14} /> Magic AI Auto-Fill</>}
                </button>
                <span className="text-[9px] text-slate-400 mt-1.5 font-medium">Powered by Premium AI</span>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="flex-1 space-y-4">
              {calcMode === 'university' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Building2 size={12} /> University
                    </label>
                    <select value={selectedUni} onChange={handleUniChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white">
                      {Object.entries(universityData).map(([key, data]) => <option key={key} value={key}>{data.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Settings2 size={12} /> Scheme / Year
                    </label>
                    <select value={selectedScheme} onChange={(e) => setSelectedScheme(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white">
                      {Object.keys(universityData[selectedUni].schemes).map(scheme => <option key={scheme} value={scheme}>{scheme} Scheme</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <div className={`grid ${calcMode === 'university' ? 'grid-cols-[2fr_1fr_1fr_auto]' : 'grid-cols-[3fr_1fr_auto]'} gap-3 px-2 mb-2`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Name</span>
                  {calcMode === 'university' && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Credits</span>}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Grade</span>
                  <span className="w-8"></span>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {subjects.map((sub, index) => (
                    <div key={sub.id} className={`grid ${calcMode === 'university' ? 'grid-cols-[2fr_1fr_1fr_auto]' : 'grid-cols-[3fr_1fr_auto]'} gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-100`}>
                      <input type="text" value={sub.name} onChange={(e) => handleSubjectChange(sub.id, "name", e.target.value)} placeholder={`Subject ${index + 1}`} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white" />
                      {calcMode === 'university' && (
                        <input type="number" min="1" max="10" value={sub.credits} onChange={(e) => handleSubjectChange(sub.id, "credits", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs font-bold text-center text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white" />
                      )}
                      <select value={sub.grade} onChange={(e) => handleSubjectChange(sub.id, "grade", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs font-black text-center text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer">
                        {Object.keys(activeGradeMap).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                      </select>
                      <button onClick={() => handleRemoveSubject(sub.id)} className="text-slate-400 hover:text-red-500 transition p-1 flex justify-center"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={handleAddSubject} className="w-full mt-3 py-3 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5"><Plus size={14} /> Add Subject</button>
              </div>
            </div>

            <div className="w-full lg:w-72 bg-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">{calcMode === 'school' ? 'Subjects Count' : 'Total Credits'}</span>
                  <span className="text-sm font-bold bg-indigo-800 px-3 py-1 rounded-md">{academicResults.details}</span>
                </div>
                <div className="mb-auto">
                  <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">{academicResults.primaryLabel}</p>
                  <p className="text-5xl font-black text-white tracking-tight">{academicResults.primaryScore}</p>
                </div>
                
                {calcMode === 'university' && (
                  <div className="pt-6 border-t border-indigo-700/50 mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Est. Percentage</p>
                      {academicResults.needsManualMultiplier ? (
                        <div className="flex items-center gap-1 bg-indigo-800 px-2 py-1 rounded-md border border-indigo-700">
                          <span className="text-[9px] text-indigo-300 font-bold">Multiplier:</span>
                          <input type="number" step="0.1" value={percentMultiplier} onChange={e => setPercentMultiplier(e.target.value)} className="w-12 bg-transparent outline-none text-xs font-bold text-white text-center" />
                        </div>
                      ) : (
                        <span className="text-[9px] bg-indigo-800 text-indigo-300 px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-indigo-700">Official Formula</span>
                      )}
                    </div>
                    <p className="text-3xl font-black text-emerald-400">{academicResults.percentage}%</p>
                  </div>
                )}
                
                {calcMode === 'school' && (
                   <div className="pt-6 border-t border-indigo-700/50 mt-6 flex items-center gap-2">
                     <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                     <p className="text-xs text-indigo-200 font-medium leading-tight">Using Kerala State 9-point calculation formula.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ✨ VISUAL PDF INSERTER MODAL ✨ */}
      {insertModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col backdrop-blur-sm animate-in fade-in">
          
          <div className="bg-white px-6 py-4 flex justify-between items-center shadow-md">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><FilePlus className="text-purple-600" /> Insert Pages to PDF</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Click the <span className="inline-flex bg-purple-100 text-purple-700 px-1.5 rounded font-bold mx-1">+</span> buttons between pages to insert a new image.</p>
            </div>
            <button onClick={() => setInsertModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
              
              <button onClick={() => triggerImageInsert(0)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 w-full py-2 border-2 border-dashed border-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
                <Plus size={14} /> Insert Image Before Page 1
              </button>

              {pdfSequence.map((item, idx) => (
                <React.Fragment key={item.id}>
                  
                  <div className={`relative w-full aspect-[1/1.414] rounded-xl shadow-lg overflow-hidden border-2 ${item.type === 'image' ? 'border-purple-500 shadow-purple-500/20' : 'border-slate-200 bg-white'}`}>
                     <img src={item.preview} className="w-full h-full object-contain bg-slate-50" alt={`Page ${idx + 1}`} />
                     
                     <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${item.type === 'image' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-white'}`}>
                          {item.type === 'image' ? `New Image (Page ${idx + 1})` : `Original Page ${idx + 1}`}
                        </span>
                        
                        {item.type === 'image' && (
                          <button onClick={() => removeSequenceItem(idx)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg shadow-sm transition"><Trash2 size={12} /></button>
                        )}
                     </div>
                  </div>

                  <button onClick={() => triggerImageInsert(idx + 1)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 w-full py-2 border-2 border-dashed border-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
                    <Plus size={14} /> Insert Image Here
                  </button>

                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">Total Pages: {pdfSequence.length}</span>
            <input type="file" accept="image/*" className="hidden" ref={insertImageInputRef} onChange={handleImageInsertSelected} />
            <button onClick={handleGenerateInsertedPdf} disabled={isConvertingPdf} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2">
              {isConvertingPdf ? <><Loader2 size={16} className="animate-spin" /> Generating PDF...</> : <><FileDown size={16} /> Download Final PDF</>}
            </button>
          </div>
          
        </div>
      )}

    </div>
  );
}