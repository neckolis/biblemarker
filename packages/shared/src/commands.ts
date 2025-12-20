export type AppMode = 'read' | 'draw';

export interface CommandDefinition {
    id: string;
    label: string;
    keywords: string;
    shortcut?: string[];
    section: 'Mode' | 'Draw' | 'Navigation' | 'App';
    parent?: string;
}

export const COMMANDS: Record<string, CommandDefinition> = {
    // Mode Switching
    SWITCH_TO_READ: {
        id: 'switch-to-read',
        label: 'Switch to Reader Mode',
        keywords: 'read study bible viewer',
        shortcut: ['v'], // or custom
        section: 'Mode'
    },
    SWITCH_TO_DRAW: {
        id: 'switch-to-draw',
        label: 'Switch to Draw Mode',
        keywords: 'draw sketch paint canvas',
        shortcut: ['d'],
        section: 'Mode'
    },

    // Draw Tools
    ACTIVATE_TEXT_TOOL: {
        id: 'activate-text-tool',
        label: 'Text Tool',
        keywords: 'text type write',
        shortcut: ['$mod', 't'],
        section: 'Draw'
    },
    ACTIVATE_DRAW_TOOL: {
        id: 'activate-draw-tool',
        label: 'Pen Tool',
        keywords: 'draw pen pencil brush',
        shortcut: ['$mod', 'd'],
        section: 'Draw'
    },

    // Navigation
    GO_TO_PASSAGE: {
        id: 'go-to-passage',
        label: 'Go to passage...',
        keywords: 'navigate jump bible book chapter verse',
        shortcut: ['$mod', 'g'],
        section: 'Navigation'
    },
    SEARCH_SCRIPTURE: {
        id: 'search-scripture',
        label: 'Search Scripture...',
        keywords: 'find search bible text',
        shortcut: ['$mod', 'f'],
        section: 'Navigation'
    },

    // App
    SAVE_STUDY: {
        id: 'save-study',
        label: 'Save Study',
        keywords: 'save store persist',
        shortcut: ['$mod', 's'],
        section: 'App'
    }
};
