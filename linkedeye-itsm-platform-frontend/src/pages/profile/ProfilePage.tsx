/**
 * Architect Professional Profile Page
 * 
 * An immersive, executive-level personal identity management interface.
 */

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks/useRedux';
import { userService } from '../../services/userService';
import { toast } from 'react-hot-toast';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Clock, 
  Globe, 
  Save,
  Shield,
  Zap,
  Activity,
  Award,
  Fingerprint,
  Sparkles,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { User } from '@/types';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  phone: string;
  timezone: string;
}

const ProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    phone: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        department: user.department || '',
        phone: user.phone || '',
        timezone: user.timezone || 'UTC',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsSubmitting(true);
    try {
      await userService.updateUser(user.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
        phone: formData.phone,
        timezone: formData.timezone,
      });
      toast.success('Identity Mesh Updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync identity');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="architect-root min-h-screen flex items-center justify-center">
        <div className="relative">
           <div className="w-24 h-24 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
           <div className="absolute inset-4 border-2 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin-slow" />
        </div>
      </div>
    );
  }

  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || 'System User';

  return (
    <div className="architect-root min-h-screen p-6 lg:p-10 relative overflow-hidden">
      <div className="mesh-aura" />
      
      {/* Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-blob delay-2000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Executive Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="architect-card overflow-hidden"
        >
           <div className="h-32 bg-gradient-to-r from-indigo-600/20 via-slate-900/40 to-cyan-600/20 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
           </div>
           <div className="px-8 pb-8 -mt-12 flex flex-col md:flex-row items-end gap-6 border-b border-white/5">
              <div className="relative group">
                 <div className="w-32 h-32 rounded-3xl bg-slate-950 border-4 border-slate-900 overflow-hidden shadow-2xl relative">
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">
                       {formData.firstName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                       <Camera size={24} className="text-white" />
                    </div>
                 </div>
                 <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-emerald-500 border-4 border-slate-900 flex items-center justify-center" title="Verified Identity">
                    <Shield size={14} className="text-white" />
                 </div>
              </div>

              <div className="flex-1 space-y-2 mb-2">
                 <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-white tracking-tighter">{displayName}</h1>
                    <div className="badge-hyper bg-indigo-500/10 text-indigo-400">Level 4 Clearance</div>
                 </div>
                 <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Briefcase size={14} className="text-indigo-400/70" /> {formData.department || 'Infrastructure'}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Globe size={14} className="text-cyan-400/70" /> {formData.timezone}</span>
                    <span className="flex items-center gap-1.5 border-l border-white/10 pl-4 capitalize whitespace-nowrap">
                       <Activity size={14} className="text-emerald-400/70" /> {user?.roles?.[0]?.name || 'operator'}
                    </span>
                 </div>
              </div>

              <div className="flex gap-3 mb-2">
                 <button className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5 whitespace-nowrap">
                    View Logs
                 </button>
                 <button 
                   onClick={(e) => handleSubmit(e as any)}
                   disabled={isSubmitting}
                   className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 whitespace-nowrap"
                 >
                    {isSubmitting ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
                    Sync Identity
                 </button>
              </div>
           </div>

           {/* Quick Telemetry Bar */}
           <div className="px-8 py-4 bg-white/2 backdrop-blur-sm flex items-center gap-8 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-3 whitespace-nowrap">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Digital Heartbeat</span>
                 <span className="text-xs font-mono text-emerald-400">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-3 whitespace-nowrap">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Access Tokens</span>
                 <span className="text-xs font-mono text-indigo-400">12 Active</span>
              </div>
              <div className="flex items-center gap-3 whitespace-nowrap">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Last Auth</span>
                 <span className="text-xs font-mono text-cyan-400">2 min ago</span>
              </div>
           </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Column: Form Settings */}
           <div className="lg:col-span-2 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="architect-card p-8"
              >
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                       <Fingerprint size={20} />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-white">Identity Configuration</h2>
                       <p className="text-xs text-slate-500">Configure your professional profile and digital signature</p>
                    </div>
                 </div>

                 <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label htmlFor="firstName" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                          <div className="relative group">
                             <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                             <input 
                               id="firstName"
                               type="text" 
                               name="firstName"
                               value={formData.firstName}
                               onChange={handleInputChange}
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="lastName" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                          <div className="relative group">
                             <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                             <input 
                               id="lastName"
                               type="text" 
                               name="lastName"
                               value={formData.lastName}
                               onChange={handleInputChange}
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Email Address</label>
                          <div className="relative group opacity-60 cursor-not-allowed">
                             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                             <input 
                               id="email"
                               type="email" 
                               value={formData.email}
                               disabled
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none transition-all font-mono"
                             />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Shield size={14} className="text-slate-600" />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="department" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Department / Division</label>
                          <div className="relative group">
                             <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                             <input 
                               id="department"
                               type="text" 
                               name="department"
                               value={formData.department}
                               onChange={handleInputChange}
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label htmlFor="phone" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comms Protocol (Phone)</label>
                          <div className="relative group">
                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                             <input 
                               id="phone"
                               type="tel" 
                               name="phone"
                               value={formData.phone}
                               onChange={handleInputChange}
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="timezone" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Temporal Sync (Timezone)</label>
                          <div className="relative group">
                             <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                             <select 
                               id="timezone"
                               name="timezone"
                               value={formData.timezone}
                               onChange={handleInputChange}
                               className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none font-medium"
                             >
                                <option value="UTC">UTC (Universal Protocol)</option>
                                <option value="Asia/Kolkata">IST (Kolkata)</option>
                                <option value="America/New_York">EST (New York)</option>
                                <option value="Europe/London">GMT (London)</option>
                                <option value="Asia/Tokyo">JST (Tokyo)</option>
                             </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                <Activity size={16} />
                             </div>
                          </div>
                       </div>
                    </div>
                 </form>
              </motion.div>

              {/* Advanced Access Settings */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="architect-card p-8 border-indigo-500/10"
              >
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                           <Zap size={20} />
                        </div>
                        <div>
                           <h2 className="text-lg font-bold text-white">System Authorization</h2>
                           <p className="text-xs text-slate-500">Manage your two-factor and cryptographic signatures</p>
                        </div>
                     </div>
                     <button className="badge-hyper bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Secure</button>
                  </div>

                  <div className="space-y-4">
                     {[
                        { title: 'Biometric Handshake', desc: 'Secure login via hardware key/biometrics', active: true, icon: <Fingerprint size={16} /> },
                        { title: 'Temporal Auth (2FA)', desc: 'Dynamic code generation for ultra-secure access', active: true, icon: <Clock size={16} /> },
                        { title: 'SSH Identity Mesh', desc: 'Manage your public keys for terminal access', active: false, icon: <Activity size={16} /> }
                     ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">{item.icon}</div>
                              <div>
                                 <p className="text-sm font-bold text-slate-300">{item.title}</p>
                                 <p className="text-xs text-slate-600">{item.desc}</p>
                              </div>
                           </div>
                           <div className={clsx(
                             "w-10 h-5 rounded-full relative transition-all cursor-pointer",
                             item.active ? "bg-indigo-500" : "bg-slate-800"
                           )}>
                              <div className={clsx(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                item.active ? "right-1" : "left-1"
                              )} />
                           </div>
                        </div>
                     ))}
                  </div>
              </motion.div>
           </div>

           {/* Right Column: Achievements & Stats */}
           <div className="space-y-8">
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="architect-card p-6"
              >
                 <h3 className="text-sm font-bold text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Award size={16} className="text-amber-400" />
                    Career Milestones
                 </h3>
                 <div className="space-y-6">
                    {[
                       { label: 'System Purity', val: 'Elite', color: 'indigo-500' },
                       { label: 'Operational Speed', val: 'Fast+', color: 'cyan-500' },
                       { label: 'Security Score', val: '980', color: 'emerald-500' }
                    ].map((stat, idx) => (
                       <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                             <span>{stat.label}</span>
                             <span className={clsx(`text-${stat.color}`)}>{stat.val}</span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '85%' }}
                                className={clsx(`h-full bg-${stat.color} shadow-[0_0_10px_rgba(99,102,241,0.5)]`)}
                             />
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="architect-card p-6 relative overflow-hidden group"
              >
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={60} className="text-indigo-400" />
                 </div>
                 <h3 className="text-sm font-bold text-white uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <Shield size={16} className="text-indigo-400" />
                    Pro Identity Access
                 </h3>
                 <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    You are currently using the **LinkedEye Architect Pro** license. Your identity is proxied through our global zero-trust mesh.
                 </p>
                 <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                    Generate Access Key
                 </button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="architect-card p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20"
              >
                 <div className="flex flex-col items-center text-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                       <Activity size={32} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                       <h4 className="text-white font-bold tracking-tight">Real-time Telemetry</h4>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Identity Mesh Sync</p>
                    </div>
                    <div className="w-full h-12 flex items-end justify-between gap-1 mt-2">
                       {[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6, 1.0, 0.7].map((h, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [`${h*100}%`, `${Math.random()*100}%`, `${h*100}%`] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex-1 bg-indigo-500/40 rounded-t-sm" 
                          />
                       ))}
                    </div>
                 </div>
              </motion.div>

           </div>

        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
