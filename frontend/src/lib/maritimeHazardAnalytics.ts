import { type OceanPredictionResult } from '@/lib/api/oceanPredictionService';

export interface CycloneTrackerData {
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskColor: string;
  riskBg: string;
  badgeText: string;
  advisoryNote: string;
  sst: string;
  waveHeight: string;
  seaStateLabel: string;
  tchp: number;
  currentSpeed: number;
  windShearStatus: string;
  evacuationWindow: string;
}

export interface EcosystemHealthData {
  score: number;
  status: 'PRISTINE' | 'HEALTHY' | 'MODERATE STRESS' | 'VULNERABLE';
  statusColor: string;
  barColor: string;
  dhw: string;
  primaryProd: string;
  hypoxiaStatus: string;
  sst: string;
  salinity: string;
  mld: string;
  phProxy: string;
  chlorophyllProxy: string;
}

export interface FishingAdvisoryData {
  rating: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'POOR';
  ratingColor: string;
  ratingBg: string;
  species: string;
  frontType: string;
  optimalDepthHorizon: string;
  feedingAggregation: string;
  advisoryText: string;
  driftStrategy: string;
}

export interface SafeZoneData {
  safetyScore: number;
  status: 'SAFE ZONE' | 'CAUTION ZONE' | 'HAZARDOUS / RESTRICTED';
  statusColor: string;
  statusBg: string;
  iconColor: string;
  leewayRate: string;
  driftVector: string;
  maxRecommendedSpeed: string;
  vesselAdvisory: string;
  smallCraftAdvisory: string;
}

export function computeSoundSpeed(T: number, S: number, D: number): string {
  // Mackenzie (1981) 9-term empirical sound speed formula
  const c = 1448.96 + 4.591 * T - 0.05304 * (T ** 2) + 0.0002374 * (T ** 3) + 1.340 * (S - 35) + 0.0163 * D + 1.675e-7 * (D ** 2);
  return c.toFixed(1);
}

export function computeSeawaterDensity(T: number, S: number, D: number): string {
  // UNESCO equation of state simplified approximation (kg/m3)
  const rho = 1000 + 28.15 - 0.18 * (T - 15) + 0.78 * (S - 35) + 0.0044 * D;
  return rho.toFixed(2);
}

export function computeCycloneTrackerData(prediction: OceanPredictionResult): CycloneTrackerData {
  const sst = prediction.variables.thetao.value;
  const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
  const mld = prediction.variables.mlotst.value;
  
  const baseWave = 0.5 + currentSpeed * 2.2;
  const waveHeight = Math.min(baseWave, 8.5).toFixed(1);
  const waveNum = parseFloat(waveHeight);

  let seaStateLabel = 'Slight (0.5 - 1.25m)';
  if (waveNum < 0.5) seaStateLabel = 'Calm Glassy (<0.5m)';
  else if (waveNum <= 1.25) seaStateLabel = 'Smooth to Slight (0.5-1.25m)';
  else if (waveNum <= 2.5) seaStateLabel = 'Moderate (1.25-2.5m)';
  else if (waveNum <= 4.0) seaStateLabel = 'Rough (2.5-4.0m)';
  else seaStateLabel = 'Very Rough to High (>4.0m)';

  let threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  let riskColor = 'text-emerald-400';
  let riskBg = 'bg-emerald-950/40 border-emerald-800/50';
  let badgeText = 'LOW RISK';
  let advisoryNote = 'Conditions calm. Standard navigational watches apply.';

  if (sst >= 29.0 && currentSpeed > 0.8) {
    threatLevel = 'CRITICAL';
    riskColor = 'text-red-400';
    riskBg = 'bg-red-950/50 border-red-700/60';
    badgeText = 'CRITICAL';
    advisoryNote = 'Extreme heat reservoir with high shear. High cyclogenesis probability.';
  } else if (sst >= 28.0 && currentSpeed > 0.4) {
    threatLevel = 'HIGH';
    riskColor = 'text-red-400';
    riskBg = 'bg-red-950/50 border-red-700/60';
    badgeText = 'HIGH RISK';
    advisoryNote = 'SST exceeds 28°C. Thermal reservoir supportive of tropical depressions.';
  } else if (sst >= 26.5) {
    threatLevel = 'MODERATE';
    riskColor = 'text-amber-400';
    riskBg = 'bg-amber-950/40 border-amber-700/50';
    badgeText = 'WATCH';
    advisoryNote = 'SST at 26.5°C threshold. Monitor barometric pressure gradients.';
  }

  const tchp = Math.max(15, Math.round(sst * 2.8 + mld * 0.4));

  return {
    threatLevel,
    riskColor,
    riskBg,
    badgeText,
    advisoryNote,
    sst: sst.toFixed(1),
    waveHeight,
    seaStateLabel,
    tchp,
    currentSpeed,
    windShearStatus: currentSpeed > 0.9 ? 'Strong Vertical Shear' : 'Low to Moderate Shear',
    evacuationWindow: threatLevel === 'CRITICAL' ? 'Immediate 6h Window' : threatLevel === 'HIGH' ? '12h Advisory Horizon' : 'Clear Maritime Corridor',
  };
}

