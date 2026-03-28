interface StatCardProps {
  value: number | string;
  label: string;
}

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="bg-gray-800/30 rounded-2xl p-6 text-center border border-gray-700/30">
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}
