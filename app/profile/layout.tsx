import UI from "@/components/ui";

export default function ProfileLayout({
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
