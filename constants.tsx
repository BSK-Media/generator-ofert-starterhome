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
// Prices source data in netto PLN. Kwoty są przeliczane na brutto poniżej.
const PRICING_DB_NET: Record<string, any> = {
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
    heating: { elec: 32000, pump_full: 62200, pump_solo: 28000, ac_heat: 7000 }, // ac_heat 5kw implicit
    ac: 7000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 10500,
    terrace: 990
  },
  'balance_house_xl': {
    ssz: 280281,
    dev: 410888,
    foundation: 90041,
    heating: { elec: 39050, pump_full: 67200, pump_solo: 35000, ac_heat: 7000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 10500,
    terrace: 990
  },
  'comfort_house': {
    ssz: 273400,
    dev: 377700,
    foundation: 77250,
    heating: { elec: 33000, pump_full: 64000, pump_solo: 30100, ac_heat: 8000 },
    ac: 7000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 11900,
    terrace: 990
  },
  'comfort_house_xl': {
    ssz: 318500,
    dev: 440577,
    foundation: 90723,
    heating: { elec: 42300, pump_full: 68800, pump_solo: 35000, ac_heat: 8000 },
    ac: 7000,
    septic: 14500,
    wwtp: 17400,
    blinds: 11900,
    terrace: 990
  },
  'family_house': {
    ssz: 342700,
    dev: 502800,
    foundation: 117600,
    heating: { elec: 49000, pump_full: 82700, pump_solo: 42000, ac_heat: 8000 },
    ac: 8000,
    septic: 14500,
    wwtp: 17400,
    blinds: 12500,
    terrace: 990
  },
  'grand_house': {
    ssz: 383000,
    dev: 545000,
    foundation: 128000,
    heating: { elec: 52700, pump_full: 85700, pump_solo: 49000, ac_heat: 8000 },
    ac: 8000,
    septic: 14500,
    wwtp: 17400,
    blinds: 12500,
    terrace: 990
  },
  'nova_house': {
    ssz: 356700,
    dev: 486300,
    foundation: 65250,
    heating: { elec: 49700, pump_full: 82700, pump_solo: 43750, ac_heat: 8000 },
    ac: 8000,
    septic: 14500,
    wwtp: 17400,
    blinds: 12500,
    terrace: 990
  },
  'vista_house': {
    ssz: 295700,
    dev: 420900,
    foundation: 94500,
    heating: { elec: 45000, pump_full: 72700, pump_solo: 37800, ac_heat: 8000 },
    ac: 8000, // 5kW
    septic: 14500,
    wwtp: 17400,
    blinds: 12500,
    terrace: 990
  },
  'peak_house': {
    ssz: 289700,
    dev: 397200,
    foundation: 50250,
    heating: { elec: 38700, pump_full: 75900, pump_solo: 38500, ac_heat: 7000 },
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

const VAT_RATE = 0.08;
const toGrossPrice = (netPrice: number) => Math.round(netPrice * (1 + VAT_RATE));

// Wartości podane bez dopisku „netto” w nowym cenniku są już kwotami brutto.
const GROSS_PRICE_OVERRIDES: Record<string, Record<string, number>> = {
  balance_house: { 'heating.elec': 32000, 'heating.pump_solo': 28000 },
  balance_house_xl: { 'heating.pump_solo': 35000 },
  comfort_house: { 'heating.pump_solo': 30100 },
  comfort_house_xl: { 'heating.pump_solo': 35000 },
  vista_house: { 'heating.pump_solo': 37800 },
  family_house: { 'heating.pump_solo': 42000 },
  grand_house: { 'heating.pump_solo': 49000 },
  nova_house: { 'heating.pump_solo': 43750 },
  peak_house: { 'heating.pump_solo': 38500 }
};

const toGrossPricing = (houseId: string, prices: any) => ({
  ...prices,
  ssz: toGrossPrice(prices.ssz),
  dev: toGrossPrice(prices.dev),
  foundation: toGrossPrice(prices.foundation),
  heating: Object.fromEntries(
    Object.entries(prices.heating).map(([key, price]) => [
      key,
      GROSS_PRICE_OVERRIDES[houseId]?.[`heating.${key}`] ?? toGrossPrice(price as number)
    ])
  ),
  ac: toGrossPrice(prices.ac),
  septic: toGrossPrice(prices.septic),
  wwtp: toGrossPrice(prices.wwtp),
  blinds: toGrossPrice(prices.blinds),
  terrace: toGrossPrice(prices.terrace)
});

const PRICING_DB: Record<string, any> = Object.fromEntries(
  Object.entries(PRICING_DB_NET).map(([houseId, prices]) => [houseId, toGrossPricing(houseId, prices)])
);

export const getOfferItemsForHouse = (house: House): OfferItem[] => {
  const prices = PRICING_DB[house.id];
  if (!prices) return [];

  const PV_OPTIONS = [
    { id: 'pv_4_4', name: '4,4 kWp + Magazyn energii 10,24 kWh', price: toGrossPrice(35000) },
    { id: 'pv_5_5', name: '5,5 kWp + Magazyn energii 10,24 kWh', price: toGrossPrice(38000) },
    { id: 'pv_7_7', name: '7,7 kWp + Magazyn energii 10,24 kWh', price: toGrossPrice(43000) }
  ];

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
        { id: 'service', name: 'Zlecam Wam (komplet dokumentacji)', price: toGrossPrice(9500) },
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
      code: 'PV',
      name: 'Fotowoltaika (Hybrydowa)',
      description: 'W instalacjach stosujemy panele JH Solar o mocy 550W, falownik hybrydowy Deye oraz magazyn energii Dyness 10,24kWh. Wizualizacja oraz wycena są orientacyjne (brak dokładnego projektu dachu).',
      type: 'radio',
      defaultValue: 'none',
      options: PV_OPTIONS
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
    image: '/assets/houses/zenith.webp',
    images: ['kolaz-zenith-1.webp'],
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
    image: '/assets/houses/nest-main.webp',
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
    image: '/assets/houses/haven.webp',
    images: ['kolaz-haven-1.webp'],
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
    image: '/assets/houses/balance.webp',
    images: ['kolaz-balance-1.webp'],
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Balance.pdf'
  },
  { 
    id: 'balance_house_xl', 
    name: 'Balance HOUSE XL', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.balance_house_xl.ssz, 
    developerPrice: PRICING_DB.balance_house_xl.dev,
    area: 'Do ustalenia',
    details: { builtArea: '118 m²', usableArea: '100 m²', bedrooms: 3 },
    description: 'Dom o 100 m² powierzchni użytkowej oferuje komfortową przestrzeń dla rodziny. Składa się z trzech sypialni, salonu z aneksem kuchennym oraz łazienki.',
    image: 'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-balance-house-xl.webp',
    images: [
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-balance-house-xl.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-balance-house-xl-1.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-balance-house-xl-2.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-balance-house-xl-3.webp'
    ],
    floorPlanPdf: 'https://starterhome.pl/wp-content/uploads/2026/07/Rzuty-Balance-House-XL.pdf'
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
    image: '/assets/houses/comfort.webp',
    images: ['kolaz-comfort-1.webp'],
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Comfort.pdf'
  },
  { 
    id: 'comfort_house_xl', 
    name: 'Comfort HOUSE XL', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.comfort_house_xl.ssz, 
    developerPrice: PRICING_DB.comfort_house_xl.dev,
    area: 'Do ustalenia',
    details: { builtArea: '120 m²', usableArea: '101 m²', bedrooms: 3 },
    description: 'Comfort House XL to parterowy dom o powierzchni użytkowej 101 m², stworzony z myślą o wygodzie rodziny. Posiada trzy sypialnie oraz otwartą część dzienną.',
    image: 'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-comfort-house-xl.webp',
    images: [
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-comfort-house-xl.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-comfort-house-xl-1.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-comfort-house-xl-2.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-comfort-house-xl-3.webp'
    ],
    floorPlanPdf: 'https://starterhome.pl/wp-content/uploads/2026/07/Rzuty-Comfort-House-XL.pdf'
  },
  { 
    id: 'family_house', 
    name: 'Family HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.family_house.ssz, 
    developerPrice: PRICING_DB.family_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '157 m²', usableArea: '123 m²', bedrooms: 3 },
    description: 'Family House to przestronny dom o powierzchni użytkowej 123 m², zaprojektowany z myślą o wygodzie całej rodziny.',
    image: 'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-family-house-xl-1.webp',
    images: [
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-family-house-xl-1.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-family-house-xl.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-family-house-xl-2.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-family-house-xl-3.webp'
    ],
    floorPlanPdf: 'https://starterhome.pl/wp-content/uploads/2026/07/Rzuty-Family-House.pdf'
  },
  { 
    id: 'grand_house', 
    name: 'Grand HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.grand_house.ssz, 
    developerPrice: PRICING_DB.grand_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '171 m²', usableArea: '139 m²', bedrooms: 3 },
    description: 'Grand House to przestronny dom o powierzchni użytkowej 139 m², zaprojektowany z myślą o komforcie całej rodziny.',
    image: 'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-grand-house.webp',
    images: [
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-grand-house.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-grand-house-1.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-grand-house-2.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-grand-house-3.webp'
    ],
    floorPlanPdf: 'https://starterhome.pl/wp-content/uploads/2026/07/Rzuty-Grand-House-140.pdf'
  },
  { 
    id: 'nova_house', 
    name: 'Nova HOUSE', 
    status: 'COMPLETED', 
    basePrice: PRICING_DB.nova_house.ssz, 
    developerPrice: PRICING_DB.nova_house.dev,
    area: 'Do ustalenia',
    details: { builtArea: '87 m²', usableArea: '162 m²', bedrooms: 4 },
    description: 'Nova House to przestronny dom o powierzchni użytkowej 162 m², zaprojektowany z myślą o komforcie większej rodziny. Posiada cztery sypialnie.',
    image: 'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-nova-house-3.webp',
    images: [
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-nova-house-3.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-nova-house.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-nova-house-1.webp',
      'https://starterhome.pl/wp-content/uploads/2026/07/starterhome-nova-house-2.webp'
    ],
    floorPlanPdf: 'https://starterhome.pl/wp-content/uploads/2026/07/Rzuty-Nova-House.pdf'
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
    image: '/assets/houses/vista.webp',
    images: ['kolaz-vista-1.webp'],
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
    image: '/assets/houses/peak.webp',
    images: ['kolaz-peak-1.webp'],
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
    image: '/assets/houses/skyline.webp',
    images: ['kolaz-skyline-1.webp'],
    floorPlanPdf: 'https://todybnsadf.cfolks.pl/Skyline.pdf'
  },
  {
    id: 'individual_house',
    name: 'Indywidualny',
    status: 'DRAFT',
    image: '/assets/houses/nest.webp',
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
