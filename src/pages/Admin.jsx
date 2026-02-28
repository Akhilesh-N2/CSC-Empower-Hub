import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  UploadCloud,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Loader,
  Activity,
  User,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  Phone,
  GraduationCap,
  FileText,
  Image,
  Users,
  Megaphone,
  Store, // <-- Added Store icon for Shops
} from "lucide-react";

// A placeholder image to use if the user doesn't upload one
const DEFAULT_IMAGE =
  "https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image+Available";

const isVideo = (url) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) !== null;
};

// Helper to create safe Cloudinary folder names from user titles
const formatFolderName = (title) => {
  if (!title || title.trim() === "") return "Untitled";
  return title
    .trim()
    .replace(/[^a-zA-Z0-9 \-]/g, "")
    .replace(/\s+/g, "_");
};

// Add this helper function to your Admin panel
const getUsageEstimate = async () => {
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: jobCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true });

  const estimatedDataSize = userCount * 0.5 + jobCount * 2;

  return {
    users: userCount,
    jobs: jobCount,
    estSizeKB: estimatedDataSize.toFixed(2),
  };
};

const uploadToCloudinary = async (file, folderName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  );

  if (folderName) {
    formData.append("folder", folderName);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error.message);

  if (file.type === "application/pdf") {
    return data.secure_url;
  }

  const optimizedUrl = data.secure_url.replace(
    "/upload/",
    "/upload/q_auto,f_auto/",
  );

  return optimizedUrl;
};

const DetailBox = ({ label, value, highlight }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
      {label}
    </span>
    <span
      className={`text-sm ${highlight ? "text-blue-600 font-black" : "text-gray-800 font-semibold"}`}
    >
      {value || "Not Provided"}
    </span>
  </div>
);

