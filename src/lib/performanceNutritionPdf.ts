import { jsPDF } from "jspdf";
import type { PerformanceNutritionAssessmentResult } from "./performanceNutritionAssessment";

const PDF_FILENAME = "elite-pocket-pt-performance-nutrition-starting-point.pdf";
const navy: [number, number, number] = [11, 18, 32];
const blue: [number, number, number] = [17, 87, 216];
const slate: [number, number, number] = [75, 85, 99];
const paleBlue: [number, number, number] = [234, 242, 255];
const paleSlate: [number, number, number] = [248, 250, 252];

function humanLabel(value: string) {
  const labels: Record<string, string> = {
    male: "Male",
    female: "Female",
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

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

export function downloadPerformanceNutritionPdf(result: PerformanceNutritionAssessmentResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - 20;
  let y = margin;

  function newPage() {
    doc.addPage();
    y = margin;
  }

  function ensureSpace(height: number) {
    if (y + height > contentBottom) {
      newPage();
    }
  }

  function addText(
    text: string,
    options: { size?: number; color?: [number, number, number]; bold?: boolean; width?: number; lineHeight?: number } = {},
  ) {
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size * 0.45;
    const width = options.width ?? contentWidth;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? slate));
    const lines = doc.splitTextToSize(text, width) as string[];

    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  function addSectionHeading(title: string, description?: string) {
    ensureSpace(description ? 23 : 13);
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 11, y);
    y += 6;
    addText(title, { size: 16, color: navy, bold: true, lineHeight: 7 });
    if (description) {
      y += 1;
      addText(description, { size: 9.5, color: slate, lineHeight: 4.8 });
    }
    y += 5;
  }

  function addCard(rows: Array<{ label: string; value: string }>, fillColor: [number, number, number] = paleSlate) {
    const rowHeight = 10;
    const height = 10 + rows.length * rowHeight;
    ensureSpace(height);
    doc.setFillColor(...fillColor);
    doc.roundedRect(margin, y, contentWidth, height, 3, 3, "F");
    let rowY = y + 7;
    for (const row of rows) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...slate);
      doc.text(row.label, margin + 5, rowY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...navy);
      doc.text(row.value, pageWidth - margin - 5, rowY, { align: "right" });
      rowY += rowHeight;
    }
    y += height + 5;
  }

  function addThreeColumnCards(
    items: Array<{ label: string; primary: string; secondary: string }>,
  ) {
    const gap = 4;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const cardHeight = 31;
    ensureSpace(cardHeight + 5);

    items.forEach((item, index) => {
      const x = margin + index * (cardWidth + gap);
      doc.setFillColor(...paleSlate);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...blue);
      doc.text(item.label.toUpperCase(), x + 4, y + 7);
      doc.setFontSize(15);
      doc.setTextColor(...navy);
      doc.text(item.primary, x + 4, y + 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...slate);
      doc.text(item.secondary, x + 4, y + 24);
    });
    y += cardHeight + 5;
  }

  function addPageTitle(title: string, eyebrow: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...blue);
    doc.text(eyebrow.toUpperCase(), margin, y);
    y += 7;
    addText(title, { size: 21, color: navy, bold: true, lineHeight: 8.5 });
    y += 4;
  }

  function addFooter() {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text("Elite Pocket PT • Performance Nutrition", margin, pageHeight - 8);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }

  doc.setProperties({
    title: "Elite Pocket PT Performance Nutrition Starting Point",
    subject: "Performance nutrition starting targets",
    author: "Elite Pocket PT",
  });

  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 55, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(155, 196, 255);
  doc.text("ELITE POCKET PT", margin, 17);
  doc.setFontSize(25);
  doc.setTextColor(255, 255, 255);
  doc.text("Performance Nutrition", margin, 30);
  doc.text("Starting Point", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(215, 228, 255);
  doc.text("Free Performance Nutrition Webinar", margin, 49);
  y = 68;
  addText("Evidence-based starting targets based on your training, goals and the information you provided.", {
    size: 11,
    color: slate,
    lineHeight: 5.5,
  });
  y += 5;
  addCard(
    [
      { label: "Prepared by", value: "Coach Mike Nicholson" },
      { label: "Qualification", value: "M.Sc Sports Nutrition" },
      {
        label: "Generated",
        value: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(),
        ),
      },
    ],
    paleBlue,
  );

  addSectionHeading("Executive Summary");
  ensureSpace(25);
  doc.setFillColor(...blue);
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text("SUGGESTED STARTING ENERGY", margin + 6, y + 8);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(`${formatNumber(result.calories.suggestedCalories)} kcal/day`, margin + 6, y + 18);
  y += 31;
  addThreeColumnCards([
    {
      label: "Protein",
      primary: `${result.macros.proteinG} g/day`,
      secondary: `${result.macros.proteinGPerKg} g/kg`,
    },
    {
      label: "Carbohydrate",
      primary: `${result.macros.carbohydrateG} g/day`,
      secondary: `${result.macros.carbohydrateGPerKg} g/kg`,
    },
    { label: "Fat", primary: `${result.macros.fatG} g/day`, secondary: `${result.macros.fatGPerKg} g/kg` },
  ]);
  addCard([
    {
      label: "Protein per main feeding",
      value: `${result.macros.proteinPerMealMinG}–${result.macros.proteinPerMealMaxG} g`,
    },
  ]);
  addSectionHeading("How this was estimated");
  addCard([
    { label: "Estimated RMR", value: `${formatNumber(result.calories.rmr)} kcal` },
    { label: "Activity band", value: result.calories.activityBand },
    { label: "Activity multiplier", value: String(result.calories.multiplier) },
    { label: "Estimated TDEE", value: `${formatNumber(result.calories.estimatedTdee)} kcal` },
    { label: "Goal adjustment", value: result.calories.goalAdjustmentLabel },
  ]);
  if (result.macros.carbohydrateWarning) {
    ensureSpace(23);
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("INDIVIDUAL REVIEW RECOMMENDED", margin + 5, y + 7);
    y += 12;
    addText("The calculated energy target is too low for the selected protein and fat framework. Individual review is recommended.", {
      size: 9,
      color: [146, 64, 14],
      lineHeight: 4.2,
    });
    y += 5;
  }

  newPage();
  addPageTitle("Protein Quality & Amino Acid Targets", "Performance Nutrition");
  addThreeColumnCards([
    {
      label: "Daily leucine exposure",
      primary: `${result.aminoAcids.dailyLeucineMinG}–${result.aminoAcids.dailyLeucineMaxG} g/day`,
      secondary: "Suggested daily exposure",
    },
    {
      label: "Leucine per feeding",
      primary: `${result.aminoAcids.leucinePerMealMinG}–${result.aminoAcids.leucinePerMealMaxG} g`,
      secondary: "Per main feeding",
    },
    {
      label: "Post-workout leucine",
      primary: `~${result.aminoAcids.postWorkoutLeucineG} g`,
      secondary: "Starting point",
    },
  ]);
  addCard([
    {
      label: "Estimated BCAA exposure from a high-quality protein intake",
      value: `${result.aminoAcids.estimatedBcaaMinG}–${result.aminoAcids.estimatedBcaaMaxG} g/day`,
    },
    { label: "Your protein starting target", value: `${result.macros.proteinG} g/day` },
    {
      label: "Your main-feeding target",
      value: `${result.macros.proteinPerMealMinG}–${result.macros.proteinPerMealMaxG} g protein`,
    },
  ], paleBlue);
  addSectionHeading("Why protein quality matters");
  addText(
    "Leucine is an important signal involved in stimulating muscle protein synthesis, but total high-quality protein and the full essential amino acid profile remain the priority.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );
  y += 4;
  addText(
    "Adequate total high-quality protein remains the priority; isolated BCAA supplementation is not usually necessary when protein intake is already sufficient.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );

  newPage();
  addPageTitle("Selected Reference Nutrition Targets", "Reference targets");
  addText(
    "These are reference nutrition targets, not personalised medical prescriptions.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );
  y += 5;
  addCard([
    { label: "Fibre", value: `${result.referenceTargets.fibreG} g/day` },
    { label: "Calcium", value: `${formatNumber(result.referenceTargets.calciumMg)} mg/day` },
    { label: "Iron", value: `${result.referenceTargets.ironMg} mg/day` },
    {
      label: "Vitamin D",
      value: `${result.referenceTargets.vitaminDMcg} mcg / ${result.referenceTargets.vitaminDIu} IU/day`,
    },
    { label: "Magnesium", value: `${result.referenceTargets.magnesiumMg} mg/day` },
    { label: "Potassium", value: `${formatNumber(result.referenceTargets.potassiumMg)} mg/day` },
  ]);
  if (result.referenceTargets.plantBasedIronNote) {
    addText("Plant-based athletes may require additional attention to iron intake and bioavailability.", {
      size: 10,
      color: slate,
      lineHeight: 5.2,
    });
    y += 3;
  }
  if (result.referenceTargets.veganB12Note) {
    addText("Vitamin B12 intake and status require specific attention in vegan diets.", {
      size: 10,
      color: slate,
      lineHeight: 5.2,
    });
    y += 3;
  }
  addSectionHeading("Important note");
  addText(
    "Blood testing and clinical assessment may be appropriate where deficiency is suspected. This report does not prescribe micronutrient supplementation.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );

  newPage();
  addPageTitle("Your Post-Workout Starting Point", "Recovery");
  addThreeColumnCards([
    { label: "Protein", primary: `${result.postWorkout.proteinG} g`, secondary: "Post-workout" },
    { label: "Leucine", primary: `~${result.postWorkout.leucineG} g`, secondary: "Post-workout" },
    {
      label: result.postWorkout.carbohydrateLabel,
      primary: `${result.postWorkout.carbohydrateMinG}–${result.postWorkout.carbohydrateMaxG} g`,
      secondary: `${result.postWorkout.carbohydrateMinGPerKg.toFixed(1)}–${result.postWorkout.carbohydrateMaxGPerKg.toFixed(1)} g/kg`,
    },
  ]);
  addText(
    result.postWorkout.carbohydrateLabel === "Rapid recovery target"
      ? "This higher-priority recovery target reflects the multiple-session/training-demand information you provided."
      : "This is a practical starting meal range. Total daily carbohydrate intake remains important.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );
  y += 6;
  addSectionHeading("Hydration & sodium");
  addText(result.postWorkout.hydrationGuidance, { size: 10, color: slate, lineHeight: 5.2 });

  newPage();
  addPageTitle("Your Starting Point — Not Your Final Plan", "Your context");
  addCard([
    { label: "Goal", value: humanLabel(result.inputs.goal) },
    { label: "Body weight", value: `${result.inputs.weightKg} kg` },
    { label: "Training sessions per week", value: String(result.inputs.sessionsPerWeek) },
    { label: "Typical training intensity", value: humanLabel(result.inputs.intensity) },
    { label: "Average session duration", value: humanLabel(result.inputs.sessionDuration) },
    { label: "Daily activity", value: humanLabel(result.inputs.dailyActivity) },
    { label: "Multiple-session frequency", value: humanLabel(result.inputs.multipleSessions) },
    { label: "Diet type", value: humanLabel(result.inputs.dietType) },
    { label: "Sweat profile", value: humanLabel(result.inputs.sweatProfile) },
    { label: "Training environment", value: humanLabel(result.inputs.trainingEnvironment) },
  ]);
  addText(
    "These values are evidence-based starting estimates generated from the information you entered. Your actual requirements can change with training load, body composition, recovery, medical history, competition schedule, gastrointestinal tolerance and real-world response.",
    { size: 10, color: slate, lineHeight: 5.2 },
  );
  y += 6;
  ensureSpace(59);
  doc.setFillColor(...navy);
  doc.roundedRect(margin, y, contentWidth, 58, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Want this built properly around you?", margin + 6, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(215, 228, 255);
  const ctaLines = doc.splitTextToSize(
    "A complete performance nutrition plan should be adjusted to your training, goals, food preferences, recovery and actual progress.",
    contentWidth - 12,
  ) as string[];
  doc.text(ctaLines, margin + 6, y + 19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Coach Mike Nicholson", margin + 6, y + 37);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(215, 228, 255);
  doc.text("Performance Dietitian • M.Sc Sports Nutrition", margin + 6, y + 43);
  doc.text("hello@elitepocketpt.com • elitepocketpt.com", margin + 6, y + 50);

  addFooter();
  doc.save(PDF_FILENAME);
}

export { PDF_FILENAME };
