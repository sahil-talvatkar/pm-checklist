import React from "react";
import { Toaster } from "react-hot-toast";

export const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 70 }}
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "10px",
          background: "#1e293b",
          color: "#f8fafc",
          fontSize: "13px",
          fontWeight: "500",
          padding: "12px 16px",
          boxShadow:
            "0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2)",
          maxWidth: "360px",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};
