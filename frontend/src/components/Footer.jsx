const Footer = () => {

    //Defines the year for the copyright
    const year = new Date().getFullYear();

    const links = [
        { title: 'GitHub', url: 'https://github.com/olael94/docrelief-ai' },
        { title: 'Report Issue', url: 'https://github.com/olael94/docrelief-ai/issues' },
        { title: 'Meet the team', url: '/team' },
        { title: 'How It Works', url: '/' },
    ];

    return (
        <footer
            data-testid="footer"
            className="w-full flex flex-col md:flex-row md:justify-between bg-gray-50 px-10 py-6 border-t border-zinc-700 md:px-36 min-w-[420px]"
        >
            <ul className="flex flex-row gap-6 justify-center md:justify-start order-1">
                {links.map((link, index) => (
                    <li key={index} data-testid={`footerLink${index}`}>
                        <a
                            href={link.url}
                            className="text-gray-600 no-underline hover:text-teal-500 hover:underline transition-colors"
                        >
                            {link.title}
                        </a>
                    </li>
                ))}
            </ul>

            <p
                data-testid="footerContent"
                className="text-gray-500 text-sm m-0 text-center md:text-right order-2 pt-6 md:pt-0"
            >
                © {year} DocRelief AI
            </p>
        </footer>
    );
};

export default Footer;