import { sanitizeRichText } from "@/lib/rich-text";

type RichTextDisplayProps = {
  className?: string;
  value: string;
};

export function RichTextDisplay({ className, value }: RichTextDisplayProps) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
