import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ContextMenu } from "@/components/ui/ContextMenu";

export interface ImportButtonProps {
  onImportFile: () => void;
  onImportCode: () => void;
  disabled?: boolean;
}

export function ImportButton({ onImportFile, onImportCode, disabled }: ImportButtonProps) {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenuAt(null), []);

  return (
    <>
      <Button
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMenuAt(menuAt ? null : { x: rect.left, y: rect.bottom + 4 });
        }}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={menuAt !== null}
      >
        Import quiz
      </Button>
      <ContextMenu
        position={menuAt}
        label="Import quiz"
        items={[
          { label: "From file…", onSelect: onImportFile },
          { label: "From share code…", onSelect: onImportCode },
        ]}
        onClose={closeMenu}
      />
    </>
  );
}