function Admin({ currentUser }) {
  // --- 1. DATA STATE ---
  const [schemes, setSchemes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [carouselSlides, setCarouselSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 2. ORIGINAL UI STATE ---
  const [pdfUploading, setPdfUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [slideImageUploading, setSlideImageUploading] = useState(false);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [posterUploading, setPosterUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("cards");

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- SEARCH & FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  // --- STATE FOR POSTERS ---
  const [posterTitle, setPosterTitle] = useState("");
  const [posterImage, setPosterImage] = useState("");

  const [jobsLoading, setJobsLoading] = useState(false);

  // --- PHASE 3 ADMIN STATES ---
  const [seekerDetails, setSeekerDetails] = useState([]);
  const [providerDetails, setProviderDetails] = useState([]);
  const [shopDetails, setShopDetails] = useState([]); // NEW: State for shops
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  const [userSubTab, setUserSubTab] = useState("seekers"); // 'seekers' | 'providers' | 'shops'

  // --- 3. FETCH DATA FUNCTION ---
  const fetchData = async () => {
    if (schemes.length === 0) setLoading(true);

    try {
      const [
        schemesData,
        jobsData,
        usersData,
        slidesData,
        catsData,
        seekersData,
        providersData,
        shopsData, // NEW: Fetch shop data
      ] = await Promise.all([
        supabase
          .from("schemes")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("slides")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true }),
        supabase.from("seeker_profiles").select("*"),
        supabase.from("provider_profiles").select("*"),
        supabase.from("shop_profiles").select("*"), // Fetch shops
      ]);

      if (seekersData?.data) setSeekerDetails(seekersData.data);
      if (providersData?.data) setProviderDetails(providersData.data);
      if (shopsData?.data) {
        console.log("SHOPS DATA FETCHED:", shopsData.data); // <-- ADD THIS
        setShopDetails(shopsData.data);
      }

      console.log("ALL USERS:", usersData.data); // <-- AND THIS // Set shops

      if (schemesData.data) setSchemes(schemesData.data);
      if (jobsData.data) setJobs(jobsData.data);
      if (usersData.data) setUsers(usersData.data);
      if (slidesData.data) setCarouselSlides(slidesData.data);
      if (catsData.data) setCategories(catsData.data.map((c) => c.name));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSearchTerm("");
    setFilterCategory("");
    setFilterType("");
    setCurrentPage(1);
  }, [activeTab, userSubTab]); // Reset pagination when sub-tabs change

  // --- FILTER & PAGINATION LOGIC ---
  const filteredContent = schemes.filter((s) => {
    if (s.category === "Poster") return false;
    const matchesSearch = s.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "" || s.category === filterCategory;
    const matchesType = filterType === "" || s.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- UPDATED USERS FILTER ---
  const roleMap = { seekers: "seeker", providers: "provider", shops: "shop" };
  const usersByRole = users.filter((u) => u.role === roleMap[userSubTab]);
  const filteredUsers = usersByRole.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredContent.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

  const indexOfLastJob = currentPage * itemsPerPage;
  const indexOfFirstJob = indexOfLastJob - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalJobPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // --- ACTION HANDLERS ---
  const toggleJobStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setJobs(
      jobs.map((j) => (j.id === id ? { ...j, is_active: newStatus } : j)),
    );
    await supabase
      .from("jobs")
      .update({ is_active: newStatus, admin_override: !newStatus })
      .eq("id", id);
    fetchData();
  };

  const deleteJob = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this job permanently?")
    )
      return;
    await supabase.from("jobs").delete().eq("id", id);
    fetchData();
  };

  const [newCategoryInput, setNewCategoryInput] = useState("");

  const handleAddCategory = async () => {
    if (newCategoryInput.trim() !== "") {
      if (!categories.includes(newCategoryInput)) {
        try {
          const { error } = await supabase
            .from("categories")
            .insert([{ name: newCategoryInput }]);
          if (error) throw error;
          alert(`Category "${newCategoryInput}" added!`);
          setNewCategoryInput("");
          fetchData();
        } catch (error) {
          alert("Error adding category: " + error.message);
        }
      } else {
        alert("Category already exists!");
      }
    }
  };

  const handleDeleteCategory = async () => {
    const categoryToDelete = currentScheme.category;
    if (!categoryToDelete) return alert("Please select a category first.");
    if (window.confirm(`Delete category "${categoryToDelete}" permanently?`)) {
      try {
        await supabase.from("categories").delete().eq("name", categoryToDelete);
        setCurrentScheme({ ...currentScheme, category: "" });
        fetchData();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [currentScheme, setCurrentScheme] = useState({
    id: null,
    title: "",
    category: "",
    type: "scheme",
    description: "",
    image: "",
    visitUrl: "",
    downloadUrl: "",
    active: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentScheme({
      ...currentScheme,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handlePdfUpload = async (e) => {
    if (!currentScheme.category) {
      e.target.value = "";
      return alert(
        "Please select a Category first so we can organize the file!",
      );
    }
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf")
      return alert("Please upload a PDF.");

    setPdfUploading(true);
    try {
      const safeCategory = formatFolderName(currentScheme.category);
      const targetFolder =
        currentScheme.type === "form"
          ? `Forms/${safeCategory}`
          : `Schemes/${safeCategory}`;
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setCurrentScheme((prev) => ({ ...prev, downloadUrl: secureUrl }));
      alert(`PDF safely stored in Cloudinary folder: ${targetFolder}`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    if (!currentScheme.category) {
      e.target.value = "";
      return alert(
        "Please select a Category first so we can organize the image!",
      );
    }
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/"))
      return alert("Please upload an image.");

    setImageUploading(true);
    try {
      const safeCategory = formatFolderName(currentScheme.category);
      const targetFolder =
        currentScheme.type === "form"
          ? `Forms/${safeCategory}`
          : `Schemes/${safeCategory}`;
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setCurrentScheme((prev) => ({ ...prev, image: secureUrl }));
      alert(`Image safely stored in Cloudinary folder: ${targetFolder}`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentScheme.type === "form" && !currentScheme.downloadUrl) {
      return alert("PDF is mandatory for downloadable forms.");
    }

    const schemeFields = {
      title: currentScheme.title,
      category: currentScheme.category,
      type: currentScheme.type,
      description: currentScheme.description,
      image: currentScheme.image || DEFAULT_IMAGE,
      visitUrl: currentScheme.visitUrl,
      downloadUrl: currentScheme.downloadUrl,
      active: currentScheme.active,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("schemes")
          .update(schemeFields)
          .eq("id", currentScheme.id);
        if (error) throw error;
        alert("Item updated successfully!");
        setIsEditing(false);
      } else {
        const { error } = await supabase.from("schemes").insert([schemeFields]);
        if (error) throw error;
        alert("New item added to database!");
      }
      setCurrentScheme({
        id: null,
        title: "",
        category: "",
        type: "scheme",
        description: "",
        image: "",
        visitUrl: "",
        downloadUrl: "",
        active: true,
      });
      fetchData();
    } catch (error) {
      console.error("Database Error details:", error);
      alert("Database Error: " + (error.details || error.message));
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm("Permanently delete this item?")) return;
    await supabase.from("schemes").delete().eq("id", id);
    fetchData();
  };

  const toggleContentActive = async (id, currentStatus) => {
    await supabase
      .from("schemes")
      .update({ active: !currentStatus })
      .eq("id", id);
    fetchData();
  };

  const handleEdit = (scheme) => {
    setCurrentScheme(scheme);
    setIsEditing(true);
  };

  const [currentSlide, setCurrentSlide] = useState({
    id: null,
    title: "",
    description: "",
    image: "",
    link: "",
    duration: 5000,
    object_fit: "cover",
  });

  const handleSlideInput = (e) =>
    setCurrentSlide({ ...currentSlide, [e.target.name]: e.target.value });

  const handleSlideImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSlideImageUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file, "Carousel");
      setCurrentSlide((prev) => ({ ...prev, image: secureUrl }));
      alert("Media Uploaded securely to Cloudinary!");
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setSlideImageUploading(false);
    }
  };

  const handleSlideSubmit = async (e) => {
    e.preventDefault();
    if (!currentSlide.image)
      return alert(
        "Please wait for the image to upload or select a file first!",
      );
    const { id, ...slideData } = currentSlide;
    const finalData = {
      ...slideData,
      duration: parseInt(slideData.duration) || 5000,
    };
    try {
      if (isEditingSlide) {
        const { error } = await supabase
          .from("slides")
          .update(finalData)
          .eq("id", id);
        if (error) throw error;
        alert("Slide updated successfully!");
      } else {
        const { error } = await supabase.from("slides").insert([finalData]);
        if (error) throw error;
        alert("Slide added successfully!");
      }
      cancelSlideEdit();
      fetchData();
    } catch (error) {
      console.error("Supabase Rejection Details:", error);
      alert(
        `Database Error: ${error.message || error.details || "Check the Inspect Element Console"}`,
      );
    }
  };

  const deleteSlide = async (id) => {
    if (window.confirm("Delete this slide?")) {
      await supabase.from("slides").delete().eq("id", id);
      fetchData();
    }
  };

  const handleEditSlide = (slide) => {
    setCurrentSlide(slide);
    setIsEditingSlide(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSlideEdit = () => {
    setIsEditingSlide(false);
    setCurrentSlide({
      id: null,
      title: "",
      description: "",
      image: "",
      link: "",
      duration: 5000,
      object_fit: "cover",
    });
  };

  const toggleUserApproval = async (id, currentStatus) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_approved: !currentStatus })
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Supabase RLS Policy blocked the update!");

      const updatedUser = {
        ...users.find((u) => u.id === id),
        is_approved: !currentStatus,
      };
      setUsers(users.map((u) => (u.id === id ? updatedUser : u)));
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser(updatedUser);
      }
    } catch (err) {
      alert("Database failed to approve user: " + err.message);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (
      !window.confirm(
        `🚨 WARNING: Are you absolutely sure you want to permanently delete ${email}? \n\nThis will wipe their login, profile, and all jobs they posted. This CANNOT be undone.`,
      )
    )
      return;

    try {
      // Trigger the secure RPC function we built in the Supabase SQL editor
      const { error } = await supabase.rpc("delete_user", { user_id: id });

      if (error) throw error;

      alert("User completely wiped from the system.");
      setSelectedUser(null); // Close the dossier view
      fetchData(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Error deleting user: " + err.message);
    }
  };

  const handlePosterUpload = async (e) => {
    if (!posterTitle) {
      e.target.value = "";
      return alert(
        "Please enter a Poster Title first so we can organize the image!",
      );
    }
    const file = e.target.files[0];
    if (!file) return;
    setPosterUploading(true);
    try {
      const safeTitle = formatFolderName(posterTitle);
      const targetFolder = `Posters/${safeTitle}`;
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setPosterImage(secureUrl);
      alert(`Poster safely stored in Cloudinary folder: ${targetFolder}`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setPosterUploading(false);
    }
  };

  const handlePosterSubmit = async (e) => {
    e.preventDefault();
    if (!posterImage) return alert("Please upload an image.");
    await supabase.from("schemes").insert([
      {
        title: posterTitle,
        category: "Poster",
        type: "scheme",
        image: posterImage,
        active: true,
        description: "Awareness Poster",
      },
    ]);
    alert("Poster published!");
    setPosterTitle("");
    setPosterImage("");
    fetchData();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* RESPONSIVE NAV */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 md:h-screen md:sticky top-0 z-30 shadow-md md:shadow-none">
        <div className="p-4 md:p-6 text-xl md:text-2xl font-black border-b border-slate-800 flex justify-between items-center tracking-tight">
          <span>Admin Hub</span>
        </div>

        <nav className="flex flex-row md:flex-col p-3 md:p-4 gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x w-full">
          <button
            onClick={() => setActiveTab("cards")}
            className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "cards" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <FileText size={18} />{" "}
            <span className="whitespace-nowrap">Content</span>
          </button>
          <button
            onClick={() => setActiveTab("carousel")}
            className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "carousel" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Image size={18} />{" "}
            <span className="whitespace-nowrap">Carousel</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "users" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users size={18} /> <span className="whitespace-nowrap">Users</span>
          </button>
          <button
            onClick={() => setActiveTab("posters")}
            className={`snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-semibold text-sm md:text-base ${activeTab === "posters" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Megaphone size={18} />{" "}
            <span className="whitespace-nowrap">Posters</span>
          </button>

          {currentUser?.email === "manoj@gmail.com" && (
            <>
              <div className="hidden md:block mt-auto pt-6 border-t border-slate-800 ">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2">
                  Developer Tools
                </div>
              </div>
              <Link
                to="/dev-stats"
                className="snap-center shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-all group md:mb-4"
              >
                <div className="md:p-1.5 md:bg-slate-900 rounded-lg group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all">
                  <Activity size={16} />
                </div>
                <span className="text-sm font-bold tracking-tight whitespace-nowrap">
                  Engine Room
                </span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <Loader className="animate-spin mr-2" /> Loading Dashboard...
          </div>
        ) : (
          <>
            {/* --- TAB 1: CONTENT CARDS --- */}
            {activeTab === "cards" && (
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                  Content Management
                </h2>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                  <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">
                    {isEditing ? "Edit Item" : "Add New Item"}
                  </h3>
                  <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                  >
                    <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <label className="block text-sm font-bold text-blue-800 mb-2">
                        Display Type
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                          <input
                            type="radio"
                            name="type"
                            value="scheme"
                            checked={currentScheme.type === "scheme"}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-blue-600"
                          />
                          <div>
                            <span className="block font-medium text-gray-800">
                              Useful Links
                            </span>
                            <span className="block text-xs text-gray-500">
                              (Home Page)
                            </span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                          <input
                            type="radio"
                            name="type"
                            value="form"
                            checked={currentScheme.type === "form"}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-blue-600"
                          />
                          <div>
                            <span className="block font-medium text-gray-800">
                              Downloadable Form
                            </span>
                            <span className="block text-xs text-gray-500">
                              (Forms Library)
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        required
                        value={currentScheme.title}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <div className="flex gap-2 mb-2">
                        <select
                          name="category"
                          required
                          value={currentScheme.category}
                          onChange={handleInputChange}
                          className="flex-1 p-2 border rounded-lg bg-white"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat, index) => (
                            <option key={index} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleDeleteCategory}
                          className="bg-red-100 text-red-600 px-3 rounded-lg border border-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New Category"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows="3"
                        value={currentScheme.description}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      ></textarea>
                    </div>

                    {currentScheme.type === "scheme" && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scheme Image
                        </label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="w-full">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {imageUploading && (
                              <span className="text-sm text-blue-600 animate-pulse">
                                ⏳ Uploading...
                              </span>
                            )}
                          </div>
                          {currentScheme.image && (
                            <img
                              src={currentScheme.image}
                              alt="Preview"
                              className="w-16 h-16 rounded border object-cover"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visit Link
                      </label>
                      <input
                        type="url"
                        name="visitUrl"
                        value={currentScheme.visitUrl}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-lg outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload PDF{" "}
                        {currentScheme.type === "form" && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {pdfUploading && (
                        <span className="text-sm text-blue-600 animate-pulse">
                          ⏳ Uploading...
                        </span>
                      )}
                      {currentScheme.downloadUrl && (
                        <div className="text-xs text-green-700 mt-1 break-all">
                          ✓ Attached
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <input
                        type="checkbox"
                        name="active"
                        checked={currentScheme.active}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <label className="text-gray-700 font-medium">
                        Make this active immediately?
                      </label>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        {isEditing ? "Update Item" : "Add Item"}
                      </button>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setCurrentScheme({
                              id: null,
                              title: "",
                              category: "",
                              type: "scheme",
                              description: "",
                              image: "",
                              visitUrl: "",
                              downloadUrl: "",
                              active: true,
                            });
                          }}
                          className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search by Title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="relative md:w-1/4">
                    <Filter
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={18}
                    />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                    >
                      <option value="">All Types</option>
                      <option value="scheme">Useful Links</option>
                      <option value="form">Forms (PDFs)</option>
                    </select>
                  </div>
                  <div className="relative md:w-1/4">
                    <Filter
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={18}
                    />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold">
                        <tr>
                          <th className="p-4">Type</th>
                          <th className="p-4">Title</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${s.type === "form" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                              >
                                {s.type ? s.type.toUpperCase() : "SCHEME"}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-gray-900">
                              {s.title}
                            </td>
                            <td className="p-4 text-gray-600">{s.category}</td>
                            <td className="p-4 flex gap-2">
                              <button
                                onClick={() =>
                                  toggleContentActive(s.id, s.active)
                                }
                                className={`px-3 py-1 rounded-full text-xs font-bold ${s.active ? "bg-green-100 text-green-700 hover:bg-green-300" : "bg-red-100 text-red-700 hover:bg-red-300"}`}
                              >
                                {s.active ? "ACTIVE" : "INACTIVE"}
                              </button>
                              <button
                                onClick={() => handleEdit(s)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteContent(s.id)}
                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredContent.length === 0 && (
                          <tr>
                            <td
                              colSpan="4"
                              className="p-6 text-center text-gray-500"
                            >
                              No content found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredContent.length > itemsPerPage && (
                    <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
                      <span className="text-xs text-gray-500 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB 2: CAROUSEL --- */}
            {activeTab === "carousel" && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                  Carousel Manager
                </h2>
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Add New Slide
                  </h3>
                  <form
                    onSubmit={handleSlideSubmit}
                    className="grid grid-cols-1 gap-4"
                  >
                    <input
                      type="text"
                      name="title"
                      placeholder="Slide Title"
                      required
                      value={currentSlide.title}
                      onChange={handleSlideInput}
                      className="p-2 border rounded-lg w-full"
                    />
                    <input
                      type="text"
                      name="description"
                      placeholder="Short Description (Optional)"
                      value={currentSlide.description}
                      onChange={handleSlideInput}
                      className="p-2 border rounded-lg w-full"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Slide Image (Optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*, video/*"
                          onChange={handleSlideImageUpload}
                          className="block w-full text-sm text-gray-500"
                        />
                        {slideImageUploading && (
                          <p className="text-sm text-blue-600 mt-2 animate-pulse">
                            Uploading...
                          </p>
                        )}
                        {currentSlide.image && (
                          <div className="mt-2">
                            <p className="text-xs text-green-600 mb-1">
                              ✓ Media Attached
                            </p>
                            {isVideo(currentSlide.image) ? (
                              <video
                                src={currentSlide.image}
                                className={`h-20 rounded border ${currentSlide.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                                muted
                                autoPlay
                                loop
                              />
                            ) : (
                              <img
                                src={currentSlide.image}
                                alt="Preview"
                                className={`h-20 rounded border ${currentSlide.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-bold text-blue-800 mb-2">
                          Image Scaling
                        </label>
                        <select
                          name="object_fit"
                          value={currentSlide.object_fit}
                          onChange={handleSlideInput}
                          className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="cover">Crop to Fill (Cover)</option>
                          <option value="contain">
                            Show Whole Image (Contain)
                          </option>
                        </select>
                        <p className="text-[10px] text-blue-600 mt-2 italic">
                          * Use 'Show Whole' for posters or images with
                          important text on the edges.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        name="link"
                        placeholder="Link (Optional)"
                        value={currentSlide.link}
                        onChange={handleSlideInput}
                        className="p-2 border rounded w-full"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="duration"
                          placeholder="5000"
                          value={currentSlide.duration}
                          onChange={handleSlideInput}
                          className="p-2 border rounded w-full"
                          min="1000"
                          step="500"
                        />
                        <span className="text-sm text-gray-500">ms</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-fit font-bold"
                    >
                      Add Slide
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {carouselSlides.map((s) => (
                    <div
                      key={s.id}
                      className="relative group rounded-xl overflow-hidden shadow h-48 bg-slate-200 border border-gray-300"
                    >
                      {isVideo(s.image) ? (
                        <video
                          src={s.image}
                          className={`w-full h-full ${s.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                          muted
                          autoPlay
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={s.image}
                          className={`w-full h-full ${s.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                          alt="Slide"
                        />
                      )}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm border border-white/20">
                          {s.object_fit === "contain" ? "Whole" : "Cropped"}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button
                          onClick={() => handleEditSlide(s)}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg"
                          title="Edit Slide"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteSlide(s.id)}
                          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                          title="Delete Slide"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent text-white w-full p-4">
                        <p className="font-bold truncate text-sm">
                          {s.title || "Untitled"}
                        </p>
                        <p className="text-[10px] text-gray-300">
                          Duration: {s.duration}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB 4: USERS --- */}
            {activeTab === "users" && (
              <div className="max-w-6xl mx-auto">
                {!selectedUser ? (
                  /* --- VIEW A: THE USER LIST --- */
                  <div className="animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                          User Directory
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                          Manage platform access and review profiles.
                        </p>
                      </div>

                      {/* Professional Segmented Control */}
                      <div className="inline-flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/60 w-full md:w-fit overflow-x-auto no-scrollbar">
                        <button
                          onClick={() => {
                            setUserSubTab("seekers");
                            setCurrentPage(1);
                          }}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "seekers" ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          <GraduationCap size={16} /> Job Seekers
                          <span
                            className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "seekers" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            {users.filter((u) => u.role === "seeker").length}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setUserSubTab("providers");
                            setCurrentPage(1);
                          }}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "providers" ? "bg-white text-purple-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          <Briefcase size={16} /> Providers
                          <span
                            className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "providers" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            {users.filter((u) => u.role === "provider").length}
                          </span>
                        </button>
                        {/* NEW: SHOPS TAB BUTTON */}
                        <button
                          onClick={() => {
                            setUserSubTab("shops");
                            setCurrentPage(1);
                          }}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${userSubTab === "shops" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          <Store size={16} /> Shops
                          <span
                            className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] ${userSubTab === "shops" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            {users.filter((u) => u.role === "shop").length}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mb-6 relative max-w-md">
                      <Search
                        className="absolute left-4 top-3 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder={`Search ${userSubTab} by email...`}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                      />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
                      <div className="overflow-x-auto w-full rounded-2xl">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                            <tr>
                              <th className="p-4 md:p-5">Account Details</th>
                              <th className="p-4 md:p-5">Status</th>
                              <th className="p-4 md:p-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentUsers.map((user) => (
                              <tr
                                key={user.id}
                                className="hover:bg-slate-50/80 transition-colors group"
                              >
                                <td className="p-4 md:p-5">
                                  <div className="flex items-center gap-3 md:gap-4">
                                    <div
                                      className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner
                                      ${user.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : user.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
                                    >
                                      {user.email.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs md:text-sm">
                                        {user.email}
                                      </div>
                                      <div className="text-[10px] md:text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">
                                        ID: {user.id.slice(0, 8)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 md:p-5">
                                  <div
                                    className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border ${
                                      user.is_approved
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    {user.is_approved ? (
                                      <CheckCircle2
                                        size={12}
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <AlertCircle
                                        size={12}
                                        className="text-amber-500"
                                      />
                                    )}
                                    {user.is_approved ? "Verified" : "Pending"}
                                  </div>
                                </td>
                                <td className="p-4 md:p-5 text-right">
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                  >
                                    View Dossier
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {currentUsers.length === 0 && (
                              <tr>
                                <td colSpan="3" className="p-10 text-center">
                                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                    <Search size={20} />
                                  </div>
                                  <h3 className="text-slate-900 font-bold text-base">
                                    No accounts found
                                  </h3>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* --- PAGINATION CONTROLS --- */}
                    {totalUserPages > 1 && (
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs text-slate-500 font-bold">
                          Page{" "}
                          <span className="text-slate-900">{currentPage}</span>{" "}
                          / {totalUserPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalUserPages}
                            className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* --- VIEW B: THE DEDICATED REVIEW SECTION --- */
                  <div className="animate-in slide-in-from-right duration-300">
                    {/* DOSSIER HEADER ACTIONS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-200 pb-4 md:pb-6">
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 hover:text-blue-600 font-bold transition group w-full sm:w-fit text-sm bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm"
                      >
                        <ChevronLeft
                          size={18}
                          className="group-hover:-translate-x-1 transition-transform"
                        />
                        Back to Directory
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Permanently delete this account? This action cannot be undone.",
                            )
                          ) {
                            handleDeleteUser(
                              selectedUser.id,
                              selectedUser.email,
                            );
                            setSelectedUser(null);
                          }
                        }}
                        className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition w-full sm:w-fit"
                      >
                        <Trash2 size={16} /> Delete Account
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                      {/* LEFT COLUMN: IDENTITY & STATUS CARD */}
                      <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 w-full h-2 ${selectedUser.role === "seeker" ? "bg-blue-500" : selectedUser.role === "provider" ? "bg-purple-500" : "bg-emerald-500"}`}
                          ></div>

                          <div className="flex flex-col items-center text-center mt-2 mb-6">
                            <div
                              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-lg mb-4 transform rotate-3
                              ${selectedUser.role === "seeker" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : selectedUser.role === "provider" ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}
                            >
                              <span className="-rotate-3">
                                {selectedUser.email
                                  .substring(0, 1)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <h3
                              className="text-lg md:text-xl font-black text-slate-900 w-full truncate px-2"
                              title={selectedUser.email}
                            >
                              {(() => {
                                const d =
                                  selectedUser.role === "seeker"
                                    ? seekerDetails.find(
                                        (s) => s.id === selectedUser.id,
                                      )
                                    : selectedUser.role === "provider"
                                      ? providerDetails.find(
                                          (p) => p.id === selectedUser.id,
                                        )
                                      : shopDetails.find(
                                          (s) => s.id === selectedUser.id,
                                        );
                                return (
                                  d?.full_name ||
                                  d?.company_name ||
                                  d?.shop_name ||
                                  "Name Not Provided"
                                );
                              })()}
                            </h3>
                            <p className="text-slate-500 text-xs md:text-sm mt-1">
                              {selectedUser.email}
                            </p>

                            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600">
                              <User size={14} /> {selectedUser.role}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-6">
                            <button
                              onClick={() =>
                                toggleUserApproval(
                                  selectedUser.id,
                                  selectedUser.is_approved,
                                )
                              }
                              className={`w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest shadow-md transition-all ${
                                selectedUser.is_approved
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {selectedUser.is_approved ? (
                                <>
                                  {" "}
                                  <AlertCircle size={16} /> Revoke Approval{" "}
                                </>
                              ) : (
                                <>
                                  {" "}
                                  <CheckCircle2 size={16} /> Approve User{" "}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: DETAILED DOSSIER */}
                      <div className="lg:col-span-2 space-y-6">
                        {(() => {
                          const details =
                            selectedUser.role === "seeker"
                              ? seekerDetails.find(
                                  (s) => s.id === selectedUser.id,
                                )
                              : selectedUser.role === "provider"
                                ? providerDetails.find(
                                    (p) => p.id === selectedUser.id,
                                  )
                                : shopDetails.find(
                                    (s) => s.id === selectedUser.id,
                                  );

                          return (
                            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                              <h3 className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-6 flex items-center gap-2">
                                {selectedUser.role === "seeker" ? (
                                  <GraduationCap size={16} />
                                ) : selectedUser.role === "provider" ? (
                                  <Briefcase size={16} />
                                ) : (
                                  <Store size={16} />
                                )}
                                {selectedUser.role === "seeker"
                                  ? "Applicant Details"
                                  : selectedUser.role === "provider"
                                    ? "Company Details"
                                    : "Shop Details"}
                              </h3>

                              {details ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
                                  <div className="space-y-4 md:col-span-2 bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">
                                      Contact Info
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="flex items-start gap-3">
                                        <Phone
                                          className="text-slate-400 mt-0.5 shrink-0"
                                          size={16}
                                        />
                                        <DetailBox
                                          label="Phone"
                                          value={
                                            details.phone ||
                                            details.contact_phone
                                          }
                                          highlight
                                        />
                                      </div>
                                      <div className="flex items-start gap-3">
                                        <MapPin
                                          className="text-slate-400 mt-0.5 shrink-0"
                                          size={16}
                                        />
                                        <DetailBox
                                          label="Location"
                                          value={details.location}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {selectedUser.role === "seeker" && (
                                    <>
                                      <DetailBox
                                        label="Target Job Title"
                                        value={details.title}
                                        highlight
                                      />
                                      <DetailBox
                                        label="Experience Level"
                                        value={details.experience}
                                      />
                                      <div className="md:col-span-2">
                                        <DetailBox
                                          label="Highest Qualification"
                                          value={details.qualification}
                                        />
                                      </div>
                                      <div className="md:col-span-2 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 mt-2">
                                          Reported Skillset
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {Array.isArray(details.skills) &&
                                          details.skills.length > 0 ? (
                                            details.skills.map((s, i) => (
                                              <span
                                                key={i}
                                                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100"
                                              >
                                                {s}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-slate-400 italic text-sm">
                                              No skills listed.
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {selectedUser.role === "provider" && (
                                    <>
                                      <div className="md:col-span-2">
                                        <DetailBox
                                          label="Company Name"
                                          value={details.company_name}
                                          highlight
                                        />
                                      </div>
                                      <div className="md:col-span-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                          Company Summary
                                        </span>
                                        <div className="text-slate-700 text-sm leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-inner whitespace-pre-wrap">
                                          {details.job_offering || (
                                            <span className="italic text-slate-400">
                                              No description provided.
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* NEW: SHOP DETAILS */}
                                  {selectedUser.role === "shop" && (
                                    <>
                                      <div className="md:col-span-2">
                                        <DetailBox
                                          label="Shop Name"
                                          value={details.shop_name}
                                          highlight
                                        />
                                      </div>
                                      <div className="md:col-span-2">
                                        <DetailBox
                                          label="Owner/Manager Name"
                                          value={details.full_name}
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                  <AlertCircle
                                    size={28}
                                    className="mx-auto text-slate-300 mb-2"
                                  />
                                  <p className="text-slate-500 font-medium text-sm px-4">
                                    Profile setup incomplete.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* JOB LISTINGS (Providers Only) */}
                        {selectedUser.role === "provider" && (
                          <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden mt-6">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                              <h3 className="text-slate-800 font-bold flex items-center gap-2 text-sm md:text-base">
                                <Briefcase
                                  size={16}
                                  className="text-purple-600"
                                />{" "}
                                Published Jobs
                              </h3>
                              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-100">
                                {
                                  jobs.filter(
                                    (j) => j.provider_id === selectedUser.id,
                                  ).length
                                }{" "}
                                Active
                              </span>
                            </div>

                            <div className="overflow-x-auto w-full">
                              {jobs.filter(
                                (j) => j.provider_id === selectedUser.id,
                              ).length > 0 ? (
                                <table className="w-full text-left min-w-[500px]">
                                  <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                                      <th className="p-3 rounded-tl-lg">
                                        Title
                                      </th>
                                      <th className="p-3 text-center">
                                        Status
                                      </th>
                                      <th className="p-3 text-right rounded-tr-lg">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {jobs
                                      .filter(
                                        (j) =>
                                          j.provider_id === selectedUser.id,
                                      )
                                      .map((job) => (
                                        <tr
                                          key={job.id}
                                          className="hover:bg-slate-50 transition-colors"
                                        >
                                          <td className="p-3 font-bold text-slate-800 text-xs md:text-sm">
                                            {job.title}
                                          </td>
                                          <td className="p-3 text-center">
                                            <button
                                              onClick={() =>
                                                toggleJobStatus(
                                                  job.id,
                                                  job.is_active,
                                                )
                                              }
                                              className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border transition-all ${
                                                job.is_active
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : "bg-red-50 text-red-700 border-red-200"
                                              }`}
                                            >
                                              {job.is_active
                                                ? "Live"
                                                : "Hidden"}
                                            </button>
                                          </td>
                                          <td className="p-3 text-right flex items-center justify-end gap-2">
                                            <button
                                              onClick={() =>
                                                setSelectedJobDetails(
                                                  selectedJobDetails?.id ===
                                                    job.id
                                                    ? null
                                                    : job,
                                                )
                                              }
                                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold border bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                                            >
                                              {selectedJobDetails?.id === job.id
                                                ? "Close View"
                                                : "Seeker View"}
                                            </button>
                                            <button
                                              onClick={() => deleteJob(job.id)}
                                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="py-8 text-center text-slate-400 text-xs md:text-sm font-medium border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                  No jobs published yet.
                                </div>
                              )}

                              {selectedJobDetails && (
                                <div className="mt-6 p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-3 md:p-4">
                                    <button
                                      onClick={() =>
                                        setSelectedJobDetails(null)
                                      }
                                      className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"
                                    >
                                      <EyeOff size={14} />
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-4 mt-2">
                                    <h2 className="text-xl md:text-2xl font-black text-white pr-8">
                                      {selectedJobDetails.title}
                                    </h2>
                                    <p className="text-purple-400 font-bold flex flex-wrap gap-2 text-xs md:text-sm">
                                      <span>
                                        🏢 {selectedJobDetails.company}
                                      </span>
                                      <span className="text-slate-600 hidden md:inline">
                                        •
                                      </span>
                                      <span>
                                        📍 {selectedJobDetails.location}
                                      </span>
                                    </p>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
                                        Description
                                      </span>
                                      <div className="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedJobDetails.description ||
                                          "No description provided."}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 5: POSTERS --- */}
            {activeTab === "posters" && (
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Poster Manager
                  </h2>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
                    Total Posters:{" "}
                    {schemes.filter((i) => i.category === "Poster").length}
                  </span>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-10">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <UploadCloud size={24} className="text-blue-600" /> Upload
                    New Poster
                  </h3>
                  <form
                    onSubmit={handlePosterSubmit}
                    className="flex flex-col md:flex-row gap-6"
                  >
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Poster Title
                        </label>
                        <input
                          type="text"
                          value={posterTitle}
                          onChange={(e) => setPosterTitle(e.target.value)}
                          placeholder="e.g. Free Eye Camp Notice"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={posterUploading || !posterImage}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${posterUploading || !posterImage ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                      >
                        {posterUploading ? "Uploading..." : "🚀 Publish Poster"}
                      </button>
                    </div>
                    <div className="flex-1">
                      <div
                        className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-center transition-all ${posterImage ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"}`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePosterUpload}
                          disabled={posterUploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {posterUploading ? (
                          <div className="animate-pulse text-blue-600 font-bold">
                            Uploading...
                          </div>
                        ) : posterImage ? (
                          <img
                            src={posterImage}
                            alt="Preview"
                            className="h-full w-full object-contain rounded-lg p-2"
                          />
                        ) : (
                          <div className="p-4">
                            <UploadCloud
                              size={32}
                              className="mx-auto text-gray-400 mb-2"
                            />
                            <p className="text-gray-900 font-bold text-sm">
                              Click to upload image
                            </p>
                            <p className="text-xs text-gray-500">
                              SVG, PNG, JPG
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {schemes
                    .filter((item) => item.category === "Poster")
                    .map((poster) => (
                      <div
                        key={poster.id}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full"
                      >
                        <div className="relative h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={poster.image}
                            alt={poster.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute top-2 right-2">
                            <span
                              className={`px-2 py-1 text-xs font-bold rounded-full border shadow-sm ${poster.active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                            >
                              {poster.active ? "Active" : "Hidden"}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h4
                            className="font-bold text-gray-800 text-sm mb-1 line-clamp-1"
                            title={poster.title}
                          >
                            {poster.title}
                          </h4>
                          <p className="text-xs text-gray-400 mb-4">
                            Added:{" "}
                            {new Date(poster.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-auto flex gap-2">
                            <button
                              onClick={() =>
                                toggleContentActive(poster.id, poster.active)
                              }
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition ${poster.active ? "border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-600" : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"}`}
                            >
                              {poster.active ? (
                                <>
                                  <EyeOff size={14} /> Hide
                                </>
                              ) : (
                                <>
                                  <Eye size={14} /> Publish
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteContent(poster.id)}
                              className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 rounded-lg transition"
                              title="Delete Permanently"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {schemes.filter((item) => item.category === "Poster")
                    .length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                      <p className="text-gray-400">No posters uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;
