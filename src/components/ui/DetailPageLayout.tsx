import type { ReactNode } from "react";
import { BackLink } from "./BackLink";
import { PageHeader } from "./PageHeader";

export interface DetailPageLayoutProps {
  width: "2xl" | "3xl";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  headerSpacing?: "default" | "roomy";
  children: ReactNode;
}

export function DetailPageLayout({
  width,
  title,
  subtitle,
  actions,
  onBack,
  headerSpacing = "default",
  children,
}: DetailPageLayoutProps) {
  return (
    <div className={`mx-auto ${width === "2xl" ? "max-w-2xl" : "max-w-3xl"}`}>
      {onBack && <BackLink onClick={onBack} />}
      <PageHeader
        as={headerSpacing === "roomy" ? "header" : "div"}
        spacing={headerSpacing}
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      {children}
    </div>
  );
}
