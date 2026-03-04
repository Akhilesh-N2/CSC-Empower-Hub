// src/utils/watermark.js

export const downloadWatermarkedPoster = async (imageUrl, shopInfo, title) => {
  try {
    // 1. THE FONT INJECTOR (Includes Malayalam Support)
    await new Promise((resolve) => {
      const fontId = 'premium-watermark-font-v3'; 
      if (document.getElementById(fontId)) {
        document.fonts.load('700 24px "Montserrat"').then(() => setTimeout(resolve, 100)).catch(resolve);
        return;
      }
      
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;900&family=Noto+Sans+Malayalam:wght@700;900&display=swap';
      
      link.onload = () => {
        Promise.all([
          document.fonts.load('900 24px "Montserrat"'),
          document.fonts.load('700 24px "Montserrat"'),
          document.fonts.load('600 24px "Montserrat"'),
          document.fonts.load('500 24px "Montserrat"'),
          document.fonts.load('900 24px "Noto Sans Malayalam"') // Ensure Malayalam is ready
        ]).then(() => {
          setTimeout(resolve, 200); 
        }).catch(resolve);
      };
      link.onerror = resolve; 
      document.head.appendChild(link);
    });

    // 2. CORS BYPASS for main poster
    const response = await fetch(`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`);
    const blob = await response.blob();
    const safeLocalUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const imgWidth = img.width;
        const imgHeight = img.height;

        // Heights for our added sections
        const bannerHeight = Math.max(180, imgHeight * 0.18); 
        const callBoxHeight = Math.max(70, bannerHeight * 0.55);

        // FIX: We ADD both the Yellow Box AND the White Banner to the canvas height.
        // This ensures the poster is never covered!
        canvas.width = imgWidth;
        canvas.height = imgHeight + callBoxHeight + bannerHeight;

        // Draw the original poster at the very top (0, 0)
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        // ==========================================
        // DIAGONAL WATERMARK (Anti-piracy background)
        // ==========================================
        const watermarkText = shopInfo?.shop_name ? shopInfo.shop_name.toUpperCase() : "AUTHORIZED PARTNER";
        
        ctx.save(); 
        const centerX = imgWidth / 2;
        const centerY = imgHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(-35 * Math.PI / 180);
        
        const diagonalLength = Math.sqrt((imgWidth * imgWidth) + (imgHeight * imgHeight));
        const maxOverlayWidth = diagonalLength * 0.85; 
        let overlaySize = Math.floor(diagonalLength * 0.08); 
        
        if ('letterSpacing' in ctx) ctx.letterSpacing = "6px";
        ctx.font = `900 ${overlaySize}px "Montserrat", sans-serif`;

        let textWidth = ctx.measureText(watermarkText).width;
        if (textWidth > maxOverlayWidth) {
          overlaySize = Math.floor(overlaySize * (maxOverlayWidth / textWidth));
          ctx.font = `900 ${overlaySize}px "Montserrat", sans-serif`;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.20)"; 
        ctx.fillText(watermarkText, 0, 0);
        ctx.lineWidth = Math.max(2, overlaySize * 0.03);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.02)";
        ctx.strokeText(watermarkText, 0, 0);

        if ('letterSpacing' in ctx) ctx.letterSpacing = "0px";
        ctx.restore(); 


        // ==========================================
        // ✨ PREMIUM SPLIT WHITE BANNER ✨
        // ==========================================
        
        // This is the Y-coordinate where the White Banner starts (below the Yellow Box)
        const bannerStartY = imgHeight + callBoxHeight;

        // 1. Fill entire new footer area with White (so no transparency bugs occur)
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, imgHeight, imgWidth, callBoxHeight + bannerHeight);

        // 2. Top Accent Line (Indian Tricolor Style) - Now sits on top of the White Banner
        const accentHeight = Math.max(6, bannerHeight * 0.04);
        ctx.fillStyle = "#FF9933"; // Saffron
        ctx.fillRect(0, bannerStartY, imgWidth / 3, accentHeight);
        ctx.fillStyle = "#f1f5f9"; // Soft grey
        ctx.fillRect(imgWidth / 3, bannerStartY, imgWidth / 3, accentHeight);
        ctx.fillStyle = "#138808"; // Green
        ctx.fillRect((imgWidth / 3) * 2, bannerStartY, imgWidth / 3, accentHeight);

        // 3. Vertical Divider Line
        ctx.strokeStyle = "#e2e8f0"; // Light slate grey
        ctx.lineWidth = Math.max(2, imgWidth * 0.002);
        ctx.beginPath();
        ctx.moveTo(imgWidth * 0.5, bannerStartY + (bannerHeight * 0.2));
        ctx.lineTo(imgWidth * 0.5, bannerStartY + (bannerHeight * 0.8));
        ctx.stroke();

        // ------------------------------------------
        // ✨ LEFT COLUMN: LOGO, SHOP NAME & SUBTITLE ✨
        // ------------------------------------------
        const leftColWidth = imgWidth * 0.5;
        const leftColCenter = leftColWidth * 0.5;
        const bannerContentY = bannerStartY + (bannerHeight * 0.45); // Y centerline for name/logo
        
        ctx.save();
        ctx.textBaseline = "middle";
        
        // Load Logo if exists
        let logoImg = null;
        const logoSize = Math.max(40, bannerHeight * 0.4); // Target size for logo

        if (shopInfo?.logo_url) {
          try {
            // CORS bypass for logo
            const logoResp = await fetch(`${shopInfo.logo_url}${shopInfo.logo_url.includes('?') ? '&' : '?'}cb=${Date.now()}`);
            const logoBlob = await logoResp.blob();
            const logoLocalUrl = URL.createObjectURL(logoBlob);
            
            logoImg = await new Promise((res) => {
              const lImg = new Image();
              lImg.onload = () => res(lImg);
              lImg.onerror = () => res(null); // Continue even if logo fails
              lImg.src = logoLocalUrl;
            });
          } catch (e) {
            console.error("Failed to load shop logo for banner", e);
          }
        }

        // Define Font settings
        let nameSize = Math.max(28, Math.floor(bannerHeight * 0.28));
        ctx.font = `900 ${nameSize}px "Montserrat", sans-serif`;
        ctx.fillStyle = "#1e3a8a"; // Deep Blue

        const gap = 15; // Gap between logo and text
        let logoFinalWidth = 0;
        let logoFinalHeight = 0;

        if (logoImg) {
          const aspectRatio = logoImg.width / logoImg.height;
          logoFinalHeight = logoSize;
          logoFinalWidth = logoSize * aspectRatio;
          // Ensure logo isn't ridiculously wide
          if (logoFinalWidth > leftColWidth * 0.3) {
             logoFinalWidth = leftColWidth * 0.3;
             logoFinalHeight = logoFinalWidth / aspectRatio;
          }
        }

        // Calculate maximum available width for text
        const padding = 20;
        const maxTextWidth = leftColWidth - padding * 2 - (logoImg ? logoFinalWidth + gap : 0);

        // Scale down Shop Name font size if it's too long
        while (ctx.measureText(watermarkText).width > maxTextWidth && nameSize > 14) {
          nameSize -= 2;
          ctx.font = `900 ${nameSize}px "Montserrat", sans-serif`;
        }

        const measuredTextWidth = ctx.measureText(watermarkText).width;
        
        // Calculate total width of block (logo + gap + text) to center it
        const totalBlockWidth = (logoImg ? logoFinalWidth + gap : 0) + measuredTextWidth;
        const blockStartX = leftColCenter - (totalBlockWidth / 2);

        // Draw Logo if available
        if (logoImg) {
          const logoX = blockStartX;
          const logoY = bannerContentY - (logoFinalHeight / 2);
          ctx.drawImage(logoImg, logoX, logoY, logoFinalWidth, logoFinalHeight);
          if (logoImg.src.startsWith('blob:')) URL.revokeObjectURL(logoImg.src); // Clean up
        }

        // Draw Shop Name
        ctx.textAlign = "left"; // Draw from left to right within centered block
        const textX = blockStartX + (logoImg ? logoFinalWidth + gap : 0);
        ctx.fillText(watermarkText, textX, bannerContentY);

        // Draw Subtitle (Centered below the name/logo block)
        const subtitleY = bannerStartY + (bannerHeight * 0.68);
        ctx.font = `700 ${Math.max(12, Math.floor(nameSize * 0.35))}px "Montserrat", sans-serif`;
        ctx.fillStyle = "#64748b"; // Slate grey
        ctx.textAlign = "center"; // Center subtitle relative to column
        if ('letterSpacing' in ctx) ctx.letterSpacing = "2px";
        ctx.fillText("AUTHORIZED SERVICE CENTER", leftColCenter, subtitleY);
        
        ctx.restore(); // Restore baseline and alignment


        // ------------------------------------------
        // ✨ RIGHT COLUMN: CONTACT DETAILS (Vector Icons) ✨
        // ------------------------------------------
        const rightColStart = imgWidth * 0.55; 
        const maxRightTextWidth = (imgWidth * 0.40) - 20; 
        const rowSpacing = bannerHeight / 4;
        const contactTextSize = Math.max(14, Math.floor(bannerHeight * 0.14));
        const iconSize = contactTextSize * 1.2;

        const iconLocation = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z";
        const iconEmail = "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z";
        const iconPhone = "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z";

        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        
        const drawVectorRow = (iconPath, text, rowNum) => {
          const y = bannerStartY + (rowSpacing * rowNum);
          
          ctx.beginPath();
          ctx.arc(rightColStart + (iconSize / 2), y, iconSize * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = "#eff6ff"; 
          ctx.fill();

          ctx.save();
          ctx.translate(rightColStart, y - (iconSize / 2)); 
          const scale = iconSize / 24; 
          ctx.scale(scale, scale);
          
          ctx.fillStyle = "#1e3a8a"; 
          ctx.fill(new Path2D(iconPath));
          ctx.restore();
          
          ctx.font = `600 ${contactTextSize}px "Montserrat", sans-serif`;
          ctx.fillStyle = "#334155"; 
          
          const textStartOffset = rightColStart + (iconSize * 1.8);
          let displayText = text;
          
          while (ctx.measureText(displayText).width > maxRightTextWidth && displayText.length > 5) {
            displayText = displayText.slice(0, -1);
          }
          if (displayText !== text) displayText += "...";
          
          ctx.fillText(displayText, textStartOffset, y);
        };

        drawVectorRow(iconLocation, shopInfo?.address || "Location not provided", 1);
        drawVectorRow(iconEmail, shopInfo?.email || "Email not provided", 2);
        drawVectorRow(iconPhone, shopInfo?.phone || "Phone not provided", 3);


        // ==========================================
        // ✨ MALAYALAM CALL-TO-ACTION BOX ✨
        // ==========================================
        
        const callBoxWidth = imgWidth * 0.65;
        const callBoxX = (imgWidth - callBoxWidth) / 2;
        // The box now starts exactly where the poster ends
        const callBoxY = imgHeight; 

        // Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = "#fef08a"; 
        const radius = Math.max(15, imgWidth * 0.03);
        
        // Draw Box
        ctx.beginPath();
        ctx.moveTo(callBoxX, bannerStartY); // Bottom left (touches the Tricolor line)
        ctx.lineTo(callBoxX, callBoxY + radius); // Up to top left
        ctx.quadraticCurveTo(callBoxX, callBoxY, callBoxX + radius, callBoxY); // Rounded top left
        ctx.lineTo(callBoxX + callBoxWidth - radius, callBoxY); // Top edge
        ctx.quadraticCurveTo(callBoxX + callBoxWidth, callBoxY, callBoxX + callBoxWidth, callBoxY + radius); // Rounded top right
        ctx.lineTo(callBoxX + callBoxWidth, bannerStartY); // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.restore(); 

        // Write the Malayalam Text
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let malSize = Math.max(18, callBoxHeight * 0.26);
        ctx.font = `900 ${malSize}px "Noto Sans Malayalam", "Montserrat", sans-serif`;
        
        const textLine1 = "എല്ലാവിധ ഓൺലൈൻ";
        const textLine2 = "സേവനങ്ങൾക്കും സമീപിക്കുക";
        
        const maxMalTextWidth = callBoxWidth * 0.9;
        let text2Width = ctx.measureText(textLine2).width;
        if (text2Width > maxMalTextWidth) {
          malSize = malSize * (maxMalTextWidth / text2Width);
          ctx.font = `900 ${malSize}px "Noto Sans Malayalam", "Montserrat", sans-serif`;
        }

        ctx.fillText(textLine1, imgWidth / 2, callBoxY + (callBoxHeight * 0.35));
        ctx.fillText(textLine2, imgWidth / 2, callBoxY + (callBoxHeight * 0.70));


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