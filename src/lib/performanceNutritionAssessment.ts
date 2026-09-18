export type PerformanceNutritionAssessmentResult = {
  inputs: {
    sex: string;
    age: number;
    heightCm: number;
    weightKg: number;
    goal: string;
    dailyActivity: string;
    sessionsPerWeek: number;
    sessionDuration: string;
    intensity: string;
    multipleSessions: string;
    dietType: string;
    sweatProfile: string;
    trainingEnvironment: string;
  };
  calories: {
    rmr: number;
    activityScore: number;
    activityBand: string;
    multiplier: number;
    estimatedTdee: number;
    goalAdjustment: number;
    goalAdjustmentLabel: string;
    suggestedCalories: number;
  };
  macros: {
    proteinG: number;
    proteinGPerKg: number;
    carbohydrateG: number;
    carbohydrateGPerKg: number;
    carbohydrateInterpretation: string;
    carbohydrateWarning: boolean;
    fatG: number;
    fatGPerKg: number;
    proteinPerMealMinG: number;
    proteinPerMealMaxG: number;
  };
  aminoAcids: {
    dailyLeucineMinG: number;
    dailyLeucineMaxG: number;
    leucinePerMealMinG: number;
    leucinePerMealMaxG: number;
    postWorkoutLeucineG: number;
    estimatedBcaaMinG: number;
    estimatedBcaaMaxG: number;
  };
  referenceTargets: {
    fibreG: number;
    calciumMg: number;
    ironMg: number;
    vitaminDMcg: number;
    vitaminDIu: number;
    magnesiumMg: number;
    potassiumMg: number;
    plantBasedIronNote: boolean;
    veganB12Note: boolean;
  };
  postWorkout: {
    proteinG: number;
    leucineG: number;
    carbohydrateLabel: string;
    carbohydrateMinGPerKg: number;
    carbohydrateMaxGPerKg: number;
    carbohydrateMinG: number;
    carbohydrateMaxG: number;
    hydrationGuidance: string;
  };
};
