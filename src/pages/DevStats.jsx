import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Briefcase, Activity, ChevronLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

function DevStats() {
  const [userGrowth, setUserGrowth] = useState([]);
  const [jobGrowth, setJobGrowth] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // 1. Fetch Growth Data (timestamps only to save bandwidth)
        const [usersData, jobsData, pendingData] = await Promise.all([
          supabase.from('profiles').select('created_at'),
          supabase.from('jobs').select('created_at'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false)
        ]);

        // 2. Process User Growth
        const userGroups = processTimeline(usersData.data);
        setUserGrowth(userGroups);

        // 3. Process Job Growth
        const jobGroups = processTimeline(jobsData.data);
        setJobGrowth(jobGroups);

        setStats({
          totalUsers: usersData.data?.length || 0,
          totalJobs: jobsData.data?.length || 0,
          pendingApprovals: pendingData.count || 0
        });

      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Helper to group SQL timestamps into a JS Chart format
  const processTimeline = (data) => {
    if (!data) return [];
    const groups = data.reduce((acc, item) => {
      const date = new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono">
      <Activity className="animate-spin mr-2" /> LOADING DEVELOPER INSIGHTS...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-10 font-sans">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link to="/admin" className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition mb-2 text-sm font-bold">
            <ChevronLeft size={16} /> BACK TO ADMIN PANEL
          </Link>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-cyan-500" /> Engine Room <span className="text-slate-700 text-lg font-mono">v1.0</span>
          </h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Database Health</p>
             <p className="text-emerald-400 font-bold text-sm">● Operational</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-cyan-500">
              <Calendar size={20} />
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BIG STATS */}
        <div className="lg:col-span-1 space-y-6">
          <StatBox icon={<Users className="text-blue-400"/>} label="Registered Base" value={stats.totalUsers} suffix="Users" />
          <StatBox icon={<Briefcase className="text-purple-400"/>} label="Platform Utility" value={stats.totalJobs} suffix="Job Posts" />
          <StatBox icon={<Activity className="text-orange-400"/>} label="Pending Review" value={stats.pendingApprovals} suffix="Approvals" />
          
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-2">Vercel Traffic</h3>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed">External traffic monitoring is active. Detailed heatmaps and referral data are available in your Vercel dashboard.</p>
              <a href="https://vercel.com/dashboard" target="_blank" className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition block text-center">Open Vercel Insights</a>
            </div>
            <Activity className="absolute -bottom-4 -right-4 text-blue-500/30 group-hover:scale-110 transition-transform duration-700" size={160} />
          </div>
        </div>

        {/* GROWTH GRAPHS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* USER GROWTH CHART */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-lg text-white">Daily User Registration</h3>
              <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase font-black">Last 30 Days</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorUser)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* JOB POSTING CHART */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-lg text-white">Job Posting Activity</h3>
              <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase font-black">Growth Trend</span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={jobGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                  />
                  <Line type="step" dataKey="count" stroke="#a855f7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const StatBox = ({ icon, label, value, suffix }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-slate-700 transition-colors">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-slate-800 rounded-2xl">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
        <p className="text-2xl font-black text-white">{value} <span className="text-xs text-slate-600 font-normal">{suffix}</span></p>
      </div>
    </div>
  </div>
);

export default DevStats;