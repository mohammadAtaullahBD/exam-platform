type AuthMessageProps = {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
};

const toneClasses = {
  error: "border-[#efc7bd] bg-[#fff2ee] text-[#9f321f]",
  success: "border-[#b9dec6] bg-[#f0fbf3] text-[#27633a]",
  info: "border-[#c8d7df] bg-[#f1f7fa] text-[#315465]",
};

export function AuthMessage({ children, tone = "info" }: AuthMessageProps) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}
