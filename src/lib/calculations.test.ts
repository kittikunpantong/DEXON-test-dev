import { describe, expect, it } from "vitest";

import {
  calculateDesignThickness,
  calculateRequiredThickness,
  calculateStructuralThickness,
  computeLine,
  lookupOutsideDiameter,
  type LineInput,
} from "./calculations";
import { formatLife } from "./format";

const SIX_INCH: LineInput = {
  pipeSize: "6",
  originalThickness: "7.1",
  stress: "137.895",
  jointEfficiency: "1",
  designPressure: "6.999",
  inserviceDate: "2020-01-01",
  cmls: [
    {
      cmlNumber: 1,
      cmlDescription: "Pipe",
      testPoints: [
        reading(1, 0, "6.50", "6.78"),
        reading(2, 90, "6.99", "6.87"),
        reading(3, 180, "6.63", "6.54"),
        reading(4, 270, "6.77", "6.43"),
      ],
    },
  ],
};

function reading(tpNumber: number, angle: number, first: string, second: string) {
  return {
    tpNumber,
    tpDescription: angle,
    note: null,
    readings: [
      { inspectionDate: "2021-01-01", actualThickness: first },
      { inspectionDate: "2022-01-01", actualThickness: second },
    ],
  };
}

describe("geometry", () => {
  it("maps every published outside diameter", () => {
    expect(lookupOutsideDiameter("0.125")).toBe("10.3");
    expect(lookupOutsideDiameter("6")).toBe("168.3");
    expect(lookupOutsideDiameter("10")).toBe("273");
    expect(lookupOutsideDiameter("2.5")).toBe("73");
    expect(lookupOutsideDiameter("18")).toBe("457");
    expect(lookupOutsideDiameter("20")).toBeNull();
    expect(lookupOutsideDiameter("7")).toBeNull();
  });

  it("leaves structural thickness blank where the table has no rule", () => {
    expect(calculateStructuralThickness("2")).toBe("1.800");
    expect(calculateStructuralThickness("1.5")).toBe("1.800");
    expect(calculateStructuralThickness("3")).toBe("2.000");
    expect(calculateStructuralThickness("4")).toBe("2.300");
    expect(calculateStructuralThickness("6")).toBe("2.800");
    expect(calculateStructuralThickness("18")).toBe("2.800");
    expect(calculateStructuralThickness("20")).toBe("3.100");
    expect(calculateStructuralThickness("24")).toBe("3.100");
    expect(calculateStructuralThickness("2.5")).toBeNull();
    expect(calculateStructuralThickness("3.5")).toBeNull();
    expect(calculateStructuralThickness("5")).toBeNull();
    expect(calculateStructuralThickness("19")).toBeNull();
  });

  it("uses the side that exists when the other thickness is blank", () => {
    expect(calculateRequiredThickness(null, "2.800")).toBe("2.800");
    expect(calculateRequiredThickness("4.186", null)).toBe("4.186");
    expect(calculateRequiredThickness(null, null)).toBeNull();
    expect(calculateRequiredThickness("1.500", "1.800")).toBe("1.800");
  });

  it("returns blank design thickness when diameter or the denominator is missing", () => {
    expect(
      calculateDesignThickness({
        designPressure: "10",
        outsideDiameter: null,
        stress: "100",
        jointEfficiency: "1",
      }),
    ).toBeNull();
    expect(
      calculateDesignThickness({
        designPressure: "0",
        outsideDiameter: "168.3",
        stress: "0",
        jointEfficiency: "1",
      }),
    ).toBeNull();
  });
});

describe("published 6-inch example", () => {
  const result = computeLine(SIX_INCH);
  const points = result.cmls[0].testPoints;

  it("matches the published rates, lives, and retirement dates", () => {
    const byAngle = Object.fromEntries(points.map((point) => [point.tpDescription, point]));

    expect(byAngle[0].corrosionRate).toBe("-0.2802");
    expect(byAngle[0].lifeStatus).toBe("unlimited");
    expect(byAngle[0].retirementDate).toBeNull();
    expect(byAngle[0].readings[0].intervalCorrosionRate).toBeNull();
    expect(byAngle[0].readings[1].intervalCorrosionRate).toBe("-0.2802");

    expect(byAngle[90].corrosionRate).toBe("0.1201");
    expect(byAngle[90].remainingLife).toBe("22.35");
    expect(formatLife(byAngle[90].lifeStatus, byAngle[90].remainingLife)).toBe("22.4");
    expect(byAngle[90].retirementDate).toBe("2044-05-09");

    expect(byAngle[180].corrosionRate).toBe("0.0901");
    expect(byAngle[180].remainingLife).toBe("26.14");
    expect(formatLife(byAngle[180].lifeStatus, byAngle[180].remainingLife)).toBe("26.1");
    // 26.137653 × 365.25 = 9546.78 days, which lands on 21 Feb 2048.
    // The specification text says 22 Feb; the same rounding reproduces 9 May 2044 and 6 Aug 2028.
    expect(byAngle[180].retirementDate).toBe("2048-02-21");

    expect(byAngle[270].corrosionRate).toBe("0.3402");
    expect(byAngle[270].shortTermRate).toBe("0.3402");
    expect(byAngle[270].longTermRate).toBe("0.3402");
    expect(byAngle[270].inserviceRate).toBe("0.3348");
    expect(byAngle[270].remainingLife).toBe("6.60");
    expect(formatLife(byAngle[270].lifeStatus, byAngle[270].remainingLife)).toBe("6.6");
    expect(byAngle[270].retirementDate).toBe("2028-08-06");
    expect(byAngle[270].governsRate).toBe(true);
    expect(byAngle[270].governsLife).toBe(true);
  });

  it("rolls the worst angle up to the CML and the line", () => {
    expect(result.cmls[0].corrosionRate).toBe("0.3402");
    expect(result.cmls[0].remainingLife).toBe("6.60");
    expect(result.cmls[0].lifeStatus).toBe("finite");
    expect(result.corrosionRate).toBe("0.3402");
    expect(result.remainingLife).toBe("6.60");
    expect(formatLife(result.lifeStatus, result.remainingLife)).toBe("6.6");
    expect(result.retirementDate).toBe("2028-08-06");
  });
});

