import HeroButton from "./HeroButton";

export default function PublicRepoTab() {
    return (
        <div className="flex flex-col items-center justify-center min-w-125">
            <input className="bg-navbar rounded-3xl p-2 w-full text-center" type="text" placeholder="Paste your public repo https://github.com/username/repo"></input>
                <HeroButton text="Generate README →" />
            <span className="mt-4 mb-4 text-bold">or upload files directly</span>
        </div>
    );
}