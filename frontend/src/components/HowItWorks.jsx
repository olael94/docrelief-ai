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
        <div className="mt-16 mb-10 w-full max-w-4xl">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="font-poppins text-3xl font-bold text-center mb-8">
                    How it Works
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step) => (
                        <div key={step.number} className="flex flex-col items-center text-center">
                            <div
                                className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold mb-4">
                                {step.number}
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                            <p className="text-gray-600 text-sm">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}