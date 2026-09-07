const systems = [
  { icon: 'K8', name: 'Kubernetes', detail: 'Clusters & workloads', status: 'Operational' },
  { icon: 'VM', name: 'Virtualization', detail: 'VMware infrastructure', status: 'Operational' },
  { icon: 'BK', name: 'Backup', detail: 'Protection & recovery', status: 'Protected' },
  { icon: 'ST', name: 'Storage', detail: 'SAN & capacity', status: 'Operational' },
  { icon: 'MO', name: 'Monitoring', detail: 'Health & observability', status: 'Online' },
  { icon: 'CI', name: 'CI / CD', detail: 'Build & delivery', status: 'Ready' },
]

const metrics = [
  ['24', 'Virtual Machines', 'Demo environment'],
  ['3', 'Kubernetes Nodes', 'Demo environment'],
  ['42 TB', 'Protected Data', 'Demo environment'],
  ['99.98%', 'Service Availability', 'Demo environment'],
]

function App() {
  return (
    <main>
      <nav className="nav shell">
        <div className="brand"><span className="brand-mark">A</span><span>ARMIN<span className="muted">/</span>INFRA</span></div>
        <div className="nav-links"><a href="#overview">Overview</a><a href="#systems">Systems</a><a href="#architecture">Architecture</a><a href="#contact">Contact</a></div>
        <div className="status-pill"><i /> ALL SYSTEMS OPERATIONAL</div>
      </nav>

      <section className="hero shell" id="overview">
        <div className="hero-copy">
          <div className="eyebrow">INFRASTRUCTURE · VIRTUALIZATION · DEVOPS</div>
          <h1>Infrastructure<br /><span>that stays</span> reliable.</h1>
          <p>Engineering and operating resilient infrastructure across virtualization, Kubernetes, backup, storage, networking and observability.</p>
          <div className="hero-actions"><a className="button primary" href="#systems">Explore platform <b>→</b></a><a className="button ghost" href="#architecture">View architecture</a></div>
        </div>
        <div className="hero-visual">
          <div className="orbital orbital-one" /><div className="orbital orbital-two" />
          <div className="core"><span>INFRA</span><strong>OPS</strong><small>PLATFORM</small></div>
          <div className="node node-a">K8S</div><div className="node node-b">VM</div><div className="node node-c">BK</div><div className="node node-d">SAN</div>
        </div>
      </section>

      <section className="metrics shell">
        {metrics.map(([value, label, note]) => <div className="metric" key={label}><strong>{value}</strong><span>{label}</span><small>{note}</small></div>)}
      </section>

      <section className="systems shell" id="systems">
        <div className="section-heading"><div><div className="eyebrow">PLATFORM MODULES</div><h2>One view. Every layer.</h2></div><p>A unified foundation for the technologies that keep business services running.</p></div>
        <div className="system-grid">
          {systems.map((system) => <article className="system-card" key={system.name}><div className="card-top"><span className="system-icon">{system.icon}</span><span className="mini-status"><i /> {system.status}</span></div><h3>{system.name}</h3><p>{system.detail}</p><span className="card-arrow">↗</span></article>)}
        </div>
      </section>

      <section className="architecture shell" id="architecture">
        <div className="architecture-copy"><div className="eyebrow">DELIVERY PIPELINE</div><h2>From commit<br />to cluster.</h2><p>This platform is designed as a real DevOps project: source control, automated builds, container images and Kubernetes delivery — with room to integrate real infrastructure APIs later.</p></div>
        <div className="pipeline">
          {['GITHUB', 'CI / CD', 'DOCKER', 'REGISTRY', 'KUBERNETES'].map((item, index) => <div className="pipeline-step" key={item}><span>0{index + 1}</span><strong>{item}</strong>{index < 4 && <b>→</b>}</div>)}
        </div>
      </section>

      <footer className="footer shell" id="contact"><div><span className="brand-mark">A</span><span> ARMIN / INFRA</span></div><span>Built for resilient infrastructure · 2026</span><span className="footer-right">DEVOPS INFRASTRUCTURE PLATFORM</span></footer>
    </main>
  )
}

export default App
