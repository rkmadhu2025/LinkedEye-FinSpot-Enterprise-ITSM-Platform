/**
 * LinkedEye-FinSpot Enterprise SMS & Voice Page
 * Twilio-powered SMS, Voice, and WhatsApp Communication Hub
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Phone, Send, CheckCircle, XCircle, Wifi, WifiOff,
  Users, AlertTriangle, Clock, Bell, PhoneCall, MessageCircle, Zap,
  Plus, X, Loader2, PhoneOff
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

const SMSVoicePage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const [activeTab, setActiveTab] = useState<TabType>('sms');
  const [connectivity, setConnectivity] = useState<ConnectivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<MessageHistory[]>([]);

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

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';
  const accentBlue = '#3b82f6';

  useEffect(() => {
    checkTwilioConnectivity();
  }, []);

  const checkTwilioConnectivity = async () => {
    setIsLoading(true);
    try {
      const result = await smsService.checkConnectivity();
      setConnectivity(result);
      if (result.connected) {
        toast.success('Twilio connected successfully');
      } else {
        toast.error('Twilio not connected');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to check connectivity');
      setConnectivity({ connected: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.to || !smsForm.message) {
      toast.error('Phone number and message are required');
      return;
    }

    setSmsSending(true);
    try {
      const result = await smsService.sendSMS(smsForm);
      if (result.success) {
        toast.success(`SMS sent successfully! SID: ${result.message_sid}`);
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
      toast.error('Phone number and message are required');
      return;
    }

    setVoiceCalling(true);
    try {
      const result = await smsService.makeCall(voiceForm);
      if (result.success) {
        toast.success(`Call initiated! SID: ${result.call_sid}`);
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
      toast.error('Phone number and message are required');
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
        toast.success(`WhatsApp sent! SID: ${result.message_sid}`);
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
      toast.error('Recipients and message are required');
      return;
    }

    try {
      const result = await smsService.sendBulkSMS({ recipients, message: bulkMessage });
      toast.success(`Bulk SMS sent: ${result.successful}/${result.total} successful`);
      setShowBulkModal(false);
      setBulkRecipients('');
      setBulkMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send bulk SMS');
    }
  };

  const tabs = [
    { id: 'sms' as TabType, label: 'SMS', icon: MessageSquare, color: '#22c55e' },
    { id: 'voice' as TabType, label: 'Voice Calls', icon: PhoneCall, color: '#3b82f6' },
    { id: 'whatsapp' as TabType, label: 'WhatsApp', icon: MessageCircle, color: '#25d366' },
    { id: 'history' as TabType, label: 'History', icon: Clock, color: '#a855f7' },
  ];

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">SMS & Voice Communications</h1>
            <p className="text-gray-400">Twilio-powered SMS, Voice, and WhatsApp messaging</p>
          </div>

          {/* Connectivity Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-gray-300">Checking...</span>
              </div>
            ) : connectivity?.connected ? (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <Wifi className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-green-400 font-medium">Twilio Connected</div>
                  <div className="text-xs text-gray-400">{connectivity.from_number}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <WifiOff className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-red-400 font-medium">Twilio Disconnected</div>
                  <div className="text-xs text-gray-400">Check configuration</div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{ background: accentBlue, border: `1px solid ${accentBlue}` }}
            >
              <Users className="w-4 h-4" />
              <span>Bulk SMS</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all"
            style={{
              background: activeTab === tab.id ? cardBg : 'transparent',
              border: `1px solid ${activeTab === tab.id ? tab.color : border}`,
              color: activeTab === tab.id ? tab.color : '#9ca3af'
            }}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Tab */}
        {activeTab === 'sms' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl"
            style={{ background: cardBg, border: `1px solid ${border}` }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Send SMS</h2>
                <p className="text-sm text-gray-400">Send text messages via Twilio</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={smsForm.to}
                  onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                  placeholder="+919176772077"
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
                <p className="text-xs text-gray-500 mt-1">Format: +[country code][number]</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={smsForm.message}
                  onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                  placeholder="Enter your message (max 1600 characters)"
                  rows={5}
                  maxLength={1600}
                  className="w-full px-4 py-2 rounded-lg text-white resize-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
                <p className="text-xs text-gray-500 mt-1">{smsForm.message.length} / 1600 characters</p>
              </div>

              <button
                onClick={handleSendSMS}
                disabled={smsSending || !connectivity?.connected}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: '#22c55e', border: '1px solid #22c55e' }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl"
            style={{ background: cardBg, border: `1px solid ${border}` }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <PhoneCall className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Make Voice Call</h2>
                <p className="text-sm text-gray-400">Text-to-speech voice calls</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={voiceForm.to}
                  onChange={(e) => setVoiceForm({ ...voiceForm, to: e.target.value })}
                  placeholder="+919176772077"
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message to Speak</label>
                <textarea
                  value={voiceForm.message}
                  onChange={(e) => setVoiceForm({ ...voiceForm, message: e.target.value })}
                  placeholder="This message will be spoken by text-to-speech"
                  rows={5}
                  className="w-full px-4 py-2 rounded-lg text-white resize-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
              </div>

              <button
                onClick={handleMakeCall}
                disabled={voiceCalling || !connectivity?.connected}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: accentBlue, border: `1px solid ${accentBlue}` }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl"
            style={{ background: cardBg, border: `1px solid ${border}` }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(37,211,102,0.15)' }}>
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Send WhatsApp</h2>
                <p className="text-sm text-gray-400">WhatsApp Business messaging</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={whatsappForm.to}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, to: e.target.value })}
                  placeholder="+919176772077"
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={whatsappForm.message}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
                  placeholder="WhatsApp message content"
                  rows={5}
                  className="w-full px-4 py-2 rounded-lg text-white resize-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Media URL (Optional)</label>
                <input
                  type="url"
                  value={whatsappForm.mediaUrl}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, mediaUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                />
              </div>

              <button
                onClick={handleSendWhatsApp}
                disabled={whatsappSending || !connectivity?.connected}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: '#25d366', border: '1px solid #25d366' }}
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

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 p-6 rounded-xl"
            style={{ background: cardBg, border: `1px solid ${border}` }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Message History</h2>

            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {item.type === 'sms' && <MessageSquare className="w-5 h-5 text-green-400 mt-1" />}
                        {item.type === 'voice' && <PhoneCall className="w-5 h-5 text-blue-400 mt-1" />}
                        {item.type === 'whatsapp' && <MessageCircle className="w-5 h-5 text-green-400 mt-1" />}

                        <div>
                          <div className="text-white font-medium">{item.to}</div>
                          <div className="text-sm text-gray-400 mt-1">{item.message}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(item.timestamp).toLocaleString()} • SID: {item.sid}
                          </div>
                        </div>
                      </div>

                      {item.status === 'sent' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {item.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bulk SMS Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-xl max-w-2xl w-full"
              style={{ background: cardBg, border: `1px solid ${border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Bulk SMS</h2>
                    <p className="text-sm text-gray-400">Send to multiple recipients</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)}>
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recipients (one per line)</label>
                  <textarea
                    value={bulkRecipients}
                    onChange={(e) => setBulkRecipients(e.target.value)}
                    placeholder="+919176772077&#10;+919876543210&#10;+918765432109"
                    rows={5}
                    className="w-full px-4 py-2 rounded-lg text-white resize-none font-mono text-sm"
                    style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkRecipients.split('\n').filter(r => r.trim()).length} recipients (max 100)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Message to send to all recipients"
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg text-white resize-none"
                    style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
                  />
                </div>

                <button
                  onClick={handleSendBulkSMS}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
                  style={{ background: accentBlue, border: `1px solid ${accentBlue}` }}
                >
                  <Send className="w-4 h-4" />
                  Send Bulk SMS
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
