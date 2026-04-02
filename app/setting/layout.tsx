import UI from "@/components/ui";

export default function SettingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <UI main={children} />
    </div>
  );
}
