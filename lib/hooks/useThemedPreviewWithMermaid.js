"use client";

import { useEffect, useState } from "react";
import { renderMermaidInHtmlDoc } from "../mermaid/renderMermaidInHtmlDoc";

/** Pre-render Mermaid in themed preview HTML so iframe matches the editor. */
export function useThemedPreviewWithMermaid(themedDoc) {
	const [previewSrcDoc, setPreviewSrcDoc] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (!themedDoc) {
			setPreviewSrcDoc("");
			setPending(false);
			return undefined;
		}
		let cancelled = false;
		setPending(true);
		renderMermaidInHtmlDoc(themedDoc)
			.then((doc) => {
				if (!cancelled) {
					setPreviewSrcDoc(doc);
					setPending(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setPreviewSrcDoc(themedDoc);
					setPending(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [themedDoc]);

	return {
		previewSrcDoc: previewSrcDoc || themedDoc,
		pending,
	};
}
