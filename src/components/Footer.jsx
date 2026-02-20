import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Section: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-slate-700 pb-8">

          {/* Column 1: Brand & Desc */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">CSC Empower Hub</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Your one-stop destination for Government Schemes, Application Forms, and Local Employment. We bridge the gap between essential resources and local talent in our community.
            </p>
            {/* <div className="flex gap-4">
              <a href="#" className="hover:text-blue-400 transition"><Facebook size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition"><Twitter size={20} /></a>
              <a href="#" className="hover:text-pink-500 transition"><Instagram size={20} /></a>
              <a href="#" className="hover:text-blue-600 transition"><Linkedin size={20} /></a>
              <a href="#" className="hover:text-green-500 transition"><MessageCircle size={20} /></a>
            </div> */}

          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white hover:underline transition">Home</Link></li>
              <li><Link to="/find-talent" className="hover:text-white hover:underline transition">Find a Job</Link></li>
              <li><Link to="/post-job" className="hover:text-white hover:underline transition">Post a Job</Link></li>
              <li><Link to="/terms" className="hover:text-white hover:underline transition">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
            <p className='text-slate-500'>Coming Soon</p>
            {/* <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-blue-500" />
                <a href="mailto:support@csc-hub.com" className="hover:text-white">support@csc-hub.com</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-green-500" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-red-500 mt-1" />
                <span>CSC Center, Main Road,<br />Kerala, India - 680001</span>
              </li>
            </ul> */}
          </div>

        </div>

        {/* Bottom Section: Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} CSC Empower Hub. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link to="/terms" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center">
          <p className="text-xs text-slate-500 leading-relaxed mt-4">
            Want your own website like this? <a target='blank' href="https://dossier-portfolio-zeta.vercel.app/" className="text-blue-400 hover:underline">Hire me</a> to get a custom-built site tailored to your needs!
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;