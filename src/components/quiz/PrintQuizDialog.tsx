import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { saveQuizPdf } from "@/lib/printQuiz";
import type { Quiz } from "@shared/types";

export interface PrintQuizDialogProps {
  open: boolean;
  quiz: Quiz;
  onClose: () => void;
}

export function PrintQuizDialog({ open, quiz, onClose }: PrintQuizDialogProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [includeKey, setIncludeKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleShowAnswers = (checked: boolean) => {
    setShowAnswers(checked);
    if (checked) setIncludeKey(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveQuizPdf(quiz, {
        showAnswers,
        includeKey: showAnswers ? false : includeKey,
      });
      if (saved) onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Save to PDF"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            Save PDF
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Toggle
          checked={showAnswers}
          onChange={handleShowAnswers}
          label="Show answers"
          description="Mark the correct choice on each question."
        />
        <Toggle
          checked={showAnswers ? false : includeKey}
          onChange={setIncludeKey}
          disabled={showAnswers}
          label="Include key"
          description="Add a separate answer key after the questions."
        />
      </div>
    </Modal>
  );
}
