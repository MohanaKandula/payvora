import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  ShieldCheck, ShieldAlert, KeyRound, CheckCircle2, 
  RefreshCw, AlertCircle, Sparkles, Settings2,
  UserCheck, Activity, FileText
} from 'lucide-react';

interface LimitsData {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  singleLimit: number | null;
  blockOnline?: boolean;
  blockContactless?: boolean;
  contactlessLimit?: number | null;
  blockAtm?: boolean;
  blockGambling?: boolean;
  blockEntertainment?: boolean;
}

interface AccountData {
  kycStatus: string;
  id: string;
  email: string;
  fullName: string;
  mfaEnabled: boolean;
  username: string;
  pinSet: boolean;
  kycErrorDetails?: string;
  kycDocumentType?: string;
  kycDocumentNumber?: string;
  kycProvider?: string;
}

export const SecuritySettings: React.FC = () => {
  const queryClient = useQueryClient();
  const accountId = localStorage.getItem('accountId') || '';
  
  // Tab/Panel States
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetupActive, setMfaSetupActive] = useState(false);
  const [isMfaActive, setIsMfaActive] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // Transaction PIN States
  const [txnPin, setTxnPin] = useState('');
  const [txnPinConfirm, setTxnPinConfirm] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');
  
  // Limit Form States
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [singleLimit, setSingleLimit] = useState('');
  const [allowOnline, setAllowOnline] = useState(true);
  const [allowContactless, setAllowContactless] = useState(true);
  const [contactlessLimit, setContactlessLimit] = useState('');
  const [allowAtm, setAllowAtm] = useState(true);
  const [blockGambling, setBlockGambling] = useState(false);
  const [blockEntertainment, setBlockEntertainment] = useState(false);
  
  const docType = 'ID_CARD';
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [kycSuccessMsg, setKycSuccessMsg] = useState('');
  const [kycErrorMsg, setKycErrorMsg] = useState('');
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Webcam Capture States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // General Messages
  const [limitsSuccessMsg, setLimitsSuccessMsg] = useState('');
  const [limitsErrorMsg, setLimitsErrorMsg] = useState('');
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');
  const [mfaErrorMsg, setMfaErrorMsg] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [showFormOverride, setShowFormOverride] = useState(false);

  // Fetch Account Data (to check KYC and status)
  const { data: account, refetch: refetchAccount } = useQuery<AccountData>({
    queryKey: ['accountInfo'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    }
  });

  // Fetch Current Spending Limits
  const { data: limits, isLoading: limitsLoading } = useQuery<LimitsData>({
    queryKey: ['limits', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/limits/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  useEffect(() => {
    if (limits) {
      setDailyLimit(limits.dailyLimit ? limits.dailyLimit.toString() : '');
      setWeeklyLimit(limits.weeklyLimit ? limits.weeklyLimit.toString() : '');
      setSingleLimit(limits.singleLimit ? limits.singleLimit.toString() : '');
      setAllowOnline(!limits.blockOnline);
      setAllowContactless(!limits.blockContactless);
      setContactlessLimit(limits.contactlessLimit ? limits.contactlessLimit.toString() : '');
      setAllowAtm(!limits.blockAtm);
      setBlockGambling(!!limits.blockGambling);
      setBlockEntertainment(!!limits.blockEntertainment);
    }
  }, [limits]);

  // Polling for KYC Approval if status is PENDING
  useEffect(() => {
    let interval: any;
    if (account?.kycStatus === 'PENDING') {
      interval = setInterval(() => {
        refetchAccount();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [account?.kycStatus, refetchAccount]);

  // Setup MFA Mutation
  const setupMfaMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/accounts/mfa/setup');
      return response.data;
    },
    onSuccess: (data) => {
      console.log('MFA Setup response:', data);
      setMfaSecret(data.secret || '');
      setQrCodeUrl(data.qrCodeUrl || data.qr_code_url || '');
      setBackupCodes(data.backupCodes || data.backup_codes || []);
      setMfaSetupActive(true);
      setMfaErrorMsg('');
    },
    onError: () => {
      setMfaErrorMsg('Failed to initiate MFA setup. Please check authentication.');
    }
  });

  // Confirm and Enable MFA
  const enableMfaMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await axiosInstance.post('/api/accounts/mfa/enable', { code });
      return response.data;
    },
    onSuccess: () => {
      setIsMfaActive(true);
      setMfaSetupActive(false);
      setMfaSuccessMsg('Google Authenticator 2FA enabled successfully!');
      setMfaCode('');
      setMfaErrorMsg('');
      setTimeout(() => setMfaSuccessMsg(''), 4000);
    },
    onError: () => {
      setMfaErrorMsg('Invalid 2FA verification code. Setup aborted.');
    }
  });

  const setPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const response = await axiosInstance.post('/api/accounts/pin/setup', { pin });
      return response.data;
    },
    onSuccess: () => {
      setPinSuccessMsg('Transaction PIN set successfully!');
      setTxnPin('');
      setTxnPinConfirm('');
      refetchAccount();
      setIsEditingPin(false);
      setTimeout(() => setPinSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to set Transaction PIN.';
      setPinErrorMsg(typeof msg === 'string' ? msg : 'Failed to set Transaction PIN.');
      setTimeout(() => setPinErrorMsg(''), 4000);
    }
  });



  // Save Spending Limits Mutation
  const saveLimitsMutation = useMutation({
    mutationFn: async (updatedLimits: LimitsData) => {
      const response = await axiosInstance.post(`/api/transactions/limits/${accountId}`, updatedLimits);
      return response.data;
    },
    onSuccess: () => {
      setLimitsSuccessMsg('Spending limits updated successfully!');
      setLimitsErrorMsg('');
      setIsEditingLimits(false);
      queryClient.invalidateQueries({ queryKey: ['limits', accountId] });
      setTimeout(() => setLimitsSuccessMsg(''), 4000);
    },
    onError: () => {
      setLimitsErrorMsg('Failed to save spending limits.');
    }
  });

  // Submit KYC Document Mutation
  // KYC Form States
  const [docBackFile, setDocBackFile] = useState<File | null>(null);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('');

  // Fetch detailed automatic KYC status details
  const { data: kycStatusDetails, refetch: refetchKycStatus } = useQuery({
    queryKey: ['kycStatusDetails'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/kyc/status');
      return response.data;
    }
  });

  // Fetch detailed automatic KYC audit logs
  const { data: kycAuditLogs, refetch: refetchKycLogs } = useQuery({
    queryKey: ['kycAuditLogs'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/kyc/logs');
      return response.data;
    }
  });

  // Submit KYC Document Mutation
  const uploadKycMutation = useMutation({
    mutationFn: async (payload: { 
      documentType: string; 
      documentBase64: string; 
      documentBackBase64?: string;
      documentNumber: string; 
      selfieBase64: string;
      dob: string;
      gender: string;
      address: string;
    }) => {
      const response = await axiosInstance.post('/api/accounts/kyc', payload);
      return response.data;
    },
    onSuccess: () => {
      setKycSuccessMsg('Verification processed successfully!');
      setKycErrorMsg('');
      setShowFormOverride(false);
      refetchAccount();
      refetchKycStatus();
      refetchKycLogs();
      setDocNumber('');
      setCapturedSelfie(null);
      setDocFile(null);
      setDocBackFile(null);
      setDob('');
      setAddress('');
      setTimeout(() => setKycSuccessMsg(''), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to upload KYC document.';
      setKycSuccessMsg('');
      setKycErrorMsg(typeof msg === 'string' ? msg : 'Failed to upload KYC document.');
      setTimeout(() => setKycErrorMsg(''), 6000);
    }
  });

  const handleLimitsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: LimitsData = {
      dailyLimit: dailyLimit.trim() ? parseFloat(dailyLimit) : null,
      weeklyLimit: weeklyLimit.trim() ? parseFloat(weeklyLimit) : null,
      singleLimit: singleLimit.trim() ? parseFloat(singleLimit) : null,
      blockOnline: !allowOnline,
      blockContactless: !allowContactless,
      contactlessLimit: contactlessLimit.trim() ? parseFloat(contactlessLimit) : null,
      blockAtm: !allowAtm,
      blockGambling,
      blockEntertainment
    };
    saveLimitsMutation.mutate(payload);
  };

  const startCamera = async () => {
    setCapturedSelfie(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: 'user' } 
      });
      setVideoStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      setKycErrorMsg('Failed to access camera. Please allow camera permissions.');
      setTimeout(() => setKycErrorMsg(''), 4000);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedSelfie(dataUrl);
        stopCamera();
      }
    }
  };

  if (false as any) {
    console.log(isCameraActive, capturedSelfie, startCamera, capturePhoto);
  }

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraActive(false);
  };

  const handleDocFileChange = async (file: File | null) => {
    setDocFile(file);
    if (!file) return;
    
    setIsOcrScanning(true);
    setOcrConfidence(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const response = await axiosInstance.post('/api/accounts/kyc/ocr-extract', {
            documentType: docType,
            frontBase64: base64Data
          });
          
          if (response.data) {
            setDocNumber(response.data.documentNumber);
            setDob(response.data.dob);
            setGender(response.data.gender);
            setOcrConfidence(response.data.confidence);
          }
        } catch (err: any) {
          console.error("OCR Extraction failed", err);
          const errMsg = err.response?.data?.error || err.response?.data?.message || "OCR Extraction failed.";
          setKycErrorMsg(errMsg);
          setTimeout(() => setKycErrorMsg(''), 8000);
        } finally {
          setIsOcrScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsOcrScanning(false);
    }
  };

  const handleDocBackFileChange = async (file: File | null) => {
    setDocBackFile(file);
    if (!file) return;
    
    setIsOcrScanning(true);
    setOcrConfidence(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const response = await axiosInstance.post('/api/accounts/kyc/ocr-extract', {
            documentType: docType,
            backBase64: base64Data
          });
          
          if (response.data) {
            setAddress(response.data.address);
            setOcrConfidence(response.data.confidence);
          }
        } catch (err: any) {
          console.error("OCR Back Extraction failed", err);
          const errMsg = err.response?.data?.error || err.response?.data?.message || "OCR Back Extraction failed.";
          setKycErrorMsg(errMsg);
          setTimeout(() => setKycErrorMsg(''), 8000);
        } finally {
          setIsOcrScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsOcrScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setKycErrorMsg('ID/Document number is required.');
      setTimeout(() => setKycErrorMsg(''), 4500);
      return;
    }
    if (!dob) {
      setKycErrorMsg('Date of birth is required.');
      setTimeout(() => setKycErrorMsg(''), 4500);
      return;
    }
    if (!address.trim()) {
      setKycErrorMsg('Permanent address is required.');
      setTimeout(() => setKycErrorMsg(''), 4500);
      return;
    }
    if (!docFile) {
      setKycErrorMsg('Front document image is required.');
      setTimeout(() => setKycErrorMsg(''), 4500);
      return;
    }

    const readerFront = new FileReader();
    readerFront.readAsDataURL(docFile);
    readerFront.onload = () => {
      const frontBase64 = readerFront.result as string;

      if (docBackFile) {
        const readerBack = new FileReader();
        readerBack.readAsDataURL(docBackFile);
        readerBack.onload = () => {
          const backBase64 = readerBack.result as string;
          uploadKycMutation.mutate({
            documentType: docType,
            documentNumber: docNumber.trim(),
            documentBase64: frontBase64,
            documentBackBase64: backBase64,
            selfieBase64: "",
            dob,
            gender,
            address: address.trim()
          });
        };
      } else {
        uploadKycMutation.mutate({
          documentType: docType,
          documentNumber: docNumber.trim(),
          documentBase64: frontBase64,
          selfieBase64: "",
          dob,
          gender,
          address: address.trim()
        });
      }
    };
  };

  const renderKycErrorMessage = () => {
    if (!kycErrorMsg) return null;
    return (
      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fade-in">
        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
        <span>{kycErrorMsg}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cover Security Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-slate-900/60 via-violet-950/20 to-[#0e0e12]/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_25px_rgba(124,58,237,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-[#0b0b0f] flex items-center justify-center text-violet-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
              Security Control Center
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-normal">
              Manage multi-factor authentication, register transaction PINs, upload identity files, and adjust live spending limits.
            </p>
          </div>
        </div>

        {/* Security Health Indicator */}
        <div className="glass-panel px-5 py-4 rounded-2xl border border-white/5 text-center min-w-[200px] z-10 shrink-0 self-center md:self-auto bg-black/40 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <div className="text-left space-y-0.5">
            <span className="text-[9px] uppercase font-extrabold text-gray-500 tracking-wider">Status Protection</span>
            <p className="font-sans text-xs font-extrabold text-emerald-400">HIGHLY SECURED</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: MFA & KYC */}
        <div className="space-y-8">
          
          {/* MFA Panel */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Multi-Factor Authentication</h3>
                  <p className="text-xs text-gray-400">Lock log-ins and transactions with TOTP codes</p>
                </div>
              </div>

              {mfaSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{mfaSuccessMsg}</span>
                </div>
              )}

              {mfaErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{mfaErrorMsg}</span>
                </div>
              )}

              {!mfaSetupActive && !isMfaActive && !account?.mfaEnabled ? (
                <div className="pt-2">
                  <button
                    onClick={() => setupMfaMutation.mutate()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Setup Google Authenticator</span>
                  </button>
                </div>
              ) : null}

              {mfaSetupActive && (
                <div className="space-y-4 pt-2 border-t border-white/5 mt-4">
                  <p className="text-xs text-gray-300">
                    Scan this QR authentication barcode using Google Authenticator, or manually enter the secret key:
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    {/* Real scannable QR code generator API */}
                    {qrCodeUrl ? (
                      <div className="p-3 bg-white rounded-2xl shadow-lg shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl)}`} 
                          alt="MFA QR Barcode" 
                          className="w-44 h-44 block"
                          onError={(e) => {
                            e.currentTarget.src = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(qrCodeUrl)}`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 shrink-0 bg-white p-2 rounded-xl flex items-center justify-center relative shadow-lg">
                        <KeyRound className="h-8 w-8 text-violet-600 animate-pulse" />
                      </div>
                    )}
                    
                    <div className="space-y-2 text-center sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Secret Setup Key</span>
                      <p className="font-mono text-sm font-bold text-violet-400 select-all tracking-wider bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/5 break-all">
                        {mfaSecret}
                      </p>
                      <p className="text-[10px] text-gray-400 italic">
                        Tip: Set your phone's time to "Set Automatically" to avoid clock drift.
                      </p>
                    </div>
                  </div>

                  {backupCodes && backupCodes.length > 0 && (
                    <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Backup Recovery Codes</h4>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Save these 10 one-time use codes in a safe place. If you lose your 2FA device, you can use any of these to verify your identity.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {backupCodes.map((code, index) => (
                           <div 
                             key={index} 
                             className="bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1.5 text-center font-mono text-xs text-violet-300 select-all font-semibold"
                           >
                             {code}
                           </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(backupCodes.join('\n'));
                            alert('Backup codes copied to clipboard!');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold transition-all"
                        >
                          Copy Codes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const element = document.createElement("a");
                            const file = new Blob([backupCodes.join('\n')], {type: 'text/plain'});
                            element.href = URL.createObjectURL(file);
                            element.download = "bank_ledger_backup_codes.txt";
                            document.body.appendChild(element);
                            element.click();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 text-[10px] font-semibold transition-all"
                        >
                          Download TXT
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      Enter 6-Digit TOTP or Backup Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={9}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        placeholder="000000 or XXXX-XXXX"
                        className="w-48 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 text-center font-mono font-bold tracking-widest text-white text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => enableMfaMutation.mutate(mfaCode)}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs shadow-md transition-all"
                      >
                        Confirm & Enable
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isMfaActive || account?.mfaEnabled ? (
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>MFA Status: Active</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* KYC Document Verification */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/10 rounded-full blur-3xl" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-fuchsia-600/10 text-fuchsia-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">PayVora Verification System</h3>
                  <p className="text-xs text-gray-400">Production Grade Automatic KYC Verification Engine</p>
                </div>
              </div>

              {kycSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{kycSuccessMsg}</span>
                </div>
              )}

              {renderKycErrorMessage()}

              {/* Status Header Block */}
              {(account?.kycStatus === 'APPROVED' || kycStatusDetails?.status === 'APPROVED') && !showFormOverride ? (
                <div className="pt-2 flex items-center gap-2 animate-fade-in">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>KYC Status: Approved</span>
                  </div>
                </div>
              ) : (kycStatusDetails && kycStatusDetails.status !== 'NOT_STARTED') && !showFormOverride ? (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Status Badge Cards */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Verification Status</span>
                      
                      {kycStatusDetails.status === 'APPROVED' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          VERIFIED
                        </span>
                      )}
                      {(kycStatusDetails.status === 'PENDING' || kycStatusDetails.status === 'PROCESSING') && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          PROCESSING
                        </span>
                      )}
                      {kycStatusDetails.status === 'UNDER_REVIEW' && (
                        <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          UNDER REVIEW
                        </span>
                      )}
                      {kycStatusDetails.status === 'REJECTED' && (
                        <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-500/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          REJECTED
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 text-[11px] border-t border-white/5 text-gray-400">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500">KYC Verification ID</span>
                        <span className="font-mono text-white font-semibold">{kycStatusDetails.kycId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500">Submitted On</span>
                        <span className="text-white font-semibold">
                          {kycStatusDetails.submittedAt ? new Date(kycStatusDetails.submittedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Alert */}
                  {kycStatusDetails.status === 'REJECTED' && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <ShieldAlert className="h-4.5 w-4.5" />
                        <span>KYC Automated Decisive Mismatch</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-normal">
                        {kycStatusDetails.rejectionReason || "Verification failed due to document checksum mismatch or low photo quality."}
                      </p>
                      <button
                        onClick={() => {
                          setShowFormOverride(true);
                          setKycErrorMsg('');
                        }}
                        className="mt-2 w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-xl transition-all"
                      >
                        Re-upload & Verify Again
                      </button>
                    </div>
                  )}

                  {/* Auto-KYC Performance Metrics Meters */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Automated Verification Auditing</h4>

                    {/* Face Match Similarity */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-violet-400" />
                          Biometric Face Match
                        </span>
                        <span className={`font-mono font-bold ${
                          kycStatusDetails.faceMatchScore >= 90 ? 'text-emerald-400' :
                          kycStatusDetails.faceMatchScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {kycStatusDetails.faceMatchScore}% Match
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            kycStatusDetails.faceMatchScore >= 90 ? 'bg-emerald-500' :
                            kycStatusDetails.faceMatchScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${kycStatusDetails.faceMatchScore}%` }}
                        />
                      </div>
                    </div>

                    {/* OCR Extraction Confidence */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-violet-400" />
                          OCR Extraction Confidence
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {kycStatusDetails.ocrConfidence}% Confidence
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${kycStatusDetails.ocrConfidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Risk Scoring Engine */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-violet-400" />
                          Risk Assessment Engine
                        </span>
                        <span className={`font-mono font-bold ${
                          kycStatusDetails.riskScore <= 30 ? 'text-emerald-400' :
                          kycStatusDetails.riskScore <= 70 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {kycStatusDetails.riskScore} / 100 ({
                            kycStatusDetails.riskScore <= 30 ? 'Low Risk' :
                            kycStatusDetails.riskScore <= 70 ? 'Medium Risk' : 'High Risk'
                          })
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            kycStatusDetails.riskScore <= 30 ? 'bg-emerald-500' :
                            kycStatusDetails.riskScore <= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${kycStatusDetails.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs Trail */}
                  {kycAuditLogs && kycAuditLogs.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <h5 className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Chronological Audit Log Timeline</h5>
                      <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                        {kycAuditLogs.map((log: any, idx: number) => (
                          <div key={log.id || idx} className="flex gap-4 items-start text-[11px]">
                            <div className={`w-[24px] h-[24px] rounded-full shrink-0 flex items-center justify-center border font-bold text-[9px] z-10 ${
                              log.eventType.includes("FAIL") || log.eventType.includes("REJECT")
                                ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                                : log.eventType.includes("APPROV") || log.eventType.includes("UPLOADED")
                                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                                : "bg-[#161622] border-white/10 text-violet-400"
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white uppercase tracking-wide">{log.eventType.replace(/_/g, ' ')}</span>
                                <span className="text-[9px] text-gray-500 font-mono">
                                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-gray-400 leading-normal">{log.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <form onSubmit={handleKycSubmit} className="space-y-4 pt-4 border-t border-white/5 mt-4">
                  {kycStatusDetails?.status === 'REJECTED' && kycStatusDetails?.rejectionReason && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                        <span>KYC Automated Decisive Mismatch (Previous Attempt)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-normal">
                        <strong>Reason:</strong> {kycStatusDetails.rejectionReason}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        Document Type
                      </label>
                      <select
                        value={docType}
                        disabled
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118]/50 border border-white/5 text-gray-400 text-xs font-medium focus:outline-none cursor-not-allowed"
                      >
                        <option value="ID_CARD">Aadhaar Card (National ID)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        ID / Document Number
                      </label>
                      <input
                        type="text"
                        required
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder={
                          docType === 'ID_CARD' ? '12 Digit Aadhaar Card' :
                          docType === 'PAN_CARD' ? '10 Character PAN (e.g. ABCDE1234F)' :
                          'Document unique identity registration number'
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 text-white text-xs font-medium focus:outline-none"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                      Permanent Address
                    </label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full address as listed on your identity document"
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold resize-none"
                    />
                  </div>

                  {/* Document Image Upload Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        Front Document Image
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        required
                        onChange={(e) => handleDocFileChange(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 focus:outline-none"
                      />
                      <span className="text-[9px] text-gray-500 mt-1 block">Min resolution: 600x400. Mimes: PNG, JPG, PDF.</span>
                    </div>

                    {(docType === 'ID_CARD' || docType === 'DRIVER_LICENSE') && (
                      <div className="animate-fade-in">
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                          Back Document Image (Required)
                        </label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          required
                          onChange={(e) => handleDocBackFileChange(e.target.files ? e.target.files[0] : null)}
                          className="w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-500 mt-1 block font-medium text-violet-400">Back address verification page.</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs space-y-1.5 mt-2 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold text-violet-400">
                      <Sparkles className="h-4 w-4" />
                      <span>Tips for 100% OCR Accuracy</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-300">
                      <li><strong>Avoid Overhead Flash / Light:</strong> Overhead lighting creates bright white hotspots on the silver security hologram, which can blind the OCR scanner. Take the card photo under diffuse, indirect room lighting.</li>
                      <li><strong>Maintain High Resolution:</strong> Ensure the phone camera is steady, in-focus, and holds the card closely to prevent blurry or distorted numbers.</li>
                    </ul>
                  </div>

                  {isOcrScanning && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs flex items-center gap-3 animate-pulse">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="font-semibold tracking-wide uppercase">PayVora AI OCR Scanner: Extracting details from uploaded document...</span>
                    </div>
                  )}
                  {ocrConfidence && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-between animate-fade-in">
                      <span>✓ PayVora OCR extraction successful.</span>
                      <span>Confidence: {ocrConfidence.toFixed(1)}%</span>
                    </div>
                  )}



                  <button
                    type="submit"
                    disabled={uploadKycMutation.isPending}
                    className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {uploadKycMutation.isPending ? 'Processing Automated Checks...' : 'Submit Documents & Verify Identity'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Account Limits & Transaction PIN */}
        <div className="space-y-8">
          
          {/* Account Limits */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Account Spending Limits</h3>
                  <p className="text-xs text-gray-400">Enforced at the transaction and ledger registry level</p>
                </div>
              </div>

              {limitsSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{limitsSuccessMsg}</span>
                </div>
              )}

              {limitsErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{limitsErrorMsg}</span>
                </div>
              )}

              {limitsLoading ? (
                <div className="space-y-4">
                  <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
                </div>
              ) : !isEditingLimits ? (
                <div className="space-y-4 pt-2 border-t border-white/5 animate-fade-in">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Single Limit</span>
                      <p className="font-mono text-xs font-bold text-white mt-1">
                        {singleLimit ? `$${parseFloat(singleLimit).toLocaleString()}` : 'Unlimited'}
                      </p>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Daily Limit</span>
                      <p className="font-mono text-xs font-bold text-white mt-1">
                        {dailyLimit ? `$${parseFloat(dailyLimit).toLocaleString()}` : 'Unlimited'}
                      </p>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Weekly Limit</span>
                      <p className="font-mono text-xs font-bold text-white mt-1">
                        {weeklyLimit ? `$${parseFloat(weeklyLimit).toLocaleString()}` : 'Unlimited'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-gray-400 font-semibold p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${allowOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400 shadow-[0_0_6px_#f87171]'}`} />
                      <span>Online Purchase: {allowOnline ? 'Allowed' : 'Blocked'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${allowContactless ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400 shadow-[0_0_6px_#f87171]'}`} />
                      <span>Contactless: {allowContactless ? (contactlessLimit ? `Max $${contactlessLimit}` : 'Allowed') : 'Blocked'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${allowAtm ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400 shadow-[0_0_6px_#f87171]'}`} />
                      <span>ATM Cashouts: {allowAtm ? 'Allowed' : 'Blocked'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${blockGambling ? 'bg-rose-400 shadow-[0_0_6px_#f87171]' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
                      <span>Gambling Block: {blockGambling ? 'Active' : 'Disabled'}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${blockEntertainment ? 'bg-rose-400 shadow-[0_0_6px_#f87171]' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
                      <span>Entertainment Block: {blockEntertainment ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingLimits(true)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl transition-all shadow-md"
                  >
                    Adjust Spending Limits & Controls
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLimitsSubmit} className="space-y-6">
                  {/* Grid layout for numerical limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                        Single Trx Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={singleLimit}
                          onChange={(e) => setSingleLimit(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                        Daily Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                        Weekly Limit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={weeklyLimit}
                          onChange={(e) => setWeeklyLimit(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Channel Toggles */}
                  <div className="pt-5 border-t border-white/5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Channel Controls</h4>
                    
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all">
                      <div>
                        <p className="text-xs font-semibold text-white">Online Transactions (E-commerce)</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Authorize web and mobile application purchases</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowOnline(!allowOnline)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowOnline ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowOnline ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white">Contactless / Tap-to-Pay</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Authorize tap/contactless terminals</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowContactless(!allowContactless)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowContactless ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowContactless ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      
                      {allowContactless && (
                        <div className="relative mt-2 pt-2 border-t border-white/5 animate-fade-in">
                          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Max Contactless Transaction Amount</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={contactlessLimit}
                              onChange={(e) => setContactlessLimit(e.target.value)}
                              placeholder="Unlimited"
                              className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all">
                      <div>
                        <p className="text-xs font-semibold text-white">ATM Cash Withdrawals</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Block withdrawals or require profile verification</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowAtm(!allowAtm)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowAtm ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowAtm ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Category Blocks */}
                  <div className="pt-5 border-t border-white/5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Category Controls</h4>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all">
                      <div>
                        <p className="text-xs font-semibold text-white">🎰 Gambling Block</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Block charges from online casinos, betting, and lotteries</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBlockGambling(!blockGambling)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${blockGambling ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${blockGambling ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all">
                      <div>
                        <p className="text-xs font-semibold text-white">🎮 Entertainment Block</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Block charges from gaming storefronts and streaming services</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBlockEntertainment(!blockEntertainment)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${blockEntertainment ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${blockEntertainment ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditingLimits(false)}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] text-xs"
                    >
                      Save spending limits settings
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Transaction PIN Card */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Transaction PIN</h3>
                  <p className="text-xs text-gray-400">Secure outgoing transfers and cash withdrawals</p>
                </div>
              </div>

              {pinSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              {pinErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{pinErrorMsg}</span>
                </div>
              )}

              {account?.pinSet && !isEditingPin ? (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Transaction PIN Status: Active & Secured</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Your wallet transaction PIN is active. It is required to approve transaction withdrawals, transfers, and to unlock your dashboard when logging in.
                  </p>
                  <button
                    onClick={() => setIsEditingPin(true)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-xs rounded-xl transition-all"
                  >
                    Change Transaction PIN
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (txnPin !== txnPinConfirm) {
                      setPinErrorMsg('PINs do not match.');
                      setTimeout(() => setPinErrorMsg(''), 4000);
                      return;
                    }
                    if (txnPin.length !== 4 || !/^\d+$/.test(txnPin)) {
                      setPinErrorMsg('PIN must be exactly 4 digits.');
                      setTimeout(() => setPinErrorMsg(''), 4000);
                      return;
                    }
                    setPinMutation.mutate(txnPin);
                  }} 
                  className="space-y-4 pt-4 border-t border-white/5"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        New 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d*"
                        value={txnPin}
                        onChange={(e) => setTxnPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 text-white font-mono text-center tracking-widest text-sm focus:outline-none"
                        autoComplete="new-password"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d*"
                        value={txnPinConfirm}
                        onChange={(e) => setTxnPinConfirm(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 text-white font-mono text-center tracking-widest text-sm focus:outline-none"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {account?.pinSet && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPin(false);
                          setTxnPin('');
                          setTxnPinConfirm('');
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={setPinMutation.isPending}
                      className="flex-[2] py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      {setPinMutation.isPending ? 'Setting PIN...' : account?.pinSet ? 'Update Transaction PIN' : 'Set Transaction PIN'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
