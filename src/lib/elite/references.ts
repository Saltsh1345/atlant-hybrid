import type { EliteReference, ProDatasetSource } from "@/lib/elite/types";

/**
 * Biomechanical elite templates — aligned with Olympic / pro boxing & tennis literature.
 * Replace/extend via tools/elite when ingesting pro clip statistics.
 */
export const ELITE_REFERENCES: EliteReference[] = [
  {
    id: "jab",
    sport: "boxing",
    labelRu: "Джеб (эталон)",
    sources: ["NealBeans/BoxingDataset", "BoxingVI", "BoxMAC"],
    leadSide: "left",
    features: {
      elbowAngle: { min: 155, max: 178, ideal: 168, weight: 0.28 },
      torsoRotation: { min: 8, max: 28, ideal: 18, weight: 0.22 },
      wristVelocityMs: { min: 2.8, max: 6.5, ideal: 4.2, weight: 0.35 },
      spineFlexion: { min: 4, max: 18, ideal: 10, weight: 0.15 },
    },
    coachCues: [
      "Выпрямите руку до конца без зависания локтя",
      "Поворот плеча минимальный — работает передняя рука",
      "Мгновенный возврат в стойку",
    ],
  },
  {
    id: "cross",
    sport: "boxing",
    labelRu: "Кросс (эталон)",
    sources: ["NealBeans/BoxingDataset", "BoxingVI"],
    leadSide: "right",
    features: {
      elbowAngle: { min: 158, max: 178, ideal: 170, weight: 0.26 },
      torsoRotation: { min: 22, max: 48, ideal: 35, weight: 0.34 },
      wristVelocityMs: { min: 3.2, max: 7.0, ideal: 4.8, weight: 0.3 },
      spineFlexion: { min: 6, max: 22, ideal: 14, weight: 0.1 },
    },
    coachCues: [
      "Ведите удар поворотом таза и заднего плеча",
      "Перенос веса на переднюю ногу",
      "Задняя рука идёт по прямой через корпус",
    ],
  },
  {
    id: "hook",
    sport: "boxing",
    labelRu: "Хук (эталон)",
    sources: ["BoxMAC", "boxpunch-detector"],
    leadSide: "left",
    features: {
      elbowAngle: { min: 78, max: 115, ideal: 92, weight: 0.32 },
      torsoRotation: { min: 28, max: 55, ideal: 40, weight: 0.33 },
      wristVelocityMs: { min: 2.5, max: 6.0, ideal: 3.8, weight: 0.25 },
      spineFlexion: { min: 8, max: 24, ideal: 15, weight: 0.1 },
    },
    coachCues: [
      "Локоть на уровне кулака — не проваливайте",
      "Корпус ведёт удар, не только рука",
      "Компактная дуга, не размахивайте",
    ],
  },
  {
    id: "combo",
    sport: "boxing",
    labelRu: "Джеб + кросс (эталон)",
    sources: ["BoxingVI"],
    leadSide: "both",
    features: {
      elbowAngle: { min: 150, max: 178, ideal: 165, weight: 0.25 },
      torsoRotation: { min: 18, max: 45, ideal: 30, weight: 0.3 },
      wristVelocityMs: { min: 2.6, max: 6.8, ideal: 4.0, weight: 0.35 },
      spineFlexion: { min: 5, max: 20, ideal: 12, weight: 0.1 },
    },
    coachCues: [
      "Первый удар короткий, второй с полным вращением корпуса",
      "Не теряйте баланс между ударами",
      "Руки возвращаются к защите",
    ],
  },
  {
    id: "forehand",
    sport: "tennis",
    labelRu: "Форхенд (эталон)",
    sources: ["TAR-Det / TAR-YOLO"],
    leadSide: "right",
    features: {
      elbowAngle: { min: 95, max: 145, ideal: 118, weight: 0.28 },
      torsoRotation: { min: 25, max: 50, ideal: 38, weight: 0.32 },
      wristVelocityMs: { min: 2.2, max: 5.5, ideal: 3.4, weight: 0.3 },
      spineFlexion: { min: 10, max: 28, ideal: 18, weight: 0.1 },
    },
    coachCues: [
      "Полный поворот плеч и таза в замахе",
      "Доводите руку через контакт",
      "Не обрывайте замах рано",
    ],
  },
  {
    id: "backhand",
    sport: "tennis",
    labelRu: "Бэкхенд (эталон)",
    sources: ["TAR-Det / TAR-YOLO"],
    leadSide: "left",
    features: {
      elbowAngle: { min: 100, max: 150, ideal: 125, weight: 0.28 },
      torsoRotation: { min: 28, max: 52, ideal: 40, weight: 0.34 },
      wristVelocityMs: { min: 2.0, max: 5.2, ideal: 3.2, weight: 0.28 },
      spineFlexion: { min: 8, max: 26, ideal: 16, weight: 0.1 },
    },
    coachCues: [
      "Разворот корпуса до замаха",
      "Стабильная ось — не заваливайтесь назад",
      "Завершите дугу вперёд",
    ],
  },
  {
    id: "serve",
    sport: "tennis",
    labelRu: "Подача (эталон)",
    sources: ["TAR-Det / TAR-YOLO"],
    leadSide: "right",
    features: {
      elbowAngle: { min: 140, max: 175, ideal: 158, weight: 0.22 },
      torsoRotation: { min: 30, max: 58, ideal: 44, weight: 0.28 },
      wristVelocityMs: { min: 2.8, max: 6.5, ideal: 4.0, weight: 0.35 },
      spineFlexion: { min: 12, max: 32, ideal: 20, weight: 0.15 },
    },
    coachCues: [
      "Высокий замах, вытягивание корпуса",
      "Полный перенос веса вперёд",
      "Контакт на вытянутой руке",
    ],
  },
  {
    id: "squat",
    sport: "strength",
    labelRu: "Присед (эталон)",
    sources: ["IPF biomechanics", "VBT strength literature"],
    features: {
      elbowAngle: { min: 150, max: 180, ideal: 170, weight: 0.05 },
      torsoRotation: { min: 0, max: 15, ideal: 5, weight: 0.1 },
      wristVelocityMs: { min: 0.4, max: 2.5, ideal: 1.2, weight: 0.2 },
      kneeAngle: { min: 75, max: 105, ideal: 92, weight: 0.35 },
      backAngle: { min: 142, max: 175, ideal: 158, weight: 0.3 },
    },
    coachCues: [
      "Глубина — бедро параллельно или ниже",
      "Колени по линии носков",
      "Нейтральная поясница",
    ],
  },
  {
    id: "bench",
    sport: "strength",
    labelRu: "Жим (эталон)",
    sources: ["IPF biomechanics"],
    features: {
      elbowAngle: { min: 85, max: 100, ideal: 92, weight: 0.4 },
      torsoRotation: { min: 0, max: 12, ideal: 4, weight: 0.1 },
      wristVelocityMs: { min: 0.3, max: 2.0, ideal: 1.0, weight: 0.15 },
      backAngle: { min: 135, max: 165, ideal: 148, weight: 0.35 },
    },
    coachCues: [
      "Лопатки сведены",
      "Локти под углом ~45°",
      "Полная амплитуда без отрыва таза",
    ],
  },
  {
    id: "lunge",
    sport: "strength",
    labelRu: "Выпад (эталон)",
    sources: ["Strength & conditioning standards"],
    features: {
      elbowAngle: { min: 150, max: 180, ideal: 170, weight: 0.05 },
      torsoRotation: { min: 0, max: 12, ideal: 4, weight: 0.1 },
      wristVelocityMs: { min: 0.3, max: 1.8, ideal: 0.9, weight: 0.1 },
      kneeAngle: { min: 85, max: 110, ideal: 98, weight: 0.4 },
      backAngle: { min: 148, max: 178, ideal: 165, weight: 0.35 },
    },
    coachCues: [
      "Колено передней ноги над стопой",
      "Корпус вертикально",
      "Контролируемая глубина",
    ],
  },
];

