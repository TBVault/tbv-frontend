"use client";

export default function JwtTokenDisplay({ token }: { token: string }) {
  return (
    <div style={{ margin: "20px 0", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
      <h2>JWT Token (for Swagger debugging)</h2>
      <textarea
        readOnly
        value={token}
        style={{
          width: "100%",
          height: "100px",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          resize: "vertical",
        }}
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
      <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
        Click the textarea to select all. Use in Swagger as: <code>Bearer [token]</code>
      </p>
    </div>
  );
}
