import { jsPDF } from "jspdf";

import type { PerformanceNutritionAssessmentResult } from "./performanceNutritionAssessment";

const PDF_FILENAME = "elite-pocket-pt-performance-nutrition-starting-point.pdf";
type Rgb = [number, number, number];

const navy: Rgb = [11, 18, 32];
const blue: Rgb = [17, 87, 216];
const slate: Rgb = [71, 85, 105];
const paleBlue: Rgb = [238, 245, 255];
const paleSlate: Rgb = [248, 250, 252];
const border: Rgb = [222, 230, 241];

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

function humanLabel(value: string) {
  const labels: Record<string, string> = {
    maintain: "Performance / maintain",
    "fat-loss": "Fat loss",
    "muscle-gain": "Muscle gain",
    seated: "Mostly seated",
    light: "Lightly active",
    active: "Active / on feet",
    "very-active": "Very active / physical job",
    "under-45": "Under 45 minutes",
    "45-75": "45–75 minutes",
    "75-120": "75–120 minutes",
    "over-120": "Over 120 minutes",
    low: "Low",
    moderate: "Moderate",
    high: "High",
    "very-high": "Very high",
    no: "No",
    sometimes: "Sometimes",
    frequently: "Frequently",
    omnivore: "Omnivore",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    normal: "Normal / unsure",
    heavy: "Heavy sweater",
    "very-heavy": "Very heavy / salty sweater",
    "cool-indoor": "Mostly cool / indoor",
    mixed: "Mixed",
    "hot-humid": "Frequently hot / humid",
  };

  return labels[value] || value;
}

