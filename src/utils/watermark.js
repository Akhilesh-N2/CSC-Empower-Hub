// src/utils/watermark.js

export const downloadWatermarkedPoster = async (imageUrl, shopInfo, title) => {
  try {
    // ✨ 1. THE FONT INJECTOR
    await new Promise((resolve) => {
      const fontId = 'premium-watermark-font-v2'; 
      if (document.getElementById(fontId)) {
        document.fonts.load('700 24px "Montserrat"').then(() => setTimeout(resolve, 100)).catch(resolve);
        return;
      }
      
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap';
      
      link.onload = () => {
        Promise.all([
          document.fonts.load('700 24px "Montserrat"'),
          document.fonts.load('600 24px "Montserrat"'),
          document.fonts.load('500 24px "Montserrat"')
        ]).then(() => {
          setTimeout(resolve, 150); 
        }).catch(resolve);
      };
      link.onerror = resolve; 
      document.head.appendChild(link);
    });

    // ✨ 2. THE BULLETPROOF CORS BYPASS
    const response = await fetch(`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`);
    const blob = await response.blob();
    const safeLocalUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const imgWidth = img.width;
        const imgHeight = img.height;

        const bannerHeight = Math.max(160, imgHeight * 0.16); 

        canvas.width = imgWidth;
        canvas.height = imgHeight + bannerHeight;

        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        // Premium Deep Navy-to-Midnight Gradient
        const bgGradient = ctx.createLinearGradient(0, imgHeight, 0, imgHeight + bannerHeight);
        bgGradient.addColorStop(0, "#0b172a"); 
        bgGradient.addColorStop(1, "#020617"); 
        ctx.fillStyle = bgGradient; 
        ctx.fillRect(0, imgHeight, imgWidth, bannerHeight);

        // Bright Blue Accent Line
        const accentHeight = Math.max(8, bannerHeight * 0.04);
        ctx.fillStyle = "#2563eb"; 
        ctx.fillRect(0, imgHeight, imgWidth, accentHeight);

        // Global Text Shadows for 3D Depth
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        const topRowY = imgHeight + (bannerHeight * 0.42);
        const bottomRowY = imgHeight + (bannerHeight * 0.78);
        const paddingX = imgWidth * 0.04; 

        ctx.textBaseline = "alphabetic";

        // ==========================================
        // ROW 1: SHOP NAME (Left) & "CONTACT" (Right)
        // ==========================================

        const shopName = shopInfo?.shop_name ? shopInfo.shop_name.toUpperCase() : "TESTNAME";
        const maxNameWidth = imgWidth * 0.60;
        let nameSize = Math.floor(bannerHeight * 0.35);

        if ('letterSpacing' in ctx) ctx.letterSpacing = "5px";

        ctx.font = `700 ${nameSize}px "Montserrat", sans-serif`;
        while (ctx.measureText(shopName).width > maxNameWidth && nameSize > 20) {
          nameSize -= 2; 
          ctx.font = `700 ${nameSize}px "Montserrat", sans-serif`;
        }

        ctx.textAlign = "left";
        ctx.fillStyle = "#f8fafc"; 
        
        ctx.fillText(shopName, paddingX, topRowY);
        if ('letterSpacing' in ctx) ctx.letterSpacing = "0px"; 

        // Right: "CONTACT" Label
        ctx.shadowColor = "transparent"; 
        const contactSize = Math.floor(bannerHeight * 0.16);
        ctx.textAlign = "right";
        ctx.fillStyle = "#60a5fa"; 
        ctx.font = `600 ${contactSize}px "Montserrat", sans-serif`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = "2px";
        ctx.fillText("CONTACT", imgWidth - paddingX, topRowY - (bannerHeight * 0.02));
        if ('letterSpacing' in ctx) ctx.letterSpacing = "0px";

        // ==========================================
        // ROW 2: ADDRESS (Left) & PHONE (Right)
        // ==========================================

        // ✨ UPDATE: Only draw the address and pin if the address actually exists!
        if (shopInfo?.address && shopInfo.address.trim() !== "") {
          let addressSize = Math.floor(bannerHeight * 0.17);
          const addressText = shopInfo.address;
          const maxAddressWidth = imgWidth * 0.50;

          ctx.font = `500 ${addressSize}px "Montserrat", sans-serif`;
          
          while (ctx.measureText(`📍 ${addressText}`).width > maxAddressWidth && addressSize > 12) {
            addressSize -= 1;
            ctx.font = `500 ${addressSize}px "Montserrat", sans-serif`;
          }

          ctx.textAlign = "left";
          
          // Red Pin
          ctx.fillStyle = "#ef4444"; 
          ctx.fillText("📍", paddingX, bottomRowY);
          const pinWidth = ctx.measureText("📍 ").width;
          
          // Slate Text
          ctx.fillStyle = "#cbd5e1"; 
          ctx.fillText(addressText, paddingX + pinWidth, bottomRowY);
        }

        // Right: Phone Block (Draws independently of the address)
        let phoneSize = Math.floor(bannerHeight * 0.42);
        const phoneStr = shopInfo?.phone || "N/A";
        
        ctx.font = `700 ${phoneSize}px "Montserrat", sans-serif`;
        
        if ('letterSpacing' in ctx) ctx.letterSpacing = "2px"; 
        while (ctx.measureText(`📞 ${phoneStr}`).width > (imgWidth * 0.40) && phoneSize > 20) {
          phoneSize -= 2;
          ctx.font = `700 ${phoneSize}px "Montserrat", sans-serif`;
        }

        ctx.textAlign = "right";
        const phoneWidth = ctx.measureText(phoneStr).width;
        
        // White Number
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(phoneStr, imgWidth - paddingX, bottomRowY);
        if ('letterSpacing' in ctx) ctx.letterSpacing = "0px";
        
        // Red Phone Icon
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ef4444";
        const iconOffset = imgWidth - paddingX - phoneWidth - (phoneSize * 0.3);
        ctx.fillText("📞", iconOffset, bottomRowY);

        // --- EXPORT TO HIGH QUALITY JPG ---
        canvas.toBlob(
          (finalBlob) => {
            if (!finalBlob) {
              reject(new Error("Canvas creation failed"));
              return;
            }
            const link = document.createElement("a");
            link.href = URL.createObjectURL(finalBlob);
            link.download = `${title.replace(/\s+/g, '_')}_Branded.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
              URL.revokeObjectURL(link.href);
              URL.revokeObjectURL(safeLocalUrl);
            }, 100);
            
            resolve();
          },
          "image/jpeg",
          1.0
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(safeLocalUrl);
        reject(new Error("Could not process image data."));
      };

      img.src = safeLocalUrl; 
    });

  } catch (error) {
    console.error("Watermarking failed:", error);
    window.open(imageUrl, '_blank');
  }
};