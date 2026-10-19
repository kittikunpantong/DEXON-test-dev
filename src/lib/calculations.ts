import Decimal from "decimal.js";

import { addDays, yearsBetween } from "./dates";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type LifeStatus = "empty" | "unlimited" | "finite";

export type ThicknessInput = {
  inspectionDate: string;
  actualThickness: string;
};

export type TestPointInput = {
  tpNumber: number;
  tpDescription: number;
  note: string | null;
  readings: ThicknessInput[];
};

export type CmlInput = {
  cmlNumber: number;
  cmlDescription: string;
  testPoints: TestPointInput[];
};

export type LineInput = {
  pipeSize: string;
  originalThickness: string | null;
  stress: string;
  jointEfficiency: string;
  designPressure: string;
  inserviceDate: string | null;
  cmls: CmlInput[];
};

export type ComputedThickness = ThicknessInput & {
  intervalCorrosionRate: string | null;
};

export type ComputedTestPoint = {
  tpNumber: number;
  tpDescription: number;
  note: string | null;
  readings: ComputedThickness[];
  shortTermRate: string | null;
  longTermRate: string | null;
  inserviceRate: string | null;
  corrosionRate: string | null;
  remainingLife: string | null;
  lifeStatus: LifeStatus;
  retirementDate: string | null;
  governsRate: boolean;
  governsLife: boolean;
};

export type ComputedCml = {
  cmlNumber: number;
  cmlDescription: string;
  actualOutsideDiameter: string | null;
  designThickness: string | null;
  structuralThickness: string | null;
  requiredThickness: string | null;
  corrosionRate: string | null;
  remainingLife: string | null;
  lifeStatus: LifeStatus;
  retirementDate: string | null;
  testPoints: ComputedTestPoint[];
  governsRate: boolean;
  governsLife: boolean;
};

export type ComputedLine = {
  actualOutsideDiameter: string | null;
  designThickness: string | null;
  structuralThickness: string | null;
  requiredThickness: string | null;
  corrosionRate: string | null;
  remainingLife: string | null;
  lifeStatus: LifeStatus;
  retirementDate: string | null;
  cmls: ComputedCml[];
};

/** NPS (inch) → actual outside diameter (mm), from the specification table. */
const OUTSIDE_DIAMETER_MM: Record<string, string> = {
  "0.125": "10.3",
  "0.250": "13.7",
  "0.375": "17.1",
  "0.500": "21.3",
  "0.750": "26.7",
  "1.000": "33.4",
  "1.250": "42.2",
  "1.500": "48.3",
  "2.000": "60.3",
  "2.500": "73",
  "3.000": "88.9",
  "3.500": "101.6",
  "4.000": "114.3",
  "5.000": "141.3",
  "6.000": "168.3",
  "8.000": "219.1",
  "10.000": "273",
  "12.000": "323.8",
  "14.000": "355.6",
  "16.000": "406.4",
  "18.000": "457",
};

function dec(value: string): Decimal {
  return new Decimal(value);
}

function round(value: Decimal, places: number): string {
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toFixed(places);
}

export function lookupOutsideDiameter(pipeSize: string): string | null {
  const size = dec(pipeSize);
  if (size.lte(0)) return null;
  return OUTSIDE_DIAMETER_MM[size.toFixed(3)] ?? null;
}

export function calculateDesignThickness(input: {
  designPressure: string;
  outsideDiameter: string | null;
  stress: string;
  jointEfficiency: string;
}): string | null {
  if (!input.outsideDiameter) return null;
  const pressure = dec(input.designPressure);
  const diameter = dec(input.outsideDiameter);
  const stress = dec(input.stress);
  const efficiency = dec(input.jointEfficiency);
  const denominator = stress.mul(2).mul(efficiency).plus(pressure.mul("0.8"));
  if (denominator.isZero()) return null;
  return round(pressure.mul(diameter).div(denominator), 3);
}

export function calculateStructuralThickness(pipeSize: string): string | null {
  const size = dec(pipeSize);
  if (size.lte(0)) return null;
  if (size.lte(2)) return "1.800";
  if (size.eq(3)) return "2.000";
  if (size.eq(4)) return "2.300";
  if (size.gte(6) && size.lte(18)) return "2.800";
  if (size.gte(20)) return "3.100";
  return null;
}

