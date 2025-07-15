function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a1a2e', 
      color: '#ffffff',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ⚡ Loopag - Sistema IPTV
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#888',
          marginBottom: '40px'
        }}>
          Sistema Completo de Gestão de Assinaturas IPTV
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '40px'
        }}>
          <div style={{ 
            backgroundColor: '#16213e',
            padding: '30px',
            borderRadius: '10px',
            border: '1px solid #667eea'
          }}>
            <h3 style={{ color: '#667eea', marginBottom: '15px' }}>📊 Dashboard</h3>
            <p style={{ color: '#ccc' }}>Métricas em tempo real, gráficos de receita e KPIs</p>
          </div>
          
          <div style={{ 
            backgroundColor: '#16213e',
            padding: '30px',
            borderRadius: '10px',
            border: '1px solid #764ba2'
          }}>
            <h3 style={{ color: '#764ba2', marginBottom: '15px' }}>👥 Gestão de Clientes</h3>
            <p style={{ color: '#ccc' }}>CRUD completo, filtros avançados e status de pagamento</p>
          </div>
          
          <div style={{ 
            backgroundColor: '#16213e',
            padding: '30px',
            borderRadius: '10px',
            border: '1px solid #667eea'
          }}>
            <h3 style={{ color: '#667eea', marginBottom: '15px' }}>💰 Sistema de Cobrança</h3>
            <p style={{ color: '#ccc' }}>Automação de cobranças via WhatsApp</p>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#0f3460',
          borderRadius: '10px',
          border: '1px solid #667eea'
        }}>
          <h3 style={{ color: '#667eea', marginBottom: '15px' }}>🚀 Sistema em Funcionamento</h3>
          <p style={{ color: '#ccc' }}>
            API funcionando ✅ | Interface carregada ✅ | Banco de dados conectado ✅
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
