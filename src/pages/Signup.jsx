import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

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
  const [skills, setSkills] = useState(""); // NEW
  const [experience, setExperience] = useState("");

  // Provider Specific
  const [companyName, setCompanyName] = useState("");
  const [jobOffering, setJobOffering] = useState("");
  // -------------------------------

  const handleSignup = async (e) => {
    e.preventDefault();
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
          // Format skills into an array (e.g., "Driving, Cooking" -> ["Driving", "Cooking"])
          const skillsArray = skills.trim()
            ? skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
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
                skills: skillsArray, // Sends user data OR empty array
                experience: finalExperience, // Sends user data OR "0 years"
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
      {/* 🛠️ WIDENED CONTAINER: max-w-md becomes max-w-4xl on large screens */}
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl w-full max-w-md lg:max-w-4xl border border-gray-100 z-10 relative my-auto overflow-y-auto max-h-[95vh]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-2">Join us to find or post jobs.</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-8">
          {/* 🛠️ TWO COLUMN WRAPPER: Stacks on mobile, side-by-side on desktop */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* --- LEFT COLUMN: CORE AUTH --- */}
            <div className="flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3">
                  I am a:
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="seeker"
                      checked={role === "seeker"}
                      onChange={(e) => setRole(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500 w-5 h-5"
                    />
                    <span className="text-gray-800 font-medium">
                      Job Seeker
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="provider"
                      checked={role === "provider"}
                      onChange={(e) => setRole(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500 w-5 h-5"
                    />
                    <span className="text-gray-800 font-medium">
                      Job Provider
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN: DYNAMIC PROFILE DETAILS --- */}
            <div className="flex-1 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-inner">
              <p className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-5 flex items-center gap-2">
                <span>{role === "seeker" ? "🎓" : "🏢"}</span>
                {role === "seeker"
                  ? "Job Seeker Details"
                  : "Job Provider Details"}
              </p>

              {/* 🛠️ INNER GRID: Side-by-side inputs within the right column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name spans both columns */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder={
                      role === "seeker"
                        ? "Your Full Name"
                        : "Contact Person's Full Name"
                    }
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <input
                  type="text"
                  placeholder="City / Location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {/* SEEKER FIELDS */}
                {role === "seeker" && (
                  <>
                    <div className="sm:col-span-2 mt-2">
                      <input
                        type="text"
                        placeholder="Highest Qualification (e.g. B.Tech, 12th) *"
                        required
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="What job are you looking for? *"
                        required
                        value={targetJob}
                        onChange={(e) => setTargetJob(e.target.value)}
                        className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                    {/* NEW OPTIONAL FIELDS */}
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Skills (comma separated, e.g. Driving, Typing) - Optional"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Experience (e.g. 2 years) - Optional"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none"
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
                        placeholder="Company / Shop Name"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="What job are you offering right now?"
                        required
                        value={jobOffering}
                        onChange={(e) => setJobOffering(e.target.value)}
                        className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white shadow-sm outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* --- SUBMIT BUTTON (Spans full width at bottom) --- */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1"}`}
            >
              {loading
                ? "Creating Account..."
                : "Create Account & Request Approval"}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?
          <Link
            to="/login"
            className="ml-2 font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
