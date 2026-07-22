import { Camera, ClipboardCheck, FileStack, UsersRound } from "lucide-react";
import type { FeatureKey } from "../types";

type FeatureTabsProps = {
  activeFeature: FeatureKey;
  onSelectFeature: (feature: FeatureKey) => void;
};

const features: Array<{
  key: FeatureKey;
  label: string;
  description: string;
  icon: typeof FileStack;
}> = [
  {
    key: "exam",
    label: "Tạo mã đề",
    description: "Tải đề gốc và xáo trộn mã đề.",
    icon: FileStack
  },
  {
    key: "answerSheet",
    label: "Tải phiếu trả lời",
    description: "Lấy mẫu phiếu PDF miễn phí.",
    icon: ClipboardCheck
  },
  {
    key: "autoGrader",
    label: "Chấm bài tự động",
    description: "Camera, OCR và xuất Excel.",
    icon: Camera
  },
  {
    key: "classroom",
    label: "Tạo lớp",
    description: "Tạo lớp và danh sách học sinh.",
    icon: UsersRound
  }
];

export function FeatureTabs({ activeFeature, onSelectFeature }: FeatureTabsProps) {
  return (
    <nav className="feature-tabs" aria-label="Chọn chức năng">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <button
            className={`feature-tab ${activeFeature === feature.key ? "is-active" : ""}`}
            type="button"
            key={feature.key}
            aria-current={activeFeature === feature.key ? "page" : undefined}
            onClick={() => onSelectFeature(feature.key)}
          >
            <Icon size={19} />
            <span>
              <strong>{feature.label}</strong>
              <small>{feature.description}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
