import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error desconocido' };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-2xl font-semibold text-red-600">Algo salió mal</div>
            <p className="mb-1 text-sm text-gray-600">La aplicación encontró un error inesperado.</p>
            <p className="mb-4 break-words rounded bg-red-50 px-2 py-1 font-mono text-xs text-red-700">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}