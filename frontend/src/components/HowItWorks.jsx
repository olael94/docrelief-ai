export default function HowItWorks() {
    const steps = [
        {
            number: 1,
            title: "GitHub URL or Files",
            description: "Paste a GitHub repository URL or upload your code files"
        },
        {
            number: 2,
            title: "AI Analyzes & Generates",
            description: "Our AI analyzes your code and generates a professional README"
        },
        {
            number: 3,
            title: "Preview & Modify",
            description: "Review the generated README and make any changes you need"
        },
        {
            number: 4,
            title: "Download or Commit",
            description: "Download your README or commit it directly to GitHub"
        }
    ];

    return (
        <div className="w-[400px] md:w-[921px] h-auto rounded-4xl shadow-2xl items-center justify-center mt-16 mb-10 bg-[#1C2B3A]/60 backdrop-blur-md border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
            <div>
                <h2 className="font-poppins text-3xl font-bold text-center text-white mt-8 mb-6">
                    How it Works
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step) => (
                        <div key={step.number} className="flex flex-col items-center text-center max-w-[420px] mx-auto px-4">
                            <div
                                className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold mb-4">
                                {step.number}
                            </div>
                            <h3 className="font-semibold text-lg text-green-200 mb-2 max-w-[160px]">{step.title}</h3>
                            <p className="text-gray-600 text-sm text-white mb-10 md:max-w-[160px] max-w-[300px]">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}