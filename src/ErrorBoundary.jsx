import React from "react";

// Captura erros de renderização em qualquer tela e mostra uma mensagem amigável,
// evitando a "tela branca" para o usuário final. Registra o erro no console para o time.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Erro capturado pelo ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "grid", placeItems: "center",
          fontFamily: "system-ui, sans-serif", background: "#EEF1F4", padding: 24,
        }}>
          <div style={{
            maxWidth: 460, background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, padding: 28, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ margin: "0 0 8px", color: "#1a2029" }}>Algo deu errado</h2>
            <p style={{ color: "#5c6672", fontSize: 14, lineHeight: 1.5 }}>
              Ocorreu um erro inesperado nesta tela. Tente recarregar a página.
              Se continuar, avise o suporte de TI.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 14, background: "#0A3D63", color: "#fff", border: 0,
                borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer",
              }}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
