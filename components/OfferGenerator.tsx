
import React, { useState, useMemo, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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


// --- FLOOR PLAN (RZUT) HELPERS ---
// Naming convention in /public: rzut-<house>-<index>.webp (e.g., rzut-nest-1.webp)
const FALLBACK_FLOORPLAN = 'https://howsmart.pl/wp-content/uploads/2025/02/EMILY-RZUT-PL-scaled.jpg';
const MAX_FLOORPLANS_PER_HOUSE = 20;

const getHouseSlugFromId = (houseId: string) => {
    if (!houseId) return '';
    // Remove trailing "_house" and convert remaining underscores to hyphens if any.
    return houseId.replace(/_house$/i, '').replace(/_/g, '-').toLowerCase();
};

const getFloorPlanSrc = (houseId: string, index: number) => {
    const slug = getHouseSlugFromId(houseId);
    if (!slug || !index || index < 1) return '';
    return resolvePublicAsset(`/rzut-${slug}-${index}.webp`);
};




const NEED_TEXT_PRESETS = [
    'Dom o powierzchni do 70m2 zabudowy',
    '2 sypialnie',
    '3 sypialnie',
    'Stan surowy zamknięty',
    'Stan deweloperski',
    'Projekt indywidualny',
    'Płyta fundamentowa',
    'Lokalizacja: Cała Polska',
    'Pompa ciepła',
    'Ogrzewanie podłogowe',
    'Rekuperacja',
    'Fotowoltaika',
    'Taras',
    'Garaż',
    'Antresola',
    'Duże przeszklenia',
    'Wysoki salon',
    'Dodatkowa łazienka',
    'Biuro / gabinet',
    'Kredyt hipoteczny',
];

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

type CompressionSettings = { targetWidth: number; jpegQuality: number };

// Poziom kompresji: 1 = minimalna (lepsza jakość), 100 = maksymalna (mniejszy plik)
const getCompressionSettings = (level: number): CompressionSettings => {
    const clamped = Math.max(1, Math.min(100, Math.round(level)));
    // JPEG quality: 0.90 -> 0.20
    const jpegQuality = 0.9 - (clamped / 100) * 0.7;
    // Target width: 1400px -> 800px
    const targetWidth = Math.round(1400 - (clamped / 100) * 600);
    return { targetWidth, jpegQuality };
};

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

const processImageForPrint = async (
    src: string,
    label: string,
    onLog: (msg: string) => void,
    onStatusUpdate: (msg: string) => void,
    params: CompressionSettings
): Promise<ProcessedImageResult> => {
    if (src.startsWith('data:')) {
         onStatusUpdate('Optymalizacja lokalna...');
         const originalSize = src.length * 0.75;
         try {
             const img = await loadImageWithTimeout(src);
             const result = rasterizeImage(img, originalSize, params);
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
        const result = rasterizeImage(img, originalSize, params);
        onLog(`${label}: ${bytesToMB(originalSize).toFixed(2)}MB -> ${bytesToMB(result.compressedSize).toFixed(2)}MB`);
        URL.revokeObjectURL(objectUrl);
        return result;
    } catch (error) {
        onLog(`${label}: Błąd przetwarzania obrazu - zachowano oryginał.`);
        URL.revokeObjectURL(objectUrl);
        return { originalSize: 0, compressedSize: 0, dataUrl: src };
    }
};

const rasterizeImage = (img: HTMLImageElement, originalSize: number, params: CompressionSettings): ProcessedImageResult => {
    const canvas = document.createElement('canvas');
    const TARGET_WIDTH = params.targetWidth;
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
    const newDataUrl = canvas.toDataURL('image/jpeg', params.jpegQuality);
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
    compressionLevel: number;
    onCompressionLevelChange: (val: number) => void;
    onSaveCompressedPdf: () => void;
}
const CompressionModal: React.FC<CompressionModalProps> = ({ isOpen, onClose, onRun, onCancel, status, logs, progress, currentFile, processingDetail, stats, compressionLevel, onCompressionLevelChange, onSaveCompressedPdf }) => {
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

                    {status === 'idle' && (
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Poziom kompresji</span>
                                <span className="text-xs font-bold text-gray-900">{Math.round(compressionLevel)}%</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={100}
                                step={1}
                                value={compressionLevel}
                                onChange={(e) => onCompressionLevelChange(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6E8809]"
                            />
                            <div className="text-[10px] text-gray-500 mt-2 leading-snug">
                                1% = minimalna kompresja (lepsza jakość), 100% = maksymalna kompresja (mniejszy plik)
                            </div>
                        </div>
                    )}
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
                    {status === 'idle' && (
                        <button onClick={onRun} className="w-full py-3 bg-gray-900 text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-black transition-colors flex items-center justify-center gap-2">
                            <FileDown className="w-4 h-4" /> Zapisz skompresowany PDF
                        </button>
                    )}
                    {status === 'running' && (<button onClick={onCancel} className="w-full py-3 bg-red-50 text-red-600 border border-red-100 font-bold uppercase tracking-widest text-xs rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><StopCircle className="w-4 h-4" /> Anuluj</button>)}
                    {status === 'done' && (
                        <div className="space-y-2">
                            <button onClick={onSaveCompressedPdf} className="w-full py-3 bg-[#6E8809] text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-[#556b07] transition-colors flex items-center justify-center gap-2">
                                <FileDown className="w-4 h-4" /> Zapisz ponownie PDF
                            </button>
                            <button onClick={onClose} className="w-full py-3 bg-white text-gray-700 border border-gray-200 font-bold uppercase tracking-widest text-xs rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Zamknij
                            </button>
                        </div>
                    )}
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
const ProcessFlowTable: React.FC<{ type: 'cash' | 'credit' }> = ({ type }) => {
    const steps =
        type === 'cash'
            ? [
                  { no: 1, title: 'ETAP 1 – Analiza działki', desc: 'Sprawdzamy możliwości zabudowy, warunki techniczne oraz zgodność działki z planem miejscowym lub warunkami zabudowy.' },
                  { no: 2, title: 'ETAP 2 – Wybór projektu', desc: 'Dobieramy projekt domu dopasowany do działki, budżetu i potrzeb inwestora.' },
                  { no: 3, title: 'ETAP 3 – Podpisanie umowy', desc: 'Ustalamy zakres realizacji, harmonogram oraz warunki współpracy.' },
                  { no: 4, title: 'ETAP 4 – Uzyskanie pozwoleń urzędowych', desc: 'Przygotowujemy dokumentację i wspieramy klienta w uzyskaniu wymaganych decyzji administracyjnych.' },
                  { no: 5, title: 'ETAP 5 – Rozpoczęcie budowy', desc: 'Rozpoczynamy realizację inwestycji zgodnie z harmonogramem.' },
              ]
            : [
                  { no: 1, title: 'ETAP 1 – Analiza działki', desc: 'Weryfikujemy działkę pod kątem formalnym i technicznym, niezbędnym do realizacji inwestycji i procesu kredytowego.' },
                  { no: 2, title: 'ETAP 2 – Wybór projektu', desc: 'Pomagamy w wyborze projektu spełniającego wymagania klienta oraz banku.' },
                  { no: 3, title: 'ETAP 3 – Podpisanie umowy', desc: 'Podpisujemy umowę stanowiącą podstawę do dalszych działań formalnych i kredytowych.' },
                  { no: 4, title: 'ETAP 4 – Uzyskanie pozwoleń urzędowych', desc: 'Zapewniamy wsparcie w przygotowaniu dokumentów potrzebnych do uzyskania pozwoleń.' },
                  { no: 5, title: 'ETAP 5 – Uzyskanie kredytu', desc: 'Wspieramy klienta w procesie uzyskania finansowania bankowego.' },
                  { no: 6, title: 'ETAP 6 – Rozpoczęcie budowy', desc: 'Po uruchomieniu finansowania rozpoczynamy budowę domu.' },
              ];

    const header = type === 'cash' ? 'Klient gotówkowy' : 'Klient kredytowy';

    return (
        <div className="w-full max-w-[720px]">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="bg-[#6e8809] text-white px-6 py-4">
                    <div className="text-lg font-bold tracking-tight">{header}</div>
                </div>

                <div className="px-6 py-6">
                    <div className="space-y-4">
                        {steps.map((s, idx) => (
                            <div key={s.no}>
                                <div className="flex gap-4">
                                    <div className="w-9 h-9 rounded-full bg-[#f7faf3] border border-[#e2e8da] flex items-center justify-center font-bold text-[#6e8809] shrink-0">
                                        {s.no}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{s.title}</div>
                                        <div className="text-gray-600 text-sm leading-relaxed mt-1">{s.desc}</div>
                                    </div>
                                </div>

                                {idx < steps.length - 1 && (
                                    <div className="ml-4 mt-3 mb-3 h-6 border-l-2 border-[#e2e8da] relative" aria-hidden="true">
                                        <div className="absolute -left-[7px] bottom-0 w-3 h-3 border-r-2 border-b-2 border-[#e2e8da] rotate-45" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN GENERATOR ---
export const OfferGenerator: React.FC = () => {
    const [welcomeDone, setWelcomeDone] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    // Contains ONLY the A4 pages (without the gray preview wrapper/padding).
    // We generate PDFs from this node to keep pagination stable.
    const pdfRootRef = useRef<HTMLDivElement>(null);
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
    // 1..100 (1 = minimalna kompresja, 100 = maksymalna)
    const [compressionLevel, setCompressionLevel] = useState(60);

    // -- SCALING STATE --
    const [fontScale, setFontScale] = useState(1.0);
    const [processClientType, setProcessClientType] = useState<'cash' | 'credit'>('cash');


    // -- STATES --
    const [openSection, setOpenSection] = useState<string>('config');
    const [clientName, setClientName] = useState('');
    const [selectedHouse, setSelectedHouse] = useState<House>(HOUSES[1]);
    const [individualProjectName, setIndividualProjectName] = useState('Projekt Indywidualny');
    const displayHouseName = selectedHouse.id === 'individual_house' ? (individualProjectName.trim() || 'Projekt Indywidualny') : selectedHouse.name;
    const isIndividualProject = selectedHouse.id === 'individual_house';
    const [buildMode, setBuildMode] = useState<'surowy' | 'deweloperski' | 'both'>('surowy');
    const [isDeveloperState, setIsDeveloperState] = useState(false); 
    // TRYB EDYCJI (dla wszystkich domów)
    const [isEditMode, setIsEditMode] = useState(false);
    // Nadpisania (edytowalne nazwy/opcje/ceny) per dom
    const [itemsByHouse, setItemsByHouse] = useState<Record<string, OfferItem[]>>({});
    const [basePricesByHouse, setBasePricesByHouse] = useState<Record<string, { surowy: number; deweloperski: number }>>({});
    type BuildStateKey = 'surowy' | 'deweloperski';
    type CustomSectionItem = { id: string; title: string; text: string; price: number };
    type CustomExtraItem = { label: string; price: number };
    const createCustomSection = (): CustomSectionItem => ({ id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: 'Zakres / opis', text: '', price: 0 });
    const createCustomExtra = (): CustomExtraItem => ({ label: '', price: 0 });
    // Projekt indywidualny - sekcje opisowe + cena
    const [customSections, setCustomSections] = useState<CustomSectionItem[]>([createCustomSection()]);
    const [customSectionsDual, setCustomSectionsDual] = useState<Record<BuildStateKey, CustomSectionItem[]>>({
        surowy: [createCustomSection()],
        deweloperski: [createCustomSection()],
    });


    // MEDIA
    const [images, setImages] = useState({
        main: selectedHouse.image,
        visualization: resolvePublicAsset(selectedHouse.visualizationImage ?? selectedHouse.image),
        gallery1: selectedHouse.image,
        gallery2: selectedHouse.image,
        interior: 'https://starterhome.pl/wp-content/uploads/2025/10/ujecie-1-scaled.png',
        floorPlan: getFloorPlanSrc(selectedHouse.id, 1) || FALLBACK_FLOORPLAN,
        advisor: 'https://i.ibb.co/j9NzkpfG/Krystian.jpg',
        logo: 'https://i.ibb.co/PZJv90w6/logo.png',
        decorLeaf: 'https://starterhome.pl/wp-content/uploads/2025/12/cropped-Favicon.png',
        // 4 Tech Images
        techRoof: '/assets/G_F_4.png',
        techWallExt: 'https://starterhome.pl/wp-content/uploads/2025/12/G_F_2.png',
        techWallInt: 'https://starterhome.pl/wp-content/uploads/2025/12/G_2.png',
        techFloor: '/assets/G_F_5.png' // Strop
    });

    // FLOOR PLANS (RZUTY) - loaded dynamically from /public (GitHub Pages safe via BASE_URL)
    const [floorPlanCandidates, setFloorPlanCandidates] = useState<string[]>([]);
    const [availableFloorPlans, setAvailableFloorPlans] = useState<string[]>([]);
    const [activeFloorPlanIndex, setActiveFloorPlanIndex] = useState(0);

    useEffect(() => {
        const isIndividual = selectedHouse?.id === "individual_house" || selectedHouse?.name === "Projekt Indywidualny";
        // For the individual project, reuse Nest floor plan (rzut-nest-1.webp) as requested.
        const candidates = isIndividual
            ? [getFloorPlanSrc("nest_house", 1)].filter(Boolean)
            : Array.from({ length: MAX_FLOORPLANS_PER_HOUSE }, (_, i) => getFloorPlanSrc(selectedHouse.id, i + 1)).filter(Boolean);
        setFloorPlanCandidates(candidates);
        setAvailableFloorPlans([]);
        setActiveFloorPlanIndex(0);
    }, [selectedHouse.id]);

    // Keep the global "floorPlan" image in sync with the first available plan (used by other parts of the generator)
    useEffect(() => {
        if (availableFloorPlans.length > 0) {
            setImages(prev => ({ ...prev, floorPlan: availableFloorPlans[0] }));
        }
    }, [availableFloorPlans]);


    useEffect(() => {
        setImages(prev => ({
            ...prev,
            main: selectedHouse.image,
            visualization: resolvePublicAsset(selectedHouse.visualizationImage ?? selectedHouse.image),
            gallery1: selectedHouse.image,
            gallery2: selectedHouse.image,
            // Default floor plan comes from /public using the naming convention.
            floorPlan: getFloorPlanSrc(selectedHouse.id, 1) || FALLBACK_FLOORPLAN,
        }));
        setIsCompressed(false);
        setCompressionStatus('idle');
    }, [selectedHouse]);

    // CONFIG STATE - Updated to handle Radio/Number/Checkbox
    const [offerConfig, setOfferConfig] = useState<Record<string, any>>({});
    const [offerConfigDual, setOfferConfigDual] = useState<Record<BuildStateKey, Record<string, any>>>({ surowy: {}, deweloperski: {} });

    useEffect(() => {
        // Dla projektu indywidualnego konfiguracja opcji nie jest potrzebna
        if (selectedHouse.id === 'individual_house') {
            setOfferConfig({});
            setOfferConfigDual({ surowy: {}, deweloperski: {} });
            return;
        }
        const items = getOfferItemsForHouse(selectedHouse);
        const newConfig: Record<string, any> = {};
        items.forEach((item) => {
            newConfig[item.code] = item.defaultValue;
        });
        setOfferConfig(newConfig);
        setOfferConfigDual({ surowy: { ...newConfig }, deweloperski: { ...newConfig } });
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

    const handleConfigChangeForState = (stateKey: BuildStateKey, code: string, value: any) => {
        setOfferConfigDual(prev => ({
            ...prev,
            [stateKey]: { ...(prev[stateKey] || {}), [code]: value }
        }));
    };

    const getConfigForState = (stateKey: BuildStateKey) => buildMode === 'both' ? (offerConfigDual[stateKey] || {}) : offerConfig;
    const getCustomSectionsForState = (stateKey: BuildStateKey) => buildMode === 'both' ? (customSectionsDual[stateKey] || []) : customSections;
    const getCustomExtrasForState = (stateKey: BuildStateKey) => buildMode === 'both' ? (customExtrasDual[stateKey] || []) : customExtras;

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
    const addCustomSection = (stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomSectionsDual(prev => ({ ...prev, [stateKey]: [...(prev[stateKey] || []), createCustomSection()] }));
            return;
        }
        setCustomSections(prev => [...prev, createCustomSection()]);
    };
    const removeCustomSection = (id: string, stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomSectionsDual(prev => ({
                ...prev,
                [stateKey]: (prev[stateKey] || []).length <= 1 ? (prev[stateKey] || []) : (prev[stateKey] || []).filter(s => s.id !== id)
            }));
            return;
        }
        setCustomSections(prev => prev.length <= 1 ? prev : prev.filter(s => s.id !== id));
    };
    const updateCustomSection = (id: string, patch: Partial<{ title: string; text: string; price: number }>, stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomSectionsDual(prev => ({
                ...prev,
                [stateKey]: (prev[stateKey] || []).map(s => s.id === id ? { ...s, ...patch } : s)
            }));
            return;
        }
        setCustomSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    };

    const updateCustomExtra = (index: number, patch: Partial<CustomExtraItem>, stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomExtrasDual(prev => ({
                ...prev,
                [stateKey]: (prev[stateKey] || []).map((item, i) => i === index ? { ...item, ...patch } : item)
            }));
            return;
        }
        setCustomExtras(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
    };
    const addCustomExtra = (stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomExtrasDual(prev => ({ ...prev, [stateKey]: [...(prev[stateKey] || []), createCustomExtra()] }));
            return;
        }
        setCustomExtras(prev => [...prev, createCustomExtra()]);
    };
    const removeCustomExtra = (index: number, stateKey?: BuildStateKey) => {
        if (stateKey) {
            setCustomExtrasDual(prev => ({
                ...prev,
                [stateKey]: (prev[stateKey] || []).length <= 1 ? [createCustomExtra()] : (prev[stateKey] || []).filter((_, i) => i !== index)
            }));
            return;
        }
        setCustomExtras(prev => prev.length <= 1 ? [createCustomExtra()] : prev.filter((_, i) => i !== index));
    };

    const renderConfigEditor = (stateKey: BuildStateKey) => {
        const stateLabel = stateKey === 'surowy' ? 'Surowy zamknięty' : 'Deweloperski';
        const stateConfig = getConfigForState(stateKey);
        const customStateKey = buildMode === 'both' ? stateKey : undefined;
        const applyConfigChange = (code: string, value: any) => {
            if (buildMode === 'both') {
                handleConfigChangeForState(stateKey, code, value);
            } else {
                handleConfigChange(code, value);
            }
        };
        const stateSections = getCustomSectionsForState(stateKey);
        return (
            <div className="border border-gray-200 p-3 space-y-4 bg-white">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#6E8809]">{stateLabel}</div>
                {selectedHouse.id === 'individual_house' ? (
                    <div className="space-y-3">
                        {stateSections.map((sec) => (
                            <div key={sec.id} className="border border-gray-200 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="text" className="flex-1 p-2 border border-gray-200 text-sm font-bold" value={sec.title} onChange={(e) => updateCustomSection(sec.id, { title: e.target.value }, customStateKey)} placeholder="Tytuł sekcji" />
                                    <button type="button" className="px-2 py-2 text-xs border border-gray-200 text-gray-500 hover:text-red-600" onClick={() => removeCustomSection(sec.id, customStateKey)} title="Usuń">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <textarea rows={3} className="w-full p-2 border border-gray-200 text-xs" value={sec.text} onChange={(e) => updateCustomSection(sec.id, { text: e.target.value }, customStateKey)} placeholder="Opis / szczegóły" />
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="text-[11px] text-gray-500 mb-1">Cena netto (PLN)</div>
                                        <input type="number" className="w-full p-2 border border-gray-200 text-sm" value={sec.price} onChange={(e) => updateCustomSection(sec.id, { price: Number(e.target.value) }, customStateKey)} />
                                    </div>
                                    <div className="text-[11px] text-gray-400 flex items-end">Ta kwota zostanie doliczona do podsumowania dla tego stanu.</div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addCustomSection(customStateKey)} className="w-full p-3 border border-dashed border-gray-300 text-xs font-bold uppercase text-gray-600 hover:border-[#6E8809] hover:text-[#6E8809]">Dodaj sekcję</button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {availableItems.map((item) => (
                            <div key={`${stateKey}-${item.code}`} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                                {isEditMode ? (
                                    <input type="text" className="w-full p-2 border border-gray-200 text-sm font-bold" value={item.name} onChange={(e) => updateItem(item.code, { name: e.target.value })} />
                                ) : (
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h4>
                                )}
                                <p className="text-xs text-gray-500 mb-3">{item.description}</p>
                                {item.type === 'radio' && item.options && (
                                    <div className="space-y-2">
                                        {item.options.map(opt => (
                                            <label key={`${stateKey}-${opt.id}`} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${stateConfig[item.code] === opt.id ? 'border-[#6E8809]' : 'border-gray-300'}`}>
                                                    {stateConfig[item.code] === opt.id && <div className="w-2 h-2 rounded-full bg-[#6E8809]" />}
                                                </div>
                                                <input type="radio" className="hidden" name={`${stateKey}-${item.code}`} checked={stateConfig[item.code] === opt.id} onChange={() => applyConfigChange(item.code, opt.id)} />
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
                                            <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 border-gray-300">
                                                {(stateConfig[item.code] === 'none' || !stateConfig[item.code]) && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                            </div>
                                            <input type="radio" className="hidden" name={`${stateKey}-${item.code}`} checked={stateConfig[item.code] === 'none'} onChange={() => applyConfigChange(item.code, 'none')} />
                                            <span className="text-xs text-gray-400">Brak wyboru / Domyślne</span>
                                        </label>
                                    </div>
                                )}
                                {item.type === 'checkbox' && (
                                    <label className={`flex items-center justify-between p-3 border rounded cursor-pointer ${stateConfig[item.code] ? 'bg-[#f7faf3] border-[#6E8809]' : 'bg-white border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 border rounded flex items-center justify-center ${stateConfig[item.code] ? 'bg-[#6E8809] border-[#6E8809]' : 'bg-white border-gray-300'}`}>
                                                {stateConfig[item.code] && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">Dodaj do oferty</span>
                                            <input type="checkbox" className="hidden" checked={!!stateConfig[item.code]} onChange={(e) => applyConfigChange(item.code, e.target.checked)} />
                                        </div>
                                        {isEditMode ? (
                                            <input type="number" className="w-28 p-2 border border-gray-200 text-xs font-bold text-[#6E8809]" value={item.price ?? 0} onClick={(e) => e.stopPropagation()} onChange={(e) => updateItem(item.code, { price: Number(e.target.value) })} />
                                        ) : (
                                            <span className="text-xs font-bold text-[#6E8809]">+ {item.price?.toLocaleString()} zł</span>
                                        )}
                                    </label>
                                )}
                                {item.type === 'number' && (
                                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded">
                                        <div className="flex items-center">
                                            <button onClick={() => applyConfigChange(item.code, Math.max(0, (stateConfig[item.code] || 0) - 1))} className="w-8 h-8 bg-white border border-gray-200 hover:text-[#6E8809] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                            <input type="number" className="w-12 text-center bg-transparent text-sm font-bold" value={stateConfig[item.code] || 0} readOnly />
                                            <button onClick={() => applyConfigChange(item.code, (stateConfig[item.code] || 0) + 1)} className="w-8 h-8 bg-white border border-gray-200 hover:text-[#6E8809] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
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
                                            <div className="text-xs font-bold text-[#6E8809]">Razem: {((stateConfig[item.code] || 0) * (item.price || 0)).toLocaleString()} zł</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="border-t border-gray-200 pt-5">
                            <div className="mb-3">
                                <div className="text-sm font-bold text-gray-800">Custom</div>
                                <div className="text-xs text-gray-500">Dodaj własną pozycję z tytułem, opisem i ceną. Zostanie doliczona do tego stanu i pokaże się w PDF.</div>
                            </div>
                            <div className="space-y-3">
                                {stateSections.map((sec) => (
                                    <div key={sec.id} className="border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                                        <div className="flex items-center gap-2">
                                            <input type="text" className="flex-1 p-2 border border-gray-200 text-sm font-bold bg-white" value={sec.title} onChange={(e) => updateCustomSection(sec.id, { title: e.target.value }, customStateKey)} placeholder="Tytuł" />
                                            <button type="button" className="px-2 py-2 text-xs border border-gray-200 text-gray-500 hover:text-red-600 bg-white" onClick={() => removeCustomSection(sec.id, customStateKey)} title="Usuń">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <textarea rows={2} className="w-full p-2 border border-gray-200 text-xs bg-white" value={sec.text} onChange={(e) => updateCustomSection(sec.id, { text: e.target.value }, customStateKey)} placeholder="Opis" />
                                        <div>
                                            <div className="text-[11px] text-gray-500 mb-1">Cena netto (PLN)</div>
                                            <input type="number" className="w-full p-2 border border-gray-200 text-sm bg-white" value={sec.price} onChange={(e) => updateCustomSection(sec.id, { price: Number(e.target.value) }, customStateKey)} placeholder="0" />
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addCustomSection(customStateKey)} className="w-full p-3 border border-dashed border-gray-300 text-xs font-bold uppercase text-gray-600 hover:border-[#6E8809] hover:text-[#6E8809]">Dodaj pozycję custom</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCustomExtrasEditor = (stateKey: BuildStateKey) => {
        const stateLabel = stateKey === 'surowy' ? 'Surowy zamknięty' : 'Deweloperski';
        const customStateKey = buildMode === 'both' ? stateKey : undefined;
        const extras = getCustomExtrasForState(stateKey);
        return (
            <div className="border border-gray-200 p-3 space-y-3 bg-white">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#6E8809]">{stateLabel}</div>
                {extras.map((extra, index) => (
                    <div key={`${stateKey}-${index}`} className="border border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Pozycja niestandardowa</div>
                            <button type="button" title="Usuń pozycję" onClick={() => removeCustomExtra(index, customStateKey)} className="p-1 text-gray-400 hover:text-gray-900">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Np. Transport"
                            className="w-full text-xs p-2 border border-gray-200 mb-2"
                            value={extra.label}
                            onChange={(e) => updateCustomExtra(index, { label: e.target.value }, customStateKey)}
                        />
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Cena netto (zł)</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="w-full text-xs p-2 border border-gray-200"
                            value={extra.price}
                            onChange={(e) => updateCustomExtra(index, { price: Number(e.target.value) }, customStateKey)}
                        />
                    </div>
                ))}
                <button type="button" onClick={() => addCustomExtra(customStateKey)} className="flex items-center gap-2 text-xs font-bold text-[#6E8809]">
                    <Plus className="w-4 h-4" />
                    Dodaj kolejną pozycję
                </button>
            </div>
        );
    };

    // NEEDS (Page 2)
    const [customExtras, setCustomExtras] = useState<CustomExtraItem[]>([createCustomExtra()]);
    const [customExtrasDual, setCustomExtrasDual] = useState<Record<BuildStateKey, CustomExtraItem[]>>({
        surowy: [createCustomExtra()],
        deweloperski: [createCustomExtra()],
    });
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
        const params = getCompressionSettings(compressionLevel);
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
            const result = await processImageForPrint(newImages[key], String(key), addLog, (status) => setProcessingDetail(status), params);
            totalOriginal += bytesToMB(result.originalSize); totalCompressed += bytesToMB(result.compressedSize);
            newImages[key] = result.dataUrl;
        }
        if (abortRef.current) return;
        setCompressionProgress(100); setCurrentProcessingFile('Finalizacja...');
        await new Promise(resolve => setTimeout(resolve, 300));
        setImages(newImages); setCompressionStats({ original: totalOriginal, compressed: totalCompressed }); setCompressionStatus('done'); setIsCompressed(true);
    };

    const getPdfFilename = (suffix?: string) => {
        const house = displayHouseName.replace(/\s+/g, '-').toLowerCase();
        const state = buildMode === 'both' ? 'surowy-i-deweloperski' : (isDeveloperState ? 'deweloperski' : 'surowy-zamkniety');
        const client = (clientName || 'oferta').trim().replace(/\s+/g, '-');
        const tail = suffix ? `-${suffix}` : '';
        return `starterhome-${client}-${house}-${state}${tail}.pdf`;
    };

    const waitForImages = async (root: HTMLElement) => {
        const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(
            imgs.map(
                (img) =>
                    new Promise<void>((resolve) => {
                        if (img.complete && img.naturalWidth > 0) return resolve();
                        const done = () => resolve();
                        img.addEventListener('load', done, { once: true });
                        img.addEventListener('error', done, { once: true });
                    })
            )
        );
    };

    const prepareExportClone = (source: HTMLElement) => {
        const exportHost = document.createElement('div');
        exportHost.style.position = 'fixed';
        exportHost.style.left = '-10000px';
        exportHost.style.top = '0';
        exportHost.style.background = '#ffffff';
        exportHost.style.padding = '0';
        exportHost.style.margin = '0';
        exportHost.style.width = '210mm';
        exportHost.style.overflow = 'visible';

        const clone = source.cloneNode(true) as HTMLElement;
        clone.style.padding = '0';
        clone.style.margin = '0';
        clone.style.background = '#ffffff';
        clone.classList.remove('mx-auto');

        clone.querySelectorAll('.a4-page').forEach((node) => {
            const el = node as HTMLElement;
            el.style.margin = '0';
            el.style.marginBottom = '0';
            el.style.boxShadow = 'none';
            el.style.width = '210mm';
            el.style.height = '297mm';
            el.style.overflow = 'hidden';
        });

        exportHost.appendChild(clone);
        document.body.appendChild(exportHost);
        return { exportHost, clone };
    };

    const appendPagesToPdf = async (pdf: jsPDF, source: HTMLElement, quality: number, addPageBeforeFirst = false) => {
        const { exportHost, clone } = prepareExportClone(source);
        try {
            await waitForImages(clone);
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            const pages = Array.from(clone.querySelectorAll('.a4-page')) as HTMLElement[];
            const targets = pages.length ? pages : [clone];
            const pageWidth = 210;
            const pageHeight = 297;

            for (let i = 0; i < targets.length; i++) {
                const pageEl = targets[i];
                const canvas = await html2canvas(pageEl, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#FFFFFF',
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: pageEl.scrollWidth,
                    windowHeight: pageEl.scrollHeight,
                });
                const imgData = canvas.toDataURL('image/jpeg', quality);
                if (addPageBeforeFirst || i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
                addPageBeforeFirst = false;
            }
        } finally {
            try { document.body.removeChild(exportHost); } catch {}
        }
    };

    const waitForRenderTick = async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };

    const savePdf = async (opts?: { compressed?: boolean; quality?: number }) => {
        if (!pdfRootRef.current) return;

        const source = pdfRootRef.current;
        const quality = opts?.quality ?? 0.98;
        const filename = getPdfFilename(opts?.compressed ? 'skompresowany' : undefined);

        try {
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

            if (buildMode === 'both') {
                const previousState = isDeveloperState;

                setIsDeveloperState(false);
                await waitForRenderTick();
                await appendPagesToPdf(pdf, source, quality, false);

                setIsDeveloperState(true);
                await waitForRenderTick();
                await appendPagesToPdf(pdf, source, quality, true);

                setIsDeveloperState(previousState);
                await waitForRenderTick();
            } else {
                await appendPagesToPdf(pdf, source, quality, false);
            }

            pdf.save(filename);
        } catch (e) {
            console.error(e);
            alert('Nie udało się zapisać PDF. Spróbuj ponownie.');
        }
    };

    const handleSavePdf = () => savePdf({ compressed: false, quality: 0.98 });
    const handleSaveCompressedPdf = () => {
        // użytkownik ustawia poziom kompresji w popupie, a następnie uruchamia kompresję
        openCompressionModal();
    };

    const runCompressionAndSavePdf = async () => {
        await runSmartCompression();
        // Poczekaj na render po podmianie obrazów, żeby PDF zaciągnął już skompresowane assety
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const { jpegQuality } = getCompressionSettings(compressionLevel);
        await savePdf({ compressed: true, quality: jpegQuality });
    };

    const handleImageUpload = async (key: keyof typeof images, file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { if (reader.result) { setImages(prev => ({ ...prev, [key]: reader.result as string })); setIsCompressed(false); } };
        reader.readAsDataURL(file);
    };

    const availableItems = useMemo(() => {
        return itemsByHouse[selectedHouse.id] ?? getOfferItemsForHouse(selectedHouse);
    }, [selectedHouse, itemsByHouse]);

    const calculateOfferForState = (developerState: boolean) => {
        const bp = basePricesByHouse[selectedHouse.id];
        const surowy = bp?.surowy ?? selectedHouse.basePrice;
        const deweloperski = bp?.deweloperski ?? selectedHouse.developerPrice;
        const calculatedBasePrice = developerState ? deweloperski : surowy;
        const stateKey: BuildStateKey = developerState ? 'deweloperski' : 'surowy';
        const configSource = buildMode === 'both' ? (offerConfigDual[stateKey] || {}) : offerConfig;
        const sectionsSource = buildMode === 'both' ? (customSectionsDual[stateKey] || []) : customSections;
        const extrasSource = buildMode === 'both' ? (customExtrasDual[stateKey] || []) : customExtras;

        const extras = (extrasSource || []).map(e => ({
            label: (e.label || '').trim(),
            price: Number(e.price) || 0,
        })).filter(e => e.label || e.price !== 0);

        const extrasTotal = extras.reduce((acc, e) => acc + e.price, 0);

        if (selectedHouse.id === 'individual_house') {
            const sumSections = sectionsSource.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
            const list = sectionsSource
                .filter(s => (s.title?.trim() || s.text?.trim() || (Number(s.price) || 0) !== 0))
                .map(s => ({
                    name: s.title || 'Sekcja',
                    variant: s.text ? s.text.slice(0, 80) + (s.text.length > 80 ? '…' : '') : undefined,
                    price: Number(s.price) || 0
                }));

            extras.forEach(e => list.push({ name: e.label || 'Pozycja niestandardowa', variant: '-', price: e.price }));

            return {
                basePrice: calculatedBasePrice,
                totalNetPrice: calculatedBasePrice + sumSections + extrasTotal,
                selectedItemsList: list,
            };
        }

        let sum = calculatedBasePrice;
        const list: { name: string; variant?: string; price: number }[] = [];

        availableItems.forEach(item => {
            const val = configSource[item.code];
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

        const customConfigSections = (sectionsSource || [])
            .map(s => ({
                title: (s.title || '').trim(),
                text: (s.text || '').trim(),
                price: Number(s.price) || 0,
            }))
            .filter(s => s.title || s.text || s.price !== 0);

        customConfigSections.forEach(s => {
            sum += s.price;
            list.push({
                name: s.title || 'Pozycja niestandardowa',
                variant: s.text || '-',
                price: s.price,
            });
        });

        extras.forEach(e => {
            sum += e.price;
            list.push({ name: e.label || 'Pozycja niestandardowa', variant: '-', price: e.price });
        });

        return { basePrice: calculatedBasePrice, totalNetPrice: sum, selectedItemsList: list };
    };

    const currentOffer = useMemo(() => calculateOfferForState(isDeveloperState), [selectedHouse, isDeveloperState, basePricesByHouse, offerConfig, offerConfigDual, availableItems, customSections, customSectionsDual, customExtras, customExtrasDual, buildMode]);
    const dualSurowyOffer = useMemo(() => calculateOfferForState(false), [selectedHouse, basePricesByHouse, offerConfig, offerConfigDual, availableItems, customSections, customSectionsDual, customExtras, customExtrasDual, buildMode]);
    const dualDeweloperskiOffer = useMemo(() => calculateOfferForState(true), [selectedHouse, basePricesByHouse, offerConfig, offerConfigDual, availableItems, customSections, customSectionsDual, customExtras, customExtrasDual, buildMode]);

    const basePrice = currentOffer.basePrice;
    const totalNetPrice = currentOffer.totalNetPrice;
    const selectedItemsList = currentOffer.selectedItemsList;
    const totalVat = totalNetPrice * 0.08;
    const totalGross = totalNetPrice + totalVat;
    const dualSurowyGross = dualSurowyOffer.totalNetPrice * 0.08 + dualSurowyOffer.totalNetPrice;
    const dualDeweloperskiGross = dualDeweloperskiOffer.totalNetPrice * 0.08 + dualDeweloperskiOffer.totalNetPrice;

    // Helpers for UI
    const toggleAccordion = (section: string) => setOpenSection(openSection === section ? '' : section);
    const updateText = (key: keyof typeof customTexts, value: string) => setCustomTexts(prev => ({ ...prev, [key]: value }));
    const updateNeed = (id: string, field: 'icon' | 'text', value: string) => setNeeds(needs.map(n => n.id === id ? { ...n, [field]: value } : n));
    const removeNeed = (id: string) => setNeeds(needs.filter(n => n.id !== id));
    const addNeed = () => setNeeds([...needs, { id: Date.now().toString(), icon: 'Check', text: 'Nowa potrzeba' }]);


    const renderPreviewPages = (previewIsDeveloperState: boolean, showStateSuffix: boolean = false) => {
        const previewOffer = calculateOfferForState(previewIsDeveloperState);
        const previewVat = previewOffer.totalNetPrice * 0.08;
        const previewGross = previewOffer.totalNetPrice + previewVat;
        return (
            <>
                    {/* PAGE 1: OKŁADKA */}
                    <A4Page className="flex flex-col a4-page">
                        <LeafDecor src={images.decorLeaf} />
                        <div className="p-20 flex flex-col h-full">
                            <div className="flex justify-center mb-24"><img src={images.logo} alt="Starter Home" className="h-12 w-auto object-contain" /></div>
                            <div className="mb-16 text-center">
								<span className="inline-block bg-[#f7faf3] text-[#6E8809] font-bold px-6 py-2 uppercase tracking-widest text-sm mb-8 border border-[#e2e8da] rounded-full">
									{selectedHouse.id === 'individual_house'
										? `Szczegóły projektu ${displayHouseName}`
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
                                <img src={images.main} className="w-full h-full object-cover" alt="Zdjęcie główne" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <div className="absolute bottom-10 right-10 text-white text-right"><p className="text-sm font-light uppercase tracking-widest opacity-80">Model</p><p className="text-3xl font-bold">{displayHouseName}</p></div>
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
                         <div className="flex justify-between items-center mb-12">
                             <h2 className="text-3xl font-bold text-gray-900">Twój proces budowy</h2>
                             <img src={images.logo} alt="Starter Home" className="h-8 w-auto object-contain" />
                         </div>

                         <div className="flex flex-1 justify-center items-start mt-6">
                             <ProcessFlowTable type={processClientType} />
                         </div>

                         <OfferFooter />
                    </A4Page>

                    {/* PAGE 4: TECHNOLOGIA / PRZEKROJE (REDESIGNED 2x2) */}
                    <A4Page className="flex flex-col p-12 a4-page">
                         <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-gray-900">Technologia i Przekroje</h2><img src={images.logo} alt="Starter Home" className="h-6 w-auto object-contain" /></div>
                         
                         
<div className="flex-1 flex flex-col gap-6">

    {/* 1. PRZEKRÓJ ŚCIANY ZEWNĘTRZNEJ - szeroki */}
    <div className="flex flex-col border border-gray-100 bg-white">
        <div className="w-full overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
            <img src={resolvePublicAsset('przekroj-sciany-zewnetrznej-1.webp')} className="w-full h-auto object-contain" alt="Ściana Zewnętrzna" />
        </div>
        <div className="p-4">
            <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>
                {customTexts.techWallExtTitle}
            </h3>
            <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>
                {customTexts.techWallExtDesc}
            </p>
        </div>
    </div>

    {/* 2 i 3 - Dach i Strop w 2 kolumnach */}
    <div className="grid grid-cols-2 gap-6">

        {/* Dach (przeniesiony niżej) */}
        <div className="flex flex-col border border-gray-100 bg-white">
            <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                <img src={images.techRoof} className="max-h-full max-w-full object-contain" alt="Dach" />
            </div>
            <div className="p-3 flex-1">
                <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>
                    {customTexts.techRoofTitle}
                </h3>
                <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>
                    {customTexts.techRoofDesc}
                </p>
            </div>
        </div>

        {/* Strop (bez zmian) */}
        <div className="flex flex-col border border-gray-100 bg-white">
            <div className="w-full aspect-square overflow-hidden bg-white flex items-center justify-center p-3 border-b border-gray-50">
                <img src={images.techFloor} className="max-h-full max-w-full object-contain" alt="Strop" />
            </div>
            <div className="p-3 flex-1">
                <h3 className="font-bold text-[#6E8809] uppercase tracking-wide mb-1" style={{ fontSize: `${12 * fontScale}px` }}>
                    {customTexts.techFloorTitle}
                </h3>
                <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${10 * fontScale}px` }}>
                    {customTexts.techFloorDesc}
                </p>
            </div>
        </div>

    </div>

</div>
<OfferFooter />

                    </A4Page>

                    {/* PAGE 5: MULTIMEDIA / GALERIA */}
                    <A4Page className="flex flex-col a4-page bg-white p-12">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900">Multimedia projektu</h2>
                            <img src={images.logo} alt="Starter Home" className="h-6 w-auto object-contain" />
                        </div>

                        <div className="grid grid-cols-1 gap-6 flex-1">
                            <div className="border border-gray-100 bg-white overflow-hidden">
                                <div className="px-4 py-3 bg-[#f7faf3] text-[#6E8809] font-bold uppercase tracking-widest text-xs">Zdjęcie główne</div>
                                <div className="h-[380px] bg-gray-50">
                                    <img src={images.main} className="w-full h-full object-cover" alt="Zdjęcie główne" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="border border-gray-100 bg-white overflow-hidden">
                                    <div className="px-4 py-3 bg-[#f7faf3] text-[#6E8809] font-bold uppercase tracking-widest text-xs">Galeria 1</div>
                                    <div className="h-[220px] bg-gray-50">
                                        <img src={images.gallery1} className="w-full h-full object-cover" alt="Galeria 1" />
                                    </div>
                                </div>
                                <div className="border border-gray-100 bg-white overflow-hidden">
                                    <div className="px-4 py-3 bg-[#f7faf3] text-[#6E8809] font-bold uppercase tracking-widest text-xs">Galeria 2</div>
                                    <div className="h-[220px] bg-gray-50">
                                        <img src={images.gallery2} className="w-full h-full object-cover" alt="Galeria 2" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 400, color: '#6e8809' }}>
                                Zdjęcia mają charakter podglądowy
                            </div>
                        </div>
                        <OfferFooter />
                    </A4Page>


{/* PAGE 6: RZUT TECHNICZNY */}
<A4Page className="flex flex-col a4-page bg-[#f9f9f9] p-12">

    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Layers className="text-[#6E8809]" />
        Rzut Techniczny
    </h3>
<p
    style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "20px",
        color: "#6E8809",
        marginBottom: "20px",
        marginTop: "-10px"
    }}
>
    Układ pomieszczeń może zostać dostosowany do indywidualnych potrzeb klienta.
</p>

    <div className="flex flex-col items-center justify-start w-full gap-8 flex-1">

        <div className="hidden">
            {floorPlanCandidates.map((src) => (
                <img
                    key={src}
                    src={src}
                    onLoad={() =>
                        setAvailableFloorPlans(prev =>
                            prev.includes(src) ? prev : [...prev, src]
                        )
                    }
                />
            ))}
        </div>

        {availableFloorPlans.length > 0 ? (
            availableFloorPlans.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    className="max-w-full max-h-[1200px] object-contain mix-blend-multiply"
                    alt={`Rzut ${i + 1}`}
                />
            ))
        ) : (
            <img
                src={images.floorPlan}
                className="max-w-full object-contain"
                alt="Rzut"
            />
        )}

    </div>

</A4Page>

                    {/* PAGE 6: TABELA STANÓW (COMPARISON) & ZAKRES (NEW) */}
                    <A4Page className="flex flex-col p-12 a4-page">
                        <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-gray-900">Porównanie Stanów</h2><img src={images.logo} alt="Starter Home" className="h-6 w-auto object-contain" /></div>
                        
                        <div className="mb-12">
                            <img
                                src={resolvePublicAsset('/assets/porownanie-stanow.png')}
                                alt="Porównanie Stanów"
                                className="w-full h-auto object-contain"
                            />
                        </div>

                        {/*
                          NOTE: This section is purely visual in the configurator.
                          It replaces the previous "Po naszej stronie / Po stronie klienta" boxes.
                        */}
                        <div className="flex-1 flex items-center justify-center">
                            <div className="transform scale-75 origin-center -mt-16">
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="bg-[#6e8809] text-white px-5 py-4">
                                    <div className="text-xl font-bold tracking-tight">Koszty związane z budową</div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    <div className="px-6 py-6 flex items-start justify-between gap-6 bg-[#f7faf3]">
                                        <div className="min-w-0">
                                            <div className="text-base font-bold text-gray-900 leading-snug">Zlecenie mapy do celów projektowych</div>
                                            <div className="text-[13px] text-gray-500 mt-0.5">(lokalny geodeta)</div>
                                        </div>
                                        <div className="shrink-0 text-base whitespace-nowrap">
                                            <span className="font-bold text-gray-900">800 – 1200 zł</span>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 flex items-start justify-between gap-6 bg-white">
                                        <div className="min-w-0">
                                            <div className="text-base font-bold text-gray-900 leading-snug">Wytyczenie budynku na działce</div>
                                            <div className="text-[13px] text-gray-500 mt-0.5">(lokalny geodeta)</div>
                                        </div>
                                        <div className="shrink-0 text-base whitespace-nowrap">
                                            <span className="font-bold text-gray-900">1000 – 2000 zł</span>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 flex items-start justify-between gap-6 bg-[#f7faf3]">
                                        <div className="min-w-0">
                                            <div className="text-base font-bold text-gray-900 leading-snug">Zatrudnienie kierownika budowy</div>
                                            <div className="text-[13px] text-gray-500 mt-0.5">(najlepiej lokalnego)</div>
                                        </div>
                                        <div className="shrink-0 text-base whitespace-nowrap">
                                            <span className="font-bold text-gray-900">3000 – 5000 zł</span>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 flex items-start justify-between gap-6 bg-white">
                                        <div className="min-w-0">
                                            <div className="text-base leading-snug text-gray-900">
                                                <span className="font-bold">Przyłącza i Media</span>
                                                <span className="font-normal"> - </span>
                                                <span className="font-normal">Doprowadzenie prądu i wody do stawianego budynku</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-base whitespace-nowrap">
                                            <span className="text-gray-400">nasz koszt to <span className="font-bold text-gray-900">150zł/mb</span></span>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 flex items-start justify-between gap-6 bg-[#f7faf3]">
                                        <div className="min-w-0">
                                            <div className="text-base leading-snug text-gray-900">
                                                <span className="font-bold">Ogrzewanie</span>
                                                <span className="font-normal"> - </span>
                                                <span className="font-normal">Wybór systemu ogrzewania</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-base whitespace-nowrap">
                                            <span className="text-gray-400 font-medium">sprawdź nasz konfigurator</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-6 bg-white">
                                    <div className="bg-[#f7faf3] border border-[#e2e8da] px-5 py-4 text-[15px] text-gray-900">
                                        <span className="font-bold">To należy do obowiązków</span> <span className="font-normal">inwestora</span>, <span className="font-normal">lecz możemy zrobić</span> <span className="font-bold">to za Ciebie</span>
                                    </div>

                                    <div className="mt-6">
                                        <div className="text-2xl font-bold text-gray-900">Zero ukrytych kosztów:</div>
                                        <div className="text-gray-700 mt-2 leading-relaxed">
                                            Pokazujemy realne wydatki, nawet jeśli nie płacisz nam.
                                            <br />
                                            Chcemy, abyś wiedział, na co przygotować budżet.
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                    <span className="font-black text-xl text-gray-900">{displayHouseName}{showStateSuffix ? ` — ${previewIsDeveloperState ? 'DEWELOPERSKI' : 'SUROWY ZAMKNIĘTY'}` : ''}</span>
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
                                                <td className="py-2 font-bold text-gray-800">Stan Bazowy ({previewIsDeveloperState ? 'Deweloperski' : 'Surowy zamknięty'})</td>
                                                <td className="py-2 text-gray-500">-</td>
                                                <td className="py-2 text-right font-bold text-gray-900">{previewOffer.basePrice.toLocaleString()} zł</td>
                                            </tr>
                                            {previewOffer.selectedItemsList.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-200 leading-loose">
                                                    <td className="py-2 font-medium text-gray-700">{item.name}</td>
                                                    <td className="py-2 text-gray-500 italic">{item.variant || '-'}</td>
                                                    <td className="py-2 text-right font-bold text-gray-900">+ {item.price.toLocaleString()} zł</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                     </table>

                                     <div className="mt-6">
                                         <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                                             {previewIsDeveloperState ? 'Stan deweloperski zawiera:' : 'Stan surowy zamknięty zawiera:'}
                                         </div>
                                         <ul className="list-disc pl-5 space-y-1 text-gray-600" style={{ fontSize: `${11 * fontScale}px` }}>
                                             {previewIsDeveloperState ? (
                                                 <>
                                                     <li>Konstrukcja z certyfikowanego drewna C24</li>
                                                     <li>Dach z pełnym deskowaniem + blacha na rąbek</li>
                                                     <li>Okna trzyszybowe</li>
                                                     <li>Gotowa elewacja</li>
                                                     <li>Instalacje sanitarne i elektryczne (15 pkt)</li>
                                                     <li>Ściany działowe</li>
                                                     <li>Płyty g-k na ścianach i sufitach</li>
                                                     <li>Drzwi wejściowe w kolorze dachu</li>
                                                 </>
                                             ) : (
                                                 <>
                                                     <li>Konstrukcja z certyfikowanego drewna C24</li>
                                                     <li>Dach z pełnym deskowaniem + blacha na rąbek</li>
                                                     <li>Okna trzyszybowe</li>
                                                     <li>Gotowa elewacja</li>
                                                     <li>Ściany działowe</li>
                                                     <li>Drzwi wejściowe w kolorze dachu</li>
                                                 </>
                                             )}
                                         </ul>
                                     </div>

                                </div>

                                {/* TOTALS (Fixed at bottom of grey area) */}
                                <div className="p-6 bg-white border-t border-gray-200 mt-auto shrink-0">
                                     <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500 uppercase tracking-widest text-sm">Suma Netto</span>
                                        <span className="text-xl font-bold text-gray-900">{previewOffer.totalNetPrice.toLocaleString()} zł</span>
                                     </div>
                                     <div className="flex justify-between items-center mb-6">
                                        <span className="text-gray-400 uppercase tracking-widest text-xs">+ VAT 8%</span>
                                        <span className="text-sm text-gray-500">{previewVat.toLocaleString()} zł</span>
                                     </div>
                                     <div className="flex justify-between items-center p-4 bg-[#6E8809] text-white rounded-lg">
                                        <span className="font-bold uppercase tracking-widest text-lg">Razem Brutto</span>
                                        <span className="text-3xl font-black">{previewGross.toLocaleString()} zł</span>
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
                         {processClientType === 'cash' ? (
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
                         ) : (
                         <div className="mb-auto">
                             <div className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl">
                                 <div className="flex items-center gap-2 mb-2">
                                     <div className="w-10 h-10 bg-[#f7faf3] border border-[#e2e8da] rounded-lg flex items-center justify-center text-[#6E8809] shrink-0">💳</div>
                                     <div className="text-base font-bold text-gray-900">Zakup kredytowy</div>
                                 </div>
                                 <p className="text-gray-600 leading-relaxed" style={{ fontSize: `${12 * fontScale}px` }}>
                                     Wpłata 30% po podpisaniu umowy, a reszta transz realizowana zgodnie z harmonogramem banku kredytującego.
                                 </p>
                             </div>
                         </div>
                         )}

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


            </>
        );
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans print:block print:h-auto print:overflow-visible">
            {!welcomeDone && <WelcomeModal onComplete={() => setWelcomeDone(true)} />}
            <CompressionModal
                isOpen={isCompressionModalOpen}
                onClose={() => setIsCompressionModalOpen(false)}
                onRun={runCompressionAndSavePdf}
                onCancel={handleCancelCompression}
                status={compressionStatus}
                logs={compressionLogs}
                progress={compressionProgress}
                currentFile={currentProcessingFile}
                processingDetail={processingDetail}
                stats={compressionStats}
                compressionLevel={compressionLevel}
                onCompressionLevelChange={setCompressionLevel}
                onSaveCompressedPdf={() => {
                    const { jpegQuality } = getCompressionSettings(compressionLevel);
                    savePdf({ compressed: true, quality: jpegQuality });
                }}
            />

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
                    <AccordionItem title="1. DANE I MODEL" icon={User} isOpen={openSection === 'data'} onToggle={() => toggleAccordion('data')}>
                        <div className="space-y-4">
                            <input type="text" placeholder="Imię i Nazwisko" className="w-full p-3 border border-gray-200 text-sm" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">{HOUSES.map(house => (<button key={house.id} onClick={() => setSelectedHouse(house)} className={`p-2 border text-xs font-bold uppercase ${selectedHouse.id === house.id ? 'border-[#6E8809] bg-[#f7faf3] text-[#6E8809]' : 'border-gray-200 text-gray-500'}`}>{house.name}</button>))}</div>
                            {isIndividualProject && (
                                <div className="mt-3">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Nazwa projektu indywidualnego</label>
                                    <input
                                        type="text"
                                        value={individualProjectName}
                                        onChange={(e) => setIndividualProjectName(e.target.value)}
                                        placeholder="Wpisz nazwę projektu"
                                        className="w-full p-3 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#6E8809]"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-3 border border-gray-200">
                                <button onClick={() => { setBuildMode('surowy'); setIsDeveloperState(false); }} className={`py-2 text-xs font-bold uppercase ${buildMode === 'surowy' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Surowy zamknięty</button>
                                <button onClick={() => { setBuildMode('deweloperski'); setIsDeveloperState(true); }} className={`py-2 text-xs font-bold uppercase border-l border-r border-gray-200 ${buildMode === 'deweloperski' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Deweloperski</button>
                                <button onClick={() => { setBuildMode('both'); setIsDeveloperState(false); }} className={`py-2 px-2 text-[11px] leading-tight font-bold uppercase ${buildMode === 'both' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Surowy zamknięty lub deweloperski</button>
                            </div>
                            {buildMode === 'both' && (
                                <div className="text-[11px] text-gray-500 leading-relaxed">
                                    W PDF zostaną wygenerowane dwie pełne oferty: najpierw <span className="font-bold">surowy zamknięty</span>, potem <span className="font-bold">deweloperski</span>.
                                </div>
                            )}
                            <div className="mt-3">
                                <div className="text-[11px] text-gray-500 mb-1 font-bold uppercase tracking-widest">Typ klienta</div>
                                <div className="flex border border-gray-200">
                                    <button onClick={() => setProcessClientType('cash')} className={`flex-1 py-2 text-xs font-bold uppercase ${processClientType === 'cash' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Klient gotówkowy</button>
                                    <button onClick={() => setProcessClientType('credit')} className={`flex-1 py-2 text-xs font-bold uppercase ${processClientType === 'credit' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>Klient kredytowy</button>
                                </div>
                            </div>

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
                                        <div className="text-[11px] text-gray-500 mb-1">Cena bazowa — Surowy zamknięty</div>
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
                    <AccordionItem title="2. KONFIGURACJA I CENY" icon={Settings} isOpen={openSection === 'config'} onToggle={() => toggleAccordion('config')}>
                        <div className="space-y-6">
                            {buildMode === 'both' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        {renderConfigEditor('surowy')}
                                        {renderConfigEditor('deweloperski')}
                                    </div>
                                </div>
                            ) : selectedHouse.id === 'individual_house' ? (
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
                                    <button type="button" onClick={() => addCustomSection()} className="w-full p-3 border border-dashed border-gray-300 text-xs font-bold uppercase text-gray-600 hover:border-[#6E8809] hover:text-[#6E8809]">Dodaj sekcję</button>
                                </div>
                            ) : (
                                renderConfigEditor(isDeveloperState ? 'deweloperski' : 'surowy')
                            )}
                        </div>
                    </AccordionItem>

                    {/* NEEDS */}
                    <AccordionItem title="3. POTRZEBY" icon={Type} isOpen={openSection === 'needs'} onToggle={() => toggleAccordion('needs')}>
                         <div className="space-y-4">
                             <textarea rows={2} className="w-full text-xs p-2 border border-gray-200" value={customTexts.page2Title} onChange={e => updateText('page2Title', e.target.value)} />
                             <div className="space-y-2">{needs.map((need, idx) => (
                                <div key={need.id} className="flex gap-2 items-start">
                                    <div className="w-16 shrink-0">
                                        <select value={need.icon} onChange={(e) => updateNeed(need.id, 'icon', e.target.value)} className="w-full text-[9px] border border-gray-200 p-1 bg-white h-8">
                                            {Object.keys(AVAILABLE_ICONS).map(iconKey => (<option key={iconKey} value={iconKey}>{ICON_LABELS_PL[iconKey] || iconKey}</option>))}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <select
                                            value=""
                                            onChange={(e) => { if (e.target.value) updateNeed(need.id, 'text', e.target.value); }}
                                            className="w-full text-[10px] border border-gray-200 p-1 bg-white h-8 text-gray-600"
                                        >
                                            <option value="">Wybierz z listy lub wpisz własne poniżej</option>
                                            {NEED_TEXT_PRESETS.map((preset) => (
                                                <option key={preset} value={preset}>{preset}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="w-full text-xs p-2 border border-gray-200 h-9"
                                            value={need.text}
                                            placeholder="Wpisz własną potrzebę"
                                            onChange={(e) => updateNeed(need.id, 'text', e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => removeNeed(need.id)} className="text-red-500 pt-2"><Trash2 className="w-3 h-3" /></button>
                                </div>
                             ))}<button onClick={addNeed} className="w-full py-2 border border-dashed text-xs text-gray-400">+ Dodaj</button></div>
                        </div>
                    </AccordionItem>

                    {/* MEDIA */}
                    <AccordionItem title="4. MULTIMEDIA" icon={ImageIcon} isOpen={openSection === 'media'} onToggle={() => toggleAccordion('media')}>
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
                    <AccordionItem title="5. OPISY TECHNOLOGII" icon={Box} isOpen={openSection === 'tech'} onToggle={() => toggleAccordion('tech')}>
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
                    <AccordionItem title="6. INNE" icon={Briefcase} isOpen={openSection === 'scope'} onToggle={() => toggleAccordion('scope')}>
                         <div className="space-y-4">
                             {buildMode === 'both' ? (
                                <>
                                    {renderCustomExtrasEditor('surowy')}
                                    {renderCustomExtrasEditor('deweloperski')}
                                </>
                             ) : (
                                <>
                                    {customExtras.map((extra, index) => (
                                        <div key={index} className="border border-gray-200 p-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase">Pozycja niestandardowa</div>
                                                <button type="button" title="Usuń pozycję" onClick={() => removeCustomExtra(index)} className="p-1 text-gray-400 hover:text-gray-900">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Np. Transport"
                                                className="w-full text-xs p-2 border border-gray-200 mb-2"
                                                value={extra.label}
                                                onChange={(e) => updateCustomExtra(index, { label: e.target.value })}
                                            />
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Cena netto (zł)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full text-xs p-2 border border-gray-200"
                                                value={extra.price}
                                                onChange={(e) => updateCustomExtra(index, { price: Number(e.target.value) })}
                                            />
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addCustomExtra()} className="flex items-center gap-2 text-xs font-bold text-[#6E8809]">
                                        <Plus className="w-4 h-4" />
                                        Dodaj kolejną pozycję
                                    </button>
                                </>
                             )}
                         </div>
                     </AccordionItem>

                    {/* TRANCHES & CTA */}
                    <AccordionItem title="7. FINANSE" icon={Banknote} isOpen={openSection === 'finance'} onToggle={() => toggleAccordion('finance')}>
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
                    {buildMode === 'both' ? (
                        <div className="mb-2 text-right leading-snug">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Brutto</div>
                            <div className="text-xl font-black text-[#6E8809] tracking-tight">Surowy: <CountUp value={dualSurowyGross} /> zł</div>
                            <div className="text-xl font-black text-[#6E8809] tracking-tight">Deweloperski: <CountUp value={dualDeweloperskiGross} /> zł</div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brutto</span><span className="text-3xl font-black text-[#6E8809] tracking-tight"><CountUp value={totalGross} /> zł</span></div>
                    )}
                    <button
                        onClick={handleSavePdf}
                        className="w-full py-3 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-xs bg-gray-900 text-white hover:bg-black cursor-pointer"
                    >
                        <FileDown className="w-4 h-4" /> Zapisz PDF
                    </button>
                    <button
                        onClick={handleSaveCompressedPdf}
                        className="w-full py-3 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    >
                        <Layers className="w-4 h-4" /> Zapisz skompresowany PDF
                    </button>
                </div>
            </div>

            {/* --- RIGHT PREVIEW (PDF) --- */}
            <div ref={previewRef} className="flex-1 bg-gray-200 overflow-y-auto p-12 print:p-0 print:bg-white print:overflow-visible print:w-full print:h-auto print:block custom-scrollbar">
                <div ref={pdfRootRef} id="pdf-root" className="scale-100 origin-top mx-auto print:scale-100 max-w-[210mm]">
                    
                    {buildMode === 'both' ? (
                        <>
                            {renderPreviewPages(false, true)}
                            {renderPreviewPages(true, true)}
                        </>
                    ) : (
                        renderPreviewPages(isDeveloperState, false)
                    )}
                </div>
            </div>
        </div>
    );
};
