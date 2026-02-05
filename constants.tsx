
import React from 'react';
import { House, OfferItem } from './types';
import { 
  Home, 
  BrickWall, 
  FileText, 
  Thermometer, 
  Wind, 
  Sun, 
  Droplet, 
  Waves, 
  LayoutDashboard, 
  Blinds,
  Layers,
  Zap,
  Hammer
} from 'lucide-react';

// --- DATA FROM SCREENSHOTS ---
// Prices in Netto PLN
const PRICING_DB: Record<string, any> = {
  'zenith_house': {
    ssz: 184900,
    dev: 249800,
    foundation: 26250,
    heating: { elec: 28700, pump_full: 58800, pump_solo: 23800, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 9500,
    terrace: 990
  },
  'nest_house': {
    ssz: 164000,
    dev: 219800,
    foundation: 41250,
    heating: { elec: 22700, pump_full: 48500, pump_solo: 19800, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 18400,
    blinds: 11800,
    terrace: 990
  },
  'haven_house': {
    ssz: 184900,
    dev: 286700,
    foundation: 51750,
    heating: { elec: 28770, pump_full: 58800, pump_solo: 23800, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 9500,
    terrace: 990
  },
  'balance_house': {
    ssz: 224900,
    dev: 329700,
    foundation: 72250,
    heating: { elec: 39050, pump_full: 67200, pump_solo: 30800, ac_heat: 7000 }, // ac_heat 5kw implicit
    ac: 7000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 10500,
    terrace: 990
  },
  'comfort_house': {
    ssz: 273400,
    dev: 377700,
    foundation: 77250,
    heating: { elec: 42300, pump_full: 68800, pump_solo: 33800, ac_heat: 8000 },
    ac: 7000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 11900,
    terrace: 990
  },
  'vista_house': {
    ssz: 295700,
    dev: 420900,
    foundation: 94500,
    heating: { elec: 55100, pump_full: 77600, pump_solo: 37800, ac_heat: 8000 },
    ac: 8000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 12500,
    terrace: 990
  },
  'peak_house': {
    ssz: 259800,
    dev: 359700,
    foundation: 50250,
    heating: { elec: 27700, pump_full: 58800, pump_solo: 23800, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 10500,
    terrace: 990
  },
  'skyline_house': {
    ssz: 174900,
    dev: 239800,
    foundation: 26250,
    heating: { elec: 28700, pump_full: 58800, pump_solo: 23800, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 8000,
    terrace: 990
  }
};

export const getOfferItemsForHouse = (house: House): OfferItem[] => {
  const prices = PRICING_DB[house.id];
  if (!prices) return [];

  return [
    {
      code: 'FUND',
      name: 'Fundamenty',
      description: 'Wybierz zakres prac fundamentowych',
      type: 'radio',
      defaultValue: 'none', // Changed to force selection or default to none
      options: [
        { id: 'plate', name: 'Płyta fundamentowa (z posadzką i izolacją)', price: prices.foundation },
        { id: 'self', name: 'Robię we własnym zakresie', price: 0 },
      ]
    },
    {
      code: 'FORM',
      name: 'Formalności urzędowe',
      description: 'Pozwolenie lub zgłoszenie budowy',
      type: 'radio',
      defaultValue: 'none',
      options: [
        { id: 'service', name: 'Zlecam Wam (komplet dokumentacji)', price: 9500 },
        { id: 'self', name: 'Robię we własnym zakresie', price: 0 },
      ]
    },
    {
      code: 'HEAT',
      name: 'Ogrzewanie',
      description: 'Wybierz system grzewczy',
      type: 'radio',
      defaultValue: 'none',
      options: [
        { id: 'elec', name: 'Ogrzewanie podłogowe elektryczne', price: prices.heating.elec },
        { id: 'pump_full', name: 'Podłogowe wodne + pompa ciepła + wylewka', price: prices.heating.pump_full },
        { id: 'pump_solo', name: 'Podłogowe wodne (rozłożenie) - klient kupuje źródło', price: prices.heating.pump_solo },
        { id: 'ac_heat', name: 'Klimatyzator z funkcją grzania', price: prices.heating.ac_heat },
      ]
    },
    {
      code: 'AC',
      name: 'Klimatyzacja (Chłodzenie)',
      description: 'Dodatkowa jednostka do chłodzenia',
      type: 'checkbox',
      price: prices.ac,
      defaultValue: false
    },
    {
      code: 'SEW',
      name: 'Gospodarka wodno-ściekowa',
      description: 'Wybierz rozwiązanie (można wybrać tylko jedno)',
      type: 'radio',
      defaultValue: 'none',
      options: [
        { id: 'septic', name: 'Szambo (10m3) z montażem', price: prices.septic },
        { id: 'wwtp', name: 'Przydomowa oczyszczalnia ścieków', price: prices.wwtp },
        { id: 'none', name: 'Brak / Własny zakres', price: 0 }
      ]
    },
    {
      code: 'BLINDS',
      name: 'Rolety zewnętrzne',
      description: 'Elektryczne rolety podtynkowe',
      type: 'checkbox',
      price: prices.blinds,
      defaultValue: false
    },
    {
      code: 'TERRACE',
      name: 'Taras drewniany',
      description: 'Konstrukcja i deska modrzewiowa',
      type: 'number',
      unit: 'm²',
      price: prices.terrace,
      defaultValue: 0
    }
  ];
};

// Update Houses with data from PRICING_DB for consistency
export const HOUSES: House[] = [
  { 
    id: 'zenith_house', 
    name: 'Zenith HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.zenith_house.ssz, 
    developerPrice: PRICING_DB.zenith_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '35 m²', usableArea: '55 m²', bedrooms: 2 },
    description: 'Zenith House 35 m² łączy elegancję z przytulnością. Duże przeszklenia na bocznej ścianie nadają budynkowi wyjątkowy charakter.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/10/enhanced_ujecie-1-przod-scaled.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Zenith.pdf'
  },
  { 
    id: 'nest_house', 
    name: 'NEST HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.nest_house.ssz, 
    developerPrice: PRICING_DB.nest_house.dev,
    area: '70 m²', 
    details: { builtArea: '55 m²', usableArea: '45 m²', bedrooms: 2 },
    description: 'Dom o powierzchni użytkowej 45 m² został zaprojektowany z myślą o funkcjonalności. Posiada dwie sypialnie, salon z aneksem kuchennym oraz łazienkę.',
    // Main image (unchanged) used in the first/top section
    image: 'nest-main.webp',
    images: ['kolaz-nest-1.png'],
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Nest.pdf'
  },
  { 
    id: 'haven_house', 
    name: 'Haven HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.haven_house.ssz, 
    developerPrice: PRICING_DB.haven_house.dev, 
    area: 'Do ustalenia',
    details: { builtArea: '69 m²', usableArea: '58 m²', bedrooms: 2 },
    description: 'Praktyczny dom o 58 m² powierzchni użytkowej łączy funkcjonalność z komfortem. Znajdują się w nim dwie sypialnie, otwarty salon z kuchnią oraz łazienka.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/09/Haven-House-1.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Haven.pdf'
  },
  { 
    id: 'balance_house', 
    name: 'Balance HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.balance_house.ssz, 
    developerPrice: PRICING_DB.balance_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '94 m²', usableArea: '80 m²', bedrooms: 3 },
    description: 'Dom o 80 m² powierzchni użytkowej oferuje komfortową przestrzeń dla rodziny. Składa się z trzech sypialni, salonu z aneksem kuchennym oraz łazienki.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/09/Balance-House-1-1024x768.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Balance.pdf'
  },
  { 
    id: 'comfort_house', 
    name: 'Comfort HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.comfort_house.ssz, 
    developerPrice: PRICING_DB.comfort_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '103 m²', usableArea: '86 m²', bedrooms: 3 },
    description: 'Comfort House to parterowy dom o powierzchni 86 m², stworzony z myślą o wygodzie rodziny. Posiada trzy sypialnie oraz otwartą część dzienną.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/09/Comfort-House-1-1024x768.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Comfort.pdf'
  },
  { 
    id: 'vista_house', 
    name: 'Vista HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.vista_house.ssz, 
    developerPrice: PRICING_DB.vista_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '126 m²', usableArea: '108 m²', bedrooms: '3-4' },
    description: 'Duży, komfortowy dom o 108 m² powierzchni użytkowej zapewnia przestrzeń i wygodę dla całej rodziny.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/10/Vista-House-1-1024x768.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Vista.pdf'
  },
  { 
    id: 'peak_house', 
    name: 'Peak HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.peak_house.ssz, 
    developerPrice: PRICING_DB.peak_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '67 m²', usableArea: '111 m²', bedrooms: '3-4' },
    description: 'Piętrowy dom o 111 m² powierzchni użytkowej łączy przestronność z funkcjonalnością.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/09/Peak-House-1-scaled.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Peak.pdf'
  },
  { 
    id: 'skyline_house', 
    name: 'Skyline HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.skyline_house.ssz, 
    developerPrice: PRICING_DB.skyline_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '35 m²', usableArea: '45 m²', bedrooms: '1-3' },
    description: 'Nowoczesny dom o formie stodoły, 35 m², z praktycznym parterem i antresolą.',
    image: 'https://starterhome.pl/wp-content/uploads/2025/10/ujecie-1-scaled.png',
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Skyline.pdf'
  },
  {
    id: 'individual_house',
    name: 'Indywidualny',
    status: 'DRAFT',
    image: 'https://starterhome.pl/wp-content/uploads/2025/09/Nest-House-1-scaled.png',
    basePrice: 0,
    developerPrice: 0,
    area: 'Do ustalenia',
    details: { builtArea: '—', usableArea: '—', bedrooms: '—' },
    description: 'Projekt indywidualny — szczegóły i ceny uzupełniasz ręcznie w generatorze.',
    floorPlanPdf: ''
  }
];

export const getIcon = (name: string) => {
  switch (name) {
    case 'Home': return <Home className="w-6 h-6" />;
    case 'BrickWall': return <BrickWall className="w-6 h-6" />;
    case 'FileText': return <FileText className="w-6 h-6" />;
    case 'Thermometer': return <Thermometer className="w-6 h-6" />;
    case 'Wind': return <Wind className="w-6 h-6" />;
    case 'Sun': return <Sun className="w-6 h-6" />;
    case 'Droplet': return <Droplet className="w-6 h-6" />;
    case 'Waves': return <Waves className="w-6 h-6" />;
    case 'LayoutDashboard': return <LayoutDashboard className="w-6 h-6" />;
    case 'Blinds': return <Blinds className="w-6 h-6" />;
    case 'Layers': return <Layers className="w-6 h-6" />;
    case 'Zap': return <Zap className="w-6 h-6" />;
    case 'Hammer': return <Hammer className="w-6 h-6" />;
    default: return <Home className="w-6 h-6" />;
  }
};