function buildPerformanceNutritionPdf(result: PerformanceNutritionAssessmentResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const width = pageWidth - margin * 2;
  const bottom = pageHeight - 19;
  let y = margin;

  function nextPage() {
    doc.addPage();
    y = margin;
  }

  function ensureSpace(height: number) {
    if (y + height > bottom) nextPage();
  }

  function roundedCard(x: number, top: number, cardWidth: number, height: number, fill: Rgb = paleSlate) {
    doc.setFillColor(...fill);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, top, cardWidth, height, 3.5, 3.5, "FD");
  }

  function title(eyebrow: string, heading: string, subtitle?: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...blue);
    doc.text(eyebrow.toUpperCase(), margin, y);
    y += 6;
    doc.setFontSize(20);
    doc.setTextColor(...navy);
    doc.text(heading, margin, y);
    y += 8;
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.6);
      doc.setTextColor(...slate);
      const lines = doc.splitTextToSize(subtitle, width) as string[];
      doc.text(lines, margin, y);
      y += lines.length * 4.3 + 3;
    }
  }

  function section(heading: string) {
    ensureSpace(14);
    doc.setFillColor(...blue);
    doc.roundedRect(margin, y, 10, 1.2, 0.6, 0.6, "F");
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(...navy);
    doc.text(heading, margin, y);
    y += 6;
  }

  function metricCard(
    x: number,
    top: number,
    cardWidth: number,
    height: number,
    label: string,
    value: string,
    detail = "",
  ) {
    roundedCard(x, top, cardWidth, height);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...blue);
    doc.text(doc.splitTextToSize(label.toUpperCase(), cardWidth - 8) as string[], x + 4, top + 6);
    doc.setFontSize(value.length > 18 ? 10.5 : 14);
    doc.setTextColor(...navy);
    doc.text(value, x + 4, top + height - (detail ? 9 : 6));
    if (detail) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.4);
      doc.setTextColor(...slate);
      doc.text(detail, x + 4, top + height - 4);
    }
  }

  function metricGrid(items: Array<{ label: string; value: string; detail?: string }>, columns: number, height: number) {
    const gap = 4;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const rowCount = Math.ceil(items.length / columns);
    const gridHeight = rowCount * height + (rowCount - 1) * gap;
    ensureSpace(gridHeight + 4);
    items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      metricCard(
        margin + column * (cardWidth + gap),
        y + row * (height + gap),
        cardWidth,
        height,
        item.label,
        item.value,
        item.detail,
      );
    });
    y += gridHeight + 4;
  }

  function rows(items: Array<{ label: string; value: string }>, columns = 1) {
    const gap = 4;
    const cellWidth = (width - gap * (columns - 1)) / columns;
    const rowHeight = 14;
    const rowCount = Math.ceil(items.length / columns);
    const height = rowCount * rowHeight + 7;
    ensureSpace(height + 4);
    roundedCard(margin, y, width, height);
    items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = margin + column * (cellWidth + gap) + 5;
      const top = y + 6 + row * rowHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...slate);
      doc.text(item.label, x, top);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.4);
      doc.setTextColor(...navy);
      doc.text(doc.splitTextToSize(item.value, cellWidth - 10) as string[], x, top + 4.5);
    });
    y += height + 4;
  }

  function info(text: string, heading = "") {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, width - 12) as string[];
    const height = 11 + lines.length * 4.2 + (heading ? 6 : 0);
    ensureSpace(height + 4);
    roundedCard(margin, y, width, height, paleBlue);
    let textY = y + 6;
    if (heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...blue);
      doc.text(heading.toUpperCase(), margin + 6, textY);
      textY += 6;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(lines, margin + 6, textY);
    y += height + 4;
  }

  function darkPanel(heading: string, text: string) {
    doc.setFontSize(9.4);
    const lines = doc.splitTextToSize(text, width - 12) as string[];
    const height = 17 + lines.length * 4.25;
    ensureSpace(height + 4);
    doc.setFillColor(...navy);
    doc.roundedRect(margin, y, width, height, 3.5, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.7);
    doc.setTextColor(155, 196, 255);
    doc.text(heading.toUpperCase(), margin + 6, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.4);
    doc.setTextColor(222, 234, 255);
    doc.text(lines, margin + 6, y + 14);
    y += height + 4;
  }

  function footer() {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.25);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...slate);
      doc.text("Coach Mike Nicholson", margin, pageHeight - 8);
      doc.text("Performance Dietitian • M.Sc Sports Nutrition • Elite Pocket PT", margin, pageHeight - 4.5);
      doc.text("Page " + page + " of " + pages, pageWidth - margin, pageHeight - 6, { align: "right" });
    }
  }

  doc.setProperties({
    title: "Elite Pocket PT Performance Nutrition Starting Point",
    subject: "Performance nutrition starting targets",
    author: "Elite Pocket PT",
  });

  title(
    "Performance Nutrition",
    "Your Performance Nutrition Starting Point",
    "Evidence-based starting targets based on your training, goals and the information you provided.",
  );
  roundedCard(margin, y, width, 30, blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(219, 234, 254);
  doc.text("DAILY ENERGY TARGET", margin + 6, y + 8);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(formatNumber(result.calories.suggestedCalories) + " kcal/day", margin + 6, y + 20);
  y += 35;
  metricGrid(
    [
      { label: "Protein", value: result.macros.proteinG + " g/day", detail: result.macros.proteinGPerKg + " g/kg" },
      { label: "Carbohydrate", value: result.macros.carbohydrateG + " g/day", detail: result.macros.carbohydrateGPerKg + " g/kg" },
      { label: "Fat", value: result.macros.fatG + " g/day", detail: result.macros.fatGPerKg + " g/kg" },
      {
        label: "Protein per main feeding",
        value: result.macros.proteinPerMealMinG + "–" + result.macros.proteinPerMealMaxG + " g",
      },
    ],
    2,
    29,
  );
  section("How This Was Estimated");
  rows([
    { label: "Estimated RMR", value: formatNumber(result.calories.rmr) + " kcal" },
    { label: "Activity band", value: result.calories.activityBand },
    { label: "Activity multiplier", value: String(result.calories.multiplier) },
    { label: "Estimated TDEE", value: formatNumber(result.calories.estimatedTdee) + " kcal" },
    { label: "Goal adjustment", value: result.calories.goalAdjustmentLabel },
  ]);
  if (result.macros.carbohydrateWarning) {
    info(
      "The calculated energy target is too low for the selected protein and fat framework. Individual review is recommended.",
      "Individual review recommended",
    );
  }

  nextPage();
  title("Performance Nutrition", "Protein Quality & Reference Nutrition Targets");
  metricGrid(
    [
      {
        label: "Daily leucine exposure",
        value: result.aminoAcids.dailyLeucineMinG + "–" + result.aminoAcids.dailyLeucineMaxG + " g/day",
      },
      {
        label: "Leucine per main feeding",
        value: result.aminoAcids.leucinePerMealMinG + "–" + result.aminoAcids.leucinePerMealMaxG + " g",
      },
      { label: "Post-workout leucine", value: "~" + result.aminoAcids.postWorkoutLeucineG + " g" },
      {
        label: "Estimated BCAA exposure",
        value: result.aminoAcids.estimatedBcaaMinG + "–" + result.aminoAcids.estimatedBcaaMaxG + " g/day",
      },
    ],
    2,
    30,
  );
  info("Leucine is an important signal involved in stimulating muscle protein synthesis, but total high-quality protein and the full essential amino acid profile remain the priority.");
  section("Selected Reference Nutrition Targets");
  metricGrid(
    [
      { label: "Fibre", value: result.referenceTargets.fibreG + " g/day" },
      { label: "Calcium", value: formatNumber(result.referenceTargets.calciumMg) + " mg/day" },
      { label: "Iron", value: result.referenceTargets.ironMg + " mg/day" },
      { label: "Vitamin D", value: result.referenceTargets.vitaminDMcg + " mcg / " + result.referenceTargets.vitaminDIu + " IU/day" },
      { label: "Magnesium", value: result.referenceTargets.magnesiumMg + " mg/day" },
      { label: "Potassium", value: formatNumber(result.referenceTargets.potassiumMg) + " mg/day" },
    ],
    2,
    24,
  );
  info("These are reference nutrition targets, not personalised medical prescriptions.");
  const notes = [
    result.referenceTargets.plantBasedIronNote ? "Plant-based athletes may require additional attention to iron intake and bioavailability." : "",
    result.referenceTargets.veganB12Note ? "Vitamin B12 intake and status require specific attention in vegan diets." : "",
    "Blood testing and clinical assessment may be appropriate where deficiency is suspected. This report does not prescribe micronutrient supplementation.",
  ].filter(Boolean).join(" ");
  info(notes);

  nextPage();
  title("Recovery", "Your Post-Workout Starting Point");
  metricGrid(
    [
      { label: "Protein", value: result.postWorkout.proteinG + " g", detail: "Post-workout target" },
      { label: "Leucine", value: "~" + result.postWorkout.leucineG + " g", detail: "Post-workout target" },
      {
        label: result.postWorkout.carbohydrateLabel,
        value: result.postWorkout.carbohydrateMinG + "–" + result.postWorkout.carbohydrateMaxG + " g",
        detail: result.postWorkout.carbohydrateMinGPerKg.toFixed(1) + "–" + result.postWorkout.carbohydrateMaxGPerKg.toFixed(1) + " g/kg",
      },
    ],
    3,
    34,
  );
  info(
    result.postWorkout.carbohydrateLabel === "Rapid recovery target"
      ? "This higher-priority recovery target reflects the multiple-session/training-demand information you provided."
      : "This is a practical starting meal range. Total daily carbohydrate intake remains important.",
  );
  section("Hydration & Electrolytes");
  info(result.postWorkout.hydrationGuidance);

  nextPage();
  title("Your Context", "Your Starting Point — Not Your Final Plan");
  rows(
    [
      { label: "Goal", value: humanLabel(result.inputs.goal) },
      { label: "Body weight", value: result.inputs.weightKg + " kg" },
      { label: "Training sessions per week", value: String(result.inputs.sessionsPerWeek) },
      { label: "Typical training intensity", value: humanLabel(result.inputs.intensity) },
      { label: "Average session duration", value: humanLabel(result.inputs.sessionDuration) },
      { label: "Daily activity", value: humanLabel(result.inputs.dailyActivity) },
      { label: "Multiple-session frequency", value: humanLabel(result.inputs.multipleSessions) },
      { label: "Diet type", value: humanLabel(result.inputs.dietType) },
      { label: "Sweat profile", value: humanLabel(result.inputs.sweatProfile) },
      { label: "Training environment", value: humanLabel(result.inputs.trainingEnvironment) },
    ],
    2,
  );
  darkPanel(
    "Important Context",
    "These values are evidence-based starting estimates generated from the information you entered. Your actual requirements can change with training load, body composition, recovery, medical history, competition schedule, gastrointestinal tolerance and real-world response.",
  );
  info(
    "Use your starting targets alongside your training, nutrition and recovery data inside Elite Pocket PT. Visit www.elitepocketpt.com.",
    "Continue With Elite Pocket PT",
  );
  footer();
  return doc;
}

export function generatePerformanceNutritionPdfBytes(result: PerformanceNutritionAssessmentResult) {
  return new Uint8Array(buildPerformanceNutritionPdf(result).output("arraybuffer"));
}

export function downloadPerformanceNutritionPdf(result: PerformanceNutritionAssessmentResult) {
  buildPerformanceNutritionPdf(result).save(PDF_FILENAME);
}

export { PDF_FILENAME };
