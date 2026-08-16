import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  Edit3, 
  X, 
  Loader, 
  CheckCircle2, 
  ChevronRight, 
  Square, 
  Receipt,
  Upload,
  Code,
  Wallet,
  Users,
  Store,
  Coffee,
  Briefcase,
  Utensils,
  CircleDollarSign,
  Heart,
  Sparkles,
  PiggyBank,
  CreditCard,
  Coins,
  ShoppingBag,
  Home as HomeIcon,
  Car,
  Plane,
  Gamepad2,
  GraduationCap,
  Gift,
  Smartphone,
  Settings,
  Brain
} from 'lucide-react';
import { PocketType, CategoryType, Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import CalcKeyboard, { formatEquation, evaluateEquation } from './CalcKeyboard';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { date?: string }) => void;
  editingTransaction?: Transaction | null;
  onEditTransaction?: (transaction: Transaction) => void;
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  onOpenCategoryManager: () => void;
}

type ModalViewType = 'options' | 'camera' | 'voice' | 'manual' | 'parser';

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onAddTransaction, 
  editingTransaction,
  onEditTransaction,
  pockets, 
  accounts,
  categories,
  onOpenCategoryManager
}: AddTransactionModalProps) {
  const [currentView, setCurrentView] = useState<ModalViewType>('options');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [audioRecording, setAudioRecording] = useState(false);
  
  // REAL AUDIO RECORDING ENGINE STATES
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // AI Parser Specific States
  const [inputText, setInputText] = useState('');
  const [rawJsonAnswer, setRawJsonAnswer] = useState<any>(null);
  const [apiError, setApiError] = useState('');

  // Manual Form States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [amountExpr, setAmountExpr] = useState<string>('');
  const [showCalc, setShowCalc] = useState<boolean>(false);
  const [pocketId, setPocketId] = useState<PocketType>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('makan');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [notes, setNotes] = useState('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'lusa' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Pre-fill form fields if editing, or reset to defaults if adding new transaction
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setTitle(editingTransaction.title);
        setAmount(editingTransaction.amount);
        setAmountExpr(editingTransaction.amount.toString());
        setShowCalc(false);
        setPocketId(editingTransaction.pocketId);
        setAccountId(editingTransaction.accountId);
        setCategory(editingTransaction.category);
        setType(editingTransaction.type);
        setNotes(editingTransaction.notes || '');
        setDatePreset('custom');
        
        // Parse date to YYYY-MM-DD
        const dateObj = new Date(editingTransaction.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        setCustomDate(`${year}-${month}-${day}`);
        
        setCurrentView('manual');
      } else {
        setTitle('');
        setAmount(0);
        setAmountExpr('');
        setShowCalc(false);
        if (pockets.length > 0) setPocketId(pockets[0].id);
        if (accounts.length > 0) setAccountId(accounts[0].id);
        setCategory(categories[0]?.id || 'makan');
        setType('outgoing');
        setNotes('');
        setDatePreset('today');
        setCurrentView('options');
      }
    }
  }, [isOpen, editingTransaction, pockets, accounts, categories]);

  // Dynamically update evaluated amount from raw expression
  useEffect(() => {
    const evaluated = evaluateEquation(amountExpr);
    setAmount(evaluated);
  }, [amountExpr]);

  const handleCalcKeyPress = (key: string) => {
    setAmountExpr(prev => {
      const operators = ['+', '-', '*', '/'];
      // Replace last operator if user types another one consecutively
      if (operators.includes(key) && operators.includes(prev.slice(-1))) {
        return prev.slice(0, -1) + key;
      }
      return prev + key;
    });
  };

  const handleCalcClear = () => {
    setAmountExpr('');
    setAmount(0);
  };

  const handleCalcDelete = () => {
    setAmountExpr(prev => prev.slice(0, -1));
  };

  const handleCalcEvaluate = () => {
    const res = evaluateEquation(amountExpr);
    setAmount(res);
    setAmountExpr(res > 0 ? res.toString() : '');
  };

  if (!isOpen) return null;

  // Real Microphone Audio Recording Logic
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsProcessing(true);
        setProgressMsg('Mengonversi suara rekaman ke data Base64...');
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            setProgressMsg('Mengirim audio asli ke AI...');
            
            // Tembak jalur pipa pemrosesan utama
            const parsed = await (window as any).kirimKeGeminiAI(base64Data, 'audio/webm');
            if (parsed) {
              applyAiMetadataToForm(parsed, 'Rekaman Suara Langsung');
            }
          } catch (err: any) {
            alert("Gagal memproses rekaman suara Anda: " + err.message);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioRecording(true);
      setProgressMsg('Mendengarkan suara Anda... Tekan kotak STOP jika selesai.');
    } catch (err) {
      console.error(err);
      alert('Tidak bisa mengakses mikrofon. Berikan izin akses mikrofon di browser Anda.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && audioRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Matikan lampu indikator mic hardware
      setAudioRecording(false);
    }
  };

  // Central Helper untuk Memetakan Hasil JSON AI ke State Formulir.
  // Prioritaskan field presisi (category_id/pocket_id/account_id/waktu) yang
  // dipetakan AI langsung ke ID kantong/rekening/kategori milik user — hanya
  // fallback ke heuristik kata kunci lama (kategori/sumber_dana/kepemilikan)
  // untuk data demo mock yang belum punya field presisi tsb. Tidak pernah
  // default diam-diam kalau AI sudah menyebutkan sesuatu secara eksplisit;
  // dan form ini tetap wajib ditinjau & disubmit manual oleh user (baris
  // terakhir fungsi ini) sebelum benar-benar tersimpan.
  const applyAiMetadataToForm = (parsedData: any, sourceName: string) => {
    setTitle(parsedData.catatan || 'Transaksi Baru');
    const nom = Number(parsedData.nominal) || 0;
    setAmount(nom);
    setAmountExpr(nom > 0 ? nom.toString() : '');
    setNotes(`Dianalisis otomatis oleh AI (${sourceName}).`);

    // 1. Kantong — pakai pocket_id presisi dari AI kalau valid & memang ada di
    // daftar kantong user; baru fallback ke heuristik 'kepemilikan' lama.
    let pocket: PocketType = pockets[0]?.id || 'pribadi';
    const pocketIdFromAi = String(parsedData.pocket_id || '').trim();
    if (pocketIdFromAi && pockets.some(p => p.id === pocketIdFromAi)) {
      pocket = pocketIdFromAi;
    } else if (!pocketIdFromAi && parsedData.kepemilikan) {
      const kepemilikanRaw = String(parsedData.kepemilikan).toLowerCase();
      if (kepemilikanRaw.includes('bisnis')) {
        pocket = pockets.find(p => p.id === 'bisnis' || p.name.toLowerCase().includes('bisnis'))?.id || pocket;
      } else if (kepemilikanRaw.includes('orang') || kepemilikanRaw.includes('grup') || kepemilikanRaw.includes('kas')) {
        pocket = pockets.find(p => p.id === 'kas' || p.name.toLowerCase().includes('kas'))?.id || pocket;
      }
    }
    setPocketId(pocket);

    // 2. Rekening — pakai account_id presisi dari AI kalau valid; fallback ke
    // heuristik 'sumber_dana' lama untuk data demo mock.
    let accId = accounts[0]?.id || '';
    const accountIdFromAi = String(parsedData.account_id || '').trim();
    if (accountIdFromAi && accounts.some(a => a.id === accountIdFromAi)) {
      accId = accountIdFromAi;
    } else if (!accountIdFromAi && parsedData.sumber_dana) {
      const sumberDanaRaw = String(parsedData.sumber_dana).toLowerCase();
      if (sumberDanaRaw.includes('cash') || sumberDanaRaw.includes('tunai')) {
        const cashAcc = accounts.find(a => a.icon === 'cash' || a.id.toLowerCase().includes('cash'));
        if (cashAcc) accId = cashAcc.id;
      } else if (sumberDanaRaw.includes('dana')) {
        const danaAcc = accounts.find(a => a.id.toLowerCase().includes('dana') || a.name.toLowerCase().includes('dana'));
        if (danaAcc) accId = danaAcc.id;
      } else if (sumberDanaRaw.includes('gopay')) {
        const gopayAcc = accounts.find(a => a.id.toLowerCase().includes('gopay') || a.name.toLowerCase().includes('gopay'));
        if (gopayAcc) accId = gopayAcc.id;
      } else if (sumberDanaRaw.includes('bca')) {
        const bcaAcc = accounts.find(a => a.id.toLowerCase().includes('bca') || a.name.toLowerCase().includes('bca'));
        if (bcaAcc) accId = bcaAcc.id;
      }
    }
    setAccountId(accId);

    // 3. Kategori — pakai category_id presisi dari AI kalau valid; fallback ke
    // heuristik 'kategori' bebas-teks lama untuk data demo mock.
    let cat = categories[categories.length - 1]?.id || 'lainnya';
    const categoryIdFromAi = String(parsedData.category_id || '').trim();
    if (categoryIdFromAi && categories.some(c => c.id === categoryIdFromAi)) {
      cat = categoryIdFromAi;
    } else if (!categoryIdFromAi && parsedData.kategori) {
      const catRaw = String(parsedData.kategori).toLowerCase();
      const matchedCategory = categories.find(c =>
        catRaw.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(catRaw) ||
        catRaw.includes(c.id.toLowerCase())
      );
      if (matchedCategory) {
        cat = matchedCategory.id;
      } else if (catRaw.includes('makan') || catRaw.includes('culinary')) {
        cat = categories.find(c => c.id === 'makan' || c.name.toLowerCase().includes('makan'))?.id || cat;
      } else if (catRaw.includes('belanja') || catRaw.includes('grosir')) {
        cat = categories.find(c => c.id === 'belanja' || c.name.toLowerCase().includes('belanja'))?.id || cat;
      } else if (catRaw.includes('kopi') || catRaw.includes('minum') || catRaw.includes('jajan')) {
        cat = categories.find(c => c.id === 'kopi' || c.name.toLowerCase().includes('kopi') || c.name.toLowerCase().includes('jajan'))?.id || cat;
      }
    }
    setCategory(cat);

    // 4. Tipe
    let tType: 'incoming' | 'outgoing' = 'outgoing';
    if (String(parsedData.tipe).toLowerCase() === 'pemasukan') {
      tType = 'incoming';
    }
    setType(tType);

    // 5. Waktu — pakai tanggal hasil resolusi AI (mis. "kemarin", "hari ini",
    // tanggal spesifik) kalau valid; kalau tidak ada/tidak valid, biarkan
    // default ke hari ini seperti input manual biasa.
    const waktuFromAi = parsedData.waktu ? new Date(parsedData.waktu) : null;
    if (waktuFromAi && !isNaN(waktuFromAi.getTime())) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const resolvedDateStr = waktuFromAi.toISOString().slice(0, 10);
      if (resolvedDateStr === todayStr) {
        setDatePreset('today');
      } else {
        setDatePreset('custom');
        setCustomDate(resolvedDateStr);
      }
    } else {
      setDatePreset('today');
    }

    // Beralih ke form manual — user WAJIB meninjau & menekan "Simpan Transaksi"
    // sendiri di sana sebelum data ini benar-benar tersimpan.
    setCurrentView('manual');
  };

  // Konteks yang dikirim ke AI supaya bisa memetakan kategori/kantong/rekening
  // ke ID PERSIS milik user ini, bukan menebak dari daftar kata kunci generik.
  const buildAiContext = () => ({
    categories: categories.map(c => ({ id: c.id, name: c.name })),
    pockets: pockets.map(p => ({ id: p.id, name: p.name })),
    accounts: accounts.map(a => ({ id: a.id, name: a.name })),
    now: new Date().toISOString(),
  });

  const handleApiParse = async (text: string) => {
    setIsProcessing(true);
    setProgressMsg('Mengirim permintaan ke AI...');
    setApiError('');
    setRawJsonAnswer(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: text, context: buildAiContext() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menghubungi asisten AI');
      }
      const data = await res.json();
      setRawJsonAnswer(data);
      applyAiMetadataToForm(data, 'Input Teks Bebas');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Gagal memproses dengan asisten AI');
    } finally {
      setIsProcessing(false);
    }
  };

  // Resize (max 1280px on the longest side) + re-encode as JPEG q=0.8 via the
  // native Canvas API before a receipt photo ever leaves the browser — no new
  // dependency, just a smaller payload so Gemini has less to chew through.
  // Falls back to the original, uncompressed data URL if anything about the
  // decode/draw step fails (e.g. an exotic image format canvas can't touch).
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const original = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIMENSION = 1280;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round(height * (MAX_DIMENSION / width));
              width = MAX_DIMENSION;
            }
          } else if (height > MAX_DIMENSION) {
            width = Math.round(width * (MAX_DIMENSION / height));
            height = MAX_DIMENSION;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(original);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(original);
        img.src = original;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      let base64Data: string;
      let mimeType = file.type;

      if (type === 'image') {
        setProgressMsg('Mengompres gambar struk...');
        base64Data = await compressImageFile(file);
        mimeType = 'image/jpeg'; // compressImageFile always re-encodes as JPEG
      } else {
        setProgressMsg('Membaca file & mengonversinya ke Base64...');
        base64Data = await new Promise<string>((resolve, reject) => {
          const audioReader = new FileReader();
          audioReader.onload = () => resolve(audioReader.result as string);
          audioReader.onerror = reject;
          audioReader.readAsDataURL(file);
        });
      }

      setProgressMsg('Mengunggah ke AI dan menganalisis berkas asli...');
      const parsed = await (window as any).kirimKeGeminiAI(base64Data, mimeType);
      if (parsed) {
        applyAiMetadataToForm(parsed, `Berkas ${file.name}`);
      }
    } catch (err: any) {
      console.error("Gagal memproses berkas:", err);
      alert("Gagal memproses file: " + (err.message || err));
    } finally {
      setIsProcessing(false);
      setAudioRecording(false);
    }
  };

  // Mock Data untuk Demo Simulasi Cepat
  const MOCK_RECEIPTS = [
    { catatan: 'Beli Kopi Nangka', nominal: 35000, kategori: 'kopi', tipe: 'pengeluaran', sumber_dana: 'Cash', kepemilikan: 'Uangku' },
    { catatan: 'Iuran Kas Futsal', nominal: 50000, kategori: 'olahraga', tipe: 'pengeluaran', sumber_dana: 'Cash', kepemilikan: 'Uang Orang' },
    { catatan: 'Belanja Dimsum Pack', nominal: 150000, kategori: 'bisnis', tipe: 'pengeluaran', sumber_dana: 'Bank_BCA', kepemilikan: 'Uang Bisnis' },
  ];

  const MOCK_VOICES = [
    { text: '"Tadi bayar iuran futsal seratus ribu pakai uang kas"', catatan: 'Iuran Futsal', nominal: 100000, kategori: 'olahraga', tipe: 'pengeluaran', sumber_dana: 'Cash', kepemilikan: 'Uang Orang' },
    { text: '"Makan gulai nasi padang lima puluh ribu rupiah uang sendiri"', catatan: 'Nasi Padang', nominal: 50000, kategori: 'makan', tipe: 'pengeluaran', sumber_dana: 'Cash', kepemilikan: 'Uangku' },
    { text: '"Ada omset grosiran masuk dua juta ke kas bisnis"', catatan: 'Omset Grosir', nominal: 2000000, kategori: 'pendapatan', tipe: 'pemasukan', sumber_dana: 'Bank_BCA', kepemilikan: 'Uang Bisnis' },
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Mohon isi judul transaksi');
    if (amount <= 0) return alert('Nominal harus lebih besar dari 0');
    
    let finalDate = new Date();
    if (datePreset === 'yesterday') {
      finalDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (datePreset === 'lusa') {
      finalDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    } else if (datePreset === 'custom') {
      const parsedDate = new Date(customDate);
      const now = new Date();
      parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      finalDate = parsedDate;
    }

    if (editingTransaction && onEditTransaction) {
      onEditTransaction({
        ...editingTransaction,
        title,
        amount,
        pocketId,
        accountId,
        category,
        type,
        notes: notes || undefined,
        date: finalDate.toISOString()
      });
    } else {
      onAddTransaction({
        title,
        amount,
        pocketId,
        accountId,
        category,
        type,
        notes: notes || undefined,
        date: finalDate.toISOString()
      });
    }

    setTitle('');
    setAmount(0);
    setPocketId(pockets[0]?.id || 'pribadi');
    setCategory(categories[0]?.id || 'makan');
    setType('outgoing');
    setNotes('');
    setDatePreset('today');
    setCurrentView('options');
    onClose();
  };

  const goBack = () => {
    setCurrentView('options');
    setIsProcessing(false);
    setAudioRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-body-md">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => { goBack(); onClose(); }} />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-md glass-card rounded-t-2xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transform transition-transform duration-300 translate-y-0 flex flex-col pb-10 z-10 max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mt-3 mb-5 shrink-0" />
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-container_margin mb-4">
          {currentView !== 'options' && !editingTransaction && (
            <button onClick={goBack} className="text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20">Kembali</button>
          )}
          <span className="flex-grow text-center font-headline-sm text-white">
            {editingTransaction ? 'Ubah Transaksi' : (
              <>
                {currentView === 'options' && 'Catat Pengeluaran'}
                {currentView === 'camera' && 'AI Scanner Struk'}
                {currentView === 'voice' && 'Mendikte lewat Suara'}
                {currentView === 'manual' && 'Input Manual'}
                {currentView === 'parser' && 'Ketik Apapun'}
              </>
            )}
          </span>
          <button onClick={() => { goBack(); onClose(); }} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Layout Router */}
        <div className="px-container_margin flex-grow">
          {currentView === 'options' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-on-surface-variant font-label-caps text-xs">Pilih Cara Catat Uang</h3>

              <button onClick={() => setCurrentView('parser')} className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Ketik Apapun</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Tulis bebas satu kalimat, AI yang urus sisanya</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button onClick={() => setCurrentView('camera')} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Foto Struk Belanja</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Baca nota instan otomatis pakai AI asli</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-white transition-colors shrink-0" />
              </button>

              <button onClick={() => setCurrentView('voice')} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-all text-left group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Catat Pakai Suara</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Rekam suara asli / dikte via AI</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-secondary transition-colors shrink-0" />
              </button>

              <button onClick={() => setCurrentView('manual')} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Input Manual</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Ketik manual nominal & kategori</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          )}

          {/* VIEW: Camera Engine */}
          {currentView === 'camera' && (
            <div className="flex flex-col gap-5 text-center items-center py-4">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader className="w-12 h-12 text-primary animate-spin" />
                  <div className="flex flex-col gap-2 items-center">
                    <p className="text-white font-medium text-lg">Menganalisis Struk...</p>
                    <p className="text-xs text-on-surface-variant animate-pulse">{progressMsg}</p>
                    <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                      <div className="h-full w-2/3 bg-primary rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label className="w-full aspect-[4/3] bg-surface/50 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-4 p-6 relative overflow-hidden group border-dashed hover:border-primary/40 duration-200 cursor-pointer">
                    <input type="file" id="upload-struk-input" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="hidden" />
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute left-0 right-0 h-0.5 bg-primary/40 shadow-[0_0_15px_#4edea3] top-1/4 animate-bounce" />
                    <Camera className="w-12 h-12 text-primary/80" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-white">Ambil Foto atau Klik Upload Struk</p>
                      <p className="text-xs text-on-surface-variant">Kirim file nota belanjaan asli Anda untuk dibongkar AI</p>
                    </div>
                  </label>

                  <div className="w-full text-left flex flex-col gap-3">
                    <span className="text-xs text-on-surface-variant uppercase font-label-caps tracking-wider block">Atau gunakan demo struk instan:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {MOCK_RECEIPTS.map((item, idx) => (
                        <button key={idx} onClick={() => applyAiMetadataToForm(item, 'Demo Struk')} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors text-left text-sm" >
                          <div className="flex items-center gap-3">
                            <Receipt className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-white font-medium">{item.catatan}</span>
                          </div>
                          <span className="font-mono-data text-primary text-xs font-bold">{formatRupiah(item.nominal)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: Real Voice Recorder Engine */}
          {currentView === 'voice' && (
            <div className="flex flex-col gap-6 text-center items-center py-4">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader className="w-12 h-12 text-secondary animate-spin" />
                  <p className="text-xs text-secondary animate-pulse">{progressMsg}</p>
                  <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-2/3 bg-secondary rounded-full animate-pulse" />
                  </div>
                </div>
              ) : audioRecording ? (
                <div className="flex flex-col items-center gap-6 py-6 w-full">
                  <div className="flex items-center gap-1.5 h-12">
                    <span className="w-1.5 bg-red-500 rounded-full animate-[bounce_0.8s_infinite] h-8" />
                    <span className="w-1.5 bg-red-500 rounded-full animate-[bounce_1.2s_infinite] h-12" />
                    <span className="w-1.5 bg-red-500 rounded-full animate-[bounce_0.6s_infinite] h-6" />
                    <span className="w-1.5 bg-red-500 rounded-full animate-[bounce_1.4s_infinite] h-12" />
                  </div>
                  <div className="flex flex-col gap-3 items-center">
                    <p className="text-white font-medium text-md animate-pulse">{progressMsg}</p>
                    <button type="button" onClick={stopAudioRecording} className="h-12 px-6 bg-red-500 text-white font-bold rounded-full flex items-center gap-2 hover:bg-red-600 active:scale-95 shadow-lg shadow-red-500/20" >
                      <Square className="w-4 h-4 text-white fill-white" /> Selesai & Kirim Ke AI
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-4 items-center">
                    <button type="button" onClick={startAudioRecording} className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 active:scale-95 duration-150 flex items-center justify-center text-secondary relative group" >
                      <div className="absolute inset-0 bg-secondary/20 rounded-full anonymity animate-ping opacity-20 pointer-events-none" />
                      <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    <label className="h-16 px-6 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-full flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold active:scale-[0.98] transition-all">
                      <input type="file" id="upload-voice-input" accept="audio/*" onChange={(e) => handleFileChange(e, 'audio')} className="hidden" />
                      <Upload className="w-[18px] h-[18px] shrink-0" /> Unggah Berkas Audio Asli
                    </label>
                  </div>
                  <p className="text-xs text-on-surface-variant max-w-[280px]">
                    Klik ikon **Mikrofon** untuk mulai merekam suara asli Anda, atau unggah file rekaman dari device Anda.
                  </p>

                  <div className="w-full text-left flex flex-col gap-2.5 mt-2">
                    <span className="text-xs text-on-surface-variant uppercase font-label-caps tracking-wider block">Demo Bicara Instan (Tiruan):</span>
                    <div className="flex flex-col gap-2">
                      {MOCK_VOICES.map((item, idx) => (
                        <button key={idx} onClick={() => applyAiMetadataToForm(item, 'Demo Suara')} className="flex flex-col p-3 rounded-lg bg-[#161E2E] border border-white/5 hover:border-secondary/40 transition-colors text-left text-xs gap-1" >
                          <span className="italic text-secondary font-medium">{item.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: Real AI Parser Engine Playground */}
          {currentView === 'parser' && (
            <div className="flex flex-col gap-4 text-left py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Input Teks/Suara Bebas</label>
                <textarea id="parser-input-textarea" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ketik kalimat bebas (cth: 'jajan kopi tuku 15rb pakai bca kategori jajan')..." className="h-24 bg-surface-variant/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/60 resize-none font-body-md" />
              </div>

              <div className="flex gap-2">
                <button type="button" disabled={isProcessing} onClick={() => { if (!inputText.trim()) return alert('Mohon isi teks terlebih dahulu'); handleApiParse(inputText); }} className="flex-1 h-12 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all" >
                  {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />} Parse Teks via AI
                </button>
              </div>

              {apiError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">{apiError}</div>}
            </div>
          )}

          {/* VIEW: Manual Form Input */}
          {currentView === 'manual' && (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 text-left">
              <div className="flex bg-[#0B111E] rounded-lg p-1 border border-white/5 w-fit self-center">
                <button type="button" onClick={() => setType('outgoing')} className={`px-4 py-1.5 rounded-md font-label-caps text-xs transition-all ${type === 'outgoing' ? 'bg-[#EF4444] text-white shadow-lg' : 'text-on-surface-variant/60 hover:text-white'}`}>Pengeluaran</button>
                <button type="button" onClick={() => setType('incoming')} className={`px-4 py-1.5 rounded-md font-label-caps text-xs transition-all ${type === 'incoming' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant/60 hover:text-white'}`}>Pemasukan</button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Judul Transaksi</label>
                <input type="text" required placeholder="Contoh: Beli Kopi Susu, Gaji Bulanan" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 bg-surface-variant/40 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary/60" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nominal (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-mono-data text-primary text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    inputMode="none"
                    required
                    placeholder="0"
                    value={formatEquation(amountExpr) || ''}
                    onFocus={() => setShowCalc(true)}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9+\-*/]/g, '');
                      setAmountExpr(clean);
                    }}
                    className="h-12 w-full bg-surface-variant/40 border border-white/10 rounded-lg pl-12 pr-4 text-white focus:outline-none focus:border-primary/60 font-mono-data"
                  />
                </div>
              </div>

              {showCalc && (
                <div className="mt-2 border-t border-white/5 pt-3 animate-fade-in">
                  <CalcKeyboard
                    onKeyPress={handleCalcKeyPress}
                    onClear={handleCalcClear}
                    onDelete={handleCalcDelete}
                    onEvaluate={handleCalcEvaluate}
                    onOk={() => setShowCalc(false)}
                  />
                </div>
              )}

              {/* Selector Waktu */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Waktu Catatan</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['today', 'yesterday', 'lusa', 'custom'] as const).map((preset) => {
                    const isSelected = datePreset === preset;
                    let label = preset === 'today' ? 'Hari Ini' : preset === 'yesterday' ? 'Kemarin' : preset === 'lusa' ? 'Lusa' : 'Kalender';
                    return (
                      <button key={preset} type="button" onClick={() => setDatePreset(preset)} className={`py-2 px-1 rounded-lg border text-xs font-semibold text-center transition-all ${isSelected ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'}`}>{label}</button>
                    );
                  })}
                </div>
                {datePreset === 'custom' && <input type="date" required value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-2 h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60" />}
              </div>

              {/* Selector Kantong */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Sumber Dana / Kantong</label>
                <div className="grid grid-cols-3 gap-2">
                  {pockets.map(p => {
                    const isSelected = pocketId === p.id;
                    let IconComponent = p.icon === 'group' ? Users : p.icon === 'storefront' ? Store : p.icon === 'food' ? Utensils : Wallet;
                    return (
                      <button key={p.id} type="button" onClick={() => setPocketId(p.id)} className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all text-center ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'}`}>
                        <IconComponent className="w-[18px] h-[18px]" /> <span className="truncate w-full">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector Rekening */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Rekening / Dompet Fisik</label>
                <div className="grid grid-cols-3 gap-2">
                  {accounts.map(acc => {
                    const isSelected = accountId === acc.id;
                    let IconComponent = acc.icon === 'bank' ? CreditCard : acc.icon === 'smartphone' ? Smartphone : Coins;
                    return (
                      <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all text-center ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'}`}>
                        <IconComponent className="w-[18px] h-[18px]" /> <span className="truncate w-full">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector Kategori */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-label-caps text-on-surface-variant uppercase">Kategori</label>
                  <button type="button" onClick={onOpenCategoryManager} className="text-[10px] text-primary hover:underline flex items-center gap-1.5 font-semibold"><Settings className="w-3.5 h-3.5" /> Kelola Kategori</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    const catHex = getCategoryColorHex(cat.color);
                    return (
                      <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all ${isSelected ? 'font-bold' : 'bg-surface-variant/40 border-white/5 text-on-surface-variant/70'}`} style={isSelected ? { backgroundColor: catHex + '20', borderColor: catHex, color: catHex } : {}}><CategoryIcon name={cat.icon} className="w-4 h-4" />{cat.name}</button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Catatan Tambahan (Opsional)</label>
                <textarea placeholder="Tuliskan catatan transaksi..." value={notes} onChange={(e) => setNotes(e.target.value)} className="h-16 bg-surface-variant/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-primary/60 resize-none" />
              </div>

              <button type="submit" className="w-full h-13 mt-2 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(78,222,163,0.2)]">
                <CheckCircle2 className="w-5 h-5" /> {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}