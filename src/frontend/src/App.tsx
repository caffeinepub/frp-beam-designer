import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  Info,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  EXPOSURE_CE,
  type ExposureType,
  type FRPInputs,
  type FRPResults,
  calculateFRP,
} from "./frpCalculations";

const DEFAULT_INPUTS: FRPInputs = {
  b: 230,
  D: 400,
  d: 360,
  fc: 12,
  fy: 415,
  As: 402,
  Mu: 49,
  tf: 1.02,
  ffuStar: 621,
  efuStar: 0.015,
  Ef: 37000,
  wf: 100,
  CE: 0.95,
  exposure: "Interior",
};

function fmt(val: number, decimals = 2): string {
  return val.toFixed(decimals);
}

function exportToCSV(
  inputs: FRPInputs,
  results: FRPResults,
  designation: string,
) {
  const date = new Date().toLocaleDateString();
  const r = results;

  const rows: string[][] = [
    ["RCC FRP Design Report - ACI 440.2R-17"],
    ["Member Designation", designation],
    ["Date", date],
    [],
    ["INPUT PARAMETERS"],
    ["Parameter", "Value", "Unit"],
    ["Width (b)", String(inputs.b), "mm"],
    ["Overall Depth (D)", String(inputs.D), "mm"],
    ["Effective Depth (d)", String(inputs.d), "mm"],
    ["f'c", String(inputs.fc), "MPa"],
    ["fy (fixed)", "415", "MPa"],
    ["As (fixed)", "402", "mm²"],
    ["Factored Moment (Mu)", String(inputs.Mu), "kN·m"],
    ["FRP Thickness/Ply (tf)", String(inputs.tf), "mm"],
    ["f*fu (Ultimate Strength)", String(inputs.ffuStar), "MPa"],
    ["ε*fu (Rupture Strain)", String(inputs.efuStar), ""],
    ["Ef (Elastic Modulus)", String(inputs.Ef), "MPa"],
    ["wf (Sheet Width)", String(inputs.wf), "mm"],
    ["CE (Env. Reduction)", String(inputs.CE), ""],
    ["Exposure Condition", inputs.exposure, ""],
    [],
    ["KEY CALCULATED VALUES"],
    ["Parameter", "Value", "Unit"],
    ["ffu (Design FRP Strength)", fmt(r.ffu), "MPa"],
    ["εfu (Design Rupture Strain)", fmt(r.efu, 5), ""],
    ["εfd (Debonding Strain)", fmt(r.efd, 5), ""],
    ["Governing Strain (εfe)", fmt(r.efe, 5), `governed by ${r.efeGoverning}`],
    ["ffe (FRP Stress)", fmt(r.ffe), "MPa"],
    ["xu (Neutral Axis Depth)", fmt(r.xu), "mm"],
    ["Mexisting (Existing Capacity)", fmt(r.Mexisting), "kN·m"],
    ["z (Moment Arm)", fmt(r.z), "mm"],
    [],
    ["FRP PLY ITERATION TABLE"],
    ["Plies", "Af (mm²)", "Mfrp (kN·m)", "Mn (kN·m)", "φMn (kN·m)", "Status"],
    ...r.plies
      .slice(0, Math.min(r.recommendedPlies + 1, 6))
      .map((ply) => [
        String(ply.n),
        fmt(ply.Af),
        fmt(ply.Mfrp),
        fmt(ply.Mn),
        fmt(ply.phiMn),
        ply.safe ? "SAFE" : "FAIL",
      ]),
    [],
    ["FINAL RESULT"],
    ["Recommended Plies", String(r.recommendedPlies), ""],
    ["φMn Provided", fmt(r.finalPhiMn), "kN·m"],
    ["Required Mu", String(inputs.Mu), "kN·m"],
    ["Safety Margin", fmt(r.safetyMargin, 1), "%"],
    ["Verdict", r.isSafe ? "SAFE" : "UNSAFE", ""],
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeDate = date.replace(/\//g, "-");
  a.href = url;
  a.download = `FRP_Design_${designation}_${safeDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportReport(
  inputs: FRPInputs,
  results: FRPResults,
  designation: string,
) {
  const date = new Date().toLocaleDateString();
  const r = results;

  const plyRows = r.plies
    .slice(0, Math.min(r.recommendedPlies + 1, 6))
    .map(
      (ply) => `
      <tr style="background:${ply.n === r.recommendedPlies ? "#e8f5e9" : "#fff"}">
        <td>${ply.n}</td>
        <td>${fmt(ply.Af)}</td>
        <td>${fmt(ply.Mfrp)}</td>
        <td>${fmt(ply.Mn)}</td>
        <td>${fmt(ply.phiMn)}</td>
        <td style="color:${ply.safe ? "#2e7d32" : "#c62828"};font-weight:bold">${ply.safe ? "SAFE" : "FAIL"}</td>
      </tr>`,
    )
    .join("");

  const verdictColor = r.isSafe ? "#2e7d32" : "#c62828";
  const verdictBg = r.isSafe ? "#e8f5e9" : "#ffebee";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>RCC FRP Design Report — ${designation}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #212121; background: #fff; padding: 32px; max-width: 900px; margin: auto; }
  h1 { font-size: 20px; font-weight: 800; color: #1a237e; letter-spacing: 0.5px; }
  h2 { font-size: 14px; font-weight: 700; color: #283593; margin: 20px 0 8px; border-bottom: 2px solid #3949ab; padding-bottom: 4px; }
  .subtitle { font-size: 12px; color: #546e7a; margin-top: 4px; }
  .header-block { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1a237e; padding-bottom: 12px; margin-bottom: 20px; }
  .header-right { text-align: right; font-size: 11px; color: #546e7a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #3949ab; color: #fff; padding: 7px 10px; text-align: left; font-size: 12px; }
  td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .two-col td:first-child { font-weight: 600; color: #37474f; width: 50%; }
  .verdict-box { border-radius: 8px; padding: 16px 20px; margin: 16px 0; border: 2px solid ${verdictColor}; background: ${verdictBg}; }
  .verdict-title { font-size: 18px; font-weight: 900; color: ${verdictColor}; letter-spacing: 1px; }
  .verdict-row { display: flex; gap: 32px; margin-top: 10px; flex-wrap: wrap; }
  .verdict-item { display: flex; flex-direction: column; }
  .verdict-label { font-size: 10px; color: #546e7a; text-transform: uppercase; }
  .verdict-value { font-size: 16px; font-weight: 800; color: #212121; }
  .formula { font-family: 'Courier New', monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #cfd8dc; font-size: 11px; color: #78909c; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header-block">
  <div>
    <h1>RCC FRP Beam Strengthening Design Report</h1>
    <div class="subtitle">As per ACI 440.2R-17 | Externally Bonded FRP Systems</div>
  </div>
  <div class="header-right">
    <div><strong>Member:</strong> ${designation}</div>
    <div><strong>Date:</strong> ${date}</div>
  </div>
</div>

<h2>1. Input Parameters</h2>
<table class="two-col">
  <tr><td>Width (b)</td><td>${inputs.b} mm</td><td>FRP Thickness/Ply (tf)</td><td>${inputs.tf} mm</td></tr>
  <tr><td>Overall Depth (D)</td><td>${inputs.D} mm</td><td>f*fu (Ultimate Strength)</td><td>${inputs.ffuStar} MPa</td></tr>
  <tr><td>Effective Depth (d)</td><td>${inputs.d} mm</td><td>ε*fu (Rupture Strain)</td><td>${inputs.efuStar}</td></tr>
  <tr><td>f'c (Concrete Strength)</td><td>${inputs.fc} MPa</td><td>Ef (Elastic Modulus)</td><td>${inputs.Ef} MPa</td></tr>
  <tr><td>fy (Yield Strength)</td><td>415 MPa</td><td>wf (Sheet Width)</td><td>${inputs.wf} mm</td></tr>
  <tr><td>As (Steel Area)</td><td>402 mm²</td><td>CE (Env. Reduction)</td><td>${inputs.CE}</td></tr>
  <tr><td>Mu (Factored Moment)</td><td>${inputs.Mu} kN·m</td><td>Exposure Condition</td><td>${inputs.exposure}</td></tr>
</table>

<h2>2. Design Calculation Steps</h2>
<table>
  <thead><tr><th>Step</th><th>Description</th><th>Formula / Reference</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>FRP Design Strength (§9.3)</td><td class="formula">ffu = CE × f*fu = ${inputs.CE} × ${inputs.ffuStar}</td><td>${fmt(r.ffu)} MPa</td></tr>
    <tr><td>1</td><td>FRP Design Rupture Strain (§9.3)</td><td class="formula">εfu = CE × ε*fu = ${inputs.CE} × ${inputs.efuStar}</td><td>${fmt(r.efu, 5)}</td></tr>
    <tr><td>2</td><td>Debonding Strain (§10.1.1)</td><td class="formula">εfd = 0.41√(f'c / Ef·tf)</td><td>${fmt(r.efd, 5)}</td></tr>
    <tr><td>2</td><td>0.9 × εfu Limit</td><td class="formula">0.9 × εfu</td><td>${fmt(r.limit09efu, 5)}</td></tr>
    <tr><td>2</td><td>Governing Effective Strain</td><td class="formula">εfe = min(εfd, 0.9εfu) → governed by ${r.efeGoverning}</td><td>${fmt(r.efe, 5)}</td></tr>
    <tr><td>3</td><td>Neutral Axis Depth (ACI 318)</td><td class="formula">xu = (0.87·fy·As) / (0.36·f'c·b)</td><td>${fmt(r.xu)} mm</td></tr>
    <tr><td>3</td><td>Existing Beam Capacity</td><td class="formula">Mexisting = 0.87·fy·As·(d − 0.42xu) / 10⁶</td><td>${fmt(r.Mexisting)} kN·m</td></tr>
    <tr><td>4</td><td>Moment Deficiency</td><td class="formula">Mdeficiency = Mu − Mexisting</td><td>${fmt(r.Mdeficiency)} kN·m</td></tr>
    <tr><td>5</td><td>FRP Stress at Failure</td><td class="formula">ffe = Ef × εfe</td><td>${fmt(r.ffe)} MPa</td></tr>
    <tr><td>6</td><td>Moment Arm</td><td class="formula">z = d − 0.42xu</td><td>${fmt(r.z)} mm</td></tr>
  </tbody>
</table>

<h2>3. FRP Ply Iteration</h2>
<table>
  <thead><tr><th>Plies (n)</th><th>Af (mm²)</th><th>Mfrp (kN·m)</th><th>Mn (kN·m)</th><th>φMn (kN·m)</th><th>Status</th></tr></thead>
  <tbody>${plyRows}</tbody>
</table>

<h2>4. Final Design Result</h2>
<div class="verdict-box">
  <div class="verdict-title">${r.isSafe ? "✔ SAFE" : "✘ UNSAFE"}</div>
  <div class="verdict-row">
    <div class="verdict-item"><span class="verdict-label">Recommended Plies</span><span class="verdict-value">${r.recommendedPlies}</span></div>
    <div class="verdict-item"><span class="verdict-label">φMn Provided</span><span class="verdict-value">${fmt(r.finalPhiMn)} kN·m</span></div>
    <div class="verdict-item"><span class="verdict-label">Required Mu</span><span class="verdict-value">${inputs.Mu} kN·m</span></div>
    <div class="verdict-item"><span class="verdict-label">Safety Margin</span><span class="verdict-value">${r.safetyMargin >= 0 ? "+" : ""}${fmt(r.safetyMargin, 1)}%</span></div>
  </div>
  <div style="margin-top:12px;font-size:14px;font-weight:700;color:${verdictColor}">
    φMn = ${fmt(r.finalPhiMn)} kN·m ${r.isSafe ? "≥" : "<"} Mu = ${inputs.Mu} kN·m → ${r.isSafe ? "SAFE" : "UNSAFE"}
  </div>
</div>

<div class="footer">
  <span>Generated by RCC FRP Design Tool — ACI 440.2R-17</span>
  <span>⚠ For educational use only. Verify with a licensed structural engineer.</span>
</div>
</body>
</html>`;

  const newWin = window.open("", "_blank");
  if (newWin) {
    newWin.document.write(html);
    newWin.document.close();
  }
}

function InputField({
  label,
  value,
  unit,
  onChange,
  step = "any",
  ocid,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  step?: string;
  ocid: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
        {label}
      </Label>
      <div className="relative">
        <Input
          data-ocid={ocid}
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
          className="bg-input border-border text-foreground pr-14 h-9 text-sm focus:ring-1 focus:ring-primary"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ResultsPanel({
  results,
  inputs,
  designation,
  onExportCSV,
  onExportReport,
}: {
  results: FRPResults;
  inputs: FRPInputs;
  designation: string;
  onExportCSV: () => void;
  onExportReport: () => void;
}) {
  const r = results;
  const isSafe = r.isSafe;

  return (
    <div className="space-y-4">
      {/* Safety Status Banner */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full rounded-full py-3 px-6 flex items-center justify-center gap-3 ${
          isSafe
            ? "bg-green-500/15 border border-green-500/40"
            : "bg-red-500/15 border border-red-500/40"
        }`}
        data-ocid="results.success_state"
      >
        {isSafe ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span
          className={`text-base font-bold tracking-wide ${
            isSafe ? "text-green-400" : "text-red-400"
          }`}
        >
          {r.noFRPNeeded
            ? "EXISTING BEAM IS SUFFICIENT — NO FRP REQUIRED"
            : isSafe
              ? `SAFE — ${r.recommendedPlies} ${
                  r.recommendedPlies === 1 ? "PLY" : "PLIES"
                } REQUIRED`
              : "UNSAFE — INCREASE FRP PLIES"}
        </span>
      </motion.div>

      {/* Ply Iteration Table */}
      {!r.noFRPNeeded && (
        <div className="mt-4">
          <SectionHeader title="FRP Ply Iteration" />
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-3 py-2 text-left text-muted-foreground font-semibold">
                    Plies
                  </th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-semibold">
                    Af (mm²)
                  </th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-semibold">
                    Mfrp (kN·m)
                  </th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-semibold">
                    Mn (kN·m)
                  </th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-semibold">
                    φMn (kN·m)
                  </th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.plies
                  .slice(0, Math.min(r.recommendedPlies + 1, 6))
                  .map((ply) => (
                    <tr
                      key={ply.n}
                      className={`border-b border-border/50 ${
                        ply.n === r.recommendedPlies
                          ? "bg-primary/10"
                          : "hover:bg-accent/20"
                      }`}
                      data-ocid={`results.item.${ply.n}`}
                    >
                      <td className="px-3 py-2 font-bold text-foreground">
                        {ply.n}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {fmt(ply.Af)}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {fmt(ply.Mfrp)}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {fmt(ply.Mn)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {fmt(ply.phiMn)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {ply.safe ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs">
                            SAFE
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">
                            FAIL
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Final Result Box */}
      {!r.noFRPNeeded && (
        <div
          className={`rounded-xl border-2 p-4 ${
            isSafe
              ? "border-green-500/50 bg-green-500/10"
              : "border-red-500/50 bg-red-500/10"
          }`}
          data-ocid="results.panel"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-foreground">
              Final Design Result
            </div>
            {designation && (
              <div className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded">
                Member: {designation}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">
                Required Plies
              </div>
              <div className="text-2xl font-black text-foreground">
                {r.recommendedPlies}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">φMn Provided</div>
              <div className="text-2xl font-black text-foreground">
                {fmt(r.finalPhiMn)}{" "}
                <span className="text-sm text-muted-foreground">kN·m</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Required Mu</div>
              <div className="text-lg font-bold text-foreground">
                {inputs.Mu}{" "}
                <span className="text-sm text-muted-foreground">kN·m</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Safety Margin</div>
              <div
                className={`text-lg font-bold ${
                  r.safetyMargin >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {r.safetyMargin >= 0 ? "+" : ""}
                {fmt(r.safetyMargin, 1)}%
              </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div
            className={`text-sm font-semibold ${
              isSafe ? "text-green-400" : "text-red-400"
            }`}
          >
            φMn = {fmt(r.finalPhiMn)} kN·m {isSafe ? "≥" : "<"} Mu = {inputs.Mu}{" "}
            kN·m → {isSafe ? "✔ SAFE" : "✘ UNSAFE"}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          className="flex-1 gap-2 border-border text-foreground hover:bg-accent"
          onClick={onExportCSV}
          data-ocid="export.csv.button"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 border-border text-foreground hover:bg-accent"
          onClick={onExportReport}
          data-ocid="export.report.button"
        >
          <FileText className="w-4 h-4" />
          Download Report
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  const [inputs, setInputs] = useState<FRPInputs>(DEFAULT_INPUTS);
  const [designation, setDesignation] = useState<string>("B1");

  const results: FRPResults = useMemo(() => calculateFRP(inputs), [inputs]);

  function setField<K extends keyof FRPInputs>(key: K, value: FRPInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function handleExposureChange(val: string) {
    const exposure = val as ExposureType;
    setInputs((prev) => ({ ...prev, exposure, CE: EXPOSURE_CE[exposure] }));
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-primary" />
            </div>
            <span className="font-black text-sm tracking-widest text-foreground uppercase">
              RCC FRP
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#calculator"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              Design
            </a>
            <a
              href="#theory"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              Theory
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              About
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 px-6">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, oklch(0.62 0.018 250) 0 1px, transparent 1px 60px),
              repeating-linear-gradient(90deg, oklch(0.62 0.018 250) 0 1px, transparent 1px 60px)`,
          }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] pointer-events-none opacity-[0.06] border-4 border-muted-foreground rounded" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[160px] pointer-events-none opacity-[0.04] bg-muted-foreground rounded" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <Badge className="mb-4 bg-primary/15 text-primary border-primary/30 text-xs font-semibold px-3 py-1">
            ACI 440.2R-17 Compliant
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-4 tracking-tight">
            RCC Beam FRP Strengthening
            <br />
            <span className="text-primary">Design Tool</span>
          </h1>
        </motion.div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Parameters */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="bg-card border-border shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                  </div>
                  Input Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Beam Designation */}
                <div>
                  <SectionHeader title="Beam Designation" />
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                      Member ID
                    </Label>
                    <Input
                      data-ocid="beam.designation.input"
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. B1"
                      className="bg-input border-border text-foreground h-9 text-sm focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Beam Geometry */}
                <div>
                  <SectionHeader title="Beam Geometry" />
                  <div className="grid grid-cols-3 gap-3">
                    <InputField
                      label="Width (b)"
                      value={inputs.b}
                      unit="mm"
                      onChange={(v) => setField("b", v)}
                      ocid="beam.b.input"
                    />
                    <InputField
                      label="Overall Depth (D)"
                      value={inputs.D}
                      unit="mm"
                      onChange={(v) => setField("D", v)}
                      ocid="beam.D.input"
                    />
                    <InputField
                      label="Eff. Depth (d)"
                      value={inputs.d}
                      unit="mm"
                      onChange={(v) => setField("d", v)}
                      ocid="beam.d.input"
                    />
                  </div>
                </div>

                {/* RCC Properties */}
                <div>
                  <SectionHeader title="RCC Properties" />
                  <div className="grid grid-cols-1 gap-3">
                    <InputField
                      label="f'c"
                      value={inputs.fc}
                      unit="MPa"
                      onChange={(v) => setField("fc", v)}
                      ocid="rcc.fc.input"
                    />
                  </div>
                </div>

                {/* Loading */}
                <div>
                  <SectionHeader title="Loading" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Factored Moment Mu"
                      value={inputs.Mu}
                      unit="kN·m"
                      onChange={(v) => setField("Mu", v)}
                      ocid="loading.Mu.input"
                    />
                  </div>
                </div>

                {/* FRP Properties */}
                <div>
                  <SectionHeader title="FRP Properties" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Thickness/Ply (tf)"
                      value={inputs.tf}
                      unit="mm"
                      step="0.01"
                      onChange={(v) => setField("tf", v)}
                      ocid="frp.tf.input"
                    />
                    <InputField
                      label="Ultimate Strength (f*fu)"
                      value={inputs.ffuStar}
                      unit="MPa"
                      onChange={(v) => setField("ffuStar", v)}
                      ocid="frp.ffu.input"
                    />
                    <InputField
                      label="Rupture Strain (ε*fu)"
                      value={inputs.efuStar}
                      unit=""
                      step="0.001"
                      onChange={(v) => setField("efuStar", v)}
                      ocid="frp.efu.input"
                    />
                    <InputField
                      label="Elastic Modulus (Ef)"
                      value={inputs.Ef}
                      unit="MPa"
                      onChange={(v) => setField("Ef", v)}
                      ocid="frp.Ef.input"
                    />
                    <InputField
                      label="Sheet Width (wf)"
                      value={inputs.wf}
                      unit="mm"
                      onChange={(v) => setField("wf", v)}
                      ocid="frp.wf.input"
                    />
                    <InputField
                      label="CE Factor"
                      value={inputs.CE}
                      unit=""
                      step="0.01"
                      onChange={(v) => setField("CE", v)}
                      ocid="frp.CE.input"
                    />
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                      Exposure Condition
                    </Label>
                    <Select
                      value={inputs.exposure}
                      onValueChange={handleExposureChange}
                    >
                      <SelectTrigger
                        className="mt-1 bg-input border-border h-9 text-sm"
                        data-ocid="frp.exposure.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="Interior">
                          Interior (CE = 0.95)
                        </SelectItem>
                        <SelectItem value="Exterior">
                          Exterior (CE = 0.85)
                        </SelectItem>
                        <SelectItem value="Aggressive">
                          Aggressive (CE = 0.75)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
                  data-ocid="calc.submit_button"
                >
                  <Calculator className="w-4 h-4" />
                  Calculate Design
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="bg-card border-border shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  Design Results & Safety Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResultsPanel
                  results={results}
                  inputs={inputs}
                  designation={designation}
                  onExportCSV={() => exportToCSV(inputs, results, designation)}
                  onExportReport={() =>
                    exportReport(inputs, results, designation)
                  }
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Theory Section */}
      <section id="theory" className="max-w-[1200px] mx-auto px-6 pb-16">
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Theory & Code Reference — ACI 440.2R-17
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-semibold text-foreground mb-2">
                  FRP Design Properties
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Design values are derived from material test data reduced by
                  an environmental reduction factor CE. This accounts for
                  long-term degradation based on exposure conditions (ACI
                  440.2R-17 §9.3).
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-2">
                  Debonding Strain Limit
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  The controlling FRP strain is limited to prevent
                  intermediate-crack debonding. εfd = 0.41√(f′c / Ef·tf) per ACI
                  440.2R-17 §10.1.1 governs when it is less than 0.9×εfu.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-2">
                  Strength Reduction Factor
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  φ = 0.90 is applied to the nominal moment capacity for a
                  tension-controlled flexural member, consistent with ACI 318
                  and ACI 440.2R-17 §9.4.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-[1200px] mx-auto px-6 pb-16">
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              About This Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This tool automates the design of RCC beams strengthened with
              externally bonded Fiber-Reinforced Polymer (FRP) composites as per
              ACI 440.2R-17 guidelines. Input your beam geometry, material
              properties, and loading to get instant design verification
              including debonding checks, ply iteration, and final safety
              status.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Badge className="bg-primary/15 text-primary border-primary/30">
                ACI 440.2R-17
              </Badge>
              <Badge className="bg-secondary border-border text-muted-foreground">
                Flexural FRP
              </Badge>
              <Badge className="bg-secondary border-border text-muted-foreground">
                Real-time Calculation
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">RCC FRP</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {currentYear}. Built with <span className="text-red-400">♥</span>{" "}
            using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              caffeine.ai
            </a>
          </p>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              For educational use. Verify with a licensed engineer.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
