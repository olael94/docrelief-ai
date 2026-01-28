export default function TabBar({activeTab, setActiveTab, tabs}) {

    return (
        <div className="relative flex gap-2 bg-gray-50 p-1 rounded-3xl w-full justify-center">
            {/* Sliding background indicator */}
            <div
                className="absolute bg-navbar rounded-3xl transition-all duration-300 ease-in-out shadow"
                style={{
                    left: `calc(${tabs.findIndex(tab => tab.id === activeTab) * (100 / tabs.length)}%)`,
                    width: `calc(${100 / tabs.length}%)`,
                    height: '100%',
                    top: '0px'
                }}
            />

            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 flex items-center justify-center px-14.5 py-2 rounded-3xl transition-all duration-300 cursor-pointer leading-none ${
                        activeTab === tab.id
                            ? 'text-black font-bold'
                            : 'text-gray-600 hover:text-gray-900 font-medium'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}