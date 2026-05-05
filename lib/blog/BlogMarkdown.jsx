import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const tableWrap =
	"my-6 -mx-1 sm:mx-0 overflow-x-auto rounded-xl border border-[#E8E4DC] bg-white/60 shadow-sm";
const tableEl =
	"min-w-full border-collapse text-left text-[14px] text-[#5A5550]";
const theadEl = "bg-[#F0ECE5] text-[#1A1A1A]";
const thCell =
	"border-b border-[#E8E4DC] px-3 py-2.5 text-left font-semibold text-[13px] text-[#1A1A1A] first:pl-4 last:pr-4 [&_p]:m-0";
const tdCell =
	"border-b border-[#E8E4DC]/90 px-3 py-2.5 align-top text-[14px] first:pl-4 last:pr-4 [&_p]:m-0 [&_p]:text-[14px] [&_p]:leading-relaxed";

export default function BlogMarkdown({ content }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
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
				table: ({ children }) => (
					<div className={tableWrap}>
						<table className={tableEl}>{children}</table>
					</div>
				),
				thead: ({ children }) => <thead className={theadEl}>{children}</thead>,
				tbody: ({ children }) => (
					<tbody className="[&_tr:last-child_td]:border-b-0">{children}</tbody>
				),
				tr: ({ children }) => <tr>{children}</tr>,
				th: ({ children }) => <th className={thCell}>{children}</th>,
				td: ({ children }) => <td className={tdCell}>{children}</td>,
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
