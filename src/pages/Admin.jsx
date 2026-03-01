import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FileText, Image, Users, Megaphone, Activity, Loader } from "lucide-react";

import AdminContentManager from "../components/admin/AdminContentManager";
import AdminCarouselManager from "../components/admin/AdminCarouselManager";
import AdminUserManager from "../components/admin/AdminUserManager";
import AdminPosterManager from "../components/admin/AdminPosterManager";

const DEFAULT_IMAGE = "https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image+Available";

const isVideo = (url) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) !== null;
};

const formatFolderName = (title) => {
  if (!title || title.trim() === "") return "Untitled";
  return title.trim().replace(/[^a-zA-Z0-9 \-]/g, "").replace(/\s+/g, "_");
};

const uploadToCloudinary = async (file, folderName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  if (folderName) formData.append("folder", folderName);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error.message);
  if (file.type === "application/pdf") return data.secure_url;
  return data.secure_url.replace("/upload/", "/upload/q_auto,f_auto/");
};

function Admin({ currentUser }) {
  const [schemes, setSchemes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [carouselSlides, setCarouselSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seekerDetails, setSeekerDetails] = useState([]);
  const [providerDetails, setProviderDetails] = useState([]);
  const [shopDetails, setShopDetails] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cards");

  const fetchData = async () => {
    if (schemes.length === 0) setLoading(true);
    try {
      const [schemesData, jobsData, usersData, slidesData, catsData, seekersData, providersData, shopsData] = await Promise.all([
        supabase.from("schemes").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("slides").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("seeker_profiles").select("*"),
        supabase.from("provider_profiles").select("*"),
        supabase.from("shop_profiles").select("*, device_limit"),
      ]);

      if (seekersData?.data) setSeekerDetails(seekersData.data);
      if (providersData?.data) setProviderDetails(providersData.data);
      if (shopsData?.data) setShopDetails(shopsData.data);
      if (schemesData?.data) setSchemes(schemesData.data);
      if (jobsData?.data) setJobs(jobsData.data);
      if (usersData?.data) setUsers(usersData.data);
      if (slidesData?.data) setCarouselSlides(slidesData.data);
      if (catsData?.data) setCategories(catsData.data.map((c) => c.name));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 md:h-screen md:sticky top-0 z-30 shadow-md md:shadow-none">
        <div className="p-4 md:p-6 text-xl md:text-2xl font-black border-b border-slate-800 flex justify-between items-center tracking-tight">
          <span>Admin Hub</span>
        </div>
        <nav className="flex flex-row md:flex-col p-3 md:p-4 gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x w-full">
          <button onClick={() => setActiveTab("cards")} className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "cards" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <FileText size={18} /> <span className="whitespace-nowrap">Content</span>
          </button>
          <button onClick={() => setActiveTab("carousel")} className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "carousel" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Image size={18} /> <span className="whitespace-nowrap">Carousel</span>
          </button>
          <button onClick={() => setActiveTab("users")} className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "users" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Users size={18} /> <span className="whitespace-nowrap">Users</span>
          </button>
          <button onClick={() => setActiveTab("posters")} className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "posters" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Megaphone size={18} /> <span className="whitespace-nowrap">Posters</span>
          </button>
          {currentUser?.email === "manoj@gmail.com" && (
            <>
              <div className="hidden md:block mt-auto pt-6 border-t border-slate-800 "><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2">Developer Tools</div></div>
              <Link to="/dev-stats" className="snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-all group md:mb-4">
                <div className="md:p-1.5 md:bg-slate-900 rounded-lg group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all"><Activity size={16} /></div>
                <span className="text-sm font-bold tracking-tight whitespace-nowrap">Engine Room</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <Loader className="animate-spin mr-2" /> Loading Dashboard...
          </div>
        ) : (
          <>
            {activeTab === "cards" && <AdminContentManager schemes={schemes} categories={categories} fetchData={fetchData} uploadToCloudinary={uploadToCloudinary} formatFolderName={formatFolderName} defaultImage={DEFAULT_IMAGE} />}
            {activeTab === "carousel" && <AdminCarouselManager carouselSlides={carouselSlides} fetchData={fetchData} uploadToCloudinary={uploadToCloudinary} isVideo={isVideo} />}
            {activeTab === "users" && <AdminUserManager users={users} jobs={jobs} seekerDetails={seekerDetails} providerDetails={providerDetails} shopDetails={shopDetails} fetchData={fetchData} />}
            {activeTab === "posters" && <AdminPosterManager schemes={schemes} fetchData={fetchData} uploadToCloudinary={uploadToCloudinary} formatFolderName={formatFolderName} />}
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;