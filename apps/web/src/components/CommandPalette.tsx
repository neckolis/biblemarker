import * as React from "react";
import {
    KBarPortal,
    KBarPositioner,
    KBarAnimator,
    KBarSearch,
    useMatches,
    KBarResults,
    ActionId,
    ActionImpl,
} from "kbar";

export function CommandPalette() {
    return (
        <KBarPortal>
            <KBarPositioner style={{ zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                <KBarAnimator style={{
                    maxWidth: "600px",
                    width: "100%",
                    background: "white",
                    color: "black",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                }}>
                    <KBarSearch style={{
                        padding: "16px 20px",
                        fontSize: "18px",
                        width: "100%",
                        boxSizing: "border-box",
                        outline: "none",
                        border: "none",
                        background: "white",
                        borderBottom: '1px solid #eee'
                    }} />
                    <RenderResults />
                </KBarAnimator>
            </KBarPositioner>
        </KBarPortal>
    );
}

function RenderResults() {
    const { results, rootActionId } = useMatches();

    return (
        <KBarResults
            items={results}
            onRender={({ item, active }) =>
                typeof item === "string" ? (
                    <div style={{
                        padding: "12px 20px",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        opacity: 0.5,
                        fontWeight: 'bold',
                        background: '#fafafa'
                    }}>
                        {item}
                    </div>
                ) : (
                    <ResultItem
                        action={item}
                        active={active}
                        currentRootActionId={rootActionId as ActionId}
                    />
                )
            }
        />
    );
}

const ResultItem = React.forwardRef(
    (
        {
            action,
            active,
            currentRootActionId,
        }: {
            action: ActionImpl;
            active: boolean;
            currentRootActionId: ActionId;
        },
        ref: React.Ref<HTMLDivElement>
    ) => {
        const ancestors = React.useMemo(() => {
            if (!currentRootActionId) return action.ancestors;
            const index = action.ancestors.findIndex(
                (ancestor) => ancestor.id === currentRootActionId
            );
            return action.ancestors.slice(index + 1);
        }, [action.ancestors, currentRootActionId]);

        return (
            <div
                ref={ref}
                style={{
                    padding: "12px 20px",
                    background: active ? "#f5f5f5" : "transparent",
                    borderLeft: active ? "3px solid var(--accent-color, #3b82f6)" : "3px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                }}
            >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div>
                            {ancestors.length > 0 &&
                                ancestors.map((ancestor) => (
                                    <React.Fragment key={ancestor.id}>
                                        <span style={{ opacity: 0.5, marginRight: "8px" }}>
                                            {ancestor.name}
                                        </span>
                                        <span style={{ marginRight: "8px" }}>&rsaquo;</span>
                                    </React.Fragment>
                                ))}
                            <span>{action.name}</span>
                        </div>
                        {action.subtitle && (
                            <span style={{ fontSize: "12px", opacity: 0.5 }}>
                                {action.subtitle}
                            </span>
                        )}
                    </div>
                </div>
                {action.shortcut?.length ? (
                    <div aria-hidden style={{ display: "grid", gridAutoFlow: "column", gap: "4px" }}>
                        {action.shortcut.map((sc) => (
                            <kbd
                                key={sc}
                                style={{
                                    padding: "4px 8px",
                                    background: "rgba(0,0,0,0.1)",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: 'bold'
                                }}
                            >
                                {sc === '$mod' ? (window.navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : sc.toUpperCase()}
                            </kbd>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }
);
