import { Button } from "@/components/ui/Button";

export interface ImportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ImportButton({ onClick, disabled }: ImportButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      Import quiz
    </Button>
  );
}
