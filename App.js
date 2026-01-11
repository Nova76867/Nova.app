import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  User, Shield, Sword, Map, Plus, Minus, Landmark, History as HistoryIcon,
  CheckCircle2, AlertCircle, Sparkles, X, BookOpen, ClipboardList, 
  Ghost, Hourglass, Zap, Store, Camera, Award, Wallet, Settings, LogOut, Trash2, Save, Info, MessageSquare
} from 'lucide-react';

// --- Firebase 初始化 ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hero-finance-v18';

// --- 靜態數據 (勳章、標題、任務) ---
const MEDALS_DATA = [
  { id: 'm1', name: '冒險之始', req: '累計存款達 100', icon: '🌱', color: 'bg-green-100' },
  { id: 'm2', name: '萬元戶', req: '累計存款達 10,000', icon: '💰', color: 'bg-yellow-100' },
  { id: 'm3', name: '無債清爽', req: '成功償還一筆契約', icon: '🕊️', color: 'bg-blue-100' },
  { id: 'm4', name: '技能大師', req: '技能等級總和達 5', icon: '📜', color: 'bg-purple-100' },
  { id: 'm5', name: '大富豪', req: '達成等級 LV.10', icon: '👑', color: 'bg-red-100' }
];

const CATEGORIES = ['食', '衣', '住', '行', '育', '樂', '健康', '其他'];
const TITLES = [
  { min: 50, name: '領地主宰' }, { min: 20, name: '理財王' },
  { min: 10, name: '存錢高手' }, { min: 0, name: '初階冒險者' }
];

