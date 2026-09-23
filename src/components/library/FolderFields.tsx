import { FieldLabel, TextArea, TextInput } from "@/components/ui/TextField";

export interface FolderFieldsProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  parentName?: string;
  newFolder?: boolean;
  error: string | null;
}

export function FolderFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  parentName,
  newFolder = false,
  error,
}: FolderFieldsProps) {
  return (
    <>
      {parentName && (
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Will be created inside <span className="font-medium">{parentName}</span>.
        </p>
      )}
      <FieldLabel label="Name">
        <TextInput
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={newFolder ? "e.g. History" : undefined}
          autoFocus
          maxLength={80}
        />
      </FieldLabel>
      <FieldLabel
        label="Description"
        hint={newFolder ? "Optional - shown on the folder card." : undefined}
      >
        <TextArea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={newFolder ? "What's in this folder?" : undefined}
          maxLength={280}
        />
      </FieldLabel>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </>
  );
}
