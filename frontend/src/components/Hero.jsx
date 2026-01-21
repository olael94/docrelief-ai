import HeroButton from "./HeroButton"

export default function Hero() {
    return (
        <>
        <div className="mt-20 mb-10 flex flex-col items-center justify-center">
            <h1 className="font-poppins text-5xl font-black text-center max-w-3xl">
                    Generate Professional READMEs with AI in Seconds
                </h1>
                <h2 className="mt-7 mb-7 font-fire-code font-semi text-2xl text-black text-center">
                    Stop writing READMEs from scratch. Let AI do it for you.
                </h2>
            
            <div className="pl-5 pr-5 rounded-4xl h-150 w-200 shadow-2xl flex flex-col items-center justify-center bg-white gap-4">
                <h1 className="font-poppins text-4xl font-bold ">Generate README</h1>
                <input className="bg-navbar rounded-3xl p-2 w-full max-w-lg text-center" type="text" placeholder="Paste your public repo https://github.com/username/repo"></input>
                <HeroButton text="Generate README →" />
                <span className="mt-4 mb-4 text-bold">or upload files directly</span>
            </div>    
        </div>
        </>
    )
}