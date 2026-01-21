export default function HeroButton({ text, onClick }) {
    return (
        <button
            className="btn-landing text-white pt-3 pb-3 pl-5 pr-5 rounded-3xl mt-4"
            onClick={onClick}
        >
            {text}
        </button>
    );
}