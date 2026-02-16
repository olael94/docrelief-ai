export default function TabBar({ activeTab, setActiveTab, tabs }) {
  return (
    <div className="relative flex gap-2 bg-[#1C2B3A]/60 backdrop-blur-md border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)] p-1 rounded-3xl w-full justify-center">
      {/* Sliding background indicator */}
      <div
        className="absolute bg-green-500/20 border border-green-500/50 rounded-3xl transition-all duration-300 ease-in-out shadow"
        style={{
          left: `calc(${tabs.findIndex((tab) => tab.id === activeTab) * (100 / tabs.length)}%)`,
          width: `calc(${100 / tabs.length}%)`,
          height: "100%",
          top: "0px",
        }}
      />

      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`relative z-10 flex items-center justify-center px-4 md:px-14.5 py-2 rounded-3xl transition-all duration-300 cursor-pointer leading-none text-sm md:text-base ${
            activeTab === tab.id
              ? "text-green-400 font-bold"
              : "text-gray-400 hover:text-gray-200 font-medium"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
