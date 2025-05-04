// automl-ai-frontend/src/pages/ExportPage.tsx
import { api } from "../api/client";
import { useSessionStore } from "../store/useSessionStore";

export default function ExportPage() {
  const { sessionId } = useSessionStore();

  const download = async (type: "pdf" | "ipynb") => {
    // Just send the sessionId — no need to fetch the data client-side
    const route = type === "pdf" ? "/export/pdf" : "/export/ipynb";
    const res = await api.post(route, { session_id: sessionId }, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${sessionId}_export.${type}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Export Pipeline</h2>
      <button
        onClick={() => download("pdf")}
        className="bg-blue-600 text-white px-4 py-2"
      >
        Download PDF
      </button>
      <button
        onClick={() => download("ipynb")}
        className="bg-green-600 text-white px-4 py-2"
      >
        Download IPYNB
      </button>
    </div>
  );
}
