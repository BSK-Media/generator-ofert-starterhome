
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HOUSES, getOfferItemsForHouse } from '../constants';
import { House, OfferItem } from '../types';
import { 
    Printer, 
    Check, 
    Home, 
    Thermometer, 
    Layers, 
    Maximize, 
    BedDouble, 
    MapPin, 
    Hammer,
    Zap, 
    PaintBucket, 
    ShieldCheck, 
    Phone, 
    Mail, 
    ChevronDown, 
    ChevronUp, 
    Image as ImageIcon, 
    Type, 
    Settings, 
    User, 
    FileOutput, 
    FileDown, 
    ExternalLink,
    Car,
    TreePine,
    Sun,
    Droplet,
    Armchair,
    Utensils,
    Bath,
    Tv,
    X,
    Activity,
    BarChart3,
    ArrowRight,
    StopCircle,
    Calendar,
    Briefcase,
    Banknote,
    PenTool,
    Trash2,
    FileText,
    Box,
    Plus,
    Minus,
    Lock,
    FileSignature,
    LayoutTemplate
} from 'lucide-react';

// --- ICONS MAPPING FOR PICKER ---
const AVAILABLE_ICONS: Record<string, React.ElementType> = {
    Maximize,
    BedDouble,
    Hammer,
    Layers,
    MapPin,
    Home,
    Check,
    Thermometer,
    Zap,
    PaintBucket,
    ShieldCheck,
    User,
    Wifi: Zap, // Fallback
    Car,
    TreePine,
    Sun,
    Droplet,
    Armchair,
    Utensils,
    Bath,
    Tv,
    Circle: ({className}) => <div className={`rounded-full border-2 border-current ${className}`} style={{width: '1em', height: '1em'}} />
};

// Resolve files placed in /public when the app is deployed under a sub-path (e.g. GitHub Pages).
const resolvePublicAsset = (src: string) => {
    if (!src) return src;
    // Keep absolute URLs (http/https) unchanged.
    if (/^https?:\/\//i.test(src)) return src;
    // For public assets, prefer BASE_URL to support sub-path deployments.
    if (src.startsWith('/')) return `${import.meta.env.BASE_URL}${src.slice(1)}`;
    return `${import.meta.env.BASE_URL}${src}`;
};



const ICON_LABELS_PL: Record<string, string> = {
    Maximize: 'Powiększenie / Metraż',
    BedDouble: 'Sypialnia / Łóżko',
    Hammer: 'Budowa / Młotek',
    Layers: 'Warstwy / Płyta',
    MapPin: 'Lokalizacja',
    Home: 'Dom',
    Check: 'Zatwierdzenie / Ptaszek',
    Thermometer: 'Temperatura / Ocieplenie',
    Zap: 'Energia / Prąd',
    PaintBucket: 'Wykończenie / Farba',
    ShieldCheck: 'Gwarancja / Bezpieczeństwo',
    User: 'Osoba / Klient',
    Car: 'Garaż / Auto',
    TreePine: 'Ogród / Drzewo',
    Sun: 'Fotowoltaika / Słońce',
    Droplet: 'Woda / Hydraulika',
    Armchair: 'Salon / Fotel',
    Utensils: 'Kuchnia',
    Bath: 'Łazienka',
    Tv: 'RTV / Salon',
    Circle: 'Kropka (Domyślna)'
};

// --- REAL IMAGE OPTIMIZATION LOGIC ---
const bytesToMB = (bytes: number) => bytes / (1024 * 1024);
interface ProcessedImageResult { originalSize: number; compressedSize: number; dataUrl: string; }

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const fetchImageBlob = async (url: string, onStatus: (status: string) => void): Promise<Blob> => {
    try { onStatus('Pobieranie bezpośrednie...'); const response = await fetchWithTimeout(url, { mode: 'cors' }, 5000); if (response.ok) return await response.blob(); } catch (e) { /* continue */ }
    try { onStatus('Pobieranie przez Proxy #1...'); const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`; const response = await fetchWithTimeout(proxyUrl, {}, 8000); if (response.ok) return await response.blob(); } catch (e) { /* continue */ }
    try { onStatus('Pobieranie przez Proxy #2...'); const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`; const response = await fetchWithTimeout(proxyUrl, {}, 10000); if (response.ok) return await response.blob(); } catch (e) { /* continue */ }
    throw new Error("Nie udało się pobrać obrazu.");
};

const loadImageWithTimeout = (src: string, timeout = 5000): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => { img.src = ""; reject(new Error("Timeout dekodowania obrazu")); }, timeout);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = (err) => { clearTimeout(timer); reject(err); };
        img.src = src;
    });
};

const processImageForPrint = async (src: string, label: string, onLog: (msg: string) => void, onStatusUpdate: (msg: string) => void): Promise<ProcessedImageResult> => {
    if (src.startsWith('data:')) {
         onStatusUpdate('Optymalizacja lokalna...');
         const originalSize = src.length * 0.75;
         try {
             const img = await loadImageWithTimeout(src);
             const result = rasterizeImage(img, originalSize);
             onLog(`${label}: Lokalny -> Kompresja OK`);
             return result;
         } catch (e) {
             onLog(`${label}: Błąd odczytu lokalnego`);
             return { originalSize: 0, compressedSize: 0, dataUrl: src };
         }
    }
    let blob: Blob;
    try { blob = await fetchImageBlob(src, onStatusUpdate); } catch (e) { onLog(`${label}: Błąd pobierania - zachowano oryginał.`); return { originalSize: 0, compressedSize: 0, dataUrl: src }; }
    const originalSize = blob.size;
    const objectUrl = URL.createObjectURL(blob);
    try {
        onStatusUpdate('Dekodowanie i kompresja...');
        const img = await loadImageWithTimeout(objectUrl);
        const result = rasterizeImage(img, originalSize);
        onLog(`${label}: ${bytesToMB(originalSize).toFixed(2)}MB -> ${bytesToMB(result.compressedSize).toFixed(2)}MB`);
        URL.revokeObjectURL(objectUrl);
        return result;
    } catch (error) {
        onLog(`${label}: Błąd przetwarzania obrazu - zachowano oryginał.`);
        URL.revokeObjectURL(objectUrl);
        return { originalSize: 0, compressedSize: 0, dataUrl: src };
    }
};

const rasterizeImage = (img: HTMLImageElement, originalSize: number): ProcessedImageResult => {
    const canvas = document.createElement('canvas');
    const TARGET_WIDTH = 1122; 
    let width = img.width;
    let height = img.height;
    if (width > TARGET_WIDTH) { height = (height * TARGET_WIDTH) / width; width = TARGET_WIDTH; }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { originalSize, compressedSize: originalSize, dataUrl: img.src };
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const newDataUrl = canvas.toDataURL('image/jpeg', 0.5);
    const compressedSize = newDataUrl.split(',')[1].length * 0.75;
    return { originalSize, compressedSize, dataUrl: newDataUrl };
};

// --- ANIMATION COMPONENTS ---
const CountUp: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(value);
    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 500;
        const startValue = displayValue;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (value - startValue) * easeOut);
            setDisplayValue(current);
            if (progress < 1) { window.requestAnimationFrame(step); }
        };
        window.requestAnimationFrame(step);
    }, [value]);
    return <span>{displayValue.toLocaleString()}</span>;
};

const WelcomeModal: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => { setVisible(false); setTimeout(onComplete, 500); }, 2000); 
        return () => clearTimeout(timer);
    }, [onComplete]);
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 transition-opacity duration-500 opacity-100 data-[closed=true]:opacity-0" data-closed={!visible}>
            <div className="text-center animate-fade-in">
                <img src="https://i.ibb.co/PZJv90w6/logo.png" alt="Starter Home" className="h-20 w-auto mx-auto mb-6 opacity-90" />
                <h1 className="text-4xl text-white font-light tracking-widest uppercase">Panel Handlowca</h1>
                <div className="mt-4 w-16 h-1 bg-[#6E8809] mx-auto"></div>
            </div>
        </div>
    );
};