export function computeEcosystemHealthData(prediction: OceanPredictionResult, depth: number): EcosystemHealthData {
  const sst = prediction.variables.thetao.value;
  const salinity = prediction.variables.so.value;
  const mld = prediction.variables.mlotst.value;
  
  let score = 96;
  if (sst > 29.5) score -= 22;
  else if (sst > 28.5) score -= 10;
  else if (sst < 18.0) score -= 14;

  if (salinity < 32.0) score -= 18;
  else if (salinity > 37.0) score -= 12;

  if (mld < 15) score -= 12;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let status: 'PRISTINE' | 'HEALTHY' | 'MODERATE STRESS' | 'VULNERABLE' = 'HEALTHY';
  let statusColor = 'text-emerald-400';
  let barColor = 'bg-emerald-500';

  if (score >= 85) {
    status = 'PRISTINE';
    statusColor = 'text-emerald-400';
    barColor = 'bg-emerald-500';
  } else if (score >= 70) {
    status = 'HEALTHY';
    statusColor = 'text-emerald-400';
    barColor = 'bg-emerald-500';
  } else if (score >= 50) {
    status = 'MODERATE STRESS';
    statusColor = 'text-amber-400';
    barColor = 'bg-amber-500';
  } else {
    status = 'VULNERABLE';
    statusColor = 'text-red-400';
    barColor = 'bg-red-500';
  }

  const dhw = sst >= 29.5 ? 'Warning (DHW 4-8)' : sst >= 28.8 ? 'Watch (DHW 1-4)' : 'No Thermal Stress';
  const primaryProd = mld < 35 && sst >= 24 && sst <= 28.5 ? 'High (Upwelling Enriched)' : 'Moderate Pelagic';
  const hypoxiaStatus = depth > 200 && sst < 15 ? 'Hypoxic Layer (OMZ Core)' : 'Normoxic Aerated';

  return {
    score,
    status,
    statusColor,
    barColor,
    dhw,
    primaryProd,
    hypoxiaStatus,
    sst: sst.toFixed(1),
    salinity: salinity.toFixed(1),
    mld: mld.toFixed(0),
    phProxy: (8.15 - (sst - 20) * 0.015).toFixed(2),
    chlorophyllProxy: mld < 30 ? '0.84 mg/m³ (Rich)' : '0.28 mg/m³ (Clear)',
  };
}

export function computeFishingAdvisoryData(prediction: OceanPredictionResult, depth: number): FishingAdvisoryData {
  const sst = prediction.variables.thetao.value;
  const salinity = prediction.variables.so.value;
  const mld = prediction.variables.mlotst.value;
  const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
  
  const isUpwellingFront = mld <= 40 && currentSpeed >= 0.25 && currentSpeed <= 1.1;
  const optimalTemp = sst >= 22.0 && sst <= 28.2;
  const optimalSalinity = salinity >= 34.0 && salinity <= 36.5;

  let rating: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'POOR' = 'MODERATE';
  let ratingColor = 'text-white';
  let ratingBg = 'bg-[#161616] border-[#262626]';

  if (isUpwellingFront && optimalTemp && optimalSalinity) {
    rating = 'EXCELLENT';
    ratingColor = 'text-emerald-400';
    ratingBg = 'bg-emerald-950/40 border-emerald-800/50';
  } else if (optimalTemp && (isUpwellingFront || optimalSalinity)) {
    rating = 'HIGH';
    ratingColor = 'text-emerald-300';
    ratingBg = 'bg-emerald-950/30 border-emerald-800/40';
  } else if (sst > 29.5 || currentSpeed > 1.4) {
    rating = 'POOR';
    ratingColor = 'text-amber-400';
    ratingBg = 'bg-amber-950/30 border-amber-800/40';
  }

  let speciesList = ['Indian Mackerel', 'Yellowfin Tuna', 'Oil Sardine'];
  if (sst < 24) speciesList = ['Skipjack Tuna', 'Carangids', 'Ribbonfish'];
  else if (sst > 28) speciesList = ['Pelagic Squid', 'Anchovies', 'Seer Fish'];

  const optimalDepthHorizon = depth <= 40 ? 'Surface Seine (0-40m)' : depth <= 120 ? 'Mesopelagic Longline (40-120m)' : 'Deep Demersal Trawl';

  return {
    rating,
    ratingColor,
    ratingBg,
    species: speciesList.join(', '),
    frontType: isUpwellingFront ? 'Active Ocean Front / Upwelling' : 'Dispersed Pelagic Zone',
    optimalDepthHorizon,
    feedingAggregation: isUpwellingFront ? 'High Plankton Density' : 'Moderate Biomass',
    advisoryText: rating === 'EXCELLENT'
      ? 'High probability of pelagic schooling near frontal temperature gradient. Optimal fishing window.'
      : rating === 'HIGH'
      ? 'Favorable sea conditions with active nutrient convergence. Good catch expected.'
      : rating === 'POOR'
      ? 'High thermal stratification or rapid drift dispersing fish schools. Limited catch yield.'
      : 'Moderate potential. Target coastal convergence zones and thermocline depth margin.',
    driftStrategy: 'Deploy gillnets & longlines along ESE oceanic shear lines during dawn/dusk twilight.',
  };
}

