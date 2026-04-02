import UI from "@/components/ui";

export default function TodoLayout({
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
