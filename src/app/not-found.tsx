// 404 neutro: no revela nada sobre la aplicación.
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      <p
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
          color: "#999",
        }}
      >
        404 · This page could not be found.
      </p>
    </div>
  );
}
