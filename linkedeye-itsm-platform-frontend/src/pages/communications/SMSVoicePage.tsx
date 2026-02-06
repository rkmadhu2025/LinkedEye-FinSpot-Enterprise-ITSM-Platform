/**
 * LinkedEye-FinSpot Enterprise SMS & Voice Communications
 * Premium Datadog-inspired Design System
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Phone, Send, CheckCircle2, XCircle, Wifi, WifiOff,
  Users, Clock, PhoneCall, MessageCircle, Loader2, X, TrendingUp,
  Activity, Zap, AlertCircle, Info, ChevronRight, BarChart3
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';
import smsService, { ConnectivityResponse } from '@/services/smsService';

type TabType = 'sms' | 'voice' | 'whatsapp' | 'history';

interface MessageHistory {
  id: string;
  type: 'sms' | 'voice' | 'whatsapp';
  to: string;
  message: string;
  status: 'sent' | 'failed' | 'delivered';
  timestamp: string;
  sid?: string;
}

interface Stats {
  totalSent: number;
  successRate: number;
  avgResponseTime: number;
  activeNow: number;
}

const SMSVoicePage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const [activeTab, setActiveTab] = useState<TabType>('sms');
  const [connectivity, setConnectivity] = useState<ConnectivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<MessageHistory[]>([]);
  const [stats] = useState<Stats>({
    totalSent: 1247,
    successRate: 98.5,
    avgResponseTime: 1.2,
    activeNow: 3
  });

  // SMS Form State
  const [smsForm, setSmsForm] = useState({ to: '', message: '' });
  const [smsSending, setSmsSending] = useState(false);

  // Voice Form State
  const [voiceForm, setVoiceForm] = useState({ to: '', message: '' });
  const [voiceCalling, setVoiceCalling] = useState(false);

  // WhatsApp Form State
  const [whatsappForm, setWhatsappForm] = useState({ to: '', message: '', mediaUrl: '' });
  const [whatsappSending, setWhatsappSending] = useState(false);

  // Bulk SMS State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  useEffect(() => {
    checkTwilioConnectivity();
  }, []);

  const checkTwilioConnectivity = async () => {
    setIsLoading(true);
    try {
      const result = await smsService.checkConnectivity();
      setConnectivity(result);
      if (result.connected) {
        toast.success('Twilio connected');
      } else {
        toast.error('Twilio not connected');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Connection failed');
      setConnectivity({ connected: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.to || !smsForm.message) {
      toast.error('Phone number and message required');
      return;
    }

    setSmsSending(true);
    try {
      const result = await smsService.sendSMS(smsForm);
      if (result.success) {
        toast.success('SMS sent successfully');
        setHistory([
          { id: Date.now().toString(), type: 'sms', to: smsForm.to, message: smsForm.message, status: 'sent', timestamp: new Date().toISOString(), sid: result.message_sid },
          ...history
        ]);
        setSmsForm({ to: '', message: '' });
      } else {
        toast.error(result.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  };

  const handleMakeCall = async () => {
    if (!voiceForm.to || !voiceForm.message) {
      toast.error('Phone number and message required');
      return;
    }

    setVoiceCalling(true);
    try {
      const result = await smsService.makeCall(voiceForm);
      if (result.success) {
        toast.success('Call initiated');
        setHistory([
          { id: Date.now().toString(), type: 'voice', to: voiceForm.to, message: voiceForm.message, status: 'sent', timestamp: new Date().toISOString(), sid: result.call_sid },
          ...history
        ]);
        setVoiceForm({ to: '', message: '' });
      } else {
        toast.error(result.error || 'Failed to make call');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to make call');
    } finally {
      setVoiceCalling(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappForm.to || !whatsappForm.message) {
      toast.error('Phone number and message required');
      return;
    }

    setWhatsappSending(true);
    try {
      const result = await smsService.sendWhatsApp({
        to: whatsappForm.to,
        message: whatsappForm.message,
        media_url: whatsappForm.mediaUrl || undefined
      });
      if (result.success) {
        toast.success('WhatsApp sent');
        setHistory([
          { id: Date.now().toString(), type: 'whatsapp', to: whatsappForm.to, message: whatsappForm.message, status: 'sent', timestamp: new Date().toISOString(), sid: result.message_sid },
          ...history
        ]);
        setWhatsappForm({ to: '', message: '', mediaUrl: '' });
      } else {
        toast.error(result.error || 'Failed to send WhatsApp');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send WhatsApp');
    } finally {
      setWhatsappSending(false);
    }
  };

  const handleSendBulkSMS = async () => {
    const recipients = bulkRecipients.split('\n').map(r => r.trim()).filter(r => r);
    if (recipients.length === 0 || !bulkMessage) {
      toast.error('Recipients and message required');
      return;
    }

    try {
      const result = await smsService.sendBulkSMS({ recipients, message: bulkMessage });
      toast.success(`Bulk SMS: ${result.successful}/${result.total} sent`);
      setShowBulkModal(false);
      setBulkRecipients('');
      setBulkMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Bulk send failed');
    }
  };

  const tabs = [
    { id: 'sms' as TabType, label: 'SMS', icon: MessageSquare, count: 247 },
    { id: 'voice' as TabType, label: 'Voice', icon: PhoneCall, count: 89 },
    { id: 'whatsapp' as TabType, label: 'WhatsApp', icon: MessageCircle, count: 156 },
    { id: 'history' as TabType, label: 'Activity', icon: Clock, count: history.length },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Premium Header - Datadog Style */}
      <div className="bg-gradient-to-r from-[#1a1f2e] to-[#151923] border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">Communications Hub</h1>
                  <p className="text-[13px] text-gray-400 mt-0.5">Twilio-powered messaging & voice platform</p>
                </div>
              </div>
            </div>

            {/* Status Badge - Premium Design */}
            <div className="flex items-center gap-4">
              {isLoading ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm font-medium text-blue-400">Checking...</span>
                </div>
              ) : connectivity?.connected ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">Connected</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{connectivity.from_number}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <div>
                    <div className="text-sm font-semibold text-red-400">Disconnected</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Check config</div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 font-medium text-sm"
              >
                <Users className="w-4 h-4" />
                Bulk Send
              </button>
            </div>
          </div>

          {/* Stats Bar - Datadog Style */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Sent</div>
                  <div className="text-2xl font-bold text-white">{stats.totalSent.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-emerald-400">{stats.successRate}%</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Avg Response</div>
                  <div className="text-2xl font-bold text-white">{stats.avgResponseTime}s</div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Active Now</div>
                  <div className="text-2xl font-bold text-white">{stats.activeNow}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-500/10">
                  <Activity className="w-5 h-5 text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Navigation Tabs */}
      <div className="bg-[#151923] border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-8">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2.5 px-5 py-4 font-medium text-[13px] transition-all
                  ${activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
              >
                <tab.icon className="w-[18px] h-[18px]" />
                <span>{tab.label}</span>
                <span className={`
                  px-2 py-0.5 rounded-md text-[11px] font-semibold
                  ${activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-white/[0.05] text-gray-500'
                  }
                `}>
                  {tab.count}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-blue-500"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Send SMS</h3>
                    <p className="text-[13px] text-gray-400 mt-0.5">Send text messages instantly</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={smsForm.to}
                    onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">E.164 format: +[country code][number]</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={smsForm.message}
                    onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                    placeholder="Type your message here..."
                    rows={6}
                    maxLength={1600}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-sm"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-gray-500">Maximum 1600 characters</p>
                    <p className={`text-[11px] font-medium ${smsForm.message.length > 1500 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {smsForm.message.length} / 1600
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSendSMS}
                  disabled={smsSending || !connectivity?.connected}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg shadow-emerald-500/25"
                >
                  {smsSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send SMS
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Voice Tab */}
          {activeTab === 'voice' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <PhoneCall className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Voice Call</h3>
                    <p className="text-[13px] text-gray-400 mt-0.5">Text-to-speech phone calls</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={voiceForm.to}
                    onChange={(e) => setVoiceForm({ ...voiceForm, to: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Message to Speak</label>
                  <textarea
                    value={voiceForm.message}
                    onChange={(e) => setVoiceForm({ ...voiceForm, message: e.target.value })}
                    placeholder="This message will be converted to speech..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
                  />
                </div>

                <button
                  onClick={handleMakeCall}
                  disabled={voiceCalling || !connectivity?.connected}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg shadow-blue-500/25"
                >
                  {voiceCalling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Make Call
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* WhatsApp Tab */}
          {activeTab === 'whatsapp' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">WhatsApp Business</h3>
                    <p className="text-[13px] text-gray-400 mt-0.5">Send rich media messages</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={whatsappForm.to}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, to: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={whatsappForm.message}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
                    placeholder="WhatsApp message content..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Media URL (Optional)</label>
                  <input
                    type="url"
                    value={whatsappForm.mediaUrl}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, mediaUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
                  />
                </div>

                <button
                  onClick={handleSendWhatsApp}
                  disabled={whatsappSending || !connectivity?.connected}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg shadow-green-500/25"
                >
                  {whatsappSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send WhatsApp
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Activity History Tab */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-[#1a1f2e] rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10">
                      <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Activity Timeline</h3>
                      <p className="text-[13px] text-gray-400 mt-0.5">Recent message activity</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-400">
                    <BarChart3 className="w-4 h-4" />
                    <span>{history.length} total events</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {history.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-4 rounded-2xl bg-white/[0.02] inline-block mb-4">
                      <Clock className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No messages sent yet</p>
                    <p className="text-[13px] text-gray-500 mt-1">Send your first message to see activity here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="group p-4 rounded-xl bg-black/20 border border-white/[0.04] hover:bg-black/30 hover:border-white/[0.08] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-lg ${
                            item.type === 'sms' ? 'bg-emerald-500/10' :
                            item.type === 'voice' ? 'bg-blue-500/10' : 'bg-green-500/10'
                          }`}>
                            {item.type === 'sms' && <MessageSquare className="w-4 h-4 text-emerald-400" />}
                            {item.type === 'voice' && <PhoneCall className="w-4 h-4 text-blue-400" />}
                            {item.type === 'whatsapp' && <MessageCircle className="w-4 h-4 text-green-400" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white text-sm">{item.to}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] text-gray-400 uppercase tracking-wide">
                                {item.type}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-400 leading-relaxed mb-2">{item.message}</p>
                            <div className="flex items-center gap-4 text-[11px] text-gray-500">
                              <span>{new Date(item.timestamp).toLocaleString()}</span>
                              {item.sid && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">SID: {item.sid.substring(0, 20)}...</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            {item.status === 'sent' && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[11px] font-semibold">Sent</span>
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span className="text-[11px] font-semibold">Failed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Premium Bulk SMS Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.08] max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Bulk SMS Campaign</h2>
                    <p className="text-[13px] text-gray-400 mt-0.5">Send to multiple recipients</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Recipients (one per line)</label>
                  <textarea
                    value={bulkRecipients}
                    onChange={(e) => setBulkRecipients(e.target.value)}
                    placeholder="+1 (555) 123-4567&#10;+1 (555) 234-5678&#10;+1 (555) 345-6789"
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-gray-500">Maximum 100 recipients</p>
                    <p className="text-[11px] font-medium text-purple-400">
                      {bulkRecipients.split('\n').filter(r => r.trim()).length} recipients
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Message to send to all recipients..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <p className="text-[13px] text-gray-300">
                    All recipients will receive the same message. Delivery reports will be tracked individually.
                  </p>
                </div>

                <button
                  onClick={handleSendBulkSMS}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all font-semibold text-sm shadow-lg shadow-purple-500/25"
                >
                  <Send className="w-4 h-4" />
                  Send to {bulkRecipients.split('\n').filter(r => r.trim()).length} Recipients
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SMSVoicePage;
