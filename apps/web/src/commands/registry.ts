import { Action } from 'kbar';
import { COMMANDS, AppMode } from '@precept/shared';

interface RegistryOptions {
    setMode: (mode: AppMode) => void;
    navigate: (path: string) => void;
    saveStudy: () => void;
    openSearch: () => void;
    openGoTo: () => void;
}

export function createActions(options: RegistryOptions): Action[] {
    const { setMode, saveStudy, openSearch, openGoTo } = options;

    return [
        // Mode Switching
        {
            id: COMMANDS.SWITCH_TO_READ.id,
            name: COMMANDS.SWITCH_TO_READ.label,
            shortcut: COMMANDS.SWITCH_TO_READ.shortcut,
            keywords: COMMANDS.SWITCH_TO_READ.keywords,
            section: COMMANDS.SWITCH_TO_READ.section,
            perform: () => setMode('read'),
        },
        {
            id: COMMANDS.SWITCH_TO_RESEARCH.id,
            name: COMMANDS.SWITCH_TO_RESEARCH.label,
            shortcut: COMMANDS.SWITCH_TO_RESEARCH.shortcut,
            keywords: COMMANDS.SWITCH_TO_RESEARCH.keywords,
            section: COMMANDS.SWITCH_TO_RESEARCH.section,
            perform: () => setMode('research'),
        },

        // Navigation
        {
            id: COMMANDS.GO_TO_PASSAGE.id,
            name: COMMANDS.GO_TO_PASSAGE.label,
            shortcut: COMMANDS.GO_TO_PASSAGE.shortcut,
            keywords: COMMANDS.GO_TO_PASSAGE.keywords,
            section: COMMANDS.GO_TO_PASSAGE.section,
            perform: openGoTo,
        },
        {
            id: COMMANDS.SEARCH_SCRIPTURE.id,
            name: COMMANDS.SEARCH_SCRIPTURE.label,
            shortcut: COMMANDS.SEARCH_SCRIPTURE.shortcut,
            keywords: COMMANDS.SEARCH_SCRIPTURE.keywords,
            section: COMMANDS.SEARCH_SCRIPTURE.section,
            perform: openSearch,
        },

        // App
        {
            id: COMMANDS.SAVE_STUDY.id,
            name: COMMANDS.SAVE_STUDY.label,
            shortcut: COMMANDS.SAVE_STUDY.shortcut,
            keywords: COMMANDS.SAVE_STUDY.keywords,
            section: COMMANDS.SAVE_STUDY.section,
            perform: saveStudy,
        },
    ];
}
