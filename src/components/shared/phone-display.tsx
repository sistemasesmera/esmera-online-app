import { parsePhoneNumber, formatPhoneNumberIntl } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

export function PhoneDisplay({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-muted-foreground">—</span>;

  const parsed = parsePhoneNumber(phone);
  const country = parsed?.country;
  const FlagComponent = country ? flags[country] : null;
  const formatted = formatPhoneNumberIntl(phone) || phone;

  return (
    <span className="flex items-center gap-1.5">
      {FlagComponent && (
        <FlagComponent title={country ?? ""} className="h-4 w-5 rounded-sm object-cover shrink-0" />
      )}
      <span>{formatted}</span>
    </span>
  );
}
