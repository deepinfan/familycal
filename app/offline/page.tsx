export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>当前离线</h1>
        <p>网络不可用。你仍可查看已缓存页面，恢复网络后数据会自动更新。</p>
      </section>
    </main>
  );
}