export function calculateRequiredThickness(
  designThickness: string | null,
  structuralThickness: string | null,
): string | null {
  if (designThickness && structuralThickness) {
    return Decimal.max(dec(designThickness), dec(structuralThickness)).toFixed(3);
  }
  return designThickness ?? structuralThickness;
}

function rateOrNull(earlierThickness: string, laterThickness: string, earlierDate: string, laterDate: string): Decimal | null {
  const years = yearsBetween(earlierDate, laterDate);
  if (years.lte(0)) return null;
  return dec(earlierThickness).minus(laterThickness).div(years);
}

function summarizeRate(rates: Array<string | null>): string | null {
  const present = rates.filter((rate): rate is string => rate !== null).map((rate) => dec(rate));
  if (present.length === 0) return null;
  return Decimal.max(...present).toFixed(4);
}

function summarizeLife(items: Array<{ lifeStatus: LifeStatus; remainingLife: string | null; retirementDate: string | null }>): {
  lifeStatus: LifeStatus;
  remainingLife: string | null;
  retirementDate: string | null;
} {
  const finite = items.filter((item) => item.lifeStatus === "finite" && item.remainingLife !== null);
  if (finite.length > 0) {
    const shortest = finite.reduce((best, item) => {
      const life = dec(item.remainingLife!);
      const bestLife = dec(best.remainingLife!);
      if (life.lt(bestLife)) return item;
      if (life.eq(bestLife) && item.retirementDate && (!best.retirementDate || item.retirementDate < best.retirementDate)) {
        return item;
      }
      return best;
    });
    return {
      lifeStatus: "finite",
      remainingLife: dec(shortest.remainingLife!).toFixed(2),
      retirementDate: shortest.retirementDate,
    };
  }
  if (items.some((item) => item.lifeStatus === "unlimited")) {
    return { lifeStatus: "unlimited", remainingLife: null, retirementDate: null };
  }
  return { lifeStatus: "empty", remainingLife: null, retirementDate: null };
}

function retirementDate(latestDate: string, remainingLife: Decimal): string | null {
  if (remainingLife.lte(0)) return null;
  const days = Number(remainingLife.mul("365.25").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0));
  return addDays(latestDate, days);
}

function computeTestPoint(
  point: TestPointInput,
  requiredThickness: string | null,
  originalThickness: string | null,
  inserviceDate: string | null,
): Omit<ComputedTestPoint, "governsRate" | "governsLife"> {
  const readings = [...point.readings].sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate));
  const computedReadings: ComputedThickness[] = readings.map((reading, index) => {
    if (index === 0) return { ...reading, intervalCorrosionRate: null };
    const previous = readings[index - 1];
    const interval = rateOrNull(
      previous.actualThickness,
      reading.actualThickness,
      previous.inspectionDate,
      reading.inspectionDate,
    );
    return {
      ...reading,
      intervalCorrosionRate: interval ? round(interval, 4) : null,
    };
  });

  const latest = readings.at(-1) ?? null;
  let shortTerm: Decimal | null = null;
  let longTerm: Decimal | null = null;
  if (readings.length >= 2 && latest) {
    const previous = readings[readings.length - 2];
    const first = readings[0];
    shortTerm = rateOrNull(previous.actualThickness, latest.actualThickness, previous.inspectionDate, latest.inspectionDate);
    longTerm = rateOrNull(first.actualThickness, latest.actualThickness, first.inspectionDate, latest.inspectionDate);
  }

  let inservice: Decimal | null = null;
  if (latest && originalThickness && inserviceDate) {
    inservice = rateOrNull(originalThickness, latest.actualThickness, inserviceDate, latest.inspectionDate);
  }

  let governing: Decimal | null = null;
  if (readings.length >= 2) {
    const comparable = [shortTerm, longTerm].filter((rate): rate is Decimal => rate !== null);
    if (comparable.length > 0) governing = Decimal.max(...comparable);
  } else if (readings.length === 1) {
    governing = inservice;
  }

  let lifeStatus: LifeStatus = "empty";
  let remainingLife: string | null = null;
  let remainingExact: Decimal | null = null;
  if (latest && requiredThickness) {
    const latestThickness = dec(latest.actualThickness);
    const required = dec(requiredThickness);
    if (latestThickness.lte(required)) {
      lifeStatus = "finite";
      remainingLife = "0.00";
      remainingExact = new Decimal(0);
    } else if (!governing || governing.lte(0)) {
      lifeStatus = "unlimited";
    } else {
      lifeStatus = "finite";
      remainingExact = latestThickness.minus(required).div(governing);
      remainingLife = round(remainingExact, 2);
    }
  }

  return {
    tpNumber: point.tpNumber,
    tpDescription: point.tpDescription,
    note: point.note,
    readings: computedReadings,
    shortTermRate: shortTerm ? round(shortTerm, 4) : null,
    longTermRate: longTerm ? round(longTerm, 4) : null,
    inserviceRate: inservice ? round(inservice, 4) : null,
    corrosionRate: governing ? round(governing, 4) : null,
    remainingLife,
    lifeStatus,
    retirementDate:
      lifeStatus === "finite" && remainingExact && latest ? retirementDate(latest.inspectionDate, remainingExact) : null,
  };
}

