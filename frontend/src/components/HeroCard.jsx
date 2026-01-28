import HeroButton from "./HeroButton"

export default function HeroCard( {title, text, buttonText} ) {
    return (
        <>
            <div className="rounded-2xl p-6 max-w-lg border-2 border border-green-300 shadow-md flex flex-col items-center justify-center m-4">
                <h2 className="text-xl font-bold mb-2 self-start">{title}</h2>
                <p className="text-gray-700 mb-4 self-start">{text}</p>
                <div className="self-end">
                    <HeroButton text={buttonText} />
                </div>
                
            </div>
        </>
    )
}