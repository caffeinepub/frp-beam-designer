export type ExposureType = "Interior" | "Exterior" | "Aggressive";

export interface FRPInputs {
  // Beam Geometry
  b: number; // mm
  D: number; // mm
  d: number; // mm
  // RCC Properties
  fc: number; // MPa  (f'c)
  fy: number; // MPa
  As: number; // mm²
  // Loading
  Mu: number; // kN·m
  // FRP Properties
  tf: number; // mm per ply
  ffuStar: number; // MPa
  efuStar: number; // unitless
  Ef: number; // MPa
  wf: number; // mm
  CE: number; // Environmental reduction factor
  exposure: ExposureType;
}

export interface PlyResult {
  n: number;
  Af: number; // mm²
  Tf: number; // N
  Mfrp: number; // kN·m
  Mn: number; // kN·m
  phiMn: number; // kN·m
  safe: boolean;
}

export interface FRPResults {
  // Step 1 - Design FRP Props
  ffu: number; // MPa
  efu: number; // unitless
  // Step 2 - Debonding
  efd: number; // unitless
  limit09efu: number;
  efeGoverning: "efd" | "09efu";
  efe: number; // governing strain
  // Step 3 - Existing Beam
  xu: number; // mm
  Mexisting: number; // kN·m
  // Step 4 - Deficiency
  Mdeficiency: number; // kN·m
  noFRPNeeded: boolean;
  // Step 5 - FRP Stress
  ffe: number; // MPa
  // Step 6 - z (moment arm)
  z: number; // mm
  // Ply iterations
  plies: PlyResult[];
  // Final
  recommendedPlies: number;
  finalPhiMn: number;
  safetyMargin: number; // %
  isSafe: boolean;
}

export function calculateFRP(inputs: FRPInputs): FRPResults {
  const { b, d, fc, fy, As, Mu, tf, ffuStar, efuStar, Ef, wf, CE } = inputs;

  // Step 1: Design FRP properties
  const ffu = CE * ffuStar;
  const efu = CE * efuStar;

  // Step 2: Debonding strain
  const efd = 0.41 * Math.sqrt(fc / (Ef * tf));
  const limit09efu = 0.9 * efu;
  const efeGoverning: "efd" | "09efu" = efd < limit09efu ? "efd" : "09efu";
  const efe = efd < limit09efu ? efd : limit09efu;

  // Step 3: Existing beam capacity
  const xu = (0.87 * fy * As) / (0.36 * fc * b);
  const Mexisting = (0.87 * fy * As * (d - 0.42 * xu)) / 1e6; // kN·m

  // Step 4: Moment deficiency
  const Mdeficiency = Mu - Mexisting;
  const noFRPNeeded = Mdeficiency <= 0;

  // Step 5: FRP stress
  const ffe = Ef * efe;

  // Step 6: z
  const z = d - 0.42 * xu;

  // Step 7: Iterate plies
  const plies: PlyResult[] = [];
  const maxPlies = 10;
  let recommendedPlies = maxPlies;

  for (let n = 1; n <= maxPlies; n++) {
    const Af = n * tf * wf;
    const Tf = Af * ffe;
    const Mfrp = (Tf * z) / 1e6;
    const Mn = Mexisting + Mfrp;
    const phiMn = 0.9 * Mn;
    const safe = phiMn >= Mu;
    plies.push({ n, Af, Tf, Mfrp, Mn, phiMn, safe });
    if (safe && recommendedPlies === maxPlies) {
      recommendedPlies = n;
    }
  }

  const finalPly = plies[recommendedPlies - 1];
  const finalPhiMn = finalPly ? finalPly.phiMn : plies[plies.length - 1].phiMn;
  const safetyMargin = ((finalPhiMn - Mu) / Mu) * 100;
  const isSafe = noFRPNeeded || finalPhiMn >= Mu;

  return {
    ffu,
    efu,
    efd,
    limit09efu,
    efeGoverning,
    efe,
    xu,
    Mexisting,
    Mdeficiency,
    noFRPNeeded,
    ffe,
    z,
    plies,
    recommendedPlies,
    finalPhiMn,
    safetyMargin,
    isSafe,
  };
}

export const EXPOSURE_CE: Record<ExposureType, number> = {
  Interior: 0.95,
  Exterior: 0.85,
  Aggressive: 0.75,
};