export function computeLine(input: LineInput): ComputedLine {
  const outsideDiameter = lookupOutsideDiameter(input.pipeSize);
  const designThickness = calculateDesignThickness({
    designPressure: input.designPressure,
    outsideDiameter,
    stress: input.stress,
    jointEfficiency: input.jointEfficiency,
  });
  const structuralThickness = calculateStructuralThickness(input.pipeSize);
  const requiredThickness = calculateRequiredThickness(designThickness, structuralThickness);

  const cmls: ComputedCml[] = input.cmls.map((cml) => {
    const testPoints = cml.testPoints.map((point) =>
      computeTestPoint(point, requiredThickness, input.originalThickness, input.inserviceDate),
    );
    const life = summarizeLife(testPoints);
    const corrosionRate = summarizeRate(testPoints.map((point) => point.corrosionRate));
    const ratedCount = testPoints.filter((point) => point.corrosionRate !== null).length;
    const finiteCount = testPoints.filter((point) => point.lifeStatus === "finite").length;
    return {
      cmlNumber: cml.cmlNumber,
      cmlDescription: cml.cmlDescription,
      actualOutsideDiameter: outsideDiameter ? dec(outsideDiameter).toFixed(3) : null,
      designThickness,
      structuralThickness,
      requiredThickness,
      corrosionRate,
      remainingLife: life.remainingLife,
      lifeStatus: life.lifeStatus,
      retirementDate: life.retirementDate,
      testPoints: testPoints.map((point) => ({
        ...point,
        governsRate: ratedCount > 1 && corrosionRate !== null && point.corrosionRate === corrosionRate,
        governsLife:
          finiteCount > 1 &&
          life.lifeStatus === "finite" &&
          life.remainingLife !== null &&
          point.lifeStatus === "finite" &&
          point.remainingLife === life.remainingLife,
      })),
      governsRate: false,
      governsLife: false,
    };
  });

  const life = summarizeLife(cmls);
  const corrosionRate = summarizeRate(cmls.map((cml) => cml.corrosionRate));
  const ratedCount = cmls.filter((cml) => cml.corrosionRate !== null).length;
  const finiteCount = cmls.filter((cml) => cml.lifeStatus === "finite").length;

  return {
    actualOutsideDiameter: outsideDiameter ? dec(outsideDiameter).toFixed(3) : null,
    designThickness,
    structuralThickness,
    requiredThickness,
    corrosionRate,
    remainingLife: life.remainingLife,
    lifeStatus: life.lifeStatus,
    retirementDate: life.retirementDate,
    cmls: cmls.map((cml) => ({
      ...cml,
      governsRate: ratedCount > 1 && corrosionRate !== null && cml.corrosionRate === corrosionRate,
      governsLife:
        finiteCount > 1 &&
        life.lifeStatus === "finite" &&
        life.remainingLife !== null &&
        cml.lifeStatus === "finite" &&
        cml.remainingLife === life.remainingLife,
    })),
  };
}
