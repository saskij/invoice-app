import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // You could also log this to Supabase or an error reporting service here
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    padding: '24px',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    <div className="glass-card" style={{
                        maxWidth: '500px',
                        width: '100%',
                        padding: '40px',
                        textAlign: 'center',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        animation: 'fade-in 0.5s ease-out'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <AlertTriangle size={40} color="#ef4444" />
                        </div>

                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            color: '#f1f5f9',
                            marginBottom: '12px'
                        }}>
                            Oops! Something went wrong
                        </h1>

                        <p style={{
                            color: '#94a3b8',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            marginBottom: '32px'
                        }}>
                            The application encountered an unexpected error. Don't worry, your data is likely safe. Try refreshing the page.
                        </p>

                        {(import.meta.env.DEV) && this.state.error && (
                            <div style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '16px',
                                borderRadius: '8px',
                                textAlign: 'left',
                                marginBottom: '32px',
                                overflow: 'auto',
                                maxHeight: '200px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <code style={{ color: '#f87171', fontSize: '13px' }}>
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                className="btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px'
                                }}
                            >
                                <RefreshCw size={18} />
                                Reload App
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="btn-secondary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px'
                                }}
                            >
                                <Home size={18} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
