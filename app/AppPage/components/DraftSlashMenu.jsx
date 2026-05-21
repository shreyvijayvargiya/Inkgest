import { motion, AnimatePresence } from "framer-motion";
import {
  T,
  Icons,
  Icon,
  draftSlashItemMatchesQuery,
  getDraftSlashFlatRows,
  DRAFT_SLASH_BASE_ITEMS,
  DRAFT_SLASH_AI_KEYWORDS,
} from "../draftPageLib";

function DraftSlashMenuList({ slashCommand, slashListIndex, handleSlashCommand }) {
  const q = (slashCommand.query ?? "")
  									.trim()
  									.toLowerCase();
  								const aiHit = draftSlashItemMatchesQuery(
  									{
  										id: "ask-ai",
  										label: "Ask AI",
  										keywords: DRAFT_SLASH_AI_KEYWORDS,
  									},
  									q,
  								);
  						const allMatching = DRAFT_SLASH_BASE_ITEMS.filter(
  							(it) => draftSlashItemMatchesQuery(it, q),
  						);
  						const flatRows = getDraftSlashFlatRows(slashCommand.query);
  						const activeIdx = flatRows.length > 0 ? Math.min(slashListIndex, flatRows.length - 1) : 0;
  						const aiRowOffset = aiHit ? 1 : 0;
  						// Build ordered sub-section groups
  						const SUB_ORDER = ["Typography", "Lists", "Media", "Data", "Components", "Callouts", "Code", "Dividers"];
  						const grouped = {};
  						allMatching.forEach((it) => {
  							const s = it.subSection || it.section;
  							if (!grouped[s]) grouped[s] = [];
  							grouped[s].push(it);
  						});
  						const orderedGroups = SUB_ORDER.filter((s) => grouped[s]?.length > 0).map((s) => ({ label: s, items: grouped[s] }));

  						if (!aiHit && allMatching.length === 0) {
  									return (
  								<div style={{ padding: "10px 12px", fontSize: 13, color: T.muted }}>
  											No matching commands
  										</div>
  									);
  								}
  								const sectionTitleStyle = {
  							fontSize: 9.5,
  									fontWeight: 700,
  							color: "#C4BDB5",
  							letterSpacing: "0.08em",
  							textTransform: "uppercase",
  							margin: "8px 0 4px 6px",
  								};
  								const rowBtnStyle = {
  									width: "100%",
  									display: "flex",
  									alignItems: "center",
  									gap: 10,
  							padding: "7px 10px",
  									border: "none",
  							borderRadius: 7,
  									background: "none",
  							fontSize: 13,
  									fontWeight: 500,
  									color: T.accent,
  									cursor: "pointer",
  									textAlign: "left",
  								};
  								const renderIcon = (item) => {
  									const ic = item.icon;
  							if (ic === "list") return <Icon d={Icons.list} size={15} stroke={T.muted} />;
  							if (ic === "image") return <Icon d={Icons.image} size={15} stroke={T.muted} />;
  							if (ic === "table") return <Icon d={Icons.table} size={15} stroke={T.muted} />;
  							if (ic === "embed") return <Icon d={Icons.video} size={15} stroke={T.muted} />;
  							if (typeof ic === "string" && !ic.startsWith("M")) {
  								return <span style={{ fontSize: 13, fontWeight: 600, width: 18, textAlign: "center", flexShrink: 0 }}>{ic}</span>;
  							}
  							return <Icon d={ic} size={15} stroke={T.muted} />;
  						};
  						// Build flat index for keyboard nav (ai first, then items in group order)
  						let navIdx = aiHit ? 1 : 0;
  								return (
  									<>
  										{aiHit && (
  											<>
  												<p style={sectionTitleStyle}>AI</p>
  												<motion.button
  													whileHover={{ background: "#F0ECE5" }}
  													whileTap={{ scale: 0.98 }}
  											onClick={() => handleSlashCommand("ask-ai")}
  											data-slash-active={activeIdx === 0 ? "true" : undefined}
  											style={{ ...rowBtnStyle, ...(activeIdx === 0 ? { background: "#EDE8E0" } : {}) }}
  										>
  											<Icon d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z" size={13} stroke="#C17B2F" />
  													Ask AI
  												</motion.button>
  											</>
  										)}
  								{orderedGroups.map((group, gi) => {
  									return (
  										<div key={group.label}>
  											{(gi > 0 || aiHit) && <div style={{ height: 1, background: T.border, margin: "6px 0" }} />}
  											<p style={sectionTitleStyle}>{group.label}</p>
  											{group.items.map((item) => {
  												const myIdx = aiRowOffset + flatRows.slice(aiHit ? 1 : 0).findIndex((r) => r.id === item.id);
  												const isActive = activeIdx === (aiHit ? 1 : 0) + allMatching.findIndex((x) => x.id === item.id);
  													return (
  													<motion.button
  														key={item.id}
  														whileHover={{ background: "#F0ECE5" }}
  														whileTap={{ scale: 0.98 }}
  														onClick={() => handleSlashCommand(item.id)}
  														data-slash-active={isActive ? "true" : undefined}
  														style={{ ...rowBtnStyle, ...(isActive ? { background: "#EDE8E0" } : {}) }}
  													>
  														{renderIcon(item)}
  														{item.label}
  													</motion.button>
  												);
  											})}
  										</div>
  												);
  												})}
  											</>
  						);
}

export default function DraftSlashMenu({ slashCommand, slashListIndex, handleSlashCommand }) {
  return (
    <AnimatePresence>
      {slashCommand && (
        <motion.div
          data-slash-command
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            left: slashCommand.x,
            top: slashCommand.y,
            zIndex: 100,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 8,
            minWidth: 240,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          <DraftSlashMenuList
            slashCommand={slashCommand}
            slashListIndex={slashListIndex}
            handleSlashCommand={handleSlashCommand}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
