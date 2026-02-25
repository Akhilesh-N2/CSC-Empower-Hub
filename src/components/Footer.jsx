import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  // Use a hardcoded year or a stable variable to avoid hydration mismatches
  const currentYear = 2026;

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Section: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8 border-b border-slate-800 pb-12">

          {/* Column 1: Brand & Desc */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              CSC <span className="text-blue-400">Empower</span> Hub
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Your one-stop destination for Government Schemes, Application Forms, and Local Employment. We bridge the gap between essential resources and local talent.
            </p>
            {/* SOCIALS: Uncomment when you have handles! */}
            {/* <div className="flex gap-4 pt-2">
               <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors"><Facebook size={20} /></a>
               <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors"><Instagram size={20} /></a>
            </div> */}
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
              <li><Link to="/job-search" className="hover:text-blue-400 transition-colors">Browse Jobs</Link></li>
              <li><Link to="/forms" className="hover:text-blue-400 transition-colors">Government Forms</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms & Privacy</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Support</h4>
            <div className="space-y-4">
               {/* Pre-fill with your optimized email logic */}
               <div className="flex items-center gap-3 text-sm">
                 <Mail size={16} className="text-blue-400 shrink-0" />
                 <a href="mailto:akhileshthrissur@gmail.com" className="hover:text-white transition-colors">akhileshthrissur@gmail.com</a>
               </div>
               <div className="flex items-center gap-3 text-sm text-slate-500">
                 <MapPin size={16} className="text-slate-600 shrink-0" />
                 <span>Kerala, India</span>
               </div>
               <p className="text-xs text-slate-600 italic pt-2">Local support coming soon</p>
            </div>
          </div>

        </div>

        {/* Bottom Section: Copyright & Creator */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[11px] text-slate-500 uppercase tracking-widest">
            &copy; {currentYear} CSC Empower Hub &bull; All rights reserved.
          </div>
          
          <div className="bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
            <p className="text-[11px] text-slate-400">
              Developed by <a target='_blank' rel="noreferrer" href="https://dossier-portfolio-zeta.vercel.app/" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Akhilesh N</a>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;