describe("rate selection", () => {
  it("uses the in-service rate when a point has only one reading", () => {
    const result = computeLine({
      ...SIX_INCH,
      cmls: [
        {
          cmlNumber: 1,
          cmlDescription: "Pipe",
          testPoints: [
            {
              tpNumber: 1,
              tpDescription: 270,
              note: null,
              readings: [{ inspectionDate: "2022-01-01", actualThickness: "6.43" }],
            },
          ],
        },
      ],
    });
    const point = result.cmls[0].testPoints[0];
    expect(point.shortTermRate).toBeNull();
    expect(point.longTermRate).toBeNull();
    expect(point.inserviceRate).toBe("0.3348");
    expect(point.corrosionRate).toBe("0.3348");
  });

  it("keeps long-term and short-term apart once there are three readings", () => {
    const result = computeLine({
      ...SIX_INCH,
      cmls: [
        {
          cmlNumber: 1,
          cmlDescription: "Pipe",
          testPoints: [
            {
              tpNumber: 1,
              tpDescription: 90,
              note: null,
              readings: [
                { inspectionDate: "2020-06-01", actualThickness: "7.00" },
                { inspectionDate: "2021-01-01", actualThickness: "6.50" },
                { inspectionDate: "2022-01-01", actualThickness: "6.40" },
              ],
            },
          ],
        },
      ],
    });
    const point = result.cmls[0].testPoints[0];
    expect(point.shortTermRate).not.toBe(point.longTermRate);
    expect(point.corrosionRate).toBe(
      Number(point.shortTermRate) > Number(point.longTermRate) ? point.shortTermRate : point.longTermRate,
    );
  });

  it("returns zero life at or below required thickness, before looking at the rate", () => {
    const result = computeLine({
      ...SIX_INCH,
      cmls: [
        {
          cmlNumber: 1,
          cmlDescription: "Pipe",
          testPoints: [reading(1, 0, "4.186", "4.100")],
        },
      ],
    });
    expect(result.cmls[0].testPoints[0].lifeStatus).toBe("finite");
    expect(result.cmls[0].testPoints[0].remainingLife).toBe("0.00");
    expect(result.cmls[0].testPoints[0].retirementDate).toBeNull();
  });

  it("leaves life blank until a required thickness exists", () => {
    const result = computeLine({
      ...SIX_INCH,
      pipeSize: "2.5",
      designPressure: "0",
      stress: "0",
      cmls: [
        {
          cmlNumber: 1,
          cmlDescription: "Pipe",
          testPoints: [reading(1, 0, "6.50", "6.40")],
        },
      ],
    });
    expect(result.requiredThickness).toBeNull();
    expect(result.cmls[0].testPoints[0].lifeStatus).toBe("empty");
    expect(result.cmls[0].lifeStatus).toBe("empty");
    expect(result.lifeStatus).toBe("empty");
  });
});

describe("published design thicknesses", () => {
  it("can be reproduced from one pressure, stress, and efficiency", () => {
    const shared = { stress: "137.895", jointEfficiency: "1.000" };
    expect(
      calculateDesignThickness({ ...shared, designPressure: "6.999", outsideDiameter: "168.3" }),
    ).toBe("4.186");
    expect(
      calculateDesignThickness({ ...shared, designPressure: "6.999", outsideDiameter: "88.9" }),
    ).toBe("2.211");
    expect(
      calculateDesignThickness({ ...shared, designPressure: "6.999", outsideDiameter: "60.3" }),
    ).toBe("1.500");

    const six = computeLine({ ...SIX_INCH, ...{ stress: "137.895", jointEfficiency: "1", designPressure: "6.999" } });
    expect(six.actualOutsideDiameter).toBe("168.300");
    expect(six.designThickness).toBe("4.186");
    expect(six.structuralThickness).toBe("2.800");
    expect(six.requiredThickness).toBe("4.186");

    const three = computeLine({
      pipeSize: "3",
      originalThickness: null,
      stress: "137.895",
      jointEfficiency: "1",
      designPressure: "6.999",
      inserviceDate: null,
      cmls: [],
    });
    expect(three.designThickness).toBe("2.211");
    expect(three.structuralThickness).toBe("2.000");
    expect(three.requiredThickness).toBe("2.211");

    const two = computeLine({
      pipeSize: "2",
      originalThickness: null,
      stress: "137.895",
      jointEfficiency: "1",
      designPressure: "6.999",
      inserviceDate: null,
      cmls: [],
    });
    expect(two.actualOutsideDiameter).toBe("60.300");
    expect(two.designThickness).toBe("1.500");
    expect(two.structuralThickness).toBe("1.800");
    expect(two.requiredThickness).toBe("1.800");
  });
});