export const PRO_DATASET_CATALOG: ProDatasetSource[] = [
  {
    id: "nealbeans-boxing",
    name: "NealBeans BoxingDataset (Olympic footage)",
    sport: "boxing",
    url: "https://huggingface.co/datasets/NealBeans/BoxingDataset",
    classes: [
      "jab",
      "cross",
      "hook",
      "uppercut",
      "slip",
      "block",
      "footwork",
      "clinch",
    ],
    license: "Research / non-commercial (see dataset card)",
    notes: "2278 клипов с олимпийских боёв — основа для pro action training",
  },
  {
    id: "boxingvi",
    name: "BoxingVI",
    sport: "boxing",
    url: "https://github.com/Bikudebug/BoxingVI",
    classes: ["6 punch types", "pose trajectories"],
    license: "Academic",
    notes: "6915 punch clips, YouTube sparring, pose + temporal labels",
  },
  {
    id: "boxmac",
    name: "BoxMAC",
    sport: "boxing",
    url: "https://arxiv.org/html/2412.18204v1",
    classes: ["13 pro boxing actions"],
    license: "Academic",
    notes: "60k+ frames, pro ring, multi-label",
  },
  {
    id: "boxpunch-universe",
    name: "boxpunch-detector (Roboflow Universe)",
    sport: "boxing",
    url: "https://universe.roboflow.com/markmcquade/boxpunch-detector",
    classes: [
      "jab",
      "cross",
      "hook",
      "uppercut",
      "lead hook",
      "rear hook",
      "no punch",
    ],
    license: "CC BY 4.0",
    notes: "347 images — быстрый старт YOLO train",
  },
  {
    id: "tar-yolo",
    name: "TAR-Det / TAR-YOLO",
    sport: "tennis",
    url: "https://doi.org/10.1111/sms.70177",
    classes: ["tennis stroke actions"],
    license: "Academic",
    notes: "Pose-driven tennis action recognition",
  },
];

export function getEliteReference(action: string): EliteReference | undefined {
  const id = action.toLowerCase();
  return ELITE_REFERENCES.find((r) => r.id === id);
}
