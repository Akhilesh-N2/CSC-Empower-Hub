import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function EditProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        title: '',
        phone: '',
        skills: '',
        experience: '',
        location: '',
        bio: '',
        contact_email: ''
    });

    // NEW: Error Tracking State
    const [errors, setErrors] = useState({});

    // Load existing profile if they have one
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) return; // Exit cleanly if not logged in

                const { data, error } = await supabase
                    .from('seeker_profiles')
                    .select('*') 
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error loading profile:", error);
                } else if (data) {
                    setFormData({
                        full_name: data.full_name || '',
                        title: data.title || '',
                        phone: data.phone || '',
                        skills: (data.skills && Array.isArray(data.skills)) ? data.skills.join(', ') : '', 
                        experience: data.experience || '',
                        location: data.location || '',
                        bio: data.bio || '',
                        contact_email: data.contact_email || ''
                    });
                }
            } catch (err) {
                console.error("Unexpected error loading profile:", err);
            }
        };
        
        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Clear the error for this field as the user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: false });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // --- CUSTOM VALIDATION LOGIC ---
        const newErrors = {
            full_name: !formData.full_name.trim(),
            title: !formData.title.trim(),
            skills: !formData.skills.trim(),
            experience: !formData.experience.trim(),
            location: !formData.location.trim(),
            contact_email: !formData.contact_email.trim(),
            phone: !formData.phone.trim()
        };

        // Check if ANY error flag is true (Bio is left optional)
        if (Object.values(newErrors).some((err) => err)) {
            setErrors(newErrors);
            return; // Stop submission
        }

        setErrors({});
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in to update your profile.");

            const updates = {
                id: user.id,
                ...formData,
                // Clean up the skills array: split by comma, trim whitespace, and remove empty entries
                skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''), 
                updated_at: new Date()
            };

            const { error } = await supabase.from('seeker_profiles').upsert(updates);
            if (error) throw error;

            alert("Profile Updated!");
            navigate('/profile'); 
            
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4">
            <div className="max-w-2xl w-full bg-white p-8 md:p-10 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">My Candidate Profile</h2>

                {/* Added noValidate to stop browser popups */}
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name *</label>
                            <input 
                                name="full_name" 
                                required 
                                value={formData.full_name} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.full_name 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.full_name && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Full Name is required
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Job Title *</label>
                            <input 
                                name="title" 
                                placeholder="e.g. Driver, Accountant"
                                required 
                                value={formData.title} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.title 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.title && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Job Title is required
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Skills (Comma separated) *</label>
                        <input 
                            name="skills" 
                            placeholder="e.g. Excel, Tally, Driving" 
                            required 
                            value={formData.skills} 
                            onChange={handleChange} 
                            className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                errors.skills 
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                            }`} 
                        />
                        {errors.skills && (
                            <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                ⚠️ At least one skill is required
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Experience (Years/Months) *</label>
                            <input 
                                name="experience" 
                                placeholder="e.g. 2 Years" 
                                required 
                                value={formData.experience} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.experience 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.experience && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Experience is required
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Preferred Location *</label>
                            <input 
                                name="location" 
                                placeholder="e.g. Kochi" 
                                required 
                                value={formData.location} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.location 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.location && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Location is required
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bio is left optional */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Short Bio / About Me <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                        <textarea 
                            name="bio" 
                            rows="3" 
                            value={formData.bio} 
                            onChange={handleChange} 
                            placeholder="Tell employers a little about yourself..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Contact Email *</label>
                            <input 
                                type="email" 
                                name="contact_email" 
                                required 
                                value={formData.contact_email} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.contact_email 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.contact_email && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Email is required
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="+91 98765 43210"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${
                                    errors.phone 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                                }`} 
                            />
                            {errors.phone && (
                                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                                    ⚠️ Phone is required
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        disabled={loading} 
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-md transition-all mt-4 
                            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
                    >
                        {loading ? "Saving..." : "Save Profile"}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default EditProfile;