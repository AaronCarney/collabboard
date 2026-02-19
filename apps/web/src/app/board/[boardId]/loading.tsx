export default function BoardLoading(): React.JSX.Element {
  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-50">
      {/* MenuBar skeleton */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center h-12 bg-white border-b border-gray-200 px-4">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      {/* Sidebar skeleton */}
      <div className="absolute left-0 top-12 bottom-0 w-12 bg-white border-r border-gray-200 flex flex-col items-center gap-2 pt-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Canvas area placeholder */}
      <div className="absolute top-12 left-12 right-0 bottom-0 flex items-center justify-center">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
