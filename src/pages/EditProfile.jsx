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

    // Load existing profile if they have one
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) return; // Exit cleanly if not logged in

                const { data, error } = await supabase
                    .from('seeker_profiles')
                    .select('*') // Correct use of '*' to populate the whole form
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // PGRST116 means "No rows found" (e.g., brand new user). We ignore that.
                    console.error("Error loading profile:", error);
                } else if (data) {
                    // OPTIMIZATION: Safely handle null values to prevent React crashes
                    setFormData({
                        full_name: data.full_name || '',
                        title: data.title || '',
                        phone: data.phone || '',
                        // Check if skills exist and is an array before calling join
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

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">My Candidate Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input name="full_name" required value={formData.full_name} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Job Title (e.g. Driver, Accountant)</label>
                            <input name="title" required value={formData.title} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Skills (Comma separated)</label>
                        <input name="skills" placeholder="e.g. Excel, Tally, Driving" required value={formData.skills} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Experience (Years/Months)</label>
                            <input name="experience" placeholder="e.g. 2 Years" required value={formData.experience} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Preferred Location</label>
                            <input name="location" placeholder="e.g. Kochi" required value={formData.location} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Short Bio / About Me</label>
                        <textarea name="bio" rows="3" value={formData.bio} onChange={handleChange} className="w-full p-2 border rounded"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                            <input type="email" name="contact_email" required value={formData.contact_email} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="+91 98765 43210"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                    </div>

                    <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold disabled:bg-blue-300 transition-colors">
                        {loading ? "Saving..." : "Save Profile"}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default EditProfile;