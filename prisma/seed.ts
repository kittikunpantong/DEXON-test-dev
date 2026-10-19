import { dateToDb, prisma } from "../src/lib/db";
import { demoAccount } from "../src/lib/demo-account";
import { recalculateLine } from "../src/lib/line-data";
import { hashPassword } from "../src/lib/password";

type LineSeed = {
  lineNumber: string;
  location: string;
  fromLocation: string;
  toLocation: string;
  drawingNumber: string;
  service: string;
  material: string;
  inserviceDate: string;
  pipeSize: string;
  originalThickness: string;
  stress: string;
  jointEfficiency: string;
  ca: string;
  designLife: number;
  designPressure: string;
  operatingPressure: string;
  designTemperature: string;
  operatingTemperature: string;
  cmls: { cmlNumber: number; cmlDescription: string }[];
};

const readings = [
  { tpNumber: 1, tpDescription: 0, first: "6.5", second: "6.78" },
  { tpNumber: 2, tpDescription: 90, first: "6.99", second: "6.87" },
  { tpNumber: 3, tpDescription: 180, first: "6.63", second: "6.54" },
  { tpNumber: 4, tpDescription: 270, first: "6.77", second: "6.43" },
];

const pl = {
  material: "Duplex Stainless Steel",
  inserviceDate: "2020-01-01",
  pipeSize: "6",
  originalThickness: "7.1",
  stress: "20000",
  jointEfficiency: "1",
  ca: "3",
  designLife: 25,
  designPressure: "1015",
  operatingPressure: "327",
  designTemperature: "140",
  operatingTemperature: "45",
  fromLocation: "BLACK STARTCOOLED WELL FLUID FROM MDPP",
  toLocation: "TEST SEPARATOR,V-0111",
  drawingNumber: "MDA-D-B-26001-1-0-Rev00-2011",
  service: "PL",
};

const gc = {
  material: "Duplex Stainless Steel",
  inserviceDate: "2020-01-01",
  stress: "20000",
  jointEfficiency: "1",
  ca: "3",
  designLife: 25,
  designPressure: "1015",
  operatingPressure: "623",
  designTemperature: "120",
  operatingTemperature: "73.27",
  fromLocation: "BLACK STARTCOOLED WELL FLUID FROM MDPP",
  toLocation: "TEST SEPARATOR,V-0111",
  drawingNumber: "B17-3-AMA-PR-005-0003",
  service: "GC",
};

const lines: LineSeed[] = [
  {
    lineNumber: "6-PL-J4N-01007",
    location: "Dacon A",
    ...pl,
    cmls: [
      { cmlNumber: 1, cmlDescription: "Pipe" },
      { cmlNumber: 2, cmlDescription: "Elbow i" },
      { cmlNumber: 3, cmlDescription: "Elbow ii" },
      { cmlNumber: 4, cmlDescription: "Pipe" },
      { cmlNumber: 5, cmlDescription: "Pipe" },
    ],
  },
  {
    lineNumber: "6-PL-J4N-01110",
    location: "Dacon B",
    ...pl,
    cmls: [
      { cmlNumber: 1, cmlDescription: "Pipe" },
      { cmlNumber: 2, cmlDescription: "Tee i" },
      { cmlNumber: 3, cmlDescription: "Tee iii" },
      { cmlNumber: 4, cmlDescription: "Pipe" },
    ],
  },
  {
    lineNumber: "3-GC-J4N-10017",
    location: "Dacon C",
    ...gc,
    pipeSize: "3",
    originalThickness: "5.48",
    cmls: [],
  },
  {
    lineNumber: "3-GC-J4N-10018",
    location: "Dacon A",
    ...gc,
    pipeSize: "3",
    originalThickness: "5.48",
    cmls: [],
  },
  {
    lineNumber: "2-GC-J4N-10034",
    location: "Dacon B",
    ...gc,
    pipeSize: "2",
    originalThickness: "3.91",
    cmls: [],
  },
];

async function main() {
  const passwordHash = await hashPassword(demoAccount.password);
  await prisma.user.upsert({
    where: { email: demoAccount.email },
    update: { name: demoAccount.name, passwordHash },
    create: {
      email: demoAccount.email,
      name: demoAccount.name,
      passwordHash,
    },
  });

  await prisma.thickness.deleteMany();
  await prisma.testPoint.deleteMany();
  await prisma.cml.deleteMany();
  await prisma.info.deleteMany();

  for (const line of lines) {
    await prisma.info.create({
      data: {
        lineNumber: line.lineNumber,
        location: line.location,
        fromLocation: line.fromLocation,
        toLocation: line.toLocation,
        drawingNumber: line.drawingNumber,
        service: line.service,
        material: line.material,
        inserviceDate: dateToDb(line.inserviceDate),
        pipeSize: line.pipeSize,
        originalThickness: line.originalThickness,
        stress: line.stress,
        jointEfficiency: line.jointEfficiency,
        ca: line.ca,
        designLife: line.designLife,
        designPressure: line.designPressure,
        operatingPressure: line.operatingPressure,
        designTemperature: line.designTemperature,
        operatingTemperature: line.operatingTemperature,
        cmls: {
          create: line.cmls.map((cml) => ({
            cmlNumber: cml.cmlNumber,
            cmlDescription: cml.cmlDescription,
            testPoints: {
              create: readings.map((point) => ({
                tpNumber: point.tpNumber,
                tpDescription: point.tpDescription,
                readings: {
                  create: [
                    { inspectionDate: dateToDb("2021-01-01"), actualThickness: point.first },
                    { inspectionDate: dateToDb("2022-01-01"), actualThickness: point.second },
                  ],
                },
              })),
            },
          })),
        },
      },
    });
  }

  for (const line of lines) {
    await recalculateLine(line.lineNumber);
  }

  const [info, cml, testPoint, thickness, user] = await Promise.all([
    prisma.info.count(),
    prisma.cml.count(),
    prisma.testPoint.count(),
    prisma.thickness.count(),
    prisma.user.count(),
  ]);
  console.log(`loaded info=${info} cml=${cml} test_point=${testPoint} thickness=${thickness} user=${user}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
