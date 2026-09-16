import type { OceanRegion } from '@/types/ocean';

export const OCEAN_REGIONS: OceanRegion[] = [
  {
    id: 'arabian-sea',
    name: 'Arabian Sea',
    hindiName: 'अरब सागर',
    description: 'Northern Indian Ocean basin bounded by India, Pakistan, Iran, and the Arabian Peninsula. Known for intense seasonal upwelling, oxygen minimum zones (OMZ), and high evaporation-driven salinity.',
    bbox: [53.0, 8.0, 76.5, 24.5],
    center: { lon: 66.0, lat: 16.5, zoomDistance: 2400000 },
    // Simplified high-fidelity polygon tracing the basin perimeter
    polygon: [
      [72.8, 19.0], // Mumbai / Konkan
      [73.8, 15.5], // Goa
      [74.8, 13.0], // Mangalore
      [76.2, 9.9],  // Kochi
      [77.5, 8.1],  // Kanyakumari
      [75.0, 5.0],  // Southwest open ocean
      [68.0, 6.0],  // Central basin
      [58.0, 12.0], // Socotra / Horn of Africa entrance
      [55.0, 17.5], // Oman coast
      [59.5, 22.5], // Ras al Hadd
      [62.0, 25.2], // Gulf of Oman mouth
      [66.5, 25.0], // Makran coast / Pakistan
      [68.8, 23.8], // Rann of Kutch
      [70.0, 21.0], // Saurashtra / Gujarat
      [72.5, 21.3], // Gulf of Khambhat
    ],
    minDepth: 0,
    maxSupportedDepth: 3600,
    nativeDepthLevels: [0, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 3600],
    stats: {
      surfaceAreaKm2: 3862000,
      averageDepthMeters: 2734,
      maxDepthMeters: 4652, // Wheatley Deep
      meanTemperatureC: 27.8,
      meanSalinityPsu: 36.4,
      monsoonInfluence: 'Strong Southwest Monsoon generates the Findlater Jet & Somali current reverse flow.',
    },
    themeColor: '#00d2ff',
  },
  {
    id: 'bay-of-bengal',
    name: 'Bay of Bengal',
    hindiName: 'बंगाल की खाड़ी',
    description: 'World’s largest water bay. Receives massive freshwater discharge from the Ganga-Brahmaputra-Meghna, Godavari, and Krishna rivers, maintaining a strong low-salinity surface layer and intense tropical cyclone activity.',
    bbox: [80.0, 5.0, 95.0, 22.5],
    center: { lon: 88.0, lat: 14.5, zoomDistance: 2400000 },
    polygon: [
      [80.3, 13.1], // Chennai
      [82.2, 16.5], // Andhra coast / Godavari mouth
      [85.8, 19.8], // Odisha / Puri
      [88.0, 21.6], // West Bengal / Sunderbans
      [91.8, 22.3], // Chittagong / Meghna delta
      [92.8, 20.0], // Myanmar Rakhine coast
      [94.2, 16.0], // Ayeyarwady Delta
      [93.5, 11.5], // Western edge of Andaman Ridge
      [92.5, 6.0],  // Great Nicobar south
      [86.0, 5.5],  // Southern Bay basin
      [81.8, 6.0],  // Sri Lanka south
      [80.2, 8.5],  // Palk Strait
      [79.8, 10.8], // Point Calimere
    ],
    minDepth: 0,
    maxSupportedDepth: 4000,
    nativeDepthLevels: [0, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000],
    stats: {
      surfaceAreaKm2: 2600000,
      averageDepthMeters: 2600,
      maxDepthMeters: 4694,
      meanTemperatureC: 28.5,
      meanSalinityPsu: 32.8,
      monsoonInfluence: 'Heavy freshwater capping suppresses vertical mixing; creates extreme warm pool SST exceeding 29°C.',
    },
    themeColor: '#00f5a0',
  },
  {
    id: 'andaman-sea',
    name: 'Andaman Sea',
    hindiName: 'अंडमान सागर',
    description: 'Semi-enclosed marginal sea separated from the Bay of Bengal by the Andaman and Nicobar chain. Features active tectonic back-arc spreading, world-renowned giant internal solitary waves, and critical coral reef biodiversity.',
    bbox: [92.0, 5.0, 99.0, 16.5],
    center: { lon: 95.5, lat: 11.0, zoomDistance: 1900000 },
    polygon: [
      [94.2, 16.0], // Myanmar Irrawaddy mouth
      [97.0, 15.0], // Gulf of Martaban
      [98.2, 12.0], // Mergui Archipelago
      [98.8, 8.5],  // Phuket / Thailand coast
      [99.8, 6.0],  // Malacca Strait entrance
      [96.0, 5.5],  // North Sumatra / Banda Aceh
      [93.8, 7.0],  // Nicobar passage
      [93.0, 10.0], // Ten Degree Channel
      [93.3, 13.5], // North Andaman
    ],
    minDepth: 0,
    maxSupportedDepth: 3500,
    nativeDepthLevels: [0, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 3500],
    stats: {
      surfaceAreaKm2: 797700,
      averageDepthMeters: 1096,
      maxDepthMeters: 4198,
      meanTemperatureC: 29.1,
      meanSalinityPsu: 33.1,
      monsoonInfluence: 'Tidal currents oscillating through submarine sills generate solitary internal waves over 100m tall.',
    },
    themeColor: '#b000ff',
  },
  {
    id: 'indian-eez',
    name: 'Indian Coastal Waters / EEZ',
    hindiName: 'भारतीय अनन्य आर्थिक क्षेत्र',
    description: 'India’s 2.37 million km² Exclusive Economic Zone covering 7,516 km of peninsular coastline and island territories (Lakshadweep & Andaman-Nicobar). Core zone for naval security, shipping lanes, and fisheries.',
    bbox: [67.0, 4.0, 94.5, 23.5],
    center: { lon: 77.0, lat: 14.0, zoomDistance: 2700000 },
    // Composite boundary wrapping peninsular Indian shelf and contiguous waters
    polygon: [
      [68.5, 23.8], // Kutch offshore
      [66.5, 20.0], // Saurashtra shelf
      [70.0, 17.0], // Konkan shelf 200nm
      [71.5, 12.0], // Malabar EEZ
      [71.8, 8.5],  // Lakshadweep outer boundary
      [73.5, 5.0],  // Minicoy 8-degree channel
      [77.5, 6.0],  // Kanyakumari offshore
      [82.5, 7.5],  // Sri Lanka EEZ boundary
      [84.0, 12.0], // Coromandel EEZ 200nm
      [86.5, 16.0], // Krishna-Godavari deep offshore
      [89.0, 19.5], // Odisha-Bengal deep EEZ
      [88.2, 21.6], // West Bengal coast
      [85.5, 19.2], // Puri coastline
      [81.5, 15.5], // Machilipatnam
      [80.0, 12.5], // Chennai coast
      [78.5, 9.0],  // Gulf of Mannar
      [77.5, 8.1],  // Kanyakumari point
      [76.0, 10.0], // Kochi
      [74.0, 15.0], // Karwar
      [72.8, 19.0], // Mumbai
    ],
    minDepth: 0,
    maxSupportedDepth: 3000,
    nativeDepthLevels: [0, 10, 30, 50, 100, 200, 500, 1000, 2000, 3000],
    stats: {
      surfaceAreaKm2: 2372000,
      averageDepthMeters: 1850,
      maxDepthMeters: 4200,
      meanTemperatureC: 28.2,
      meanSalinityPsu: 35.1,
      monsoonInfluence: 'Crucial for Indian Monsoon onset, offshore hydrocarbon production, and marine biodiversity.',
    },
    themeColor: '#ffaa00',
  },
];

export const getRegionById = (id: string): OceanRegion | undefined => {
  return OCEAN_REGIONS.find((r) => r.id === id);
};
