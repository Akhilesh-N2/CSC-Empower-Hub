import React, { useState } from 'react';

function TestCloudinary() {
    const [status, setStatus] = useState("Waiting for file...");
    const [imageUrl, setImageUrl] = useState("");

    const uploadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus("Uploading to Cloudinary...");
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                { method: "POST", body: formData }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message);
            
            setStatus("Success! 🎉");
            setImageUrl(data.secure_url);
        } catch (error) {
            setStatus("Error: " + error.message);
        }
    };

    return (
        <div style={{ padding: '50px', border: '5px solid #2563eb', margin: '20px', backgroundColor: 'white', zIndex: 9999, position: 'relative' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>🧪 Cloudinary Test</h2>
            <p><strong>Status:</strong> {status}</p>
            
            <input type="file" onChange={uploadFile} style={{ marginTop: '20px', marginBottom: '20px', display: 'block' }} />
            
            {imageUrl && (
                <div>
                    <p className="text-green-600 font-bold mb-2">It worked! Here is your link:</p>
                    <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color: 'blue', wordBreak: 'break-all' }}>{imageUrl}</a>
                    <br/><br/>
                    <img src={imageUrl} alt="Uploaded test" style={{ maxWidth: '300px', borderRadius: '8px' }} />
                </div>
            )}
        </div>
    );
}

export default TestCloudinary;