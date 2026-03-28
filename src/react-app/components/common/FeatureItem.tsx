interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-4 text-gray-300">
      <div className="w-10 h-10 bg-gray-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </div>
  );
}
