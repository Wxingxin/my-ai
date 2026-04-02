import UI from "@/components/ui";

export default function NewsLayout({
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
