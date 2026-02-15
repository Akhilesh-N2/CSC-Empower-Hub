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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('seeker_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setFormData({
                    ...data,
                    skills: data.skills.join(', ') // Convert array back to string for input
                });
            }
        };
        loadProfile();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        const updates = {
            id: user.id,
            ...formData,
            skills: formData.skills.split(',').map(s => s.trim()), // Convert string to array
            updated_at: new Date()
        };

        const { error } = await supabase.from('seeker_profiles').upsert(updates);

        setLoading(false);
        if (error) alert(error.message);
        else {
            alert("Profile Updated!");
            navigate('/profile'); // Send them back to job search
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

                    <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold">
                        {loading ? "Saving..." : "Save Profile"}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default EditProfile;