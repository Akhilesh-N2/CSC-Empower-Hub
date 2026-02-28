import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
// Imported icons for the role selector
import { GraduationCap, Briefcase, Store } from "lucide-react";

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Basic Signup State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("seeker"); // Default to Job Seeker

  // --- DYNAMIC FORM STATE ---
  // Shared Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Seeker Specific
  const [qualification, setQualification] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  // Provider Specific
  const [companyName, setCompanyName] = useState("");
  const [jobOffering, setJobOffering] = useState("");

  // Shop Specific
  const [shopName, setShopName] = useState("");
  
  // --- ERROR TRACKING STATE ---
  const [errors, setErrors] = useState({});

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // --- CUSTOM VALIDATION LOGIC ---
    const newErrors = {
      email: !email.trim(),
      password: !password.trim() || password.length < 6,
      fullName: !fullName.trim(),
      phone: !phone.trim(),
      location: !location.trim(),
    };

    // Role-specific validation
    if (role === "seeker") {
      newErrors.qualification = !qualification.trim();
      newErrors.targetJob = !targetJob.trim();
    } else if (role === "provider") {
      newErrors.companyName = !companyName.trim();
      newErrors.jobOffering = !jobOffering.trim();
    } else if (role === "shop") {
      newErrors.shopName = !shopName.trim();
    }

    // Check if ANY error flag is true
    const hasErrors = Object.values(newErrors).some((err) => err);
    if (hasErrors) {
      setErrors(newErrors);
      return; // Stop the form submission
    }

    // Clear errors if everything is valid
    setErrors({});
    setLoading(true);

    try {
      // 1. Create Supabase Auth User
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 2. Create Profile Entries
      if (data.user) {
        // A. Insert into the main Profiles table
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            email: email,
            role: role,
            is_approved: false,
          },
        ]);

        if (profileError)
          console.error("Error creating base profile:", profileError);

        // B. Insert detailed data into specific sub-profile tables
        if (role === "seeker") {
          const skillsArray = skills.trim()
            ? skills.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          const finalExperience =
            experience.trim() !== "" ? experience : "0 years";

          const { error: seekerErr } = await supabase
            .from("seeker_profiles")
            .insert([
              {
                id: data.user.id,
                contact_email: email,
                full_name: fullName,
                phone: phone,
                location: location,
                qualification: qualification,
                title: targetJob,
                skills: skillsArray,
                experience: finalExperience,
              },
            ]);

          if (seekerErr) {
            console.error("SEEKER DB ERROR:", seekerErr);
            alert("Seeker data rejected: " + seekerErr.message);
          }
        } else if (role === "provider") {
          const { error: providerErr } = await supabase
            .from("provider_profiles")
            .insert([
              {
                id: data.user.id,
                full_name: fullName,
                contact_phone: phone,
                location: location,
                company_name: companyName,
                job_offering: jobOffering,
              },
            ]);

          if (providerErr) {
            console.error("PROVIDER DB ERROR:", providerErr);
            alert("Provider data rejected: " + providerErr.message);
          }
        } else if (role === "shop") {
          const { error: shopErr } = await supabase
            .from("shop_profiles")
            .insert([
              {
                id: data.user.id,
                full_name: fullName,
                shop_name: shopName,
                phone: phone,
                location: location,
              },
            ]);

          if (shopErr) {
            console.error("SHOP DB ERROR:", shopErr);
            alert("Shop data rejected: " + shopErr.message);
          }
        }

        // 3. FORCE LOGOUT
        await supabase.auth.signOut();

        // 4. Success Message & Redirect
        alert(
          "Account created successfully! Please wait for Admin Approval before logging in.",
        );
        navigate("/login");
      }
    } catch (error) {
      alert("Signup failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl w-full max-w-md lg:max-w-4xl border border-gray-100 z-10 relative my-auto overflow-y-auto max-h-[95vh]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-2">Join the Empower Hub community.</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-8" noValidate>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* --- LEFT COLUMN: CORE AUTH --- */}
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                    errors.email 
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                    : 'border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white'
                  }`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: false });
                  }}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                    ⚠️ Email is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                    errors.password 
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                    : 'border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white'
                  }`}
                  placeholder="•••••••• (Min 6 chars)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: false });
                  }}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                    ⚠️ Password must be at least 6 characters
                  </p>
                )}
              </div>

              {/* MODERN ROLE SELECTOR */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  I am registering as a:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* SEEKER CARD */}
                  <label className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === "seeker" 
                    ? "border-blue-500 bg-blue-50 shadow-sm" 
                    : "border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-200"
                  }`}>
                    <input type="radio" name="role" value="seeker" checked={role === "seeker"} onChange={(e) => setRole(e.target.value)} className="sr-only" />
                    <GraduationCap size={24} className={`mb-2 ${role === "seeker" ? "text-blue-600" : "text-gray-400"}`} />
                    <span className={`text-xs sm:text-sm font-bold ${role === "seeker" ? "text-blue-800" : "text-gray-500"}`}>Seeker</span>
                  </label>

                  {/* PROVIDER CARD */}
                  <label className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === "provider" 
                    ? "border-purple-500 bg-purple-50 shadow-sm" 
                    : "border-gray-200 bg-white hover:bg-gray-50 hover:border-purple-200"
                  }`}>
                    <input type="radio" name="role" value="provider" checked={role === "provider"} onChange={(e) => setRole(e.target.value)} className="sr-only" />
                    <Briefcase size={24} className={`mb-2 ${role === "provider" ? "text-purple-600" : "text-gray-400"}`} />
                    <span className={`text-xs sm:text-sm font-bold ${role === "provider" ? "text-purple-800" : "text-gray-500"}`}>Provider</span>
                  </label>

                  {/* SHOP CARD */}
                  <label className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    role === "shop" 
                    ? "border-emerald-500 bg-emerald-50 shadow-sm" 
                    : "border-gray-200 bg-white hover:bg-gray-50 hover:border-emerald-200"
                  }`}>
                    <input type="radio" name="role" value="shop" checked={role === "shop"} onChange={(e) => setRole(e.target.value)} className="sr-only" />
                    <Store size={24} className={`mb-2 ${role === "shop" ? "text-emerald-600" : "text-gray-400"}`} />
                    <span className={`text-xs sm:text-sm font-bold ${role === "shop" ? "text-emerald-800" : "text-gray-500"}`}>Shop</span>
                  </label>
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN: DYNAMIC PROFILE DETAILS --- */}
            <div className={`flex-1 p-6 rounded-2xl border transition-colors shadow-inner ${
              role === 'shop' ? 'bg-emerald-50/30 border-emerald-100' :
              role === 'provider' ? 'bg-purple-50/30 border-purple-100' :
              'bg-blue-50/30 border-blue-100'
            }`}>
              <p className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-5 flex items-center gap-2">
                <span>
                  {role === "seeker" ? "🎓" : role === "provider" ? "🏢" : "🏪"}
                </span>
                {role === "seeker"
                  ? "Job Seeker Details"
                  : role === "provider"
                  ? "Job Provider Details"
                  : "Shop Details"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shared Fields */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder={
                      role === "shop" 
                        ? "Your Name (Owner/Manager) *" 
                        : role === "seeker"
                        ? "Your Full Name *"
                        : "Contact Person's Full Name *"
                    }
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: false });
                    }}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                      errors.fullName ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                      ⚠️ Name is required
                    </p>
                  )}
                </div>

                {/* Wrapped Phone inside div */}
                <div>
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: false });
                    }}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                      errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                      ⚠️ Phone is required
                    </p>
                  )}
                </div>

                {/* Wrapped Location inside div */}
                <div>
                  <input
                    type="text"
                    placeholder="City / Location *"
                    required
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors({ ...errors, location: false });
                    }}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                      errors.location ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'
                    }`}
                  />
                  {errors.location && (
                    <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                      ⚠️ Location is required
                    </p>
                  )}
                </div>

                {/* SEEKER FIELDS */}
                {role === "seeker" && (
                  <>
                    <div className="sm:col-span-2 mt-2">
                      <input
                        type="text"
                        placeholder="Highest Qualification (e.g. B.Tech, 12th) *"
                        required
                        value={qualification}
                        onChange={(e) => {
                          setQualification(e.target.value);
                          if (errors.qualification) setErrors({ ...errors, qualification: false });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm outline-none transition-all ${
                          errors.qualification ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-blue-200 focus:ring-2 focus:ring-blue-500 bg-white'
                        }`}
                      />
                      {errors.qualification && (
                        <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Qualification is required
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="What job are you looking for? *"
                        required
                        value={targetJob}
                        onChange={(e) => {
                          setTargetJob(e.target.value);
                          if (errors.targetJob) setErrors({ ...errors, targetJob: false });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm outline-none transition-all ${
                          errors.targetJob ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-blue-200 focus:ring-2 focus:ring-blue-500 bg-white'
                        }`}
                      />
                      {errors.targetJob && (
                        <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Target job is required
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Skills (comma separated) - Optional"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Experience (e.g. 2 years) - Optional"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {/* PROVIDER FIELDS */}
                {role === "provider" && (
                  <>
                    <div className="sm:col-span-2 mt-2">
                      <input
                        type="text"
                        placeholder="Company Name *"
                        required
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (errors.companyName) setErrors({ ...errors, companyName: false });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm outline-none transition-all ${
                          errors.companyName ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-purple-200 focus:ring-2 focus:ring-purple-500 bg-white'
                        }`}
                      />
                      {errors.companyName && (
                        <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Company Name is required
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="What job are you offering right now? *"
                        required
                        value={jobOffering}
                        onChange={(e) => {
                          setJobOffering(e.target.value);
                          if (errors.jobOffering) setErrors({ ...errors, jobOffering: false });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm outline-none transition-all ${
                          errors.jobOffering ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-purple-200 focus:ring-2 focus:ring-purple-500 bg-white'
                        }`}
                      />
                      {errors.jobOffering && (
                        <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                          ⚠️ Job offering is required
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* SHOP FIELDS */}
                {role === "shop" && (
                  <div className="sm:col-span-2 mt-2">
                    <input
                      type="text"
                      placeholder="Shop / Store Name *"
                      required
                      value={shopName}
                      onChange={(e) => {
                        setShopName(e.target.value);
                        if (errors.shopName) setErrors({ ...errors, shopName: false });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl shadow-sm outline-none transition-all ${
                        errors.shopName ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' : 'border-emerald-200 focus:ring-2 focus:ring-emerald-500 bg-white'
                      }`}
                    />
                    {errors.shopName && (
                      <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                        ⚠️ Shop Name is required
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- SUBMIT BUTTON --- */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${
                loading 
                ? "bg-gray-400 cursor-not-allowed" 
                : role === "shop" 
                  ? "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1" 
                  : role === "provider"
                  ? "bg-purple-600 hover:bg-purple-700 hover:-translate-y-1"
                  : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account & Request Approval"}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?
          <Link to="/login" className="ml-2 font-bold text-blue-600 hover:text-blue-800 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;