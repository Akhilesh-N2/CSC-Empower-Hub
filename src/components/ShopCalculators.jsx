import React, { useState, useRef, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument } from 'pdf-lib'; 
import { 
  Calculator, ArrowRightLeft, GraduationCap, Plus, Trash2, 
  ScanLine, Loader2, BookOpen, Building2, CheckCircle2, 
  FileImage, FileDown, Image as ImageIcon, X, Minimize, RefreshCw, 
  UploadCloud, Files, Settings2, Crop, FilePlus, FileArchive,
  MoveLeft, MoveRight, Maximize2, Layout, UserSquare, CalendarDays,
  Download, PenTool
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

  // --- PDF MERGE PRO STATE ---
  const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState("p"); // 'p' or 'l'
  const [pdfMargin, setPdfMargin] = useState(0); // 0, 10, 20
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const previewCanvasRef = useRef(null);
  
  const [compressFile, setCompressFile] = useState(null);
  const [targetKB, setTargetKB] = useState(50);
  const [isCompressing, setIsCompressing] = useState(false);
  const compressInputRef = useRef(null);

  // PDF Compressor State
  const [compressPdfFile, setCompressPdfFile] = useState(null);
  const [isCompressingPdf, setIsCompressingPdf] = useState(false);
  const [targetPdfKB, setTargetPdfKB] = useState(200);
  const compressPdfInputRef = useRef(null);
  
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

  // --- ✨ NEW: PSC PHOTO & SIGNATURE STATE ✨ ---
  const [pscImage, setPscImage] = useState(null);
  const [pscSignature, setPscSignature] = useState(null);
  const [pscName, setPscName] = useState('');
  const [pscDate, setPscDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingPsc, setIsGeneratingPsc] = useState(false);
  const pscFileInputRef = useRef(null);
  const pscSigInputRef = useRef(null);
  const pscCanvasRef = useRef(null);

  // --- PSC PHOTO HANDLERS ---
  const handlePscPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => setPscImage(re.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePscSigUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => setPscSignature(re.target.result);
      reader.readAsDataURL(file);
    }
  };

  const processAndDownloadPhoto = () => {
    return new Promise((resolve) => {
      if (!pscImage) return resolve();
      const canvas = pscCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const targetWidth = 150;
      const targetHeight = 200;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      img.onload = () => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const imageHeight = 170; 
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / imageHeight;
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        
        if (imgRatio > targetRatio) {
          srcW = img.height * targetRatio;
          srcX = (img.width - srcW) / 2;
        } else {
          srcH = img.width / targetRatio;
          srcY = (img.height - srcH) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, imageHeight);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, imageHeight, targetWidth, targetHeight - imageHeight);
        
        if (pscName) {
          ctx.fillStyle = "#000000";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          let displayName = pscName.toUpperCase();
          ctx.font = 'bold 11px sans-serif';
          while (ctx.measureText(displayName).width > targetWidth - 4 && displayName.length > 5) {
            displayName = displayName.slice(0, -1);
          }
          if (displayName.length < pscName.length) displayName += "..";
          ctx.fillText(displayName, targetWidth / 2, imageHeight + 4);
        }

        if (pscDate) {
          ctx.fillStyle = "#000000";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.font = '500 10px sans-serif';
          const formattedDate = pscDate.split('-').reverse().join('/');
          ctx.fillText(formattedDate, targetWidth / 2, imageHeight + 16);
        }

        const finalImageDataUrl = canvas.toDataURL('image/jpeg', 1.0);
        const link = document.createElement("a");
        link.href = finalImageDataUrl;
        let downName = pscName.trim() ? pscName.replace(/\s+/g, '_') : 'Candidate';
        link.download = `PSC_${downName}_Photo.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      };
      img.src = pscImage;
    });
  };

  const processAndDownloadSignature = () => {
    return new Promise((resolve) => {
      if (!pscSignature) return resolve();
      const canvas = pscCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Standard Kerala PSC Signature Size
      const targetWidth = 150;
      const targetHeight = 100;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      img.onload = () => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Contain scaling to ensure no part of the signature is cut off
        const imgRatio = img.width / img.height;
        const containerRatio = targetWidth / targetHeight;

        let renderWidth, renderHeight;
        if (imgRatio > containerRatio) {
          renderWidth = targetWidth;
          renderHeight = targetWidth / imgRatio;
        } else {
          renderHeight = targetHeight;
          renderWidth = targetHeight * imgRatio;
        }

        const x = (targetWidth - renderWidth) / 2;
        const y = (targetHeight - renderHeight) / 2;

        ctx.drawImage(img, x, y, renderWidth, renderHeight);

        const finalImageDataUrl = canvas.toDataURL('image/jpeg', 1.0);
        const link = document.createElement("a");
        link.href = finalImageDataUrl;
        let downName = pscName.trim() ? pscName.replace(/\s+/g, '_') : 'Candidate';
        link.download = `PSC_${downName}_Signature.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      };
      img.src = pscSignature;
    });
  };

  const generatePSCAssets = async () => {
    if (!pscImage && !pscSignature) return;
    setIsGeneratingPsc(true);
    
    if (pscImage) {
      await processAndDownloadPhoto();
    }
    
    if (pscSignature) {
      // Small delay if downloading both to prevent browser blocking simultaneous downloads
      if (pscImage) await new Promise(r => setTimeout(r, 400));
      await processAndDownloadSignature();
    }
    
    setIsGeneratingPsc(false);
  };


  // --- UNIT CONVERTER HANDLERS ---
  const handleCategoryChange = (e) => {
    const newCat = e.target.value; setCalcCategory(newCat);
    setCalcFromUnit(Object.keys(conversionRates[newCat])[0]); setCalcToUnit(Object.keys(conversionRates[newCat])[1]);
  };
  const calculatedConversion = () => {
    if (!calcInput) return 0;
    return ((calcInput * conversionRates[calcCategory][calcFromUnit]) / conversionRates[calcCategory][calcToUnit]).toFixed(4);
  };

  // --- PDF MERGE HANDLERS ---
  const handleAddPdfFiles = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const newFiles = files.map(file => ({ 
      id: Math.random().toString(36).substr(2, 9), 
      file, 
      name: file.name, 
      preview: URL.createObjectURL(file) 
    }));
    setConvertFiles(prev => [...prev, ...newFiles]);
    setPdfSettingsOpen(true); 
    if (convertPdfInputRef.current) convertPdfInputRef.current.value = '';
  };

  const movePage = (index, direction) => {
    const newFiles = [...convertFiles];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newFiles.length) return;
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    setConvertFiles(newFiles);
  };

  // --- LIVE PREVIEW RENDERER ---
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || convertFiles.length === 0) return;

    const file = convertFiles[previewPageIndex] || convertFiles[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const isLandscape = pdfOrientation === 'l';
      const pageW = isLandscape ? 297 : 210;
      const pageH = isLandscape ? 210 : 297;

      const canvasW = canvas.width;
      const canvasH = canvas.height;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvasW, canvasH);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const marginRatioX = (pdfMargin / pageW) * canvasW;
      const marginRatioY = (pdfMargin / pageH) * canvasH;

      if (pdfMargin > 0) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(marginRatioX, marginRatioY, canvasW - marginRatioX * 2, canvasH - marginRatioY * 2);
        ctx.setLineDash([]);
      }

      const availW = canvasW - marginRatioX * 2;
      const availH = canvasH - marginRatioY * 2;

      const imgRatio = img.width / img.height;
      const containerRatio = availW / availH;

      let drawW, drawH;
      if (imgRatio > containerRatio) {
        drawW = availW;
        drawH = availW / imgRatio;
      } else {
        drawH = availH;
        drawW = availH * imgRatio;
      }

      const x = marginRatioX + (availW - drawW) / 2;
      const y = marginRatioY + (availH - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);

      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvasW, canvasH);
    };
    img.src = file.preview;
  }, [convertFiles, previewPageIndex, pdfOrientation, pdfMargin]);

  useEffect(() => {
    if (pdfSettingsOpen) {
      const t = setTimeout(renderPreview, 30);
      return () => clearTimeout(t);
    }
  }, [pdfSettingsOpen, renderPreview]);

  const handleCreatePdf = async () => {
    if (convertFiles.length === 0) return;
    setIsConvertingPdf(true);
    try {
      const doc = new jsPDF(pdfOrientation, 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      for (let i = 0; i < convertFiles.length; i++) {
        if (i > 0) doc.addPage();
        const imgUrl = convertFiles[i].preview;
        const img = new Image();
        img.src = imgUrl;
        await new Promise(resolve => { img.onload = resolve; });

        const margin = pdfMargin;
        const availableW = pageWidth - (margin * 2);
        const availableH = pageHeight - (margin * 2);

        const imgRatio = img.width / img.height;
        const containerRatio = availableW / availableH;

        let renderWidth, renderHeight;
        if (imgRatio > containerRatio) {
          renderWidth = availableW;
          renderHeight = availableW / imgRatio;
        } else {
          renderHeight = availableH;
          renderWidth = availableH * imgRatio;
        }

        const x = margin + (availableW - renderWidth) / 2;
        const y = margin + (availableH - renderHeight) / 2;

        doc.addImage(imgUrl, 'JPEG', x, y, renderWidth, renderHeight);
      }
      doc.save(`Merged_CSC_Empower_${Date.now()}.pdf`);
      setPdfSettingsOpen(false);
      setConvertFiles([]);
    } catch (err) {
      alert("Failed to create PDF.");
    } finally {
      setIsConvertingPdf(false);
    }
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

  const handleCompressPdf = async () => {
    if (!compressPdfFile) return alert("Please select a PDF file first.");
    if (!targetPdfKB || targetPdfKB < 10) return alert("Please enter a valid target size in KB.");
    
    setIsCompressingPdf(true);
    
    try {
      const arrayBuffer = await compressPdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const targetBytesPerPage = (targetPdfKB * 1024) / numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        
        let scale = 1.5;
        let jpegQuality = 0.8;
        let imgData = '';
        let currentBytes = Infinity;

        while (currentBytes > targetBytesPerPage && scale > 0.4) {
          const viewport = page.getViewport({ scale: scale }); 
          
          const canvas = document.createElement('canvas'); 
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width; 
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgData = canvas.toDataURL('image/jpeg', jpegQuality);
          
          currentBytes = (imgData.length * 3) / 4;

          if (currentBytes > targetBytesPerPage) {
            if (jpegQuality > 0.3) {
              jpegQuality -= 0.1;
            } else {
              scale -= 0.2;
              jpegQuality = 0.7;
            }
          }
        }

        if (i > 1) doc.addPage();
        
        const imgProps = doc.getImageProperties(imgData);
        const pdfRatio = pageWidth / pageHeight;
        const imgRatio = imgProps.width / imgProps.height;
        let renderW = pageWidth;
        let renderH = pageHeight;
        
        if (imgRatio > pdfRatio) {
          renderH = pageWidth / imgRatio;
        } else {
          renderW = pageHeight * imgRatio;
        }
        
        const x = (pageWidth - renderW) / 2;
        const y = (pageHeight - renderH) / 2;

        doc.addImage(imgData, 'JPEG', x, y, renderW, renderH);
      }
      
      doc.save(`Compressed_${targetPdfKB}KB_${compressPdfFile.name}`);
    } catch(err) {
      console.error(err);
      alert("Failed to compress the PDF. It might be corrupted or encrypted.");
    } finally {
      setIsCompressingPdf(false); 
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
        <p className="text-md flex justify-center font-semibold text-slate-500 mt-1">Quickly calculate daily shop metrics, precisely format documents, or assist students.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. UNIT CONVERTER */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
          <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowRightLeft size={16} className="text-blue-500" /> Unit Converter
          </h3>
          
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
            <button onClick={() => setActiveToolTab('compress-pdf')} className={getTabClass('compress-pdf', 'teal')}>
              <FileArchive size={16} /> Compress PDF
            </button>
            
            <div className="hidden md:block w-full h-px bg-slate-200 my-2"></div>

            {/* ✨ NEW: PSC Photo Maker Tab */}
            <button onClick={() => setActiveToolTab('psc-photo')} className={getTabClass('psc-photo', 'orange')}>
              <UserSquare size={16} /> PSC Photo Editor
            </button>

            <button onClick={() => setActiveToolTab('resize')} className={getTabClass('resize', 'pink')}>
              <Crop size={16} /> Crop/Resize Image
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
              <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                  <FileImage size={40} className="text-rose-500" />
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-2">Merge Images to PDF</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">Upload multiple images to arrange them, set margins, and convert into a clean PDF.</p>
                
                <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" multiple className="hidden" ref={convertPdfInputRef} onChange={handleAddPdfFiles} />
                <button 
                  onClick={() => convertPdfInputRef.current.click()}
                  className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2"
                >
                  <Plus size={18} /> Select Images
                </button>
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

            {/* TAB: COMPRESS PDF */}
            {activeToolTab === 'compress-pdf' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">Target KB PDF Compressor</h4>
                  <p className="text-xs text-slate-500 mt-1">Shrink heavy scanned PDF files to pass strict government portal limits. <br/><span className="text-amber-600 font-medium">Note: Converts pages to images. Best for scanned documents.</span></p>
                </div>

                <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-6 text-center mb-6 flex-1 flex flex-col justify-center items-center border-dashed">
                   {compressPdfFile ? (
                     <div className="flex flex-col items-center">
                       <FileArchive size={36} className="text-teal-500 mb-3" />
                       <p className="text-sm font-bold text-slate-800 truncate max-w-[250px]">{compressPdfFile.name}</p>
                       <span className="text-[10px] text-teal-600 font-bold bg-teal-100 px-2 py-0.5 rounded mt-2">Ready to compress</span>
                     </div>
                   ) : (
                     <>
                       <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                         <UploadCloud size={28} className="text-teal-500" />
                       </div>
                       <p className="text-sm font-bold text-slate-700">Select a large PDF document</p>
                     </>
                   )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                   <div className="flex-1">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Max Target Size (KB)</label>
                     <input type="number" min="10" value={targetPdfKB} onChange={(e) => setTargetPdfKB(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-[10px] font-black text-transparent mb-1.5">Action</label>
                     <input type="file" accept="application/pdf" className="hidden" ref={compressPdfInputRef} onChange={(e) => setCompressPdfFile(e.target.files[0])} />
                     <button onClick={() => compressPdfInputRef.current.click()} className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:border-slate-300 hover:bg-slate-50 transition">{compressPdfFile ? "Change PDF" : "Select PDF"}</button>
                   </div>
                </div>

                <button onClick={handleCompressPdf} disabled={!compressPdfFile || isCompressingPdf} className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 ${!compressPdfFile ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700 text-white"}`}>
                  {isCompressingPdf ? <><Loader2 size={16} className="animate-spin" /> Compressing & Flattening...</> : <><Minimize size={16} /> Download Compressed PDF</>}
                </button>
              </div>
            )}

            {/* ✨ NEW TAB: PSC PHOTO MAKER ✨ */}
            {activeToolTab === 'psc-photo' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-800">PSC Photo & Signature Editor</h4>
                  <p className="text-xs text-slate-500 mt-1">Generate standard 150x200px photo and 150x100px signature for Kerala PSC.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 flex-1">
                  {/* Upload Column */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="text-orange-500" size={14}/> Step 1: Uploads (Optional)</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Photo Box */}
                      <div 
                        onClick={() => pscFileInputRef.current.click()} 
                        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl aspect-[3/4] flex flex-col items-center justify-center p-3 text-center transition ${pscImage ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50'}`}
                      >
                        {pscImage ? (
                          <img src={pscImage} alt="Photo" className="absolute inset-0 w-full h-full object-cover rounded-2xl group-hover:opacity-50 transition" />
                        ) : (
                          <>
                            <UserSquare size={24} className="text-slate-400 mb-2 group-hover:scale-110 transition group-hover:text-orange-500" />
                            <p className="text-[10px] font-bold text-slate-600">Photo</p>
                          </>
                        )}
                        <input ref={pscFileInputRef} type="file" accept="image/*" onChange={handlePscPhotoUpload} className="hidden" />
                      </div>

                      {/* Signature Box */}
                      <div 
                        onClick={() => pscSigInputRef.current.click()} 
                        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl aspect-[3/4] flex flex-col items-center justify-center p-3 text-center transition ${pscSignature ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50'}`}
                      >
                        {pscSignature ? (
                          <img src={pscSignature} alt="Signature" className="absolute inset-0 w-full h-full object-contain p-2 rounded-2xl group-hover:opacity-50 transition" />
                        ) : (
                          <>
                            <PenTool size={24} className="text-slate-400 mb-2 group-hover:scale-110 transition group-hover:text-orange-500" />
                            <p className="text-[10px] font-bold text-slate-600">Signature</p>
                          </>
                        )}
                        <input ref={pscSigInputRef} type="file" accept="image/*" onChange={handlePscSigUpload} className="hidden" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 text-center">White/plain background required. Upload one or both.</p>
                  </div>

                  {/* Inputs Column */}
                  <div className="flex flex-col">
                    <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2"><Settings2 className="text-orange-500" size={14}/> Step 2: Photo Details</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Candidate Name (For Photo)</label>
                        <input 
                          type="text" 
                          value={pscName}
                          onChange={(e) => setPscName(e.target.value)}
                          placeholder="e.g. RAMESH K"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm uppercase bg-slate-50 focus:bg-white transition-all"
                          disabled={!pscImage}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Photo Date</label>
                        <div className="relative">
                          <CalendarDays size={16} className={`absolute left-3 top-3 ${pscImage ? 'text-slate-400' : 'text-slate-300'}`} />
                          <input 
                            type="date" 
                            value={pscDate}
                            onChange={(e) => setPscDate(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm text-slate-700 bg-slate-50 focus:bg-white transition-all disabled:opacity-50"
                            disabled={!pscImage}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2"><FileDown className="text-emerald-500" size={14}/> Step 3: Final Download</h3>
                      <button 
                        onClick={generatePSCAssets}
                        disabled={(!pscImage && !pscSignature) || isGeneratingPsc}
                        className="w-full py-3.5 rounded-xl bg-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-orange-700 transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {isGeneratingPsc ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Download size={16} /> Download File(s)</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hidden Canvas used for manipulation */}
                <canvas ref={pscCanvasRef} className="hidden" />
              </div>
            )}

            {/* TAB: RESIZE & CROP */}
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

            {/* TAB: COMPRESS IMAGE */}
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

            {/* TAB: FORMAT TO JPG */}
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

      {/* ✨ PDF MERGE PRO MODAL ✨ */}
      {pdfSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                  <Layout size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">Image to PDF Options</h3>
                  <p className="text-xs text-slate-500">{convertFiles.length} images selected</p>
                </div>
              </div>
              <button onClick={() => setPdfSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* Preview & Reorder Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

                {/* Live Preview Canvas */}
                <div className="flex-1 flex items-center justify-center p-6 min-h-0">
                  <div className={`relative shadow-2xl shadow-slate-400/30 transition-all duration-300 ${pdfOrientation === 'l' ? 'max-h-full' : 'max-w-[280px] w-full'}`}
                    style={{ aspectRatio: pdfOrientation === 'l' ? '297/210' : '210/297' }}
                  >
                    <canvas
                      ref={previewCanvasRef}
                      width={pdfOrientation === 'l' ? 594 : 420}
                      height={pdfOrientation === 'l' ? 420 : 594}
                      className="w-full h-full rounded-sm"
                      style={{ display: 'block' }}
                    />
                    {/* Live badge */}
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block"></span>
                      Live Preview
                    </div>
                    {convertFiles.length > 1 && (
                      <div className="absolute bottom-2 right-2 text-[10px] font-black text-slate-400 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        Page {previewPageIndex + 1} / {convertFiles.length}
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="border-t border-slate-200 bg-white p-3 overflow-x-auto">
                  <div className="flex gap-2 items-center min-w-max">
                    {convertFiles.map((file, idx) => (
                      <div
                        key={file.id}
                        onClick={() => { setPreviewPageIndex(idx); }}
                        className={`group relative shrink-0 cursor-pointer rounded-xl border-2 transition-all overflow-hidden
                          ${previewPageIndex === idx ? 'border-rose-500 shadow-md shadow-rose-200' : 'border-slate-200 hover:border-rose-300'}`}
                        style={{ width: 64, height: 80 }}
                      >
                        <img src={file.preview} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-1">
                          <span className="text-[8px] font-black text-white leading-none">P{idx + 1}</span>
                        </div>
                        {/* Reorder / delete overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); movePage(idx, -1); if (previewPageIndex === idx && idx > 0) setPreviewPageIndex(idx - 1); }} disabled={idx === 0} className="p-1 bg-white/80 rounded text-slate-700 disabled:opacity-30 hover:bg-white transition"><MoveLeft size={10}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setConvertFiles(prev => { const next = prev.filter(f => f.id !== file.id); if (previewPageIndex >= next.length) setPreviewPageIndex(Math.max(0, next.length - 1)); return next; }); }} className="p-1 bg-red-500 rounded text-white hover:bg-red-600 transition"><Trash2 size={10}/></button>
                          <button onClick={(e) => { e.stopPropagation(); movePage(idx, 1); if (previewPageIndex === idx && idx < convertFiles.length - 1) setPreviewPageIndex(idx + 1); }} disabled={idx === convertFiles.length - 1} className="p-1 bg-white/80 rounded text-slate-700 disabled:opacity-30 hover:bg-white transition"><MoveRight size={10}/></button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => convertPdfInputRef.current.click()}
                      className="shrink-0 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50/30 transition-all"
                      style={{ width: 64, height: 80 }}
                    >
                      <Plus size={18} />
                      <span className="text-[9px] font-bold">Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Settings */}
              <div className="w-full lg:w-72 border-l border-slate-100 p-6 space-y-8 bg-white">
                {/* Orientation */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Page Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPdfOrientation("p")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${pdfOrientation === 'p' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <div className="w-6 h-8 border-2 border-current rounded-sm"></div>
                      <span className="text-xs font-bold">Portrait</span>
                    </button>
                    <button 
                      onClick={() => setPdfOrientation("l")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${pdfOrientation === 'l' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <div className="w-8 h-6 border-2 border-current rounded-sm"></div>
                      <span className="text-xs font-bold">Landscape</span>
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Page Margin</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "No Margin", value: 0 },
                      { label: "Small (10mm)", value: 10 },
                      { label: "Big (20mm)", value: 20 }
                    ].map((m) => (
                      <button 
                        key={m.value}
                        onClick={() => setPdfMargin(m.value)}
                        className={`text-left px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all ${pdfMargin === m.value ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Final Action */}
                <div className="pt-4">
                  <button 
                    onClick={handleCreatePdf}
                    disabled={isConvertingPdf || convertFiles.length === 0}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isConvertingPdf ? <><Loader2 className="animate-spin" size={18}/> Converting...</> : <><FileDown size={18}/> Convert to PDF</>}
                  </button>
                  <p className="text-[9px] text-slate-400 text-center mt-3 leading-tight uppercase font-black">Fast browser-side conversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL PDF INSERTER MODAL */}
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