export type AppMode = 'read' | 'research' | 'ai-study';

export interface CommandDefinition {
    id: string;
    label: string;
    keywords: string;
    shortcut?: string[];
    section: 'Mode' | 'Navigation' | 'App';
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
    SWITCH_TO_RESEARCH: {
        id: 'switch-to-research',
        label: 'Switch to Research Mode',
        keywords: 'research lexicon greek hebrew original language',
        shortcut: ['r'],
        section: 'Mode'
    },
    SWITCH_TO_AI_STUDY: {
        id: 'switch-to-ai-study',
        label: 'Switch to AI Study',
        keywords: 'ai chat assistant perplexity inductive',
        shortcut: ['a'],
        section: 'Mode'
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
