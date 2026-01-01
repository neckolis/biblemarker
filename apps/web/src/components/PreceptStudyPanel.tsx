import { useState } from 'react';
import {
    Eye,
    BookOpen,
    Heart,
    CheckCircle2,
    Info
} from 'lucide-react';

type Mode = 'observation' | 'interpretation' | 'application';

export function PreceptStudyPanel() {
    const [mode, setMode] = useState<Mode>('observation');

    const renderObservation = () => (
        <div className="precept-content animate-in fade-in slide-in-from-right duration-300">

        </div>
    );

    const renderInterpretation = () => (
        <div className="precept-content animate-in fade-in slide-in-from-right duration-300">
            <section className="precept-section">
                <h3 className="section-title">
                    <Info size={16} /> Context & Author Intent
                </h3>
                <p className="section-desc">What was the original author's intended meaning for the original audience?</p>
                <textarea
                    className="precept-textarea"
                    placeholder="Record your thoughts on the cultural and historical context..."
                />
            </section>

            <section className="precept-section">
                <h3 className="section-title">
                    <BookOpen size={16} /> Cross References
                </h3>
                <p className="section-desc">Let Scripture interpret Scripture. Note relevant parallel passages.</p>
                <div className="empty-state">
                    Use Research mode to find and link cross-references here.
                </div>
            </section>
        </div>
    );

    const renderApplication = () => (
        <div className="precept-content animate-in fade-in slide-in-from-right duration-300">
            <section className="precept-section">
                <h3 className="section-title">
                    <CheckCircle2 size={16} /> Obedience & Transformation
                </h3>
                <p className="section-desc">What truths are to be believed? What commands are to be obeyed?</p>
                <textarea
                    className="precept-textarea high"
                    placeholder="How does this passage change your view of God? How should you live differently today?"
                />
            </section>

            <button className="save-application-btn">
                Save Application Note
            </button>
        </div>
    );

    return (
        <div className="precept-panel">
            <header className="precept-header">
                <div className="precept-tabs">
                    <button
                        className={`precept-tab ${mode === 'observation' ? 'active' : ''}`}
                        onClick={() => setMode('observation')}
                    >
                        <Eye size={18} /> Observation
                    </button>
                    <button
                        className={`precept-tab ${mode === 'interpretation' ? 'active' : ''}`}
                        onClick={() => setMode('interpretation')}
                    >
                        <BookOpen size={18} /> Interpretation
                    </button>
                    <button
                        className={`precept-tab ${mode === 'application' ? 'active' : ''}`}
                        onClick={() => setMode('application')}
                    >
                        <Heart size={18} /> Application
                    </button>
                </div>
            </header>

            <main className="precept-body">
                {mode === 'observation' && renderObservation()}
                {mode === 'interpretation' && renderInterpretation()}
                {mode === 'application' && renderApplication()}
            </main>

            <style>{`
                .precept-panel {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #f8fafc;
                    border-left: 1px solid #e2e8f0;
                }

                .precept-header {
                    padding: 1rem;
                    background: #fff;
                    border-bottom: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }

                .precept-tabs {
                    display: flex;
                    gap: 0.5rem;
                    background: #f1f5f9;
                    padding: 0.25rem;
                    border-radius: 8px;
                }

                .precept-tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .precept-tab:hover {
                    color: #1e293b;
                }

                .precept-tab.active {
                    background: #fff;
                    color: #2563eb;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .precept-body {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                }

                .precept-section {
                    margin-bottom: 2rem;
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 0.5rem;
                }

                .section-desc {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-bottom: 1rem;
                    line-height: 1.4;
                }

                .checklist {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .checklist-item {
                    background: #fff;
                    padding: 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    transition: border-color 0.2s;
                }

                .checklist-item:hover {
                    border-color: #cbd5e1;
                }

                .q-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.25rem;
                }

                .q-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #334155;
                }

                .q-check {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .q-hint {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-style: italic;
                }

                .add-list-btn {
                    width: 100%;
                    padding: 0.75rem;
                    background: #fff;
                    border: 1px dashed #cbd5e1;
                    color: #64748b;
                    font-size: 0.8rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .add-list-btn:hover {
                    background: #f1f5f9;
                    border-color: #3b82f6;
                    color: #3b82f6;
                }

                .precept-textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    font-family: inherit;
                    font-size: 0.85rem;
                    resize: vertical;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .precept-textarea:focus {
                    border-color: #3b82f6;
                }

                .precept-textarea.high {
                    min-height: 250px;
                }

                .empty-state {
                    padding: 2rem 1rem;
                    text-align: center;
                    background: #f1f5f9;
                    border-radius: 8px;
                    border: 1px dashed #cbd5e1;
                    font-size: 0.75rem;
                    color: #64748b;
                    font-style: italic;
                }

                .save-application-btn {
                    width: 100%;
                    padding: 0.85rem;
                    background: #2563eb;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .save-application-btn:hover {
                    background: #1d4ed8;
                }

                .animate-in {
                    animation-duration: 0.3s;
                }
            `}</style>
        </div>
    );
}
