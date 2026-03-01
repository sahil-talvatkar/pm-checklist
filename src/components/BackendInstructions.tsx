import React, { useState } from "react";
import { Server, ChevronDown, ChevronUp, Terminal, FileSpreadsheet, Code2, Copy, Check } from "lucide-react";

const backendCode = `# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from datetime import date, datetime
import os

app = FastAPI(title="PM Checklist API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXCEL_FILE = "pm_data.xlsx"

class UpdatePMRequest(BaseModel):
    pm_id: str
    status: str
    completed_on: str
    comment: str
    completed_by: str = "Technician"

def get_excel_data():
    if not os.path.exists(EXCEL_FILE):
        df = pd.DataFrame(columns=[
            "PM_ID", "Equipment_Name", "PM_Task",
            "Due_Date", "Status", "Completed_By",
            "Completed_On", "Comment"
        ])
        df.to_excel(EXCEL_FILE, index=False)
    return pd.read_excel(EXCEL_FILE, dtype=str).fillna("")

@app.get("/get-todays-pm")
async def get_todays_pm():
    try:
        df = get_excel_data()
        today = date.today().isoformat()
        df["Due_Date"] = pd.to_datetime(df["Due_Date"]).dt.date.astype(str)
        filtered = df[df["Due_Date"] == today]
        return filtered.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-all-pm")
async def get_all_pm():
    try:
        df = get_excel_data()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-pm")
async def update_pm(request: UpdatePMRequest):
    try:
        df = get_excel_data()
        mask = df["PM_ID"] == request.pm_id
        if not mask.any():
            raise HTTPException(status_code=404, detail=f"PM ID {request.pm_id} not found")
        df.loc[mask, "Status"] = "Completed"
        df.loc[mask, "Completed_On"] = request.completed_on
        df.loc[mask, "Comment"] = request.comment
        df.loc[mask, "Completed_By"] = request.completed_by
        df.to_excel(EXCEL_FILE, index=False)
        return {"message": f"PM task {request.pm_id} updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`;

const requirementsCode = `# backend/requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
pandas==2.1.4
openpyxl==3.1.2
pydantic==2.5.3`;

const runCommand = `# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
cd backend
uvicorn main:app --reload --port 8000

# Frontend (in separate terminal)
npm run dev`;

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

export const BackendInstructions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"backend" | "requirements" | "run">("backend");

  const tabs = [
    { id: "backend" as const, label: "main.py", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "requirements" as const, label: "requirements.txt", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: "run" as const, label: "Run Commands", icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  const getCode = () => {
    switch (activeTab) {
      case "backend": return backendCode;
      case "requirements": return requirementsCode;
      case "run": return runCommand;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Server className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">
              FastAPI Backend Setup
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Python server with Excel read/write via Pandas & OpenPyXL
            </p>
          </div>
          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-200">
            Demo Mode
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Info Banner */}
          <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
            <div className="text-blue-500 flex-shrink-0 mt-0.5">ℹ️</div>
            <div>
              <p className="text-xs font-semibold text-blue-800">Running in Demo Mode</p>
              <p className="text-xs text-blue-700 mt-0.5">
                The frontend currently uses mock data with simulated API calls. To connect a real
                FastAPI backend, set <code className="bg-blue-100 px-1 rounded">USE_MOCK_DATA = false</code> in{" "}
                <code className="bg-blue-100 px-1 rounded">src/api/pmApi.ts</code> and run the Python server below.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Block */}
          <div className="mx-4 mb-4">
            <div className="bg-slate-900 rounded-b-lg rounded-tr-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
                </div>
                <CopyButton text={getCode()} />
              </div>
              <pre className="p-4 text-xs text-gray-300 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed font-mono">
                <code>{getCode()}</code>
              </pre>
            </div>
          </div>

          {/* Folder Structure */}
          <div className="mx-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" />
              Recommended Project Structure
            </p>
            <pre className="text-xs text-gray-600 font-mono leading-relaxed">
{`pm-checklist/
├── frontend/          ← React + Vite + Tailwind
│   ├── src/
│   │   ├── api/pmApi.ts
│   │   ├── components/
│   │   ├── types/pm.ts
│   │   └── App.tsx
│   └── package.json
└── backend/           ← FastAPI Python
    ├── main.py
    ├── requirements.txt
    └── pm_data.xlsx   ← Excel Database`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
