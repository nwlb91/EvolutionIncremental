import { useState, useRef, type ReactNode, type CSSProperties } from "react";

interface Props {
  text: string;
  children: ReactNode;
}

const tooltipStyle: CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#222",
  color: "#ddd",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "6px 10px",
  fontSize: 12,
  lineHeight: 1.4,
  whiteSpace: "normal",
  width: 220,
  zIndex: 100,
  pointerEvents: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
};

export function Tooltip({ text, children }: Props) {
  const [visible, setVisible] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setVisible(true), 250);
  };

  const hide = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setVisible(false);
  };

  return (
    <span
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: "relative", cursor: "help" }}
    >
      {children}
      {visible && <span style={tooltipStyle}>{text}</span>}
    </span>
  );
}
