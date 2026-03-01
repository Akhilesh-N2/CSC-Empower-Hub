export const downloadWatermarkedPoster = async (posterUrl, shopDetails, posterTitle) => {
    try {
        // 1. Fetch the image as a Blob to bypass CORS (Cross-Origin) canvas restrictions
        const response = await fetch(posterUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.src = objectUrl;

        img.onload = () => {
            // Calculate banner dimensions based on the original image size
            // Makes the strip exactly 12% of the image height, but ensures it's at least 100px
            const bannerHeight = Math.max(img.height * 0.12, 100); 

            // 2. EXTEND THE CANVAS HEIGHT (Original Image + New Bottom Strip)
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height + bannerHeight; 
            const ctx = canvas.getContext("2d");

            // 3. Draw the original poster EXACTLY as it is, starting at the very top (0,0)
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // 4. Create a clean, solid white banner at the very bottom
            const bannerY = img.height; // Starts exactly where the image ends
            ctx.fillStyle = "#ffffff"; // Solid white background
            ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

            // Optional: Draw a very thin subtle grey line to separate the poster from the banner
            ctx.fillStyle = "#f1f5f9"; 
            ctx.fillRect(0, bannerY, canvas.width, 4);

            // 5. Setup Typography sizing so it looks "just right"
            const titleFontSize = Math.floor(bannerHeight * 0.30); // Clean, bold size
            const addressFontSize = Math.floor(bannerHeight * 0.18); // Smaller, subtle size

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // 6. Draw the Shop Name (Just the name, dark slate color)
            ctx.fillStyle = "#0f172a"; // Slate-900
            ctx.font = `900 ${titleFontSize}px Arial, sans-serif`;
            const shopName = shopDetails?.shop_name 
                ? shopDetails.shop_name.toUpperCase() 
                : "AUTHORIZED PARTNER";
                
            ctx.fillText(shopName, canvas.width / 2, bannerY + (bannerHeight * 0.40));

            // 7. Draw the Address & Phone (Slate grey color)
            ctx.fillStyle = "#64748b"; // Slate-500
            ctx.font = `600 ${addressFontSize}px Arial, sans-serif`;
            
            let subText = [];
            if (shopDetails?.address) subText.push(shopDetails.address);
            if (shopDetails?.phone) subText.push(`Ph: ${shopDetails.phone}`);
            
            ctx.fillText(subText.join("  •  "), canvas.width / 2, bannerY + (bannerHeight * 0.72));

            // 8. Convert Canvas to a downloadable image file
            const finalImageUrl = canvas.toDataURL("image/jpeg", 0.95); // High quality JPEG
            
            // Trigger the download
            const link = document.createElement("a");
            const cleanTitle = (posterTitle || "Poster").replace(/\s+/g, "_");
            link.download = `${cleanTitle}_${shopDetails?.shop_name?.replace(/\s+/g, '_') || "Shop"}.jpg`;
            link.href = finalImageUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up memory
            URL.revokeObjectURL(objectUrl);
        };

        img.onerror = () => {
            throw new Error("Failed to load image onto canvas.");
        };

    } catch (error) {
        console.error("Watermark generation failed:", error);
        // Fallback: If canvas manipulation fails, just download the raw image normally
        window.open(posterUrl, '_blank');
    }
};