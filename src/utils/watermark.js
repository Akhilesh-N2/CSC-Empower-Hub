// src/utils/watermark.js

export const downloadWatermarkedPoster = async (imageUrl, shopInfo, title) => {
  try {
    // 1. BULLETPROOF FONT LOADER
    // Upgraded to "Lexend" - a highly premium, wide tech-brand font
    await new Promise((resolve) => {
      const fontUrl = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@700;800;900&display=swap';
      
      let link = document.querySelector(`link[href="${fontUrl}"]`);
      
      const loadFontsIntoMemory = async () => {
        await document.fonts.ready;
        try {
          await Promise.all([
            document.fonts.load('900 24px "Lexend"'),
            document.fonts.load('800 24px "Lexend"'),
            document.fonts.load('700 24px "Lexend"'),
            document.fonts.load('600 24px "Lexend"'),
            document.fonts.load('500 24px "Lexend"'),
            document.fonts.load('900 24px "Noto Sans Malayalam"')
          ]);
        } catch (e) {
          console.warn("Font loading error:", e);
        }
        setTimeout(resolve, 150); 
      };

      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.onload = loadFontsIntoMemory; 
        link.onerror = resolve; 
        document.head.appendChild(link);
      } else {
        loadFontsIntoMemory();
      }
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

        // ✨ DUMMY DRAW HACK: Forces browser to cache the Lexend font shapes
        ctx.font = '800 10px "Lexend"';
        ctx.fillText('A', -100, -100);
        ctx.font = '600 10px "Lexend"';
        ctx.fillText('A', -100, -100);
        ctx.font = '900 10px "Noto Sans Malayalam"';
        ctx.fillText('അ', -100, -100);

        const imgWidth = img.width;
        const imgHeight = img.height;

        const bannerHeight = Math.max(220, imgHeight * 0.22); 
        const callBoxHeight = Math.max(70, bannerHeight * 0.55);

        canvas.width = imgWidth;
        canvas.height = imgHeight + callBoxHeight + bannerHeight;

        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        // ==========================================
        // DIAGONAL WATERMARK
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
        ctx.font = `800 ${overlaySize}px "Lexend", sans-serif`;

        let textWidth = ctx.measureText(watermarkText).width;
        if (textWidth > maxOverlayWidth) {
          overlaySize = Math.floor(overlaySize * (maxOverlayWidth / textWidth));
          ctx.font = `800 ${overlaySize}px "Lexend", sans-serif`;
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
        const bannerStartY = imgHeight + callBoxHeight;

        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, imgHeight, imgWidth, callBoxHeight + bannerHeight);

        const accentHeight = Math.max(6, bannerHeight * 0.04);
        ctx.fillStyle = "#FF9933"; 
        ctx.fillRect(0, bannerStartY, imgWidth / 3, accentHeight);
        ctx.fillStyle = "#f1f5f9"; 
        ctx.fillRect(imgWidth / 3, bannerStartY, imgWidth / 3, accentHeight);
        ctx.fillStyle = "#138808"; 
        ctx.fillRect((imgWidth / 3) * 2, bannerStartY, imgWidth / 3, accentHeight);

        ctx.strokeStyle = "#e2e8f0"; 
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
        const bannerContentY = bannerStartY + (bannerHeight * 0.35); 
        
        ctx.save();
        ctx.textBaseline = "middle";
        
        let logoImg = null;
        const logoSize = Math.max(40, bannerHeight * 0.4); 

        if (shopInfo?.logo_url) {
          try {
            const logoResp = await fetch(`${shopInfo.logo_url}${shopInfo.logo_url.includes('?') ? '&' : '?'}cb=${Date.now()}`);
            const logoBlob = await logoResp.blob();
            const logoLocalUrl = URL.createObjectURL(logoBlob);
            
            logoImg = await new Promise((res) => {
              const lImg = new Image();
              lImg.onload = () => res(lImg);
              lImg.onerror = () => res(null); 
              lImg.src = logoLocalUrl;
            });
          } catch (e) {
            console.error("Failed to load shop logo for banner", e);
          }
        }

        let nameSize = Math.max(28, Math.floor(bannerHeight * 0.28));
        if ('letterSpacing' in ctx) ctx.letterSpacing = "0px"; // Lexend is already wide
        ctx.font = `800 ${nameSize}px "Lexend", sans-serif`;

        const gap = 15; 
        let logoFinalWidth = 0;
        let logoFinalHeight = 0;

        if (logoImg) {
          const aspectRatio = logoImg.width / logoImg.height;
          logoFinalHeight = logoSize;
          logoFinalWidth = logoSize * aspectRatio;
          if (logoFinalWidth > leftColWidth * 0.3) {
             logoFinalWidth = leftColWidth * 0.3;
             logoFinalHeight = logoFinalWidth / aspectRatio;
          }
        }

        const padding = 20;
        const maxTextWidth = leftColWidth - padding * 2 - (logoImg ? logoFinalWidth + gap : 0);

        while (ctx.measureText(watermarkText).width > maxTextWidth && nameSize > 14) {
          nameSize -= 2;
          ctx.font = `800 ${nameSize}px "Lexend", sans-serif`;
        }

        const measuredTextWidth = ctx.measureText(watermarkText).width;
        const totalBlockWidth = (logoImg ? logoFinalWidth + gap : 0) + measuredTextWidth;
        const blockStartX = leftColCenter - (totalBlockWidth / 2);

        if (logoImg) {
          const logoX = blockStartX;
          const logoY = bannerContentY - (logoFinalHeight / 2);
          ctx.drawImage(logoImg, logoX, logoY, logoFinalWidth, logoFinalHeight);
          if (logoImg.src.startsWith('blob:')) URL.revokeObjectURL(logoImg.src); 
        }

        const textX = blockStartX + (logoImg ? logoFinalWidth + gap : 0);

        // Premium Linear Gradient for the Title
        const titleGradient = ctx.createLinearGradient(textX, 0, textX + measuredTextWidth, 0);
        titleGradient.addColorStop(0, "#1e3a8a"); // Deep Navy
        titleGradient.addColorStop(1, "#3b82f6"); // Vibrant Blue
        ctx.fillStyle = titleGradient;

        ctx.textAlign = "left"; 
        ctx.fillText(watermarkText, textX, bannerContentY);
        
        // Vibrant Subtitle Styling
        const subtitleY = bannerContentY + (nameSize * 0.85); 
        ctx.font = `600 ${Math.max(12, Math.floor(nameSize * 0.30))}px "Lexend", sans-serif`;
        ctx.fillStyle = "#2563eb"; // Bright solid blue to match gradient end
        ctx.textAlign = "center"; 
        if ('letterSpacing' in ctx) ctx.letterSpacing = "3px";
        ctx.fillText("AUTHORIZED SERVICE CENTER", leftColCenter, subtitleY);
        
        ctx.restore(); 


        // ------------------------------------------
        // ✨ RIGHT COLUMN: CONTACT DETAILS ✨
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
          
          // Floating 3D Badge for Icons
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;
          ctx.beginPath();
          ctx.arc(rightColStart + (iconSize / 2), y, iconSize * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff"; 
          ctx.fill();
          ctx.restore();

          // Draw Icon Inside Badge
          ctx.save();
          ctx.translate(rightColStart, y - (iconSize / 2)); 
          const scale = iconSize / 24; 
          ctx.scale(scale, scale);
          ctx.fillStyle = "#2563eb"; 
          ctx.fill(new Path2D(iconPath));
          ctx.restore();
          
          const textStartOffset = rightColStart + (iconSize * 1.8);
          
          // ✨ NEW: DYNAMIC TEXT WRAPPING & AUTO-RESIZING
          let currentTextSize = contactTextSize;
          let words = text.toString().split(' ');
          let lines = [];
          let maxLines = 2; // Strict 2-line cap to avoid hitting the row beneath it

          // Loop: Shrink font size until it fits into 2 lines
          while (currentTextSize > 8) {
            ctx.font = `500 ${currentTextSize}px "Lexend", sans-serif`;
            let line = '';
            lines = [];

            for(let n = 0; n < words.length; n++) {
              let testLine = line + words[n] + ' ';
              let metrics = ctx.measureText(testLine);
              if (metrics.width > maxRightTextWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push(line.trim());

            if (lines.length <= maxLines) {
              break; // Fits perfectly!
            }
            currentTextSize -= 1; // Shrink and try again
          }

          // Fallback: If it's a massive paragraph, cap it and add "..."
          if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            let lastLine = lines[maxLines - 1];
            while (ctx.measureText(lastLine + "...").width > maxRightTextWidth && lastLine.length > 0) {
              lastLine = lastLine.slice(0, -1);
            }
            lines[maxLines - 1] = lastLine.trim() + "...";
          }

          // Finally, draw the properly sized and wrapped text
          ctx.font = `500 ${currentTextSize}px "Lexend", sans-serif`;
          ctx.fillStyle = "#475569"; 
          const lineHeight = currentTextSize * 1.2;

          if (lines.length === 1) {
            ctx.fillText(lines[0], textStartOffset, y);
          } else {
            const startY = y - (lineHeight * 0.45); // Shift up so both lines stay vertically centered on icon
            ctx.fillText(lines[0], textStartOffset, startY);
            ctx.fillText(lines[1], textStartOffset, startY + lineHeight);
          }
        };

        drawVectorRow(iconLocation, shopInfo?.address || "Location not provided", 1);
        drawVectorRow(iconEmail, shopInfo?.email || "Email not provided", 2);
        drawVectorRow(iconPhone, shopInfo?.phone || "Phone not provided", 3);


        // ==========================================
        // ✨ MALAYALAM CALL-TO-ACTION BOX ✨
        // ==========================================
        const callBoxWidth = imgWidth * 0.65;
        const callBoxX = (imgWidth - callBoxWidth) / 2;
        const callBoxY = imgHeight; 

        // Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = "#fde047"; // Richer Amber Gold color
        const radius = Math.max(15, imgWidth * 0.03);
        
        ctx.beginPath();
        ctx.moveTo(callBoxX, bannerStartY); 
        ctx.lineTo(callBoxX, callBoxY + radius); 
        ctx.quadraticCurveTo(callBoxX, callBoxY, callBoxX + radius, callBoxY); 
        ctx.lineTo(callBoxX + callBoxWidth - radius, callBoxY); 
        ctx.quadraticCurveTo(callBoxX + callBoxWidth, callBoxY, callBoxX + callBoxWidth, callBoxY + radius); 
        ctx.lineTo(callBoxX + callBoxWidth, bannerStartY); 
        ctx.closePath();
        ctx.fill();
        ctx.restore(); 

        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let malSize = Math.max(18, callBoxHeight * 0.26);
        ctx.font = `900 ${malSize}px "Noto Sans Malayalam", "Lexend", sans-serif`;
        
        const textLine1 = "എല്ലാവിധ ഓൺലൈൻ";
        const textLine2 = "സേവനങ്ങൾക്കും സമീപിക്കുക";
        
        const maxMalTextWidth = callBoxWidth * 0.9;
        let text2Width = ctx.measureText(textLine2).width;
        if (text2Width > maxMalTextWidth) {
          malSize = malSize * (maxMalTextWidth / text2Width);
          ctx.font = `900 ${malSize}px "Noto Sans Malayalam", "Lexend", sans-serif`;
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