// --- COMPRESSION MODAL ---
interface CompressionModalProps {
    isOpen: boolean; onClose: () => void; onRun: () => void; onCancel: () => void;
    status: 'idle' | 'running' | 'done'; logs: string[]; progress: number; currentFile: string; processingDetail: string;
    stats: { original: number; compressed: number };
}
const CompressionModal: React.FC<CompressionModalProps> = ({ isOpen, onClose, onRun, onCancel, status, logs, progress, currentFile, processingDetail, stats }) => {
    if (!isOpen) return null;
    const savedPercent = stats.original > 0 ? Math.round(((stats.original - stats.compressed) / stats.original) * 100) : 0;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-[500px] max-w-[90vw] rounded-xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div><h3 className="text-xl font-bold text-gray-900">Optymalizacja Dokumentu</h3><p className="text-xs text-gray-500 mt-1">Przygotowanie lekkiego pliku do druku (Algorytm Stratny)</p></div>
                    {status !== 'running' && (<button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>)}
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex justify-between mb-8 relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-0"></div>
                        {[{ step: 1, label: 'Pobieranie', icon: Activity }, { step: 2, label: 'Kompresja', icon: Layers }, { step: 3, label: 'Podmiana', icon: Check }].map((s) => {
                            let stateClass = "bg-gray-200 text-gray-400";
                            if (status === 'running') { if (s.step === 2) stateClass = "bg-[#6E8809] text-white animate-pulse"; if (s.step === 1) stateClass = "bg-[#6E8809] text-white"; }
                            if (status === 'done') { stateClass = "bg-[#6E8809] text-white"; }
                            return (
                                <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${stateClass}`}><s.icon className="w-5 h-5" /></div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</span>
                                </div>
                            )
                        })}
                    </div>
                    {status === 'running' && (
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex flex-col"><span className="text-xs font-bold text-[#6E8809] uppercase">{currentFile}</span>{processingDetail && (<span className="text-[10px] text-gray-400 font-mono mt-0.5">{processingDetail}</span>)}</div>
                                <span className="text-xs font-bold text-gray-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-[#6E8809] h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div></div>
                        </div>
                    )}
                    {status === 'done' ? (
                        <div className="bg-[#f7faf3] border border-[#e2e8da] rounded-lg p-6 mb-6 text-center">
                            <BarChart3 className="w-8 h-8 text-[#6E8809] mx-auto mb-3" />
                            <h4 className="text-lg font-bold text-gray-900 mb-1">Sukces!</h4>
                            <p className="text-sm text-gray-600 mb-4">Dokument PDF będzie teraz lekki.</p>
                            <div className="flex justify-center items-center gap-6">
                                <div><p className="text-xs uppercase font-bold text-gray-400">Przed</p><p className="text-xl font-bold text-gray-900 line-through decoration-red-500 decoration-2">{stats.original.toFixed(1)} MB</p></div>
                                <ArrowRight className="w-5 h-5 text-[#6E8809]" />
                                <div><p className="text-xs uppercase font-bold text-gray-400">Po</p><p className="text-2xl font-black text-[#6E8809]">{stats.compressed.toFixed(1)} MB</p></div>
                            </div>
                            <div className="mt-2 text-xs font-bold text-[#6E8809] bg-white inline-block px-3 py-1 rounded-full border border-[#e2e8da]">Zredukowano wagę zdjęć o {savedPercent}%</div>
                        </div>
                    ) : (
                         <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 h-32 mb-6 overflow-y-auto custom-scrollbar font-mono text-xs">
                            {logs.length === 0 ? (<span className="text-gray-400 italic">Oczekiwanie na rozpoczęcie procesu...</span>) : (logs.map((log, i) => (<div key={i} className="mb-1 text-gray-600 border-l-2 border-[#6E8809] pl-2">{log}</div>)))}
                         </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    {status === 'idle' && (<button onClick={onRun} className="w-full py-3 bg-gray-900 text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-black transition-colors flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Uruchom Kompresję</button>)}
                    {status === 'running' && (<button onClick={onCancel} className="w-full py-3 bg-red-50 text-red-600 border border-red-100 font-bold uppercase tracking-widest text-xs rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><StopCircle className="w-4 h-4" /> Anuluj</button>)}
                    {status === 'done' && (<button onClick={onClose} className="w-full py-3 bg-[#6E8809] text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-[#556b07] transition-colors flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Wróć do oferty</button>)}
                </div>
            </div>
        </div>
    );
};

// --- UI COMPONENTS ---
const AccordionItem: React.FC<{ title: string; icon: React.ElementType; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, icon: Icon, isOpen, onToggle, children }) => {
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button onClick={onToggle} className={`w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}>
                <div className="flex items-center gap-3"><Icon className={`w-4 h-4 ${isOpen ? 'text-[#6E8809]' : 'text-gray-400'}`} /><span className="text-xs font-bold uppercase tracking-widest text-gray-700">{title}</span></div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isOpen && (<div className="p-4 bg-gray-50 border-t border-gray-100 animate-fade-in">{children}</div>)}
        </div>
    );
};

// --- PDF COMPONENTS ---
const A4Page: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => (
    <div id={id} style={{ pageBreakAfter: 'always' }} className={`bg-white mx-auto mb-8 relative overflow-hidden w-[210mm] min-h-[297mm] max-h-[297mm] p-0 print:w-[210mm] print:h-[297mm] print:m-0 print:mb-0 ${className}`}>{children}</div>
);
const LeafDecor: React.FC<{ src: string }> = ({ src }) => (<div className="absolute top-0 right-0 w-40 h-40 overflow-hidden pointer-events-none z-0"><img src={src} alt="Decor" className="absolute top-[-20px] right-[-20px] w-40 h-40 object-contain opacity-[0.08] transform rotate-12" /></div>);
const OfferFooter = () => (<div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-end"></div>);

// --- MAIN GENERATOR ---
export const OfferGenerator: React.FC = () => {
    const [welcomeDone, setWelcomeDone] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<boolean>(false);
    
    // -- COMPRESSION STATES --
    const [isCompressionModalOpen, setIsCompressionModalOpen] = useState(false);
    const [compressionStatus, setCompressionStatus] = useState<'idle' | 'running' | 'done'>('idle');
    const [compressionLogs, setCompressionLogs] = useState<string[]>([]);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [currentProcessingFile, setCurrentProcessingFile] = useState('');
    const [processingDetail, setProcessingDetail] = useState('');
    const [compressionStats, setCompressionStats] = useState({ original: 0, compressed: 0 });
    const [isCompressed, setIsCompressed] = useState(false);

    // -- SCALING STATE --
    const [fontScale, setFontScale] = useState(1.0);

    // -- STATES --
    const [openSection, setOpenSection] = useState<string>('config');
    const [clientName, setClientName] = useState('');
    const [selectedHouse, setSelectedHouse] = useState<House>(HOUSES[1]); 
    const [isDeveloperState, setIsDeveloperState] = useState(false); 
    // TRYB EDYCJI (dla wszystkich domów)
    const [isEditMode, setIsEditMode] = useState(false);
    // Nadpisania (edytowalne nazwy/opcje/ceny) per dom
    const [itemsByHouse, setItemsByHouse] = useState<Record<string, OfferItem[]>>({});
    const [basePricesByHouse, setBasePricesByHouse] = useState<Record<string, { surowy: number; deweloperski: number }>>({});
    // Projekt indywidualny - sekcje opisowe + cena
    const [customSections, setCustomSections] = useState<Array<{ id: string; title: string; text: string; price: number }>>([
        { id: 'sec-1', title: 'Zakres / opis', text: '', price: 0 },
    ]);


    // MEDIA
    const [images, setImages] = useState({
        main: selectedHouse.image,
        visualization: resolvePublicAsset(selectedHouse.visualizationImage ?? selectedHouse.image),
        gallery1: selectedHouse.image,
        gallery2: selectedHouse.image,
        interior: 'https://starterhome.pl/wp-content/uploads/2025/10/ujecie-1-scaled.png',
        floorPlan: 'https://howsmart.pl/wp-content/uploads/2025/02/EMILY-RZUT-PL-scaled.jpg',
        advisor: 'https://i.ibb.co/j9NzkpfG/Krystian.jpg',
        logo: 'https://i.ibb.co/PZJv90w6/logo.png',
        decorLeaf: 'https://starterhome.pl/wp-content/uploads/2025/12/cropped-Favicon.png',
        // 4 Tech Images
        techRoof: 'https://starterhome.pl/wp-content/uploads/2025/12/G_F_4.png',
        techWallExt: 'https://starterhome.pl/wp-content/uploads/2025/12/G_F_2.png',
        techWallInt: 'https://starterhome.pl/wp-content/uploads/2025/12/G_2.png',
        techFloor: 'https://starterhome.pl/wp-content/uploads/2025/12/G_F_5.png' // Strop
    });

    useEffect(() => {
        setImages(prev => ({
            ...prev,
            main: selectedHouse.image,
            visualization: resolvePublicAsset(selectedHouse.visualizationImage ?? selectedHouse.image),
            gallery1: selectedHouse.image,
            gallery2: selectedHouse.image,
        }));
        setIsCompressed(false);
        setCompressionStatus('idle');
    }, [selectedHouse]);

    // CONFIG STATE - Updated to handle Radio/Number/Checkbox
    const [offerConfig, setOfferConfig] = useState<Record<string, any>>({});

    useEffect(() => {
        // Dla projektu indywidualnego konfiguracja opcji nie jest potrzebna
        if (selectedHouse.id === 'individual_house') {
            setOfferConfig({});
            return;
        }
        const items = getOfferItemsForHouse(selectedHouse);
        const newConfig: Record<string, any> = {};
        items.forEach((item) => {
            newConfig[item.code] = item.defaultValue;
        });
        setOfferConfig(newConfig);
    }, [selectedHouse]);

    // Inicjalizacja edytowalnych danych per dom (pierwsze wejście)
    useEffect(() => {
        setItemsByHouse((prev) => {
            if (prev[selectedHouse.id]) return prev;
            const cloned = JSON.parse(JSON.stringify(getOfferItemsForHouse(selectedHouse))) as OfferItem[];
            return { ...prev, [selectedHouse.id]: cloned };
        });
        setBasePricesByHouse((prev) => {
            if (prev[selectedHouse.id]) return prev;
            return { ...prev, [selectedHouse.id]: { surowy: selectedHouse.basePrice, deweloperski: selectedHouse.developerPrice } };
        });
    }, [selectedHouse]);


    const handleConfigChange = (code: string, value: any) => {
        setOfferConfig(prev => ({ ...prev, [code]: value }));
    };

    // --- EDYCJA OPcji i CEN ---
    const updateBasePrice = (field: 'surowy' | 'deweloperski', value: number) => {
        setBasePricesByHouse(prev => ({
            ...prev,
            [selectedHouse.id]: {
                surowy: prev[selectedHouse.id]?.surowy ?? selectedHouse.basePrice,
                deweloperski: prev[selectedHouse.id]?.deweloperski ?? selectedHouse.developerPrice,
                [field]: value,
            }
        }));
    };

    const updateItem = (code: string, patch: Partial<OfferItem>) => {
        setItemsByHouse(prev => ({
            ...prev,
            [selectedHouse.id]: (prev[selectedHouse.id] ?? []).map(it => it.code === code ? { ...it, ...patch } : it)
        }));
    };

    const updateOption = (code: string, optId: string, patch: { name?: string; price?: number }) => {
        setItemsByHouse(prev => ({
            ...prev,
            [selectedHouse.id]: (prev[selectedHouse.id] ?? []).map(it => {
                if (it.code !== code || !it.options) return it;
                return {
                    ...it,
                    options: it.options.map(o => o.id === optId ? { ...o, ...patch } : o)
                };
            })
        }));
    };

    const addRadioOption = (code: string) => {
        setItemsByHouse(prev => ({
            ...prev,
            [selectedHouse.id]: (prev[selectedHouse.id] ?? []).map(it => {
                if (it.code !== code) return it;
                const nextId = `opt_${Date.now()}`;
                const opts = it.options ? [...it.options] : [];
                opts.push({ id: nextId, name: 'Nowa opcja', price: 0 });
                return { ...it, options: opts };
            })
        }));
    };

    const removeRadioOption = (code: string, optId: string) => {
        setItemsByHouse(prev => ({
            ...prev,
            [selectedHouse.id]: (prev[selectedHouse.id] ?? []).map(it => {
                if (it.code !== code || !it.options) return it;
                const opts = it.options.filter(o => o.id !== optId);
                // jeśli usunęliśmy aktualnie wybraną opcję, ustaw 'none'
                if (offerConfig[code] === optId) {
                    setOfferConfig(cfg => ({ ...cfg, [code]: 'none' }));
                }
                return { ...it, options: opts };
            })
        }));
    };

    // --- Projekt indywidualny: sekcje ---
    const addCustomSection = () => {
        setCustomSections(prev => [...prev, { id: `sec-${Date.now()}`, title: 'Nowa sekcja', text: '', price: 0 }]);
    };
    const removeCustomSection = (id: string) => {
        setCustomSections(prev => prev.length <= 1 ? prev : prev.filter(s => s.id !== id));
    };
    const updateCustomSection = (id: string, patch: Partial<{ title: string; text: string; price: number }>) => {
        setCustomSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    };


    // NEEDS (Page 2)
    const [needs, setNeeds] = useState([
        { id: '1', icon: 'Maximize', text: 'Dom o powierzchni do 70m2 zabudowy' },
        { id: '2', icon: 'BedDouble', text: '2 sypialnie' },
        { id: '3', icon: 'Hammer', text: 'Stan deweloperski' },
        { id: '4', icon: 'Layers', text: 'Płyta fundamentowa' },
        { id: '5', icon: 'MapPin', text: 'Lokalizacja: Cała Polska' },
    ]);

    // GENERAL TEXTS
    const [customTexts, setCustomTexts] = useState({
        page2Title: "Po rozmowie telefonicznej zrozumiałem następujące potrzeby:",
        cta: "Po zapoznaniu się z ofertą, zadzwonię do Państwa w umówionym terminie. Jeśli pytania pojawią się wcześniej – serdecznie zapraszam do kontaktu.",
        scopeOurSide: "Projekt, Prefabrykacja, Transport, Montaż, Dach, Stolarka, Elewacja.",
        scopeClientSide: "Przygotowanie działki, Przyłącza mediów, Odbiory końcowe.",
        
        // Tranches
        tranche1: "30% 7 dni po podpisaniu umowy",
        tranche2: "50% 7 dni po zrobieniu płyty fundamentowej oraz postawieniu konstrukcji budynku",
        tranche3: "20% 7 dni po wykonaniu instalacji elektrycznych i hydraulicznych",

        // Steps (Now 6)
        step1: "Analiza działki",
        step2: "Rezerwacja terminu (zaliczka)",
        step3: "Weryfikacja Kredytowa",
        step4: "Formalności",
        step5: "Konfiguracja + umowa",
        step6: "Budowa + odbiory",

        // Tech Sections
        techRoofTitle: "Przekrój Dachu",
        techRoofDesc: "Ochrona Górna U = 0.15 W/m²K. Pokrycie: Blacha na rąbek. Podkonstrukcja: Mata drenażowa / Papa / OSB 22mm. Uszczelnienie: Membrana. Konstrukcja: Krokiew + wełna 200mm. Docieplenie: Wełna 50mm. Szczelność: Folia + GK.",
        
        techWallExtTitle: "Przekrój Ściany Zewnętrznej",
        techWallExtDesc: "Energooszczędność U = 0.14 W/m²K. Elewacja: Siatka + klej (10mm). Izolacja zew: Wełna elewacyjna (100mm). Poszycie: Płyta OSB (10mm). Izolacja gł: Wełna (150mm). Konstrukcja: C24. Szczelność: Folia. Wykończenie: Płyta GK 2x12.5mm.",

        techWallIntTitle: "Przekrój Ściany Wewnętrznej",
        techWallIntDesc: "Przegroda Akustyczna i Działowa. Wiatroizolacja, Słupek 4,5x14,5 cm + wełna mineralna 15 cm, Paroizolacja, Szczelina montażowa 7 cm, Płyta G-K 2x1.25 cm.",

        techFloorTitle: "Przekrój Stropu",
        techFloorDesc: "Konstrukcja Międzykondygnacyjna U = 0.20 W/m²K. Wykończenie góra: Panele 8mm. Poszycie nośne: Płyta OSB 22mm. Konstrukcja drewniana C24. Izolacja akustyczna: Wełna. Wykończenie dół: Ruszt + GK."
    });

    // -- LOGIC --
    const openCompressionModal = () => { setIsCompressionModalOpen(true); setCompressionStatus('idle'); setCompressionLogs([]); setCompressionProgress(0); setCurrentProcessingFile(''); setProcessingDetail(''); setCompressionStats({ original: 0, compressed: 0 }); };
    const handleCancelCompression = () => { abortRef.current = true; setCompressionStatus('idle'); setIsCompressionModalOpen(false); };
    const runSmartCompression = async () => {
        abortRef.current = false; setCompressionStatus('running');
        const logs: string[] = []; const addLog = (msg: string) => { logs.push(msg); setCompressionLogs([...logs]); };
        addLog("Etap 1: Inicjalizacja...");
        let totalOriginal = 0; let totalCompressed = 0;
        const newImages = { ...images };
        const keys = Object.keys(newImages) as Array<keyof typeof newImages>;
        for (let i = 0; i < keys.length; i++) {
            if (abortRef.current) { addLog("Anulowano."); setCompressionStatus('idle'); return; }
            await new Promise(resolve => setTimeout(resolve, 50));
            const key = keys[i];
            setCurrentProcessingFile(`Przetwarzanie ${i + 1}/${keys.length}: ${String(key)}`);
            setCompressionProgress(Math.round((i / keys.length) * 100));
            const result = await processImageForPrint(newImages[key], String(key), addLog, (status) => setProcessingDetail(status));
            totalOriginal += bytesToMB(result.originalSize); totalCompressed += bytesToMB(result.compressedSize);
            newImages[key] = result.dataUrl;
        }
        if (abortRef.current) return;
        setCompressionProgress(100); setCurrentProcessingFile('Finalizacja...');
        await new Promise(resolve => setTimeout(resolve, 300));
        setImages(newImages); setCompressionStats({ original: totalOriginal, compressed: totalCompressed }); setCompressionStatus('done'); setIsCompressed(true);
    };

    const handlePrint = () => {
        if (!previewRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("Proszę zezwolić na wyskakujące okienka"); return; }
        const content = previewRef.current.innerHTML;
        printWindow.document.write(`<html><head><title>Oferta</title><script src="https://cdn.tailwindcss.com"></script><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');body{font-family:'Inter',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.a4-page{page-break-after:always;width:210mm;height:297mm;overflow:hidden;position:relative;margin-bottom:0;}@media print{body{margin:0;padding:0;}.a4-page{margin:0;box-shadow:none;page-break-after:always;}.font-black{font-weight:700!important;}.font-bold{font-weight:600!important;}}</style></head><body>${content}<script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},1000);}</script></body></html>`);
        printWindow.document.close();
    };

    const handleImageUpload = async (key: keyof typeof images, file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { if (reader.result) { setImages(prev => ({ ...prev, [key]: reader.result as string })); setIsCompressed(false); } };
        reader.readAsDataURL(file);
    };

    const basePrice = useMemo(() => {
        const bp = basePricesByHouse[selectedHouse.id];
        const surowy = bp?.surowy ?? selectedHouse.basePrice;
        const deweloperski = bp?.deweloperski ?? selectedHouse.developerPrice;
        return isDeveloperState ? deweloperski : surowy;
    }, [selectedHouse, isDeveloperState, basePricesByHouse]);
    
    // --- CALCULATE PRICES ---
    const availableItems = useMemo(() => {
        return itemsByHouse[selectedHouse.id] ?? getOfferItemsForHouse(selectedHouse);
    }, [selectedHouse, itemsByHouse]);
    
    const { totalNetPrice, selectedItemsList } = useMemo(() => {
        // Projekt indywidualny: suma = cena bazowa + ceny sekcji
        if (selectedHouse.id === 'individual_house') {
            const sumSections = customSections.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
            const list = customSections
                .filter(s => (s.title?.trim() || s.text?.trim() || (Number(s.price) || 0) !== 0))
                .map(s => ({ name: s.title || 'Sekcja', variant: s.text ? s.text.slice(0, 80) + (s.text.length > 80 ? '…' : '') : undefined, price: Number(s.price) || 0 }));
            return { totalNetPrice: basePrice + sumSections, selectedItemsList: list };
        }
        let sum = basePrice;
        const list: { name: string; variant?: string; price: number }[] = [];
        
        availableItems.forEach(item => {
            const val = offerConfig[item.code];
            if (item.type === 'checkbox' && val) {
                sum += item.price || 0;
                list.push({ name: item.name, price: item.price || 0 });
            } else if (item.type === 'radio' && val && val !== 'none') {
                const opt = item.options?.find(o => o.id === val);
                if (opt && opt.price > 0) {
                    sum += opt.price;
                    list.push({ name: item.name, variant: opt.name, price: opt.price });
                }
            } else if (item.type === 'number' && typeof val === 'number' && val > 0) {
                const cost = val * (item.price || 0);
                sum += cost;
                list.push({ name: item.name, variant: `${val} ${item.unit || ''}`, price: cost });
            }
        });
        return { totalNetPrice: sum, selectedItemsList: list };
    }, [basePrice, offerConfig, availableItems, selectedHouse, customSections]);

    const totalVat = totalNetPrice * 0.08;
    const totalGross = totalNetPrice + totalVat;

    // Helpers for UI
    const toggleAccordion = (section: string) => setOpenSection(openSection === section ? '' : section);
    const updateText = (key: keyof typeof customTexts, value: string) => setCustomTexts(prev => ({ ...prev, [key]: value }));
    const updateNeed = (id: string, field: 'icon' | 'text', value: string) => setNeeds(needs.map(n => n.id === id ? { ...n, [field]: value } : n));
    const removeNeed = (id: string) => setNeeds(needs.filter(n => n.id !== id));
    const addNeed = () => setNeeds([...needs, { id: Date.now().toString(), icon: 'Check', text: 'Nowa potrzeba' }]);

    return (
        <div className="flex h-screen bg-gray-100 font-sans print:block print:h-auto print:overflow-visible">
            {!welcomeDone && <WelcomeModal onComplete={() => setWelcomeDone(true)} />}
            <CompressionModal isOpen={isCompressionModalOpen} onClose={() => setIsCompressionModalOpen(false)} onRun={runSmartCompression} onCancel={handleCancelCompression} status={compressionStatus} logs={compressionLogs} progress={compressionProgress} currentFile={currentProcessingFile} processingDetail={processingDetail} stats={compressionStats} />

            {/* --- LEFT SIDEBAR --- */}
            <div className="w-[450px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col print:hidden z-50">
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <img src={images.logo} alt="Logo" className="h-6 object-contain" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-auto">Panel Handlowca</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* DATA */}
                    <AccordionItem title="1. Dane i Model" icon={User} isOpen={openSection === 'data'} onToggle={() => toggleAccordion('data')}>
                        <div className="space-y-4">
                            <input type="text" placeholder="Imię i Nazwisko" className="w-full p-3 border border-gray-200 text-sm" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">{HOUSES.map(house => (<button key={house.id} onClick={() => setSelectedHouse(house)} className={`p-2 border text-xs font-bold uppercase ${selectedHouse.id === house.id ? 'border-[#6E8809] bg-[#f7faf3] text-[#6E8809]' : 'border-gray-200 text-gray-500'}`}>{house.name}</button>))}</div>
                            <div className="flex border border-gray-200"><button onClick={() => setIsDeveloperState(false)} className={`flex-1 py-2 text-xs font-bold uppercase ${!isDeveloperState ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Surowy</button><button onClick={() => setIsDeveloperState(true)} className={`flex-1 py-2 text-xs font-bold uppercase ${isDeveloperState ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Deweloperski</button></div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsEditMode((v) => !v)}
                                    className={`px-3 py-2 text-xs font-bold uppercase border ${isEditMode ? 'border-[#6E8809] text-[#6E8809] bg-[#f7faf3]' : 'border-gray-200 text-gray-600 bg-white'}`}
                                >
                                    {isEditMode ? 'Zakończ edycję' : 'Edytuj'}
                                </button>
                                {isEditMode && <span className="text-[11px] text-gray-500">Możesz edytować nazwy opcji i ceny (także bazowe).</span>}
                            </div>
                            {isEditMode && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="border border-gray-200 p-3">
                                        <div className="text-[11px] text-gray-500 mb-1">Cena bazowa — Surowy</div>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-200 text-sm"
                                            value={(basePricesByHouse[selectedHouse.id]?.surowy ?? selectedHouse.basePrice)}
                                            onChange={(e) => updateBasePrice('surowy', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="border border-gray-200 p-3">
                                        <div className="text-[11px] text-gray-500 mb-1">Cena bazowa — Deweloperski</div>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-200 text-sm"
                                            value={(basePricesByHouse[selectedHouse.id]?.deweloperski ?? selectedHouse.developerPrice)}
                                            onChange={(e) => updateBasePrice('deweloperski', Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </AccordionItem>
                    
                    {/* CONFIGURATION - Dynamic based on selected House */}
                    <AccordionItem title="2. Konfiguracja i Ceny" icon={Settings} isOpen={openSection === 'config'} onToggle={() => toggleAccordion('config')}>
                        <div className="space-y-6">
                            {selectedHouse.id === 'individual_house' ? (
                                <div className="space-y-3">
                                    <div className="text-xs text-gray-500">Wybierz <b>Edytuj</b>, aby zmienić również ceny bazowe w sekcji 1.</div>
                                    {customSections.map((sec) => (
                                        <div key={sec.id} className="border border-gray-200 p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input type="text" className="flex-1 p-2 border border-gray-200 text-sm font-bold" value={sec.title} onChange={(e) => updateCustomSection(sec.id, { title: e.target.value })} placeholder="Tytuł sekcji" />
                                                <button type="button" className="px-2 py-2 text-xs border border-gray-200 text-gray-500 hover:text-red-600" onClick={() => removeCustomSection(sec.id)} title="Usuń">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <textarea rows={3} className="w-full p-2 border border-gray-200 text-xs" value={sec.text} onChange={(e) => updateCustomSection(sec.id, { text: e.target.value })} placeholder="Opis / szczegóły" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <div className="text-[11px] text-gray-500 mb-1">Cena netto (PLN)</div>
                                                    <input type="number" className="w-full p-2 border border-gray-200 text-sm" value={sec.price} onChange={(e) => updateCustomSection(sec.id, { price: Number(e.target.value) })} />
                                                </div>
                                                <div className="text-[11px] text-gray-400 flex items-end">Ta kwota zostanie doliczona do podsumowania.</div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCustomSection} className="w-full p-3 border border-dashed border-gray-300 text-xs font-bold uppercase text-gray-600 hover:border-[#6E8809] hover:text-[#6E8809]">Dodaj sekcję</button>
                                </div>
                            ) : (
                                <>
                            {availableItems.map((item) => (
                                <div key={item.code} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                    {isEditMode ? (
                                        <input type="text" className="w-full p-2 border border-gray-200 text-sm font-bold" value={item.name} onChange={(e) => updateItem(item.code, { name: e.target.value })} />
                                    ) : (
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h4>
                                    )}
                                    <p className="text-xs text-gray-500 mb-3">{item.description}</p>
                                    
                                    {/* RADIO */}
                                    {item.type === 'radio' && item.options && (
                                        <div className="space-y-2">
                                            {item.options.map(opt => (
                                                <label key={opt.id} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${offerConfig[item.code] === opt.id ? 'border-[#6E8809]' : 'border-gray-300'}`}>
                                                        {offerConfig[item.code] === opt.id && <div className="w-2 h-2 rounded-full bg-[#6E8809]" />}
                                                    </div>
                                                    <input type="radio" className="hidden" name={item.code} checked={offerConfig[item.code] === opt.id} onChange={() => handleConfigChange(item.code, opt.id)} />
                                                    <div className="flex-1">
                                                        {isEditMode ? (
                                                            <input type="text" className="w-full p-2 border border-gray-200 text-xs font-medium" value={opt.name} onChange={(e) => updateOption(item.code, opt.id, { name: e.target.value })} />
                                                        ) : (
                                                            <div className="text-xs font-medium text-gray-700">{opt.name}</div>
                                                        )}
                                                        {isEditMode ? (
                                                            <input type="number" className="w-full p-2 border border-gray-200 text-xs font-bold text-[#6E8809]" value={opt.price} onChange={(e) => updateOption(item.code, opt.id, { price: Number(e.target.value) })} />
                                                        ) : (
                                                            <div className="text-xs font-bold text-[#6E8809]">{opt.price === 0 ? '0 zł' : `+ ${opt.price.toLocaleString()} zł`}</div>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${offerConfig[item.code] === 'none' || !offerConfig[item.code] ? 'border-gray-300' : 'border-gray-300'}`}>
                                                        {(offerConfig[item.code] === 'none' || !offerConfig[item.code]) && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                                 </div>
                                                 <input type="radio" className="hidden" name={item.code} checked={offerConfig[item.code] === 'none'} onChange={() => handleConfigChange(item.code, 'none')} />
                                                 <span className="text-xs text-gray-400">Brak wyboru / Domyślne</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* CHECKBOX */}
                                    {item.type === 'checkbox' && (
                                        <label className={`flex items-center justify-between p-3 border rounded cursor-pointer ${offerConfig[item.code] ? 'bg-[#f7faf3] border-[#6E8809]' : 'bg-white border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${offerConfig[item.code] ? 'bg-[#6E8809] border-[#6E8809]' : 'bg-white border-gray-300'}`}>
                                                    {offerConfig[item.code] && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700">Dodaj do oferty</span>
                                                <input type="checkbox" className="hidden" checked={!!offerConfig[item.code]} onChange={(e) => handleConfigChange(item.code, e.target.checked)} />
                                            </div>
                                            {isEditMode ? (
                                                <input type="number" className="w-28 p-2 border border-gray-200 text-xs font-bold text-[#6E8809]" value={item.price ?? 0} onClick={(e) => e.stopPropagation()} onChange={(e) => updateItem(item.code, { price: Number(e.target.value) })} />
                                            ) : (
                                                <span className="text-xs font-bold text-[#6E8809]">+ {item.price?.toLocaleString()} zł</span>
                                            )}
                                        </label>
                                    )}

                                    {/* NUMBER */}
                                    {item.type === 'number' && (
                                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded">
                                            <div className="flex items-center">
                                                <button onClick={() => handleConfigChange(item.code, Math.max(0, (offerConfig[item.code] || 0) - 1))} className="w-8 h-8 bg-white border border-gray-200 hover:text-[#6E8809] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                                <input type="number" className="w-12 text-center bg-transparent text-sm font-bold" value={offerConfig[item.code] || 0} readOnly />
                                                <button onClick={() => handleConfigChange(item.code, (offerConfig[item.code] || 0) + 1)} className="w-8 h-8 bg-white border border-gray-200 hover:text-[#6E8809] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                                            </div>
                                            <div className="text-right flex-1">
                                                <div className="text-xs text-gray-500">{isEditMode ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <input type="number" className="w-24 p-1 border border-gray-200 text-xs" value={item.price ?? 0} onChange={(e) => updateItem(item.code, { price: Number(e.target.value) })} />
                                                        <span>zł / {item.unit}</span>
                                                    </span>
                                                ) : (
                                                    <span>{item.price?.toLocaleString()} zł / {item.unit}</span>
                                                )}</div>
                                                <div className="text-xs font-bold text-[#6E8809]">Razem: {((offerConfig[item.code] || 0) * (item.price || 0)).toLocaleString()} zł</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                                </>
                            )}
                        </div>
                    </AccordionItem>

                    {/* NEEDS */}
                    <AccordionItem title="3. Potrzeby (Strona 2)" icon={Type} isOpen={openSection === 'needs'} onToggle={() => toggleAccordion('needs')}>
                         <div className="space-y-4">
                             <textarea rows={2} className="w-full text-xs p-2 border border-gray-200" value={customTexts.page2Title} onChange={e => updateText('page2Title', e.target.value)} />
                             <div className="space-y-2">{needs.map((need, idx) => (
                                <div key={need.id} className="flex gap-2 items-center">
                                    <div className="w-16 shrink-0"><select value={need.icon} onChange={(e) => updateNeed(need.id, 'icon', e.target.value)} className="w-full text-[9px] border border-gray-200 p-1 bg-white h-8">{Object.keys(AVAILABLE_ICONS).map(iconKey => (<option key={iconKey} value={iconKey}>{ICON_LABELS_PL[iconKey] || iconKey}</option>))}</select></div>
                                    <input className="flex-1 text-xs p-1 border border-gray-200 h-8" value={need.text} onChange={(e) => updateNeed(need.id, 'text', e.target.value)} />
                                    <button onClick={() => removeNeed(need.id)} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                             ))}<button onClick={addNeed} className="w-full py-2 border border-dashed text-xs text-gray-400">+ Dodaj</button></div>
                        </div>
                    </AccordionItem>

                    {/* STEPS */}
                    <AccordionItem title="3. Kroki (Strona 3)" icon={Activity} isOpen={openSection === 'steps'} onToggle={() => toggleAccordion('steps')}>
                        <div className="space-y-2">
                            {[1,2,3,4,5,6].map(num => {
                                const key = `step${num}` as keyof typeof customTexts;
                                return (
                                    <div key={num}>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Krok {num}</label>
                                        <input className="w-full text-xs p-2 border border-gray-200" value={customTexts[key]} onChange={e => updateText(key, e.target.value)} />
                                    </div>
                                )
                            })}
                        </div>
                    </AccordionItem>

                    {/* MEDIA */}
                    <AccordionItem title="4. Multimedia" icon={ImageIcon} isOpen={openSection === 'media'} onToggle={() => toggleAccordion('media')}>
                        <div className="space-y-4">
                            {[
                                { label: 'Zdjęcie Główne', key: 'main' },
                                { label: 'Rzut Techniczny', key: 'floorPlan' },
                                { label: 'Galeria 1', key: 'gallery1' },
                                { label: 'Galeria 2', key: 'gallery2' },
                                { label: 'Zdjęcie Doradcy', key: 'advisor' },
                                { label: 'Logo Firmy', key: 'logo' },
                                { label: 'Tło Ozdobne (Znak wodny)', key: 'decorLeaf' },
                                { label: 'Przekrój Dachu', key: 'techRoof' },
                                { label: 'Przekrój Ściany Zew.', key: 'techWallExt' },
                                { label: 'Przekrój Ściany Wew.', key: 'techWallInt' },
                                { label: 'Przekrój Stropu', key: 'techFloor' },
                            ].map((field) => (
                                <div key={field.key} className="border border-gray-100 p-2 bg-gray-50 rounded">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">{field.label}</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 shrink-0 border border-gray-300"><img src={images[field.key as keyof typeof images]} className="w-full h-full object-cover" /></div>
                                        <input type="file" accept="image/*" className="text-xs w-full" onChange={(e) => { const file = e.target.files?.[0]; if(file) handleImageUpload(field.key as keyof typeof images, file); }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionItem>
                    
                    {/* TECH TEXTS */}
                    <AccordionItem title="8. Opisy Technologii (Strona 4)" icon={Box} isOpen={openSection === 'tech'} onToggle={() => toggleAccordion('tech')}>
                        <div className="space-y-4">
                             <div className="border-b border-gray-100 pb-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Dach</label>
                                <input className="w-full text-xs p-2 border border-gray-200 mb-1 font-bold" value={customTexts.techRoofTitle} onChange={e => updateText('techRoofTitle', e.target.value)} />
                                <textarea rows={2} className="w-full text-xs p-2 border border-gray-200 resize-none" value={customTexts.techRoofDesc} onChange={e => updateText('techRoofDesc', e.target.value)} />
                             </div>
                             <div className="border-b border-gray-100 pb-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Ściana Zewnętrzna</label>
                                <input className="w-full text-xs p-2 border border-gray-200 mb-1 font-bold" value={customTexts.techWallExtTitle} onChange={e => updateText('techWallExtTitle', e.target.value)} />
                                <textarea rows={2} className="w-full text-xs p-2 border border-gray-200 resize-none" value={customTexts.techWallExtDesc} onChange={e => updateText('techWallExtDesc', e.target.value)} />
                             </div>
                             <div className="border-b border-gray-100 pb-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Ściana Wewnętrzna</label>
                                <input className="w-full text-xs p-2 border border-gray-200 mb-1 font-bold" value={customTexts.techWallIntTitle} onChange={e => updateText('techWallIntTitle', e.target.value)} />
                                <textarea rows={2} className="w-full text-xs p-2 border border-gray-200 resize-none" value={customTexts.techWallIntDesc} onChange={e => updateText('techWallIntDesc', e.target.value)} />
                             </div>
                             <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Strop</label>
                                <input className="w-full text-xs p-2 border border-gray-200 mb-1 font-bold" value={customTexts.techFloorTitle} onChange={e => updateText('techFloorTitle', e.target.value)} />
                                <textarea rows={2} className="w-full text-xs p-2 border border-gray-200 resize-none" value={customTexts.techFloorDesc} onChange={e => updateText('techFloorDesc', e.target.value)} />
                             </div>
                        </div>
                    </AccordionItem>

                    {/* SCOPE */}
                    <AccordionItem title="9. Zakres (Strona 9)" icon={Briefcase} isOpen={openSection === 'scope'} onToggle={() => toggleAccordion('scope')}>
                         <div className="space-y-4">
                             <div><label className="text-[10px] font-bold text-gray-400 uppercase">Po naszej stronie</label><textarea rows={3} className="w-full text-xs p-2 border border-gray-200" value={customTexts.scopeOurSide} onChange={e => updateText('scopeOurSide', e.target.value)} /></div>
                             <div><label className="text-[10px] font-bold text-gray-400 uppercase">Po stronie klienta</label><textarea rows={3} className="w-full text-xs p-2 border border-gray-200" value={customTexts.scopeClientSide} onChange={e => updateText('scopeClientSide', e.target.value)} /></div>
                         </div>
                    </AccordionItem>

                    {/* TRANCHES & CTA */}
                    <AccordionItem title="Finanse i CTA" icon={Banknote} isOpen={openSection === 'finance'} onToggle={() => toggleAccordion('finance')}>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Transza 1 (30%)</label><textarea rows={2} className="w-full text-xs p-2 border border-gray-200" value={customTexts.tranche1} onChange={e => updateText('tranche1', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Transza 2 (50%)</label><textarea rows={2} className="w-full text-xs p-2 border border-gray-200" value={customTexts.tranche2} onChange={e => updateText('tranche2', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Transza 3 (20%)</label><textarea rows={2} className="w-full text-xs p-2 border border-gray-200" value={customTexts.tranche3} onChange={e => updateText('tranche3', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">CTA (Ostatnia strona)</label><textarea rows={3} className="w-full text-xs p-2 border border-gray-200" value={customTexts.cta} onChange={e => updateText('cta', e.target.value)} /></div>
                        </div>
                    </AccordionItem>
                </div>
                {/* ACTION FOOTER */}
                
                <div className="p-4 bg-white border-t border-gray-200">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-3">Ustawienia Wydruku (Skala Tekstu)</label>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400">A</span>
                        <input
                            type="range"
                            min="0.8"
                            max="1.4"
                            step="0.05"
                            value={fontScale}
                            onChange={(e) => setFontScale(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6E8809]"
                        />
                        <span className="text-base font-bold text-gray-900">A</span>
                    </div>
                    <div className="text-center text-[10px] font-bold text-gray-300 mt-1">{(fontScale * 100).toFixed(0)}%</div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                    <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brutto</span><span className="text-3xl font-black text-[#6E8809] tracking-tight"><CountUp value={totalGross} /> zł</span></div>
                    <button onClick={handlePrint} className={`w-full py-3 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-xs bg-gray-900 text-white hover:bg-black cursor-pointer`}><FileOutput className="w-4 h-4" /> Drukuj Ofertę</button>
                    <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener noreferrer" className="w-full py-3 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-xs border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200"><ExternalLink className="w-4 h-4" /> Tu kompresuj PDF</a>
                </div>
            </div>

            {/* --- RIGHT PREVIEW (PDF) --- */}
            <div ref={previewRef} className="flex-1 bg-gray-200 overflow-y-auto p-12 print:p-0 print:bg-white print:overflow-visible print:w-full print:h-auto print:block custom-scrollbar">
                <div className="scale-100 origin-top mx-auto print:scale-100 max-w-[210mm]">
                    
                    {/* PAGE 1: OKŁADKA */}
                    <A4Page className="flex flex-col a4-page">
                        <LeafDecor src={images.decorLeaf} />
                        <div className="p-20 flex flex-col h-full">
                            <div className="flex justify-center mb-24"><img src={images.logo} alt="Starter Home" className="h-12 w-auto object-contain" /></div>
                            <div className="mb-16 text-center">
								<span className="inline-block bg-[#f7faf3] text-[#6E8809] font-bold px-6 py-2 uppercase tracking-widest text-sm mb-8 border border-[#e2e8da] rounded-full">
									{selectedHouse.id === 'individual_house'
										? 'Szczegóły projektu indywidualnego'
										: `Szczegóły Projektu ${selectedHouse.name.replace(' HOUSE', '')}`}
								</span>
                                <h1 className="text-6xl font-black text-gray-900 leading-tight mb-6">Spersonalizowana <br/>Oferta</h1>
                                {clientName && (<h2 className="text-2xl text-gray-400 font-light mt-4">Dla: <span className="text-gray-900 font-bold">{clientName}</span></h2>)}
                            </div>
                            <div className="flex items-center justify-center gap-8 mb-20">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#6E8809]"><img src={images.advisor} className="w-full h-full object-cover" alt="Doradca" /></div>
                                <div className="text-left"><div className="font-black text-3xl text-gray-900 mb-1">Krystian Pogorzelski</div><div className="text-[#6E8809] font-bold text-base uppercase tracking-widest">Obsługa Klienta</div></div>
                            </div>
                            <div className="flex-1 relative overflow-hidden mt-auto -mx-20 -mb-20 h-[400px]">
                                <img src={resolvePublicAsset(selectedHouse.image)} className="w-full h-full object-cover" alt="Zdjęcie główne domu" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <div className="absolute bottom-10 right-10 text-white text-right"><p className="text-sm font-light uppercase tracking-widest opacity-80">Model</p><p className="text-3xl font-bold">{selectedHouse.name}</p></div>
                            </div>
                        </div>
                    </A4Page>

                    {/* PAGE 2: ANALIZA POTRZEB */}
                    <A4Page className="flex flex-col p-12 a4-page">
                        <div className="flex justify-between items-start mb-10"><img src={images.logo} alt="Starter Home" className="h-8 w-auto object-contain" /></div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-tight">{customTexts.page2Title}</h2>
                        <div className="space-y-4 mb-8">
                            {needs.map((item) => {
                                const IconComponent = AVAILABLE_ICONS[item.icon] || AVAILABLE_ICONS['Circle'];
                                return (<div key={item.id} className="flex items-center gap-4 text-gray-700" style={{ fontSize: `${16 * fontScale}px` }}><div className="w-8 h-8 bg-[#f7faf3] flex items-center justify-center text-[#6E8809] shrink-0"><IconComponent size={16} strokeWidth={2.5} /></div><span className="font-medium">{item.text}</span></div>);
                            })}
                        </div>
                        <div className="mb-12 border-l-4 border-[#6E8809] pl-6 py-2"><h3 className="text-4xl font-black text-[#6E8809] mb-1">{totalNetPrice.toLocaleString()} zł <span className="text-xl font-medium text-gray-400">netto</span></h3><p className="text-gray-400 text-sm font-medium uppercase tracking-wider">*Cena zawiera wybrane opcje</p></div>
                        
                        {/* USPs SECTION (REPLACED LIST) */}
                        <div className="mt-auto grid grid-cols-1 gap-6">
                            <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-xl">
                                <div className="w-14 h-14 bg-[#f7faf3] text-[#6E8809] flex items-center justify-center rounded-full shrink-0">
                                     <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Brak ukrytych kosztów</h4>
                                    <p className="text-gray-500" style={{ fontSize: `${14 * fontScale}px` }}>Cena w umowie jest ostateczna i transparentna.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-xl">
                                <div className="w-14 h-14 bg-[#f7faf3] text-[#6E8809] flex items-center justify-center rounded-full shrink-0">
                                     <Lock className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Gwarancja niezmienności ceny</h4>
                                    <p className="text-gray-500" style={{ fontSize: `${14 * fontScale}px` }}>Pełne bezpieczeństwo finansowe Twojej inwestycji.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-xl">
                                <div className="w-14 h-14 bg-[#f7faf3] text-[#6E8809] flex items-center justify-center rounded-full shrink-0">
                                     <LayoutTemplate className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Zmiana układu gratis</h4>
                                    <p className="text-gray-500" style={{ fontSize: `${14 * fontScale}px` }}>Dopasuj wnętrze domu do swoich indywidualnych potrzeb.</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-xl">
                                <div className="w-14 h-14 bg-[#f7faf3] text-[#6E8809] flex items-center justify-center rounded-full shrink-0">
                                     <FileSignature className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Przejrzysta umowa</h4>
                                    <p className="text-gray-500" style={{ fontSize: `${14 * fontScale}px` }}>Proste i zrozumiałe warunki współpracy.</p>
                                </div>
                            </div>
                        </div>
                        <OfferFooter />
                    </A4Page>

                    {/* PAGE 3: 6 KROKÓW (NEW) */}
                    <A4Page className="flex flex-col p-20 a4-page">
                         <div className="flex justify-between items-center mb-16"><h2 className="text-3xl font-bold text-gray-900">Twój proces budowy</h2><img src={images.logo} alt="Starter Home" className="h-8 w-auto object-contain" /></div>
                         <div className="grid grid-cols-3 gap-8 mb-auto">
                            {[
                                { num: 1, title: customTexts.step1, icon: MapPin },
                                { num: 2, title: customTexts.step2, icon: Calendar },
                                { num: 3, title: customTexts.step3, icon: FileText },
                                { num: 4, title: customTexts.step4, icon: ShieldCheck },
                                { num: 5, title: customTexts.step5, icon: PenTool },
                                { num: 6, title: customTexts.step6, icon: Hammer },
                            ].map(s => (
                                <div key={s.num} className="bg-[#f9f9f9] p-6 flex flex-col items-center text-center border border-gray-100 rounded-lg">
                                    <div className="w-12 h-12 bg-[#6E8809] rounded-full flex items-center justify-center text-white mb-4"><s.icon className="w-6 h-6" /></div>
                                    <div className="text-4xl font-black text-gray-200 mb-2">0{s.num}</div>
                                    <h3 className="font-bold text-gray-900 leading-tight" style={{ fontSize: `${18 * fontScale}px` }}>{s.title}</h3>
                                </div>
                            ))}
                         </div>
                         <OfferFooter />
                    </A4Page>

                    {/* PAGE 4: TECHNOLOGIA / PRZEKROJE (REDESIGNED 2x2) */}
                    <A4Page className="flex flex-col p-12 a4-page">
                         <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-gray-900">Technologia i Przekroje</h2><img src={images.logo} alt="Starter Home" className="h-6 w-auto object-contain" /></div>
                         
                         <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-6">
                             {/* Item 1: Roof */}
                             <div className="flex flex-col h-full border border-gray-100 bg-white">
                                <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                                    <img src={images.techRoof} className="max-h-full max-w-full object-contain" alt="Dach" />
                                </div>
                                <div className="p-3 flex-1">
                                    <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.techRoofTitle}</h3>
                                    <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>{customTexts.techRoofDesc}</p>
                                </div>
                             </div>

                             {/* Item 2: Ext Wall */}
                             <div className="flex flex-col h-full border border-gray-100 bg-white">
                                <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                                    <img src={images.techWallExt} className="max-h-full max-w-full object-contain" alt="Ściana Zew." />
                                </div>
                                <div className="p-3 flex-1">
                                    <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.techWallExtTitle}</h3>
                                    <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>{customTexts.techWallExtDesc}</p>
                                </div>
                             </div>

                             {/* Item 3: Int Wall */}
                             <div className="flex flex-col h-full border border-gray-100 bg-white">
                                <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                                    <img src={images.techWallInt} className="max-h-full max-w-full object-contain" alt="Ściana Wew." />
                                </div>
                                <div className="p-3 flex-1">
                                    <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.techWallIntTitle}</h3>
                                    <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>{customTexts.techWallIntDesc}</p>
                                </div>
                             </div>

                             {/* Item 4: Ceiling/Floor */}
                             <div className="flex flex-col h-full border border-gray-100 bg-white">
                                <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                                    <img src={images.techFloor} className="max-h-full max-w-full object-contain" alt="Strop" />
                                </div>
                                <div className="p-3 flex-1">
                                    <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.techFloorTitle}</h3>
                                    <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>{customTexts.techFloorDesc}</p>
                                </div>
                             </div>
                         </div>
                         <OfferFooter />
                    </A4Page>

                    {/* PAGE 5: WIZUALIZACJE & RZUTY */}
                    <A4Page className="flex flex-col a4-page">
                        <div className="h-[40%] w-full relative">
                            {selectedHouse.images && selectedHouse.images.length > 0 ? (
                                selectedHouse.images.length === 1 ? (
                                    <img
                                        src={resolveImageSrc(selectedHouse.images[0])}
                                        className="w-full h-full object-cover"
                                        alt="Wizualizacja"
                                    />
                                ) : (
                                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-4 bg-white">
                                        {selectedHouse.images.slice(0, 4).map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={resolveImageSrc(img)}
                                                className="w-full h-full object-cover"
                                                alt={`Wizualizacja ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                <img
                                    src={images.visualization}
                                    className="w-full h-full object-cover"
                                    alt="Wizualizacja"
                                />
                            )}
                            <div className="absolute top-8 left-8 bg-white px-4 py-2 font-bold uppercase tracking-widest text-xs">Wizualizacja</div>
                        </div>
                        <div className="h-[60%] w-full bg-[#f9f9f9] p-12 flex flex-col relative">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3"><Layers className="text-[#6E8809]" /> Rzut Techniczny</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <img src={images.floorPlan} className="max-h-full max-w-full object-contain mix-blend-multiply" alt="Rzut" />
                            </div>
                            <div className="absolute bottom-12 right-12 bg-white p-6 border border-gray-100 max-w-xs">
                                 <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase text-xs tracking-wider">Metraż</h4>
                                 <div className="flex justify-between mb-1"><span className="text-gray-500 text-sm">Zabudowy</span><span className="font-bold">{selectedHouse.details?.builtArea}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500 text-sm">Użytkowa</span><span className="font-bold text-[#6E8809]">{selectedHouse.details?.usableArea}</span></div>
                            </div>
                        </div>
                    </A4Page>

                    {/* PAGE 6: TABELA STANÓW (COMPARISON) & ZAKRES (NEW) */}
                    <A4Page className="flex flex-col p-12 a4-page">
                        <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-gray-900">Porównanie Stanów</h2><img src={images.logo} alt="Starter Home" className="h-6 w-auto object-contain" /></div>
                        
                        <div className="mb-12">
                            <table className="w-full border-collapse" style={{ fontSize: `${12 * fontScale}px` }}>
                                <thead>
                                    <tr className="bg-gray-900 text-white">
                                        <th className="p-3 text-left w-1/3">Element</th>
                                        <th className="p-3 text-center w-1/3 bg-gray-800">Stan Surowy Zamknięty</th>
                                        <th className="p-3 text-center w-1/3 bg-[#6E8809]">Stan Deweloperski</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { el: "Konstrukcja C24", s: true, d: true },
                                        { el: "Dach z pełnym deskowaniem + blacha na rąbek", s: true, d: true },
                                        { el: "Okna 3-szybowe", s: true, d: true },
                                        { el: "Elewacja na gotowo", s: true, d: true },
                                        { el: "Ocieplenie (wełna)", s: false, d: true },
                                        { el: "Instalacje (Wod-Kan, Prąd)", s: false, d: true },
                                        { el: "Ściany G-K", s: false, d: true },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-gray-100 last:border-0 even:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-700">{row.el}</td>
                                            <td className="p-3 text-center text-gray-500">{row.s ? <Check className="w-5 h-5 mx-auto text-gray-900" /> : <X className="w-4 h-4 mx-auto text-gray-300" />}</td>
                                            <td className="p-3 text-center text-[#6E8809] font-bold bg-[#f7faf3]">{row.d ? <Check className="w-5 h-5 mx-auto" /> : <X className="w-4 h-4 mx-auto" />}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-auto">
                            <div className="bg-[#f7faf3] p-6 border border-[#e2e8da]">
                                <h4 className="font-bold text-[#6E8809] uppercase tracking-wider mb-4 flex items-center gap-2" style={{ fontSize: `${12 * fontScale}px` }}><Briefcase className="w-4 h-4" /> Po naszej stronie</h4>
                                <p className="text-gray-700 whitespace-pre-line leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.scopeOurSide}</p>
                            </div>
                            <div className="bg-gray-50 p-6 border border-gray-200">
                                <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2" style={{ fontSize: `${12 * fontScale}px` }}><User className="w-4 h-4" /> Po stronie klienta</h4>
                                <p className="text-gray-600 whitespace-pre-line leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.scopeClientSide}</p>
                            </div>
                        </div>
                        <OfferFooter />
                    </A4Page>

                    {/* PAGE 7: PODSUMOWANIE FINANSOWE (JUST THE TABLE) */}
                    <A4Page className="flex flex-col relative a4-page overflow-hidden">
                        <LeafDecor src={images.decorLeaf} />
                        <div className="flex-1 flex flex-col p-12 pb-8 h-full">
                             <div className="flex justify-between items-start mb-8">
                                <h2 className="text-3xl font-black text-gray-900">Podsumowanie Oferty</h2>
                                <img src={images.logo} alt="Starter Home" className="h-8 w-auto object-contain" />
                             </div>

                             {/* DYNAMIC SPACER TABLE - EXPANDED */}
                             <div className="bg-gray-50 border-t-4 border-[#6E8809] flex-1 flex flex-col mb-4 overflow-hidden">
                                <div className="p-6 bg-gray-100 border-b border-gray-200 flex justify-between items-center shrink-0">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Wybrany Model</span>
                                    <span className="font-black text-xl text-gray-900">{selectedHouse.name}</span>
                                </div>
                                
                                {/* SCROLLABLE CONTENT AREA */}
                                <div className="flex-1 overflow-visible p-8">
                                     <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-200">
                                                <th className="pb-4 font-medium w-1/2">Pozycja</th>
                                                <th className="pb-4 font-medium w-1/4">Szczegóły</th>
                                                <th className="pb-4 font-medium w-1/4 text-right">Cena Netto</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: `${12 * fontScale}px` }}>
                                            <tr className="border-b border-gray-200 leading-loose">
                                                <td className="py-2 font-bold text-gray-800">Stan Bazowy ({isDeveloperState ? 'Deweloperski' : 'Surowy'})</td>
                                                <td className="py-2 text-gray-500">-</td>
                                                <td className="py-2 text-right font-bold text-gray-900">{basePrice.toLocaleString()} zł</td>
                                            </tr>
                                            {selectedItemsList.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-200 leading-loose">
                                                    <td className="py-2 font-medium text-gray-700">{item.name}</td>
                                                    <td className="py-2 text-gray-500 italic">{item.variant || '-'}</td>
                                                    <td className="py-2 text-right font-bold text-gray-900">+ {item.price.toLocaleString()} zł</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                     </table>
                                </div>

                                {/* TOTALS (Fixed at bottom of grey area) */}
                                <div className="p-6 bg-white border-t border-gray-200 mt-auto shrink-0">
                                     <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500 uppercase tracking-widest text-sm">Suma Netto</span>
                                        <span className="text-xl font-bold text-gray-900">{totalNetPrice.toLocaleString()} zł</span>
                                     </div>
                                     <div className="flex justify-between items-center mb-6">
                                        <span className="text-gray-400 uppercase tracking-widest text-xs">+ VAT 8%</span>
                                        <span className="text-sm text-gray-500">{totalVat.toLocaleString()} zł</span>
                                     </div>
                                     <div className="flex justify-between items-center p-4 bg-[#6E8809] text-white rounded-lg">
                                        <span className="font-bold uppercase tracking-widest text-lg">Razem Brutto</span>
                                        <span className="text-3xl font-black">{totalGross.toLocaleString()} zł</span>
                                     </div>
                                </div>
                             </div>
                        </div>
                    </A4Page>

                    {/* PAGE 8: HARMONOGRAM & CTA (NEW PAGE) */}
                    <A4Page className="flex flex-col relative a4-page overflow-hidden p-12">
                         <div className="flex justify-between items-center mb-16">
                             <h2 className="text-3xl font-black text-gray-900">Harmonogram i Kontakt</h2>
                             <img src={images.logo} alt="Starter Home" className="h-8 w-auto object-contain" />
                         </div>

                         {/* TRANCHES */}
                         <div className="mb-auto space-y-4">
                             <div className="flex items-start gap-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                 <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center text-xl font-black rounded-lg shrink-0">I</div>
                                 <div>
                                     <h4 className="text-sm font-bold text-gray-900 mb-2">I Transza (30%)</h4>
                                     <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.tranche1}</p>
                                 </div>
                             </div>
                             <div className="flex items-start gap-6 p-4 bg-[#f7faf3] border border-[#dcfce7] rounded-xl">
                                 <div className="w-12 h-12 bg-[#6E8809] text-white flex items-center justify-center text-xl font-black rounded-lg shrink-0">II</div>
                                 <div>
                                     <h4 className="text-sm font-bold text-gray-900 mb-2">II Transza (50%)</h4>
                                     <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.tranche2}</p>
                                 </div>
                             </div>
                             <div className="flex items-start gap-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                 <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center text-xl font-black rounded-lg shrink-0">III</div>
                                 <div>
                                     <h4 className="text-sm font-bold text-gray-900 mb-2">III Transza (20%)</h4>
                                     <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>{customTexts.tranche3}</p>
                                 </div>
                             </div>
                         </div>

                         {/* CTA BIG */}
                         <div className="mt-12 bg-white border-t-2 border-[#6E8809] pt-8">
                             <div className="flex items-center gap-8">
                                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shrink-0">
                                      <img src={images.advisor} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1">
                                      <p className="font-medium text-gray-900 italic mb-4 leading-relaxed tracking-tight" style={{ fontSize: `${18 * fontScale}px` }}>
                                          "{customTexts.cta}"
                                      </p>
                                      <div>
                                          <div className="text-xs font-bold text-[#6E8809] uppercase tracking-widest mb-1">Twój Opiekun</div>
                                          <div className="text-xl font-black text-gray-900">Krystian Pogorzelski</div>
                                      </div>
                                  </div>
                             </div>
                         </div>
                    </A4Page>

                </div>
            </div>
        </div>
    );
};
