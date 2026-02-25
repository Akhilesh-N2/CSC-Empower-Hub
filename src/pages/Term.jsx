import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, AlertCircle } from 'lucide-react';

const Terms = () => {
  // OPTIMIZATION: Hardcoding the date is legally safer and prevents React hydration errors.
  const LAST_UPDATED = "February 25, 2026"; 
  
  // Use your admin email from env or fallback
  const SUPPORT_EMAIL = import.meta.env.VITE_ADMIN_USERNAME || "akhileshthrissur@gmail.com";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white">
          <Link to="/" className="inline-flex items-center text-slate-300 hover:text-white mb-6 transition group">
            <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 text-gray-600">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} /> 1. Introduction
            </h2>
            <p>
              Welcome to <strong>CSC Empower Hub</strong> ("we," "our," or "us"). By accessing or using our job portal, 
              you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, 
              you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="text-blue-600" size={24} /> 2. User Responsibilities
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Job Seekers:</strong> You agree that all information provided in your profile is accurate and truthful.</li>
              <li><strong>Job Providers:</strong> You agree to post only genuine job vacancies. We reserve the right to remove any listing deemed fake or misleading.</li>
              <li>You are responsible for maintaining the confidentiality of your account password and activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="text-blue-600" size={24} /> 3. Liability Disclaimer
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800 rounded-r-lg">
              <p className="font-bold mb-1">Important Notice:</p>
              <p>
                CSC Empower Hub acts strictly as an intermediary platform. We do not guarantee job placement for Seekers 
                nor do we guarantee the quality of employees for Providers. We are not liable for any disputes, 
                unpaid wages, or workplace issues that arise between users.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Content & Privacy</h2>
            <p>
              By posting content (jobs or profiles), you grant us the right to display this information to other users. 
              We respect your privacy and will not sell your personal contact details to third-party marketers without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account immediately, without prior notice or liability, 
              if you breach these Terms (e.g., posting scams, fraudulent listings, or abusive behavior).
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 text-center">
            <p className="mb-4">Questions about these terms?</p>
            <a 
              href={`mailto:${SUPPORT_EMAIL}`} 
              className="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors shadow-lg active:scale-95"
            >
              Contact Support
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Terms;