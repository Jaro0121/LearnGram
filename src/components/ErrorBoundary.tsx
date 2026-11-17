import { Component, type ReactNode } from 'react';

/** Last line of defence: never leave the user on a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error) { console.error('LearnGram crashed:', error); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app"><div className="page center">
        <div className="big-emoji">😵</div>
        <h1>Something went wrong</h1>
        <p className="lead">Your progress is saved. Reloading usually fixes it.</p>
        <button className="btn primary" onClick={() => location.reload()}>Reload</button>
      </div></div>
    );
  }
}
