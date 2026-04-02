import UI from "@/components/ui";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UI main={children} />;
}
