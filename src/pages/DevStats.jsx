import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Label } from 'recharts';
import { Users, Briefcase, Activity, ChevronLeft, MousePointer2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

function DevStats() {
  const [timeRange, setTimeRange] = useState('daily'); 
  const [visitData, setVisitData] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [jobGrowth, setJobGrowth] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, pendingApprovals: 0, totalVisits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const [visits, users, jobs, pending] = await Promise.all([
        supabase.from('traffic_logs').select('created_at'),
        supabase.from('profiles').select('created_at'),
        supabase.from('jobs').select('created_at'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false)
      ]);

      setVisitData(processTimeline(visits.data, timeRange));
      setUserGrowth(processTimeline(users.data, 'daily'));
      setJobGrowth(processTimeline(jobs.data, 'daily'));

      setStats({
        totalUsers: users.data?.length || 0,
        totalJobs: jobs.data?.length || 0,
        pendingApprovals: pending.count || 0,
        totalVisits: visits.data?.length || 0
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const processTimeline = (data, range) => {
    if (!data) return [];
    const groups = data.reduce((acc, item) => {
      const d = new Date(item.created_at);
      let key;
      if (range === 'yearly') key = d.getFullYear().toString();
      else if (range === 'monthly') key = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      else key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono tracking-tighter">INITIALIZING ENGINE ROOM...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-10 font-sans">
      
      {/* HEADER SECTION */}
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

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP ROW: SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox icon={<Users className="text-blue-400"/>} label="Registered Base" value={stats.totalUsers} subtext="Total accounts" />
          <StatBox icon={<Briefcase className="text-purple-400"/>} label="Platform Utility" value={stats.totalJobs} subtext="Live job posts" />
          <StatBox icon={<Clock className="text-orange-400"/>} label="Pending Review" value={stats.pendingApprovals} subtext="Awaiting validation" alert={stats.pendingApprovals > 0} />
        </div>

        {/* MAIN VISITS GRAPH */}
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
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dy={10}>
                  <Label value="Time Period" offset={-10} position="insideBottom" fill="#475569" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
                </XAxis>
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false}>
                  <Label value="Visit Count" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#475569', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
                </YAxis>
                <Tooltip cursor={{fill: '#1e293b', opacity: 0.4}} content={<CustomTooltip labelText="Visits" />} />
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BOTTOM GROWTH GRIDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
          <GrowthCard title="Daily Signups" data={userGrowth} color="#3b82f6" icon={<Users size={18} className="text-blue-400"/>} yLabel="Users" />
          <GrowthCard title="Job Activity" data={jobGrowth} color="#a855f7" icon={<Briefcase size={18} className="text-purple-400"/>} yLabel="Jobs" type="step" />
        </div>
      </div>
    </div>
  );
}

/* --- REUSABLE COMPONENTS --- */

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