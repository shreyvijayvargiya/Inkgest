import ReactMarkdown from "react-markdown";

const mdClasses = {
	p: "text-[#5A5550] text-[15px] leading-[1.75] mb-4 last:mb-0",
	h2: "text-[#1A1A1A] text-xl font-semibold mt-10 mb-4 first:mt-0 scroll-mt-24",
	h3: "text-[#1A1A1A] text-lg font-semibold mt-8 mb-3",
	ul: "list-disc pl-5 my-4 space-y-2 text-[#5A5550] text-[15px] leading-relaxed",
	ol: "list-decimal pl-5 my-4 space-y-2 text-[#5A5550] text-[15px] leading-relaxed",
	li: "pl-1",
	a: "text-[#C17B2F] underline underline-offset-2 hover:text-[#a06424]",
	strong: "text-[#1A1A1A] font-semibold",
	blockquote:
		"border-l-[3px] border-[#C17B2F] pl-4 my-6 text-[#7A7570] italic",
};

export default function BlogMarkdown({ content }) {
	return (
		<ReactMarkdown
			components={{
				p: ({ children }) => <p className={mdClasses.p}>{children}</p>,
				h2: ({ children }) => <h2 className={mdClasses.h2}>{children}</h2>,
				h3: ({ children }) => <h3 className={mdClasses.h3}>{children}</h3>,
				ul: ({ children }) => <ul className={mdClasses.ul}>{children}</ul>,
				ol: ({ children }) => <ol className={mdClasses.ol}>{children}</ol>,
				li: ({ children }) => <li className={mdClasses.li}>{children}</li>,
				a: ({ href, children }) => (
					<a href={href} className={mdClasses.a} rel="noopener noreferrer">
						{children}
					</a>
				),
				strong: ({ children }) => (
					<strong className={mdClasses.strong}>{children}</strong>
				),
				blockquote: ({ children }) => (
					<blockquote className={mdClasses.blockquote}>{children}</blockquote>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