const calculateGPToNext = (lv) => 100 * Math.pow(2, lv);
const getTitleName = (lv) => {
  for (const t of TITLES) if (lv >= t.min) return t.name;
  return '初階冒險者';
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isBinding, setIsBinding] = useState(true);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); 
  const [activeTab, setActiveTab] = useState('status'); 
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const unsubscribeRef = useRef(null);

  // Auth 監聽
  useEffect(() => {
    onAuthStateChanged(auth, u => { if(u) setUser(u); });
    signInAnonymously(auth).catch(() => console.error("連線失敗"));
  }, []);

  const getDocRef = (email) => {
    const safeEmail = email.replace(/[.$#[\]]/g, '_');
    return doc(db, 'artifacts', appId, 'public', 'data', 'players', safeEmail);
  };

  const saveToCloud = useCallback(async (state) => {
    if (!user || !state.email) return;
    setSaveStatus('saving');
    try { 
      await setDoc(getDocRef(state.email), state); 
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) { setSaveStatus('idle'); }
  }, [user]);

  const handleStartAdventure = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const docRef = getDocRef(profile.email);
      const snap = await getDoc(docRef);
      let data = snap.exists() ? snap.data() : {
        name: profile.name, email: profile.email, lv: 0, gp: 0, totalGP: 0,
        vaults: [{ id: 'v1', name: '隨身現金', amount: 0 }, { id: 'v2', name: '銀行帳戶', amount: 0 }],
        history: [], debts: [], medals: [], skills: { frugality: 0, manaBoost: 0, repayBless: 0 },
        mainQuests: [], daily: { lastDate: new Date().toLocaleDateString(), signedIn: false }
      };
      setGameState(data);
      setIsBinding(false);
      onSnapshot(docRef, s => { if(s.exists()) setGameState(s.data()); });
    } catch (err) { alert("讀取失敗"); } finally { setLoading(false); }
  };

  const handleAction = (type, params) => {
    let next = JSON.parse(JSON.stringify(gameState));
    const nowStr = new Date().toLocaleString('zh-TW', { hour12: false });

    if (type === 'deposit') {
      const v = next.vaults.find(v => v.id === params.vaultId);
      v.amount += parseInt(params.amount);
      next.gp += Math.floor(params.amount / 100);
      next.totalGP += Math.floor(params.amount / 100);
      next.history.unshift({ type: '注入', amount: params.amount, note: `至 ${v.name}`, time: nowStr });
    }
    // ... 其他邏輯 (Spend, Repay, etc.) 保持你原本的邏輯
    
    setGameState(next);
    saveToCloud(next);
    setActiveModal(null);
  };

  if (isBinding) return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 p-10 text-center space-y-8">
        <div className="bg-[#967E76] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-lg animate-bounce-slow">
          <Sword size={40} />
        </div>
        <h1 className="text-2xl font-black italic text-[#5C4033]">勇者金庫之冒險</h1>
        <form onSubmit={handleStartAdventure} className="space-y-4">
          <input required placeholder="冒險者名號" className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#967E76] outline-none transition-all font-bold" onChange={e => setProfile({...profile, name: e.target.value})} />
          <input required type="email" placeholder="Gmail 帳號" className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#967E76] outline-none transition-all font-bold" onChange={e => setProfile({...profile, email: e.target.value})} />
          <button className="w-full bg-[#967E76] text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all">開啟冒險</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[420px] h-screen bg-[#FDFBF7] md:h-[850px] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col relative border-x border-gray-200">
        
        {/* 頂部懸浮狀態卡片 */}
        <div className="pt-[env(safe-area-inset-top)] px-4 mt-4 flex-shrink-0 z-20">
          <div className="bg-[#967E76] p-6 rounded-[2.5rem] text-white shadow-xl shadow-[#967E76]/30 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-white/40 overflow-hidden bg-white/10">
                  {gameState.profilePic ? <img src={gameState.profilePic} className="w-full h-full object-cover" alt="Avatar"/> : <User className="m-auto mt-2" size={32}/>}
                </div>
                <div>
                  <h2 className="text-xl font-black italic">{gameState.name}</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{getTitleName(gameState.lv)}</p>
                </div>
              </div>
              <div className="bg-black/20 px-3 py-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-lg font-black text-[#FFD27D] flex items-center gap-1"><Sparkles size={16} fill="#FFD27D"/> {gameState.gp}</span>
              </div>
            </div>
            
            <div className="space-y-1.5 bg-black/10 p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between text-[9px] font-black uppercase opacity-70">
                <span>LV.{gameState.lv} 位格進度</span>
                <span>{gameState.totalGP} / {calculateGPToNext(gameState.lv)}</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${(gameState.totalGP / calculateGPToNext(gameState.lv)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 內容區塊 */}
        <div className="flex-1 overflow-y-auto p-4 pt-6 space-y-6 pb-32 custom-scrollbar">
          {activeTab === 'status' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-[#967E76] uppercase tracking-widest italic flex items-center gap-2"><Wallet size={14}/> Territory Vaults</h3>
              </div>
              <div className="grid gap-4">
                {gameState.vaults.map(v => (
                  <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-[#EEE3CB] shadow-sm flex justify-between items-center transition-all active:scale-[0.98]">
                    <div>
                      <span className="text-[9px] font-black text-[#967E76] uppercase tracking-widest">{v.name}</span>
                      <p className="text-2xl font-black text-[#5C4033]">{v.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setActiveModal('deposit'); setFormData({vaultId: v.id})}} className="p-3 bg-[#967E76] text-white rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={20}/></button>
                      <button onClick={()=>{setActiveModal('spend'); setFormData({vaultId: v.id})}} className="p-3 bg-white border-2 border-[#967E76] text-[#967E76] rounded-2xl shadow-lg active:scale-90 transition-all"><Minus size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ... 其他 Tab 內容 (Quest, History, Glory) 保持不變 ... */}
        </div>

        {/* 底部懸浮導覽膠囊 */}
        <div className="absolute bottom-6 left-4 right-4 z-40">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 flex justify-around p-3 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
            {[
              { id: 'status', icon: Sword, label: '冒險' }, { id: 'quest', icon: Map, label: '任務' },
              { id: 'debt', icon: Shield, label: '契約' }, { id: 'glory', icon: Award, label: '榮耀' },
              { id: 'history', icon: BookOpen, label: '日誌' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all ${activeTab === tab.id ? 'text-[#967E76] scale-110' : 'text-gray-300'}`}>
                <div className={`${activeTab === tab.id ? 'bg-[#967E76]/10 p-2 rounded-2xl' : ''}`}>
                  <tab.icon size={22} strokeWidth={activeTab === tab.id ? 3 : 2} />
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.4s ease-out fill-mode: both; }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