export function computeSafeZoneData(prediction: OceanPredictionResult, cycloneData: CycloneTrackerData): SafeZoneData {
  const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
  const waveHeight = parseFloat(cycloneData.waveHeight);

  let safetyScore = 98;
  if (currentSpeed > 1.2) safetyScore -= 30;
  else if (currentSpeed > 0.7) safetyScore -= 12;

  if (waveHeight > 3.0) safetyScore -= 35;
  else if (waveHeight > 1.8) safetyScore -= 15;

  if (cycloneData.threatLevel === 'CRITICAL') safetyScore -= 45;
  else if (cycloneData.threatLevel === 'HIGH') safetyScore -= 25;
  else if (cycloneData.threatLevel === 'MODERATE') safetyScore -= 10;

  safetyScore = Math.max(10, Math.min(100, safetyScore));

  let status: 'SAFE ZONE' | 'CAUTION ZONE' | 'HAZARDOUS / RESTRICTED' = 'SAFE ZONE';
  let statusColor = 'text-emerald-400';
  let statusBg = 'bg-emerald-950/40 border-emerald-800/50';
  let iconColor = 'text-emerald-400';

  if (safetyScore >= 78) {
    status = 'SAFE ZONE';
    statusColor = 'text-emerald-400';
    statusBg = 'bg-emerald-950/40 border-emerald-800/50';
    iconColor = 'text-emerald-400';
  } else if (safetyScore >= 50) {
    status = 'CAUTION ZONE';
    statusColor = 'text-amber-400';
    statusBg = 'bg-amber-950/40 border-amber-700/50';
    iconColor = 'text-amber-400';
  } else {
    status = 'HAZARDOUS / RESTRICTED';
    statusColor = 'text-red-400';
    statusBg = 'bg-red-950/50 border-red-700/60';
    iconColor = 'text-red-400';
  }

  const leewayRate = (currentSpeed * 0.035 * 60).toFixed(1);
  const driftVector = `${prediction.summary.currentDirectionCompass} (${prediction.summary.currentDirectionDeg}°) at ${currentSpeed} kts`;

  return {
    safetyScore,
    status,
    statusColor,
    statusBg,
    iconColor,
    leewayRate: `${leewayRate} nm/hr`,
    driftVector,
    maxRecommendedSpeed: safetyScore < 50 ? 'Reduce Speed (<8 kts)' : safetyScore < 75 ? 'Moderate Speed (12 kts)' : 'Cruising Speed (18+ kts)',
    vesselAdvisory: safetyScore >= 78 ? 'Unrestricted navigation corridor. Standard bridge watch.' : safetyScore >= 50 ? 'Moderate cross-track drift. Counter-steer leeway vector.' : 'Hazardous sea state. Small crafts stay in port.',
    smallCraftAdvisory: waveHeight > 2.0 || currentSpeed > 1.2 ? 'Small Craft Advisory Active' : 'Favorable for Artisanal Craft',
  };
}

export interface MaritimeActivitySummary {
  riskStatus: 'SAFE' | 'CAUTION' | 'HAZARD';
  riskColor: string;
  cycloneText: string;
  cycloneThreat: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  seaStateText: string;
  fishingRating: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'POOR';
  fishingText: string;
  navStatus: string;
  currentSpeedText: string;
}

export function computeMaritimeActivitySummary(prediction: OceanPredictionResult, depth: number): MaritimeActivitySummary {
  const cyclone = computeCycloneTrackerData(prediction);
  const safe = computeSafeZoneData(prediction, cyclone);
  const fishing = computeFishingAdvisoryData(prediction, depth);

  const riskStatus = safe.status === 'SAFE ZONE' ? 'SAFE' : safe.status === 'CAUTION ZONE' ? 'CAUTION' : 'HAZARD';
  const riskColor = safe.statusColor;

  return {
    riskStatus,
    riskColor,
    cycloneText: `${cyclone.threatLevel} · ${cyclone.tchp} kJ/cm²`,
    cycloneThreat: cyclone.threatLevel,
    seaStateText: `${cyclone.waveHeight}m · ${cyclone.seaStateLabel.split(' ')[0]}`,
    fishingRating: fishing.rating,
    fishingText: `${fishing.rating} · ${fishing.frontType.includes('Front') ? 'Frontal Convergence' : 'Pelagic'}`,
    navStatus: safe.status,
    currentSpeedText: `${prediction.summary.currentSpeedKnots} kts ${prediction.summary.currentDirectionCompass}`,
  };
}
