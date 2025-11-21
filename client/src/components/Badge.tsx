interface BadgeProps {
  children: React.ReactNode;
  color: string; // "red", "green", "blue", "yellow", etc.
}

const colorMap: Record<string, string> = {
  red: "bg-red-600",
  green: "bg-green-600",
  blue: "bg-blue-600",
  yellow: "bg-yellow-600",
  orange: "bg-orange-600",
  purple: "bg-purple-600",
  pink: "bg-pink-600",
  indigo: "bg-indigo-600",
  cyan: "bg-cyan-600",
  gray: "bg-gray-600",
  slate: "bg-slate-600",
};

export default function Badge({ children, color }: BadgeProps) {
  const bgColor = colorMap[color] || "bg-gray-600";

  return (
    <span className={`px-2 py-1 text-xs rounded-full text-white ${bgColor}`}>
      {children}
    </span>
  );
}
