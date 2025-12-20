import { useEffect, useState, useMemo } from 'react';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    inline,
    size,
    useRole,
    useDismiss,
    useInteractions,
    FloatingPortal,
} from '@floating-ui/react';
import { AnnotationStyle } from '@precept/shared';
import { Underline, Trash2, Sparkles } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface SelectionToolbarProps {
    onApplyStyle: (style: AnnotationStyle, color?: string, range?: Range) => void;
    onClear: (range?: Range) => void;
    isVisible: boolean;
    onClose: () => void;
}

const COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Brown', value: '#92400e' },
    { name: 'Black', value: '#0f172a' },
];

interface WordSuggestion {
    style: AnnotationStyle;
    color?: string;
    count: number;
}

export function SelectionToolbar({ onApplyStyle, onClear, isVisible, onClose }: SelectionToolbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'highlight' | 'underline' | 'symbols'>('highlight');
    const [savedRange, setSavedRange] = useState<Range | null>(null);
    const [selectedText, setSelectedText] = useState('');

    // Suggestions state
    const [mappings, setMappings] = useState<Record<string, WordSuggestion[]>>({});

    useEffect(() => {
        const saved = localStorage.getItem('precept_word_mappings');
        if (saved) setMappings(JSON.parse(saved));
    }, []);

    useEffect(() => {
        setIsOpen(isVisible);
    }, [isVisible]);

    const { refs, floatingStyles, context, update } = useFloating({
        open: isOpen,
        onOpenChange: (open) => {
            setIsOpen(open);
            if (!open) onClose();
        },
        placement: 'top',
        middleware: [
            offset(12),
            flip({
                fallbackPlacements: ['bottom', 'top'],
                padding: 5,
            }),
            shift({
                padding: 10,
                crossAxis: true,
            }),
            inline(),
            size({
                apply({ availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        maxHeight: `${Math.max(200, availableHeight)}px`,
                    });
                },
            }),
        ],
        whileElementsMounted: autoUpdate,
    });

    // Re-position when changing tabs (dynamic height change)
    useEffect(() => {
        if (isOpen) {
            update();
        }
    }, [activeTab, isOpen, update]);

    const dismiss = useDismiss(context);
    const role = useRole(context);

    const { getFloatingProps } = useInteractions([dismiss, role]);

    useEffect(() => {
        let isInteracting = false;

        const handleMouseDown = (e: MouseEvent) => {
            if (refs.floating.current?.contains(e.target as Node)) {
                isInteracting = true;
            }
        };

        const handleMouseUp = () => {
            isInteracting = false;
        };

        const handleSelectionChange = () => {
            if (isInteracting) return;

            const selection = window.getSelection();

            if (isOpen && refs.floating.current?.contains(document.activeElement)) {
                return;
            }

            if (!selection || selection.isCollapsed) {
                setIsOpen(false);
                return;
            }

            const range = selection.getRangeAt(0);
            let node = range.commonAncestorContainer as Node | null;
            let inBible = false;
            while (node) {
                if (node instanceof HTMLElement && node.classList.contains('bible-text-wrapper')) {
                    inBible = true;
                    break;
                }
                node = node.parentNode;
            }

            if (!inBible) {
                setIsOpen(false);
                return;
            }

            const text = selection.toString().trim();
            setSelectedText(text);
            setSavedRange(range.cloneRange());

            refs.setPositionReference({
                getBoundingClientRect: () => range.getBoundingClientRect(),
                getClientRects: () => range.getClientRects(),
            });
            setIsOpen(true);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'c' && isOpen) {
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
                onClear(savedRange || undefined);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [refs, isOpen, onClear, savedRange]);

    const handleApply = (style: AnnotationStyle, color?: string) => {
        const range = savedRange || undefined;
        onApplyStyle(style, color, range);

        // Save mapping
        if (selectedText) {
            const key = selectedText.toLowerCase();
            const current = mappings[key] || [];
            const updated = [...current];
            const existing = updated.find(m => m.style === style && m.color === color);

            if (existing) {
                existing.count++;
            } else {
                updated.push({ style, color, count: 1 });
            }

            updated.sort((a, b) => b.count - a.count);
            const newMappings = { ...mappings, [key]: updated.slice(0, 3) };
            setMappings(newMappings);
            localStorage.setItem('precept_word_mappings', JSON.stringify(newMappings));
        }
    };

    const handleClearAction = () => {
        onClear(savedRange || undefined);
    };

    const currentSuggestions = useMemo(() => {
        if (!selectedText) return [];
        return mappings[selectedText.toLowerCase()] || [];
    }, [selectedText, mappings]);

    if (!isOpen) return null;

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={{
                    ...floatingStyles,
                    zIndex: 9999,
                }}
                {...getFloatingProps()}
            >
                <div className="selection-toolbar-premium" style={{ width: activeTab === 'symbols' ? '352px' : '220px' }}>
                    <div className="toolbar-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'highlight' ? 'active' : ''}`}
                            onClick={() => setActiveTab('highlight')}
                        >
                            Highlight
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'underline' ? 'active' : ''}`}
                            onClick={() => setActiveTab('underline')}
                        >
                            Underline
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'symbols' ? 'active' : ''}`}
                            onClick={() => setActiveTab('symbols')}
                        >
                            Symbols
                        </button>
                    </div>

                    <div className="toolbar-content">
                        {/* Contextual Suggestions */}
                        {currentSuggestions.length > 0 && (
                            <div className="suggestions-area">
                                <div className="suggestion-label"><Sparkles size={10} /> Suggested for "{selectedText}"</div>
                                <div className="suggestion-list">
                                    {currentSuggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            className="suggestion-item"
                                            onClick={() => handleApply(s.style, s.color)}
                                        >
                                            {s.style === 'symbol' ? (
                                                <span className="suggestion-symbol">{s.color}</span>
                                            ) : (
                                                <div
                                                    className={`suggestion-preview ${s.style}`}
                                                    style={{
                                                        backgroundColor: s.style === 'highlight' ? s.color : 'transparent',
                                                        borderBottom: (s.style === 'underline' || s.style === 'double-underline') ? `2px solid ${s.color}` : 'none'
                                                    }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'symbols' ? (
                            <div className="emoji-container">
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: any) => {
                                        handleApply('symbol', emoji.native);
                                    }}
                                    theme="dark"
                                    set="native"
                                    previewPosition="none"
                                    skinTonePosition="none"
                                    searchPosition="top"
                                    navPosition="bottom"
                                    perLine={8}
                                    maxFrequentRows={1}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="color-grid">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            className="color-btn"
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                            onClick={() => {
                                                if (activeTab === 'highlight') {
                                                    handleApply('highlight', c.value);
                                                } else {
                                                    handleApply('underline', c.value);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="toolbar-actions">
                                    {activeTab === 'underline' && (
                                        <button
                                            className="action-btn"
                                            title="Double Underline"
                                            onClick={() => handleApply('double-underline', '#3b82f6')}
                                        >
                                            <div className="double-underline-icon-large">
                                                <Underline size={18} />
                                                <div className="second-line" />
                                            </div>
                                        </button>
                                    )}
                                    <div className="esc-hint">
                                        <span className="shortcut-hint">ESC</span> to Close
                                    </div>
                                    <div style={{ flexGrow: 1 }} />
                                    <button className="action-btn clear" title="Clear (C)" onClick={handleClearAction}>
                                        <Trash2 size={18} />
                                        <span className="shortcut-hint">C</span>
                                    </button>
                                </div>
                            </>
                        )}
                        {activeTab === 'symbols' && (
                            <div className="toolbar-actions" style={{ marginTop: '8px' }}>
                                <div className="esc-hint">
                                    <span className="shortcut-hint">ESC</span> to Close
                                </div>
                                <div style={{ flexGrow: 1 }} />
                                <button className="action-btn clear" title="Clear (C)" onClick={handleClearAction}>
                                    <Trash2 size={18} />
                                    <span className="shortcut-hint">C</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .esc-hint {
            font-size: 10px;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .selection-toolbar-premium {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3);
          overflow: hidden;
          transition: width 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .toolbar-tabs {
          display: flex;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          flex-shrink: 0;
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          color: white;
          background: #0f172a;
        }

        .toolbar-content {
          padding: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .suggestions-area {
          background: #1e293b;
          margin: -10px -10px 10px -10px;
          padding: 8px 10px;
          border-bottom: 1px solid #334155;
          flex-shrink: 0;
        }

        .suggestion-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .suggestion-list {
          display: flex;
          gap: 6px;
        }

        .suggestion-item {
          background: #0f172a;
          border: 1px solid #334155;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.1s;
        }

        .suggestion-item:hover {
          background: #334155;
          transform: scale(1.05);
        }

        .suggestion-symbol {
          font-size: 16px;
        }

        .suggestion-preview {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        .emoji-container {
          border-radius: 8px;
          overflow: hidden;
          flex-grow: 1;
          min-height: 350px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-bottom: 10px;
        }

        .color-btn {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: transform 0.1s;
        }

        .color-btn:hover {
          transform: scale(1.1);
          border-color: rgba(255,255,255,0.3);
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid #334155;
          flex-shrink: 0;
        }

        .action-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #1e293b;
          color: white;
        }

        .action-btn.clear:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .shortcut-hint {
          font-size: 10px;
          background: #334155;
          padding: 2px 4px;
          border-radius: 4px;
          color: #94a3b8;
        }

        .double-underline-icon-large {
          position: relative;
          color: inherit;
        }

        .double-underline-icon-large .second-line {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 1.5px;
          background: currentColor;
          border-radius: 1px;
        }

        /* emoji-mart custom styling */
        em-emoji-picker {
          --border-radius: 0;
          --category-icon-size: 20px;
          --font-family: inherit;
          --font-size: 14px;
          --rgb-accent: 59, 130, 246;
          --rgb-background: 15, 23, 42;
          --rgb-color: 255, 255, 255;
          --shadow: none;
          width: 100% !important;
          height: 350px !important;
        }
      `}</style>
        </FloatingPortal>
    );
}
