import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Protección contra traductores / extensiones del navegador (Google Translate en
// Chrome, Grammarly, etc.). Estas herramientas reemplazan los nodos de texto de la
// página y, cuando React intenta quitarlos (por ejemplo al elegir un ejecutivo en el
// selector), el navegador lanza "Failed to execute 'removeChild' on 'Node'" y la
// app completa se queda en blanco. Este parche evita ese error.
if (typeof Node === 'function' && Node.prototype) {
	const originalRemoveChild = Node.prototype.removeChild;
	Node.prototype.removeChild = function (child) {
		if (child.parentNode !== this) {
			if (child.parentNode) child.parentNode.removeChild(child);
			return child;
		}
		return originalRemoveChild.apply(this, arguments);
	};

	const originalInsertBefore = Node.prototype.insertBefore;
	Node.prototype.insertBefore = function (newNode, referenceNode) {
		if (referenceNode && referenceNode.parentNode !== this) {
			return originalInsertBefore.call(this, newNode, null);
		}
		return originalInsertBefore.apply(this, arguments);
	};
}

// Si ocurre cualquier otro error inesperado, mostrar un mensaje con opción de
// recargar en lugar de una pantalla en blanco.
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error, info) {
		console.error('Error en la aplicación:', error, info?.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
					<div>
						<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ocurrió un error inesperado</h1>
						<p style={{ color: '#555', marginBottom: 16 }}>Recarga la página para continuar. Si usas el traductor de Chrome, desactívalo para este sitio.</p>
						<button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: 8, background: '#148286', color: '#fff', border: 0, fontWeight: 600, cursor: 'pointer' }}>
							Recargar página
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);
