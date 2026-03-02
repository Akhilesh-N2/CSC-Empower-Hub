import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Label } from 'recharts';
import { Users, Briefcase, Activity, ChevronLeft, MousePointer2, Clock, Map } from 'lucide-react';
import { Link } from 'react-router-dom';

function DevStats() {
  const [timeRange, setTimeRange] = useState('daily'); 
  const [visitData, setVisitData] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [jobGrowth, setJobGrowth] = useState([]);
  const [topPages, setTopPages] = useState([]); // ✨ NEW: State for top pages
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, pendingApprovals: 0, totalVisits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const [users, jobs, pending, visits] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('traffic_logs').select('id', { count: 'exact', head: true })
      ]);

      const [ 
        { data: dailyVisits }, 
        { data: dailySignups }, 
        { data: dailyJobs },
        { data: pagesData } // ✨ NEW: Fetch top pages
      ] = await Promise.all([
        supabase.rpc('get_daily_visits'),
        supabase.rpc('get_daily_signups'),
        supabase.rpc('get_daily_jobs'),
        supabase.rpc('get_top_pages') 
      ]);

      setVisitData(formatAggregatedData(dailyVisits, timeRange, 'visit_date', 'visit_count'));
      setUserGrowth(formatAggregatedData(dailySignups, timeRange, 'signup_date', 'signup_count'));
      setJobGrowth(formatAggregatedData(dailyJobs, timeRange, 'job_date', 'job_count'));
      setTopPages(pagesData || []); // ✨ Set top pages state
      
      setStats({
        totalUsers: users.count || 0,
        totalJobs: jobs.count || 0,
        pendingApprovals: pending.count || 0,
        totalVisits: visits.count || 0
      });
      
    } catch (err) { 
      console.error("Error fetching analytics:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatAggregatedData = (data, range, dateKey, countKey) => {
    if (!data || data.length === 0) return [];
    
    if (range === 'daily') {
      return data.map(row => ({
        date: new Date(row[dateKey]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        count: Number(row[countKey])
      }));
    }

    const grouped = data.reduce((acc, row) => {
      const d = new Date(row[dateKey]);
      let displayKey = range === 'yearly' 
        ? d.getFullYear().toString() 
        : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      acc[displayKey] = (acc[displayKey] || 0) + Number(row[countKey]);
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      date: key,
      count: grouped[key]
    }));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono tracking-tighter">INITIALIZING ENGINE ROOM...</div>;

  // Calculate the highest page visit count to properly scale the progress bars
  const maxPageVisits = topPages.length > 0 ? Math.max(...topPages.map(p => Number(p.visit_count))) : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-10 font-sans">
      
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Link to="/admin" className="text-slate-500 hover:text-cyan-400 flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <ChevronLeft size={14} /> System Admin
          </Link>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <Activity className="text-cyan-500" /> Engine Room
          </h1>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner">
          {['daily', 'monthly', 'yearly'].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${timeRange === r ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox icon={<Users className="text-blue-400"/>} label="Registered Base" value={stats.totalUsers} subtext="Total accounts" />
          <StatBox icon={<Briefcase className="text-purple-400"/>} label="Platform Utility" value={stats.totalJobs} subtext="Live job posts" />
          <StatBox icon={<Clock className="text-orange-400"/>} label="Pending Review" value={stats.pendingApprovals} subtext="Awaiting validation" alert={stats.pendingApprovals > 0} />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
            <MousePointer2 size={160} />
          </div>
          <div className="mb-10">
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[.4em] mb-2">Traffic Telemetry</p>
            <h3 className="text-2xl font-black text-white">Platform Visits ({timeRange})</h3>
          </div>
          
          <div className="h-[400px] w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#1e293b', opacity: 0.4}} content={<CustomTooltip labelText="Visits" />} />
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ✨ NEW: TOP VISITED PAGES LIST */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="font-bold text-white flex items-center gap-3 uppercase text-xs tracking-widest mb-6">
            <Map size={18} className="text-emerald-400"/> Top Visited Pages (All Time)
          </h3>
          
          {topPages.length === 0 ? (
            <p className="text-slate-500 text-sm">No page data recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {topPages.map((page, index) => {
                const count = Number(page.visit_count);
                const percentage = Math.max((count / maxPageVisits) * 100, 2); // Minimum 2% width so it's visible
                
                return (
                  <div key={index} className="relative">
                    <div className="flex justify-between items-center mb-1 relative z-10 px-2">
                      <span className="text-slate-300 font-mono text-sm">
                        {page.page_path === '/' ? '/ (Home)' : page.page_path}
                      </span>
                      <span className="text-emerald-400 font-bold text-sm">{count}</span>
                    </div>
                    {/* Background Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-lg h-8 absolute top-0 left-0 overflow-hidden">
                      <div 
                        className="bg-slate-700/50 h-full rounded-lg transition-all duration-1000 ease-out border-l-2 border-emerald-500" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GrowthCard title="Signups Over Time" data={userGrowth} color="#3b82f6" icon={<Users size={18} className="text-blue-400"/>} yLabel="Users" />
          <GrowthCard title="Job Activity Over Time" data={jobGrowth} color="#a855f7" icon={<Briefcase size={18} className="text-purple-400"/>} yLabel="Jobs" type="step" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, labelText }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white">{payload[0].value} <span className="text-cyan-500">{labelText}</span></p>
      </div>
    );
  }
  return null;
};

const StatBox = ({ icon, label, value, subtext, alert }) => (
  <div className={`bg-slate-900 border ${alert ? 'border-orange-500/30' : 'border-slate-800'} p-8 rounded-[2rem] shadow-xl relative overflow-hidden group`}>
    <div className="flex items-center gap-5 relative z-10">
      <div className="p-4 bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">{subtext}</p>
      </div>
    </div>
  </div>
);

const GrowthCard = ({ title, data, color, icon, type, yLabel }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
    <h3 className="font-bold text-white flex items-center gap-3 uppercase text-xs tracking-widest mb-8">
      {icon} {title}
    </h3>
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "step" ? (
          <LineChart data={data} margin={{ left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip labelText={yLabel} />} />
            <Line type="step" dataKey="count" stroke={color} strokeWidth={3} dot={false} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip labelText={yLabel} />} />
            <Area type="monotone" dataKey="count" stroke={color} fillOpacity={0.1} fill={color} strokeWidth={3} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  </div>
);

export default DevStats;